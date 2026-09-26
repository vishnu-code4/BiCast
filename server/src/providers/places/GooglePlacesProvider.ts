// ============================================================
// Google Places API (New) Provider
// Uses Google Places API (v1/places:searchNearby)
// Supports motorcycle rider categories and route proximity filtering
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
import {
  haversineDistanceMetres,
  minDistanceToPolyline,
  interpolatePolyline,
} from '../../utils/geoMath';
import {
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

const GOOGLE_PLACES_SEARCH_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// Map internal rider categories to Google Places (New) types
const CATEGORY_TO_GOOGLE_TYPES: Record<PlaceCategory, string[]> = {
  fuel: ['gas_station'],
  ev_charging: ['electric_vehicle_charging_station'],
  restaurant: ['restaurant', 'fast_food_restaurant'],
  cafe: ['cafe', 'coffee_shop'],
  hotel: ['hotel', 'motel', 'lodging', 'resort_hotel'],
  hospital: ['hospital', 'medical_clinic'],
  motorcycle_service: ['car_repair'],
  tyre_repair: ['car_repair'],
  atm: ['atm', 'bank'],
  restroom: ['rest_stop'],
  tourist_attraction: ['tourist_attraction', 'historical_landmark'],
  parking: ['parking'],
  rest_area: ['rest_stop'],
  pharmacy: ['pharmacy', 'drugstore'],
  convenience_store: ['convenience_store', 'grocery_store'],
};

interface GooglePlacesApiResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string; languageCode?: string };
    primaryType?: string;
    types?: string[];
    location?: { latitude: number; longitude: number };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    businessStatus?: string;
    regularOpeningHours?: {
      openNow?: boolean;
    };
  }>;
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly name = 'Google Places (New)';
  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ??
      process.env.GOOGLE_PLACES_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY;
  }

  async searchNearby(request: PlacesRequest): Promise<PlaceResult[]> {
    const { lat, lng, radiusMetres, categories, limit = 20 } = request;

    validateCoordinates(lat, lng, this.name);

    if (!this.apiKey) {
      throw new ProviderAuthError(
        this.name,
        'Google Places API key is missing. Set GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY.',
      );
    }

    if (categories.length === 0) {
      return [];
    }

    // Collect Google Place types for the requested categories
    const googleTypes = new Set<string>();
    for (const cat of categories) {
      const types = CATEGORY_TO_GOOGLE_TYPES[cat as PlaceCategory] ?? [cat];
      types.forEach((t) => googleTypes.add(t));
    }

    const payload = {
      includedTypes: Array.from(googleTypes),
      maxResultCount: Math.min(Math.max(1, limit), 20),
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(Math.max(100, radiusMetres), 50_000),
        },
      },
    };

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.primaryType',
      'places.types',
      'places.location',
      'places.formattedAddress',
      'places.rating',
      'places.userRatingCount',
      'places.nationalPhoneNumber',
      'places.websiteUri',
      'places.businessStatus',
      'places.regularOpeningHours.openNow',
    ].join(',');

    try {
      logger.debug(`Google Places searchNearby at (${lat}, ${lng}) r=${radiusMetres}m`);

      const response = await axios.post<GooglePlacesApiResponse>(
        GOOGLE_PLACES_SEARCH_NEARBY_URL,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          timeout: 10_000,
        },
      );

      if (!response.data.places || response.data.places.length === 0) {
        return [];
      }

      const results: PlaceResult[] = response.data.places
        .filter((p) => p.location?.latitude != null && p.location?.longitude != null)
        .map((p) => {
          const pLat = p.location!.latitude;
          const pLng = p.location!.longitude;
          const matchedCat = this.resolveCategory(p.primaryType, p.types, categories);
          const isOpen = p.regularOpeningHours?.openNow;

          return {
            placeId: p.id,
            name: p.displayName?.text || 'Point of Interest',
            category: matchedCat,
            lat: pLat,
            lng: pLng,
            latitude: pLat,
            longitude: pLng,
            address: p.formattedAddress,
            distanceMetres: haversineDistanceMetres(lat, lng, pLat, pLng),
            isOpen,
            openNow: isOpen,
            businessStatus: p.businessStatus,
            rating: p.rating,
            userRatingCount: p.userRatingCount,
            phone: p.nationalPhoneNumber,
            website: p.websiteUri,
            types: p.types,
            categories: p.types,
          };
        });

      return results.sort((a, b) => (a.distanceMetres ?? 0) - (b.distanceMetres ?? 0));
    } catch (err) {
      if (err instanceof ProviderError) throw err;

      const axiosErr = err as AxiosError<{ error?: { message?: string; status?: string } }>;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, 'Google Places request timed out');
      }

      const status = axiosErr.response?.status;
      if (status === 401 || status === 403) {
        throw new ProviderAuthError(this.name, 'Google Places API key invalid, unauthorized or billing inactive');
      }
      if (status === 429) {
        throw new ProviderRateLimitError(this.name, 'Google Places API rate limit reached');
      }

      const msg = axiosErr.response?.data?.error?.message || axiosErr.message || 'Google Places query failed';
      throw new ProviderError(this.name, msg, status ?? 502);
    }
  }

  /**
   * Searches for places along a route corridor by sampling key checkpoints
   * and filtering results strictly by proximity to the route geometry.
   */
  async searchAlongRoute(request: PlacesAlongRouteRequest): Promise<PlaceResult[]> {
    const { polyline, categories, maxDeviationMetres = 5000, limit = 50 } = request;

    if (polyline.length < 2) return [];

    // Sample points along route (approx every 30-40km)
    const samplesCount = Math.max(2, Math.min(8, Math.ceil(polyline.length / 20)));
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
          limit: 15,
        });

        for (const place of nearby) {
          if (!placeMap.has(place.placeId)) {
            placeMap.set(place.placeId, place);
          }
        }
      } catch (err) {
        logger.warn(`Failed searching places at sample point (${pt.lat}, ${pt.lng}): ${err}`);
      }
    }

    return filterPlacesByRouteProximity(Array.from(placeMap.values()), polyline, maxDeviationMetres).slice(0, limit);
  }

  private resolveCategory(
    primaryType?: string,
    types: string[] = [],
    requestedCats: Array<PlaceCategory | string> = [],
  ): PlaceCategory | string {
    const allTypes = [primaryType, ...types].filter(Boolean) as string[];

    for (const reqCat of requestedCats) {
      const targets = CATEGORY_TO_GOOGLE_TYPES[reqCat as PlaceCategory];
      if (targets && targets.some((t) => allTypes.includes(t))) {
        return reqCat;
      }
    }

    return requestedCats[0] || 'general';
  }
}

/**
 * Filters places to only those within `maxDeviationMetres` of a route polyline,
 * annotates `distanceFromRouteMetres`, and sorts by proximity to route.
 */
export function filterPlacesByRouteProximity(
  places: PlaceResult[],
  polyline: Array<[number, number]>,
  maxDeviationMetres: number = 5000,
): PlaceResult[] {
  if (polyline.length === 0) return places;

  return places
    .map((place) => {
      const distFromRoute = minDistanceToPolyline(place.lat, place.lng, polyline);
      return {
        ...place,
        distanceFromRouteMetres: distFromRoute,
      };
    })
    .filter((place) => (place.distanceFromRouteMetres ?? Infinity) <= maxDeviationMetres)
    .sort((a, b) => (a.distanceFromRouteMetres ?? 0) - (b.distanceFromRouteMetres ?? 0));
}
