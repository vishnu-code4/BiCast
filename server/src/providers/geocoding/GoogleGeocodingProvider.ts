// ============================================================
// Google Geocoding Provider
// Uses Google Geocoding API (maps/api/geocode/json)
// Extracts meaningful geographic names (towns, villages, junctions, roads)
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
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

const BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeItem {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  address_components: AddressComponent[];
}

interface GoogleGeocodeResponse {
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  error_message?: string;
  results: GoogleGeocodeItem[];
}

function extractComponents(components: AddressComponent[] = []): GeocodeComponents {
  const result: GeocodeComponents = {};

  for (const comp of components) {
    const types = comp.types;
    if (types.includes('country')) {
      result.country = comp.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = comp.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      result.district = comp.long_name;
    } else if (types.includes('postal_town') || types.includes('administrative_area_level_3')) {
      result.town = comp.long_name;
      if (!result.city) result.city = comp.long_name;
    } else if (types.includes('locality')) {
      result.city = comp.long_name;
      if (!result.town) result.town = comp.long_name;
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      result.locality = comp.long_name;
      result.village = comp.long_name;
    } else if (types.includes('intersection')) {
      result.junction = comp.long_name;
      result.intersection = comp.long_name;
    } else if (types.includes('point_of_interest') || types.includes('establishment')) {
      result.landmark = comp.long_name;
    } else if (types.includes('route')) {
      result.road = comp.long_name;
      result.highway = comp.long_name;
    } else if (types.includes('postal_code')) {
      result.postalCode = comp.long_name;
    }
  }

  return result;
}

/**
 * Extracts a concise, meaningful title for a checkpoint location
 * e.g. "Nelamangala Junction" or "Channapatna Bypass" or locality name
 */
function deriveName(item: GoogleGeocodeItem, components: GeocodeComponents): string {
  if (components.junction) return components.junction;
  if (components.landmark) return components.landmark;
  if (components.town) return components.town;
  if (components.village) return components.village;
  if (components.locality) return components.locality;
  if (components.city) return components.city;
  if (components.road) return components.road;
  return item.formatted_address.split(',')[0]?.trim() || item.formatted_address;
}

export class GoogleGeocodingProvider implements GeocodingProvider {
  readonly name = 'Google Geocoding';
  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ??
      process.env.GOOGLE_GEOCODING_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY;
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length === 0) return [];

    if (!this.apiKey) {
      throw new ProviderAuthError(
        this.name,
        'Google Geocoding API key is missing. Set GOOGLE_GEOCODING_API_KEY or GOOGLE_MAPS_API_KEY.',
      );
    }

    try {
      logger.debug(`Google Geocoding request for "${query}"`);

      const response = await axios.get<GoogleGeocodeResponse>(BASE_URL, {
        params: {
          address: query,
          key: this.apiKey,
        },
        timeout: 8_000,
      });

      this.checkGoogleStatus(response.data.status, response.data.error_message);

      if (response.data.status === 'ZERO_RESULTS' || !response.data.results) {
        return [];
      }

      return response.data.results.map((item) => {
        const components = extractComponents(item.address_components);
        return {
          placeId: item.place_id,
          name: deriveName(item, components),
          formattedAddress: item.formatted_address,
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
          types: item.types,
          components,
        };
      });
    } catch (err) {
      this.handleError(err, 'Forward geocoding failed');
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    validateCoordinates(lat, lng, this.name);

    if (!this.apiKey) {
      throw new ProviderAuthError(
        this.name,
        'Google Geocoding API key is missing. Set GOOGLE_GEOCODING_API_KEY or GOOGLE_MAPS_API_KEY.',
      );
    }

    try {
      logger.debug(`Google Reverse Geocoding for (${lat}, ${lng})`);

      const response = await axios.get<GoogleGeocodeResponse>(BASE_URL, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
        },
        timeout: 8_000,
      });

      this.checkGoogleStatus(response.data.status, response.data.error_message);

      if (response.data.status === 'ZERO_RESULTS' || !response.data.results || response.data.results.length === 0) {
        return {
          formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          name: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
          lat,
          lng,
          types: ['coordinates'],
          components: {},
        };
      }

      const topResult = response.data.results[0]!;
      const components = extractComponents(topResult.address_components);

      return {
        placeId: topResult.place_id,
        name: deriveName(topResult, components),
        formattedAddress: topResult.formatted_address,
        lat: topResult.geometry.location.lat,
        lng: topResult.geometry.location.lng,
        types: topResult.types,
        components,
      };
    } catch (err) {
      this.handleError(err, 'Reverse geocoding failed');
    }
  }

  private checkGoogleStatus(status: string, errorMessage?: string): void {
    if (status === 'OK' || status === 'ZERO_RESULTS') return;
    if (status === 'OVER_QUERY_LIMIT') {
      throw new ProviderRateLimitError(this.name, 'Google Geocoding API quota exceeded or rate limit reached');
    }
    if (status === 'REQUEST_DENIED') {
      throw new ProviderAuthError(this.name, `Google Geocoding request denied: ${errorMessage || 'Invalid API key'}`);
    }
    throw new ProviderError(this.name, `Google Geocoding API error: ${status}${errorMessage ? ` - ${errorMessage}` : ''}`);
  }

  private handleError(err: unknown, defaultMsg: string): never {
    if (err instanceof ProviderError) throw err;

    const axiosErr = err as AxiosError<GoogleGeocodeResponse>;
    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
      throw new ProviderTimeoutError(this.name, 'Google Geocoding request timed out');
    }

    const status = axiosErr.response?.status;
    if (status === 401 || status === 403) {
      throw new ProviderAuthError(this.name, 'Google Geocoding API key unauthorized or disabled');
    }
    if (status === 429) {
      throw new ProviderRateLimitError(this.name, 'Google Geocoding API rate limited');
    }

    throw new ProviderError(this.name, axiosErr.message || defaultMsg, status ?? 502);
  }
}
