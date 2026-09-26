// ============================================================
// BiCAST Client Fuel Planning Types
// ============================================================

export type FuelStatus =
  | 'SUFFICIENT'
  | 'LOW'
  | 'REFUEL_RECOMMENDED'
  | 'REFUEL_REQUIRED'
  | 'UNKNOWN';

export interface FuelInput {
  mileageKmPerLitre: number;
  fuelPricePerLitre?: number;
  currentFuelLitres?: number;
  fuelTankCapacityLitres?: number;
  reserveLitres?: number;
}

export interface FuelCalculation {
  routeId: string;
  distanceKm: number;
  mileageKmPerLitre: number;
  fuelRequiredLitres: number;
  fuelPricePerLitre?: number;
  estimatedCost?: number;
  currentFuelLitres?: number;
  tankCapacityLitres?: number;
  reserveLitres?: number;
  estimatedRemainingFuelLitres?: number;
  estimatedRangeKm?: number;
  usableRangeKm?: number;
  status: FuelStatus;
  statusMessage: string;
}

export interface FuelCheckpointEstimate {
  checkpointId: string;
  sequence: number;
  name: string;
  distanceFromStartKm: number;
  estimatedArrivalTime: string;
  estimatedFuelConsumedLitres: number;
  estimatedRemainingFuelLitres?: number;
}

export interface FuelStationRecommendation {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  distanceFromRouteMeters: number;
  distanceFromStartKm: number;
  estimatedArrivalTime: string;
  remainingFuelLitresAtStation?: number;
  isReachableBeforeReserve: boolean;
  estimatedDetourMeters?: number;
  estimatedDetourSeconds?: number;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  rankScore: number;
}

export interface RouteFuelPlan {
  routeId: string;
  calculation: FuelCalculation;
  checkpointEstimates: FuelCheckpointEstimate[];
  recommendations: FuelStationRecommendation[];
  isMostFuelEfficient?: boolean;
}
