// ============================================================
// Nominatim Geocoding Provider
// Uses OpenStreetMap Nominatim — free, no API key required.
// https://nominatim.openstreetmap.org/
// ============================================================
import axios, { AxiosError } from 'axios';
import {
  GeocodingProvider,
  GeocodeResult,
  ReverseGeocodeResult,
  GeocodeComponents,
} from '../interfaces/GeocodingProvider';
import { logger } from '../../utils/logger';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

const USER_AGENT = 'BiCAST-Motorcycle-Route-Intelligence/1.0 (contact: bicast.dev@gmail.com)';

// Nominatim usage policy: max 1 request per second strictly serialized
let lastRequestMs = 0;
let rateLimitQueue: Promise<void> = Promise.resolve();

async function nominatimRateLimit(): Promise<void> {
  const next = rateLimitQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestMs;
    if (elapsed < 1100) {
      await new Promise((r) => setTimeout(r, 1100 - elapsed));
    }
    lastRequestMs = Date.now();
  });
  rateLimitQueue = next.catch(() => {});
  await next;
}

// In-memory cache to avoid repeated requests and respect OSM Nominatim guidelines
const geocodeCache = new Map<string, { data: GeocodeResult[]; expiry: number }>();
const reverseGeocodeCache = new Map<string, { data: ReverseGeocodeResult; expiry: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_ENTRIES = 500;

// Pre-seeded popular locations across India for instantaneous autocomplete and offline/rate-limit resilience
const POPULAR_LOCATIONS: GeocodeResult[] = [
  { placeId: 'seed-chennai', name: 'Chennai', formattedAddress: 'Chennai, Tamil Nadu, India', lat: 13.0827, lng: 80.2707, types: ['city'] },
  { placeId: 'seed-bangalore', name: 'Bangalore', formattedAddress: 'Bengaluru, Karnataka, India', lat: 12.9716, lng: 77.5946, types: ['city'] },
  { placeId: 'seed-mysore', name: 'Mysore', formattedAddress: 'Mysuru, Karnataka, India', lat: 12.2958, lng: 76.6394, types: ['city'] },
  { placeId: 'seed-pondicherry', name: 'Puducherry (Pondicherry)', formattedAddress: 'Puducherry, Union Territory, India', lat: 11.9416, lng: 79.8083, types: ['city'] },
  { placeId: 'seed-tindivanam', name: 'Tindivanam', formattedAddress: 'Tindivanam, Viluppuram, Tamil Nadu, India', lat: 12.2286, lng: 79.6508, types: ['town'] },
  { placeId: 'seed-mandya', name: 'Mandya', formattedAddress: 'Mandya, Karnataka, India', lat: 12.5238, lng: 76.8967, types: ['town'] },
  { placeId: 'seed-ramanagara', name: 'Ramanagara', formattedAddress: 'Ramanagara, Karnataka, India', lat: 12.7209, lng: 77.2799, types: ['town'] },
  { placeId: 'seed-mahabalipuram', name: 'Mahabalipuram', formattedAddress: 'Mamallapuram, Chengalpattu, Tamil Nadu, India', lat: 12.6269, lng: 80.1927, types: ['town'] },
  { placeId: 'seed-kanchipuram', name: 'Kanchipuram', formattedAddress: 'Kanchipuram, Tamil Nadu, India', lat: 12.8342, lng: 79.7036, types: ['city'] },
  { placeId: 'seed-vellore', name: 'Vellore', formattedAddress: 'Vellore, Tamil Nadu, India', lat: 12.9165, lng: 79.1325, types: ['city'] },
  { placeId: 'seed-salem', name: 'Salem', formattedAddress: 'Salem, Tamil Nadu, India', lat: 11.6643, lng: 78.1460, types: ['city'] },
  { placeId: 'seed-coimbatore', name: 'Coimbatore', formattedAddress: 'Coimbatore, Tamil Nadu, India', lat: 11.0168, lng: 76.9558, types: ['city'] },
  { placeId: 'seed-madurai', name: 'Madurai', formattedAddress: 'Madurai, Tamil Nadu, India', lat: 9.9252, lng: 78.1198, types: ['city'] },
  { placeId: 'seed-tirupati', name: 'Tirupati', formattedAddress: 'Tirupati, Andhra Pradesh, India', lat: 13.6288, lng: 79.4192, types: ['city'] },
  { placeId: 'seed-hyderabad', name: 'Hyderabad', formattedAddress: 'Hyderabad, Telangana, India', lat: 17.3850, lng: 78.4867, types: ['city'] },
  { placeId: 'seed-mumbai', name: 'Mumbai', formattedAddress: 'Mumbai, Maharashtra, India', lat: 19.0760, lng: 72.8777, types: ['city'] },
  { placeId: 'seed-pune', name: 'Pune', formattedAddress: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567, types: ['city'] },
  { placeId: 'seed-goa', name: 'Panaji (Goa)', formattedAddress: 'Panaji, Goa, India', lat: 15.4909, lng: 73.8278, types: ['city'] },
  { placeId: 'seed-kochi', name: 'Kochi', formattedAddress: 'Kochi, Kerala, India', lat: 9.9312, lng: 76.2673, types: ['city'] },
  { placeId: 'seed-ooty', name: 'Ooty', formattedAddress: 'Udhagamandalam, Nilgiris, Tamil Nadu, India', lat: 11.4102, lng: 76.6950, types: ['town'] },
  { placeId: 'seed-chidambaram', name: 'Chidambaram', formattedAddress: 'Chidambaram, Cuddalore, Tamil Nadu, India', lat: 11.3992, lng: 79.6935, types: ['town'] },
];

// Seed cache
for (const loc of POPULAR_LOCATIONS) {
  geocodeCache.set(loc.name.toLowerCase(), { data: [loc], expiry: Date.now() + CACHE_TTL_MS });
}


interface NominatimSearchResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  importance: number;
}

