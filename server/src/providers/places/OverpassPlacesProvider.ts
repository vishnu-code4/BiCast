// ============================================================
// Overpass Places Provider
// Uses the Overpass API (OpenStreetMap) — free, no API key required.
// https://wiki.openstreetmap.org/wiki/Overpass_API
// ============================================================
import axios, { AxiosError } from 'axios';
import {
  PlacesProvider,
  PlacesRequest,
  PlacesAlongRouteRequest,
  PlaceResult,
  PlaceCategory,
} from '../interfaces/PlacesProvider';
import { logger } from '../../utils/logger';
import { haversineDistanceMetres, interpolatePolyline } from '../../utils/geoMath';
import { filterPlacesByRouteProximity } from './GooglePlacesProvider';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

const BASE_URL = 'https://overpass-api.de/api/interpreter';

// Map 13 rider categories to OSM tags
const CATEGORY_TAGS: Record<PlaceCategory, string[]> = {
  fuel: ['amenity=fuel'],
  ev_charging: ['amenity=charging_station'],
  restaurant: ['amenity=restaurant', 'amenity=fast_food'],
  cafe: ['amenity=cafe'],
  hotel: ['tourism=hotel', 'tourism=motel', 'tourism=guest_house'],
  hospital: ['amenity=hospital', 'amenity=clinic'],
  motorcycle_service: ['shop=motorcycle_repair', 'shop=car_repair'],
  tyre_repair: ['shop=tyres', 'shop=car_repair'],
  atm: ['amenity=atm', 'amenity=bank'],
  restroom: ['amenity=toilets'],
  tourist_attraction: ['tourism=attraction', 'tourism=viewpoint'],
  parking: ['amenity=parking'],
  rest_area: ['highway=rest_area'],
  pharmacy: ['amenity=pharmacy'],
  convenience_store: ['shop=convenience'],
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export class OverpassPlacesProvider implements PlacesProvider {
  readonly name = 'Overpass API (OSM)';
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.OVERPASS_BASE_URL ?? BASE_URL;
  }

  async searchNearby(request: PlacesRequest): Promise<PlaceResult[]> {
    const { lat, lng, radiusMetres, categories, limit = 20 } = request;

    validateCoordinates(lat, lng, this.name);

    if (categories.length === 0) return [];

    // Build Overpass QL query
    const tagFilters: string[] = [];
    for (const cat of categories) {
      const tags = CATEGORY_TAGS[cat as PlaceCategory] ?? [`amenity=${cat}`];
      for (const tag of tags) {
        const [key, value] = tag.split('=');
        tagFilters.push(
          `node[${key}="${value}"](around:${radiusMetres},${lat},${lng});`,
        );
      }
    }

    const query = `[out:json][timeout:15];(${tagFilters.join('')});out center ${limit};`;

    try {
      const response = await axios.post<OverpassResponse>(
        this.baseUrl,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'BiCAST-App/1.0 (https://github.com/bicast; motorcycle router)',
          },
          timeout: 10_000,
        },
      );

      return response.data.elements
        .map((el): PlaceResult | null => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          if (!elLat || !elLon) return null;

          const tags = el.tags ?? {};
          const category = this.detectCategory(tags, categories);

          return {
            placeId: `overpass-${el.type}-${el.id}`,
            name: tags['name'] ?? tags['amenity'] ?? tags['shop'] ?? tags['tourism'] ?? 'Unknown Point',
            category,
            lat: elLat,
            lng: elLon,
            latitude: elLat,
            longitude: elLon,
            address: tags['addr:full'] ?? tags['addr:street'],
            distanceMetres: haversineDistanceMetres(lat, lng, elLat, elLon),
            phone: tags['phone'] ?? tags['contact:phone'],
            website: tags['website'] ?? tags['contact:website'],
          };
        })
        .filter((r): r is PlaceResult => r !== null)
        .sort((a, b) => (a.distanceMetres ?? 0) - (b.distanceMetres ?? 0));
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, 'Overpass places query timed out');
      }
      if (axiosErr.response?.status === 429) {
        throw new ProviderRateLimitError(this.name, 'Overpass API rate limit reached');
      }
      throw new ProviderError(this.name, axiosErr.message || 'Overpass query failed', axiosErr.response?.status ?? 502);
    }
  }

  async searchAlongRoute(request: PlacesAlongRouteRequest): Promise<PlaceResult[]> {
    const { polyline, categories, maxDeviationMetres = 5000, limit = 50 } = request;
    if (polyline.length < 2) return [];

    const samplesCount = Math.max(2, Math.min(6, Math.ceil(polyline.length / 25)));
    const samplePoints: Array<{ lat: number; lng: number }> = [];

    for (let i = 0; i < samplesCount; i++) {
      const frac = i / (samplesCount - 1);
      samplePoints.push(interpolatePolyline(polyline, frac));
    }

    const placeMap = new Map<string, PlaceResult>();

    for (const pt of samplePoints) {
      try {
        const nearby = await this.searchNearby({
          lat: pt.lat,
          lng: pt.lng,
          radiusMetres: maxDeviationMetres * 1.5,
          categories,
          limit: 10,
        });
        for (const p of nearby) {
          if (!placeMap.has(p.placeId)) {
            placeMap.set(p.placeId, p);
          }
        }
      } catch (err) {
        logger.warn(`Overpass route sample failed at (${pt.lat}, ${pt.lng}): ${err}`);
      }
    }

    return filterPlacesByRouteProximity(Array.from(placeMap.values()), polyline, maxDeviationMetres).slice(0, limit);
  }

  private detectCategory(
    tags: Record<string, string>,
    requestedCategories: Array<PlaceCategory | string>,
  ): PlaceCategory | string {
    if (tags['amenity'] === 'fuel') return 'fuel';
    if (tags['amenity'] === 'charging_station') return 'ev_charging';
    if (tags['amenity'] === 'hospital' || tags['amenity'] === 'clinic') return 'hospital';
    if (tags['amenity'] === 'restaurant' || tags['amenity'] === 'fast_food') return 'restaurant';
    if (tags['amenity'] === 'cafe') return 'cafe';
    if (tags['tourism'] === 'hotel' || tags['tourism'] === 'motel' || tags['tourism'] === 'guest_house') return 'hotel';
    if (tags['shop'] === 'motorcycle_repair') return 'motorcycle_service';
    if (tags['shop'] === 'car_repair') return requestedCategories.includes('tyre_repair') ? 'tyre_repair' : 'motorcycle_service';
    if (tags['shop'] === 'tyres') return 'tyre_repair';
    if (tags['amenity'] === 'atm' || tags['amenity'] === 'bank') return 'atm';
    if (tags['amenity'] === 'toilets') return 'restroom';
    if (tags['tourism'] === 'attraction' || tags['tourism'] === 'viewpoint') return 'tourist_attraction';
    if (tags['amenity'] === 'parking') return 'parking';
    if (tags['highway'] === 'rest_area') return 'rest_area';
    return requestedCategories[0] || 'general';
  }
}
