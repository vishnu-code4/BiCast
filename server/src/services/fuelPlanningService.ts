// ============================================================
// BiCAST Fuel Planning Service
// Identifies reachable fuel stations, evaluates safety reserve windows,
// and deterministically recommends practical refuelling stops.
// Reuses RoutePlacesService (PlacesProvider) from Prompt 6.
// ============================================================
import { PlannedRoute } from '../types/routePlan';
import {
  FuelInput,
  FuelStationRecommendation,
  RouteFuelPlan,
} from '../types/fuel';
import { fuelCalculationService } from './fuelCalculationService';
import { routePlacesService } from './routePlacesService';
import { distanceAlongPolylineMetres } from '../utils/geoMath';
import { addSecondsToIso } from './routePlanningService';
import { logger } from '../utils/logger';

export class FuelPlanningService {
  /**
   * Plans complete fuel metrics and recommended refuelling stops along a route.
   */
  async planRouteFuel(
    route: PlannedRoute,
    input: FuelInput,
  ): Promise<RouteFuelPlan> {
    // 1. Calculate deterministic base fuel metrics
    const calculation = fuelCalculationService.calculateRouteFuel(route, input);
    const checkpointEstimates = fuelCalculationService.calculateCheckpointEstimates(route, input);

    // 2. Fetch fuel stations along route corridor reusing existing RoutePlacesService
    let rawPlaces: any[] = [];
    try {
      const placesResult = await routePlacesService.getPlacesAlongRoute(route, {
        category: 'fuel',
        radiusMeters: 5000,
        limit: 25,
      });
      rawPlaces = placesResult.places;
    } catch (err) {
      logger.warn(`Could not retrieve fuel stations along route ${route.id}: ${err}`);
    }

    const {
      mileageKmPerLitre,
      currentFuelLitres,
      reserveLitres = 1.5,
    } = input;

    // 3. Process each fuel station with route progression metrics
    const candidateStations: FuelStationRecommendation[] = [];

    for (const p of rawPlaces) {
      const distFromStartMeters = distanceAlongPolylineMetres(
        p.latitude,
        p.longitude,
        route.geometry,
      );
      const distFromStartKm = Number((distFromStartMeters / 1000).toFixed(1));

      // Estimate arrival time at station
      const fraction = route.distanceMeters > 0 ? distFromStartMeters / route.distanceMeters : 0;
      const etaSeconds = Math.round(fraction * route.durationSeconds);
      const estimatedArrivalTime = addSecondsToIso(route.departureTime, etaSeconds);

      // Remaining fuel when reaching this station
      let remainingFuelLitresAtStation: number | undefined;
      let isReachableBeforeReserve = true;

      if (mileageKmPerLitre && mileageKmPerLitre > 0 && currentFuelLitres != null) {
        const fuelConsumed = distFromStartKm / mileageKmPerLitre;
        remainingFuelLitresAtStation = Math.max(0, Number((currentFuelLitres - fuelConsumed).toFixed(2)));
        isReachableBeforeReserve = remainingFuelLitresAtStation > reserveLitres;
      }

      // Calculate ranking score for refuelling suitability (0 to 100)
      const rankScore = this.calculateStationSuitabilityScore({
        distFromStartKm,
        routeDistanceKm: calculation.distanceKm,
        usableRangeKm: calculation.usableRangeKm,
        isReachableBeforeReserve,
        distanceFromRouteMeters: p.distanceFromRouteMeters,
        rating: p.rating,
        openNow: p.openNow ?? p.isOpen,
      });

      candidateStations.push({
        placeId: p.placeId,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address,
        distanceFromRouteMeters: p.distanceFromRouteMeters,
        distanceFromStartKm: distFromStartKm,
        estimatedArrivalTime,
        remainingFuelLitresAtStation,
        isReachableBeforeReserve,
        estimatedDetourMeters: p.estimatedDetourMeters,
        estimatedDetourSeconds: p.estimatedDetourSeconds,
        rating: p.rating,
        userRatingCount: p.userRatingCount,
        openNow: p.openNow ?? p.isOpen,
        rankScore,
      });
    }

    // Sort by suitability score descending
    const recommendations = candidateStations.sort((a, b) => b.rankScore - a.rankScore);

    return {
      routeId: route.id,
      calculation,
      checkpointEstimates,
      recommendations,
    };
  }

  /**
   * Deterministically evaluates fuel metrics and station recommendations for multiple routes.
   * Tags the route with the lowest required fuel as `isMostFuelEfficient`.
   */
  async planMultiRouteFuel(
    routes: PlannedRoute[],
    input: FuelInput,
  ): Promise<Record<string, RouteFuelPlan>> {
    const plans: Record<string, RouteFuelPlan> = {};
    let minFuelRequired = Infinity;
    let mostEfficientRouteId: string | undefined;

    for (const r of routes) {
      const plan = await this.planRouteFuel(r, input);
      plans[r.id] = plan;

      if (
        plan.calculation.mileageKmPerLitre > 0 &&
        plan.calculation.fuelRequiredLitres < minFuelRequired
      ) {
        minFuelRequired = plan.calculation.fuelRequiredLitres;
        mostEfficientRouteId = r.id;
      }
    }

    if (mostEfficientRouteId && plans[mostEfficientRouteId]) {
      plans[mostEfficientRouteId]!.isMostFuelEfficient = true;
    }

    return plans;
  }

  /**
   * Deterministically scores a fuel station's suitability as a refuelling stop (0 to 100).
   */
  private calculateStationSuitabilityScore(params: {
    distFromStartKm: number;
    routeDistanceKm: number;
    usableRangeKm?: number;
    isReachableBeforeReserve: boolean;
    distanceFromRouteMeters: number;
    rating?: number;
    openNow?: boolean;
  }): number {
    const {
      distFromStartKm,
      usableRangeKm,
      isReachableBeforeReserve,
      distanceFromRouteMeters,
      rating,
      openNow,
    } = params;

    let score = 50;

    // 1. Reachability penalty if station is beyond rider's usable range
    if (!isReachableBeforeReserve) {
      score -= 40; // heavily de-prioritize unreachable stations
    } else if (usableRangeKm != null && usableRangeKm > 0) {
      // Sweet spot for refuelling is between 50% and 85% of usable range
      const ratio = distFromStartKm / usableRangeKm;
      if (ratio >= 0.5 && ratio <= 0.88) {
        score += 25; // ideal refuel window
      } else if (ratio < 0.3) {
        score += 5; // too early in the ride, but reachable
      }
    }

    // 2. Detour penalty (0 to -20)
    const detourPenalty = Math.min(20, (distanceFromRouteMeters / 5000) * 20);
    score -= detourPenalty;

    // 3. Rating boost (0 to +10)
    if (rating != null && rating > 0) {
      score += (rating / 5) * 10;
    }

    // 4. Open status (+10 if open, -15 if closed)
    if (openNow === true) {
      score += 10;
    } else if (openNow === false) {
      score -= 15;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }
}

export const fuelPlanningService = new FuelPlanningService();
