// ============================================================
// BiCAST Fuel Calculation Service
// Deterministic, explainable calculations for motorcycle fuel usage,
// cost, range, remaining fuel, and checkpoint progression.
// No AI / LLM is used.
// ============================================================
import { PlannedRoute } from '../types/routePlan';
import {
  FuelInput,
  FuelCalculation,
  FuelCheckpointEstimate,
} from '../types/fuel';
import { FUEL_CONFIG, evaluateFuelStatus } from '../config/fuelRules';

export class FuelCalculationService {
  /**
   * Calculates fuel metrics for a given route distance and user inputs.
   */
  calculateRouteFuel(
    route: PlannedRoute,
    input: FuelInput,
  ): FuelCalculation {
    const {
      mileageKmPerLitre,
      fuelPricePerLitre,
      currentFuelLitres,
      fuelTankCapacityLitres,
      reserveLitres = FUEL_CONFIG.DEFAULT_SAFETY_RESERVE_LITRES,
    } = input;

    const distanceKm = Number((route.distanceMeters / 1000).toFixed(1));

    // 1. If mileage is not provided or invalid
    if (!mileageKmPerLitre || mileageKmPerLitre <= 0) {
      return {
        routeId: route.id,
        distanceKm,
        mileageKmPerLitre: 0,
        fuelRequiredLitres: 0,
        status: 'UNKNOWN',
        statusMessage: 'Enter your motorcycle mileage to calculate fuel usage and range.',
      };
    }

    // 2. Fuel required in litres
    const rawRequired = distanceKm / mileageKmPerLitre;
    const fuelRequiredLitres = Number(rawRequired.toFixed(2));

    // 3. Estimated fuel cost (INR)
    let estimatedCost: number | undefined;
    if (fuelPricePerLitre != null && fuelPricePerLitre >= 0) {
      estimatedCost = Math.round(fuelRequiredLitres * fuelPricePerLitre);
    }

    // 4. Estimated range and usable range
    let estimatedRangeKm: number | undefined;
    let usableRangeKm: number | undefined;
    let estimatedRemainingFuelLitres: number | undefined;

    if (currentFuelLitres != null && currentFuelLitres >= 0) {
      // Total theoretical range until completely dry
      estimatedRangeKm = Math.round(currentFuelLitres * mileageKmPerLitre);

      // Usable range before hitting safety reserve
      const usableFuel = Math.max(0, currentFuelLitres - reserveLitres);
      usableRangeKm = Math.round(usableFuel * mileageKmPerLitre);

      // Remaining fuel on arrival (clamped to 0)
      const rawRemaining = currentFuelLitres - fuelRequiredLitres;
      estimatedRemainingFuelLitres = Math.max(0, Number(rawRemaining.toFixed(2)));
    }

    // 5. Evaluate fuel status level
    const { status, message } = evaluateFuelStatus({
      mileageKmPerLitre,
      routeDistanceKm: distanceKm,
      fuelRequiredLitres,
      currentFuelLitres,
      reserveLitres,
      usableRangeKm,
      estimatedRemainingFuelLitres,
    });

    return {
      routeId: route.id,
      distanceKm,
      mileageKmPerLitre,
      fuelRequiredLitres,
      fuelPricePerLitre,
      estimatedCost,
      currentFuelLitres,
      tankCapacityLitres: fuelTankCapacityLitres,
      reserveLitres,
      estimatedRemainingFuelLitres,
      estimatedRangeKm,
      usableRangeKm,
      status,
      statusMessage: message,
    };
  }

  /**
   * Calculates fuel consumption and remaining fuel for each smart checkpoint.
   */
  calculateCheckpointEstimates(
    route: PlannedRoute,
    input: FuelInput,
  ): FuelCheckpointEstimate[] {
    const { mileageKmPerLitre, currentFuelLitres } = input;
    if (!mileageKmPerLitre || mileageKmPerLitre <= 0) return [];

    return route.checkpoints.map((cp) => {
      const distKm = Number((cp.distanceFromStartMeters / 1000).toFixed(1));
      const fuelConsumed = Number((distKm / mileageKmPerLitre).toFixed(2));

      let remaining: number | undefined;
      if (currentFuelLitres != null) {
        remaining = Math.max(0, Number((currentFuelLitres - fuelConsumed).toFixed(2)));
      }

      return {
        checkpointId: cp.id,
        sequence: cp.sequence,
        name: cp.name,
        distanceFromStartKm: distKm,
        estimatedArrivalTime: cp.estimatedArrivalTime,
        estimatedFuelConsumedLitres: fuelConsumed,
        estimatedRemainingFuelLitres: remaining,
      };
    });
  }
}

export const fuelCalculationService = new FuelCalculationService();
