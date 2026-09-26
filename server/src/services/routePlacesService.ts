// ============================================================
// BiCAST Route Places Service
// Discovers, deduplicates, and deterministically ranks places along
// a route corridor using Google Places API (New) with Overpass fallback.
// Enforces API cost control via route corridor sampling and TTL caching.
// ============================================================
import { placesProvider } from '../providers';
import { Place, PlaceCategory } from '../providers/interfaces/PlacesProvider';
import { PlannedRoute } from '../types/routePlan';
import {
  minDistanceToPolyline,
  interpolatePolyline,
  haversineDistanceMetres,
} from '../utils/geoMath';
import { cacheService, CACHE_TTL } from '../cache/CacheService';
import {
  getCategoryConfig,
  PlaceCategoryId,
  PLACE_CATEGORIES,
} from '../config/placeCategories';
import { logger } from '../utils/logger';

export interface RoutePlacesOptions {
  category?: string;
  categories?: string[];
  radiusMeters?: number;
  limit?: number;
}

export interface RoutePlacesResult {
  routeId: string;
  category: string;
  categories: string[];
  radiusMeters: number;
  totalFound: number;
  places: Place[];
  groupedPlaces?: Record<string, Place[]>;
}

export class RoutePlacesService {
  /**
   * Generates corridor search points along a route polyline.
   * Dynamically determines sample count to prevent excessive external API calls.
   */
  generateCorridorSamplePoints(
    polyline: Array<[number, number]>,
    totalDistanceMeters: number,
  ): Array<{ lat: number; lng: number; fraction: number }> {
    if (polyline.length < 2) return [];

    // Distances:
    // < 30km: 2 sample points
    // 30km - 80km: 3 sample points (~25km spacing)
    // 80km - 180km: 4-5 sample points (~35km spacing)
    // 180km - 350km: 6-8 sample points (~45km spacing)
    // > 350km: 8-10 sample points (capped at 10 to avoid excessive API calls)
    const distanceKm = totalDistanceMeters > 0 ? totalDistanceMeters / 1000 : polyline.length * 0.5;

    let sampleCount = 3;
    if (distanceKm < 30) {
      sampleCount = 2;
    } else if (distanceKm < 80) {
      sampleCount = 3;
    } else if (distanceKm < 180) {
      sampleCount = 5;
    } else if (distanceKm < 350) {
      sampleCount = 7;
    } else {
      sampleCount = 9;
    }

    const samplePoints: Array<{ lat: number; lng: number; fraction: number }> = [];

    for (let i = 0; i < sampleCount; i++) {
      // Offset slightly from 0 and 1 so samples focus on the route corridor rather than just terminals
      const fraction = sampleCount === 1 ? 0.5 : i / (sampleCount - 1);
      const coord = interpolatePolyline(polyline, fraction);
      samplePoints.push({
        lat: coord.lat,
        lng: coord.lng,
        fraction,
      });
    }

    return samplePoints;
  }

  /**
   * Deterministically scores a place for motorcycle route usefulness (0 to 100).
   * No AI / LLM is used.
   *
   * Formula:
   * 1. Distance score (0-50 pts): Linear decay based on perpendicular distance from route.
   * 2. Rating score (0-20 pts): Based on Google rating (0-5 stars). Unrated places get 12 pts neutral.
   * 3. Review confidence (0-10 pts): Logarithmic scale based on number of reviews.
   * 4. Open status (0-15 pts): +15 if open now, 0 if unknown, -10 if known closed.
   * 5. Category importance (0-5 pts): Essential services like fuel, hospital, tyre repair get bonus.
   */
  calculatePlaceRank(place: {
    distanceFromRouteMeters: number;
    rating?: number;
    userRatingCount?: number;
    openNow?: boolean;
    category: string;
    maxCorridorRadius: number;
  }): number {
    const {
      distanceFromRouteMeters,
      rating,
      userRatingCount,
      openNow,
      category,
      maxCorridorRadius,
    } = place;

    // 1. Distance score: 0 to 50
    const clampedDist = Math.max(0, Math.min(distanceFromRouteMeters, maxCorridorRadius));
    const distanceScore = 50 * (1 - clampedDist / maxCorridorRadius);

    // 2. Rating score: 0 to 20
    let ratingScore = 12; // neutral default for unrated places
    if (rating != null && rating > 0) {
      ratingScore = Math.min(20, Math.max(0, (rating / 5) * 20));
    }

    // 3. Review count confidence: 0 to 10
    let reviewScore = 0;
    if (userRatingCount != null && userRatingCount > 0) {
      reviewScore = Math.min(10, Math.log10(userRatingCount + 1) * 3.3);
    }

    // 4. Open status score: -10 to +15
    let openScore = 0;
    if (openNow === true) {
      openScore = 15;
    } else if (openNow === false) {
      openScore = -10;
    }

    // 5. Category importance: 0 to 5
    const catConfig = getCategoryConfig(category);
    const importanceWeight = catConfig?.importanceWeight ?? 5;
    const categoryScore = (importanceWeight / 10) * 5;

    const total = distanceScore + ratingScore + reviewScore + openScore + categoryScore;
    return Math.round(Math.max(0, Math.min(100, total)));
  }