interface NominatimReverseResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    junction?: string;
  };
}

export class NominatimGeocodingProvider implements GeocodingProvider {
  readonly name = 'Nominatim (OSM)';
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length === 0) return [];
    const normalizedKey = query.trim().toLowerCase();
    const cached = geocodeCache.get(normalizedKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Check popular locations for quick partial matches
    const popularMatches = POPULAR_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(normalizedKey) ||
        loc.formattedAddress.toLowerCase().includes(normalizedKey) ||
        normalizedKey.includes(loc.name.toLowerCase()),
    );

    logger.debug(`Nominatim geocode: "${query}"`);
    await nominatimRateLimit();

    try {
      const response = await axios.get<NominatimSearchResult[]>(
        `${this.baseUrl}/search`,
        {
          params: {
            q: query,
            format: 'json',
            limit: 5,
            addressdetails: 0,
          },
          headers: { 'User-Agent': USER_AGENT },
          timeout: 8_000,
        },
      );

      const results = response.data.map((item) => ({
        placeId: `nominatim-${item.osm_type}-${item.osm_id}`,
        name: item.display_name.split(',')[0]?.trim() ?? item.display_name,
        formattedAddress: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        types: [item.class, item.type],
      }));

      // If empty but popular matches exist, merge them
      const finalResults = results.length > 0 ? results : popularMatches;

      if (geocodeCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey) geocodeCache.delete(firstKey);
      }
      geocodeCache.set(normalizedKey, { data: finalResults, expiry: Date.now() + CACHE_TTL_MS });

      return finalResults;
    } catch (err) {
      // If popular matches are available on 429 or timeout, return them gracefully
      if (popularMatches.length > 0) {
        logger.warn(`Nominatim geocode throttled or failed for "${query}", returning ${popularMatches.length} seeded locations`);
        return popularMatches;
      }
      if (err instanceof ProviderError) throw err;
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, 'Nominatim geocoding request timed out');
      }
      if (axiosErr.response?.status === 429) {
        throw new ProviderRateLimitError(this.name, 'Nominatim rate limit exceeded (1 req/sec limit)');
      }
      throw new ProviderError(this.name, axiosErr.message || 'Nominatim geocoding failed', axiosErr.response?.status ?? 502);
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    validateCoordinates(lat, lng, this.name);
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = reverseGeocodeCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    logger.debug(`Nominatim reverse geocode: (${lat}, ${lng})`);
    await nominatimRateLimit();

    try {
      const response = await axios.get<NominatimReverseResult>(
        `${this.baseUrl}/reverse`,
        {
          params: {
            lat,
            lon: lng,
            format: 'json',
            addressdetails: 1,
          },
          headers: { 'User-Agent': USER_AGENT },
          timeout: 8_000,
        },
      );

      const { address } = response.data;
      const components: GeocodeComponents = {
        country: address.country,
        state: address.state,
        district: address.state_district,
        city: address.city,
        town: address.town,
        village: address.village ?? address.hamlet,
        locality: address.suburb,
        junction: address.junction,
        road: address.road,
        postalCode: address.postcode,
      };

      const name =
        components.junction ||
        components.village ||
        components.town ||
        components.locality ||
        components.city ||
        components.road ||
        response.data.display_name.split(',')[0]?.trim() ||
        'Checkpoint';

      const result: ReverseGeocodeResult = {
        placeId: `nominatim-${response.data.place_id}`,
        name,
        formattedAddress: response.data.display_name,
        lat: parseFloat(response.data.lat),
        lng: parseFloat(response.data.lon),
        types: ['geographic'],
        components,
      };

      if (reverseGeocodeCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = reverseGeocodeCache.keys().next().value;
        if (firstKey) reverseGeocodeCache.delete(firstKey);
      }
      reverseGeocodeCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });

      return result;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, 'Nominatim reverse geocoding request timed out');
      }
      if (axiosErr.response?.status === 429) {
        throw new ProviderRateLimitError(this.name, 'Nominatim rate limit exceeded');
      }
      throw new ProviderError(this.name, axiosErr.message || 'Nominatim reverse geocoding failed', axiosErr.response?.status ?? 502);
    }
  }
}
