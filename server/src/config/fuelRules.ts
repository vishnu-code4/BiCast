// ============================================================
// BiCAST Fuel Planning Configuration & Rules
// Centralized, configurable thresholds for motorcycle fuel planning
// ============================================================
import { FuelStatus } from '../types/fuel';

export const FUEL_CONFIG = {
  DEFAULT_FUEL_PRICE_INR: 103, // Reference petrol price in India (₹/L)
  DEFAULT_SAFETY_RESERVE_LITRES: 1.5, // Standard motorcycle reserve
  LOW_FUEL_BUFFER_LITRES: 0.5, // Buffer above reserve to trigger 'LOW' status
  DETOUR_SPEED_KMH: 40, // Assumed average speed for local road detours to fuel pumps
};

export interface FuelStatusEvaluationParams {
  mileageKmPerLitre?: number;
  routeDistanceKm: number;
  fuelRequiredLitres: number;
  currentFuelLitres?: number;
  reserveLitres?: number;
  usableRangeKm?: number;
  estimatedRemainingFuelLitres?: number;
}

/**
 * Deterministically evaluates fuel status level and user explanation message.
 * No AI / LLM is used.
 */
export function evaluateFuelStatus(params: FuelStatusEvaluationParams): {
  status: FuelStatus;
  message: string;
} {
  const {
    mileageKmPerLitre,
    routeDistanceKm,
    currentFuelLitres,
    reserveLitres = FUEL_CONFIG.DEFAULT_SAFETY_RESERVE_LITRES,
    usableRangeKm,
    estimatedRemainingFuelLitres,
  } = params;

  // 1. If mileage is missing or invalid
  if (!mileageKmPerLitre || mileageKmPerLitre <= 0) {
    return {
      status: 'UNKNOWN',
      message: 'Enter your motorcycle mileage to calculate fuel usage and range.',
    };
  }

  // 2. If current fuel is not provided, we know required fuel but not remaining fuel
  if (currentFuelLitres == null) {
    return {
      status: 'UNKNOWN',
      message: 'Enter current fuel level to check if refuelling will be required before destination.',
    };
  }

  // 3. If remaining fuel drops to 0 or below (run-out condition)
  if (estimatedRemainingFuelLitres != null && estimatedRemainingFuelLitres <= 0) {
    return {
      status: 'REFUEL_REQUIRED',
      message: `Refuelling required. Journey of ${routeDistanceKm.toFixed(1)} km exceeds total range.`,
    };
  }

  // 4. If usable range is less than route distance (reaches reserve before destination)
  if (usableRangeKm != null && usableRangeKm < routeDistanceKm) {
    return {
      status: 'REFUEL_RECOMMENDED',
      message: `Refuelling recommended. Projected arrival will reach your ${reserveLitres} L fuel reserve before destination.`,
    };
  }

  // 5. If remaining fuel is uncomfortably close to reserve (reserve + buffer)
  if (
    estimatedRemainingFuelLitres != null &&
    estimatedRemainingFuelLitres <= reserveLitres + FUEL_CONFIG.LOW_FUEL_BUFFER_LITRES
  ) {
    return {
      status: 'LOW',
      message: `Low fuel on arrival. Estimated arrival fuel (~${estimatedRemainingFuelLitres.toFixed(1)} L) is close to reserve.`,
    };
  }

  // 6. Otherwise sufficient fuel
  return {
    status: 'SUFFICIENT',
    message: `Sufficient fuel. Projected arrival fuel (~${estimatedRemainingFuelLitres?.toFixed(1)} L) is comfortably above reserve.`,
  };
}