  /**
   * Searches, deduplicates, filters, ranks, and caches places along a selected route.
   */
  async getPlacesAlongRoute(
    route: PlannedRoute,
    options: RoutePlacesOptions = {},
  ): Promise<RoutePlacesResult> {
    const {
      category = 'fuel',
      categories: requestedCategories,
      radiusMeters: customRadius,
      limit = 30,
    } = options;

    // Resolve target categories
    const categories: PlaceCategoryId[] = [];
    if (requestedCategories && requestedCategories.length > 0) {
      for (const cat of requestedCategories) {
        const conf = getCategoryConfig(cat);
        if (conf && !categories.includes(conf.id)) {
          categories.push(conf.id);
        }
      }
    } else {
      const conf = getCategoryConfig(category);
      if (conf) categories.push(conf.id);
      else categories.push('fuel');
    }

    const primaryCatConfig = getCategoryConfig(categories[0] ?? 'fuel') ?? PLACE_CATEGORIES.fuel;
    const corridorRadius = customRadius ?? primaryCatConfig.defaultRadiusMeters;

    // Build stable cache key: routeId + categories + corridorRadius
    const categoriesKey = [...categories].sort().join(',');
    const cacheKey = `routePlaces:${route.id}:${categoriesKey}:${corridorRadius}`;

    const cachedResult = await cacheService.get<RoutePlacesResult>(cacheKey);
    if (cachedResult) {
      logger.debug(`Cache hit for route places: ${cacheKey}`);
      return {
        ...cachedResult,
        places: cachedResult.places.slice(0, limit),
      };
    }

    if (!route.geometry || route.geometry.length < 2) {
      return {
        routeId: route.id,
        category: categories[0] ?? 'fuel',
        categories,
        radiusMeters: corridorRadius,
        totalFound: 0,
        places: [],
      };
    }

    // 1. Identify sample points along route corridor
    const samplePoints = this.generateCorridorSamplePoints(
      route.geometry,
      route.distanceMeters,
    );

    // 2. Query places provider at sample points (provider has internal caching too)
    const placeMap = new Map<string, Place>();

    for (const sample of samplePoints) {
      try {
        const rawResults = await placesProvider.searchNearby({
          lat: sample.lat,
          lng: sample.lng,
          radiusMetres: Math.round(corridorRadius * 1.3),
          categories: categories as PlaceCategory[],
          limit: 15,
        });

        for (const res of rawResults) {
          if (!placeMap.has(res.placeId)) {
            const pLat = res.latitude ?? res.lat;
            const pLng = res.longitude ?? res.lng;

            // Distance from route polyline
            const distFromRoute = minDistanceToPolyline(pLat, pLng, route.geometry);

            // Filter out places further than corridor radius
            if (distFromRoute <= corridorRadius) {
              const estimatedDetourMeters = Math.round(distFromRoute * 2);
              // Assume 40 km/h in detour/local roads (40,000 m / 3,600 s ≈ 11.1 m/s)
              const estimatedDetourSeconds = Math.round((estimatedDetourMeters / 1000 / 40) * 3600);

              const rankScore = this.calculatePlaceRank({
                distanceFromRouteMeters: distFromRoute,
                rating: res.rating,
                userRatingCount: res.userRatingCount,
                openNow: res.openNow ?? res.isOpen,
                category: res.category,
                maxCorridorRadius: corridorRadius,
              });

              // Distance from current sample point
              const distFromSample = haversineDistanceMetres(sample.lat, sample.lng, pLat, pLng);

              placeMap.set(res.placeId, {
                placeId: res.placeId,
                name: res.name,
                category: res.category,
                categories: res.categories ?? (res.types ? [...res.types] : [res.category]),
                latitude: pLat,
                longitude: pLng,
                lat: pLat,
                lng: pLng,
                address: res.address,
                rating: res.rating,
                userRatingCount: res.userRatingCount,
                openNow: res.openNow ?? res.isOpen,
                isOpen: res.openNow ?? res.isOpen,
                businessStatus: res.businessStatus,
                distanceFromRouteMeters: distFromRoute,
                distanceFromCurrentRoutePointMeters: distFromSample,
                estimatedDetourMeters,
                estimatedDetourSeconds,
                rankScore,
                phone: res.phone,
                website: res.website,
                types: res.types,
              });
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed searching places at sample (${sample.lat}, ${sample.lng}): ${err}`);
      }
    }

    // 3. Rank places deterministically
    const allPlaces = Array.from(placeMap.values()).sort(
      (a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0),
    );

    // Group by category if multiple categories
    let groupedPlaces: Record<string, Place[]> | undefined;
    if (categories.length > 1) {
      groupedPlaces = {};
      for (const cat of categories) {
        groupedPlaces[cat] = allPlaces.filter((p) => p.category === cat);
      }
    }

    const fullResult: RoutePlacesResult = {
      routeId: route.id,
      category: categories[0] ?? 'fuel',
      categories,
      radiusMeters: corridorRadius,
      totalFound: allPlaces.length,
      places: allPlaces,
      groupedPlaces,
    };

    // Cache the full result for 6 hours
    await cacheService.set(cacheKey, fullResult, CACHE_TTL.PLACES);

    return {
      ...fullResult,
      places: allPlaces.slice(0, limit),
    };
  }
}

export const routePlacesService = new RoutePlacesService();
