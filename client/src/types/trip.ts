// ============================================================
// BiCAST Trip Persistence & History Types (Frontend)
// ============================================================
import { RouteFuelPlan } from './fuel';
import { PlannedRoute } from './route';
import { RouteWeatherTimeline } from './weather';
import { RouteRiskAnalysis } from './risk';

export type TripStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TripLocation {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface TripStopItem {
  id?: string;
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  userDefined?: boolean;
  source?: 'manual' | 'place';
  estimatedArrival?: string;
  distanceFromStart?: number;
}

export interface TripFuelConfig {
  mileageKmPerLitre?: number;
  fuelPricePerLitre?: number;
  currentFuelLitres?: number;
  fuelTankCapacityLitres?: number;
  reserveLitres?: number;
}

export interface TripSnapshotData {
  lastCalculatedAt?: string;
  selectedRouteId?: string;
  route?: PlannedRoute;
  alternatives?: PlannedRoute[];
  weatherTimeline?: RouteWeatherTimeline;
  riskAnalysis?: RouteRiskAnalysis;
  fuelPlan?: RouteFuelPlan;
}

export type FreshnessStatus = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNPROCESSED';

export interface TripFreshness {
  isFresh: boolean;
  status: FreshnessStatus;
  reason?: string;
  ageHours?: number;
}

export interface SavedTrip {
  id: string;
  userId?: string | null;
  name: string;
  status: TripStatus;

  // Persistent journey configuration
  startLocation: TripLocation;
  destination: TripLocation;
  stops: TripStopItem[];
  journeyDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  timezone: string;
  fuelConfig?: TripFuelConfig;

  // Last calculated snapshot
  lastCalculatedAt?: string | null;
  selectedRouteId?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  estimatedArrival?: string | null;
  routePolyline?: string | null;
  safetyScore?: number | null;
  riskLevel?: string | null;
  riskSummary?: string | null;

  // Detailed snapshot payloads
  snapshots?: TripSnapshotData;

  // Evaluated freshness metadata
  freshness?: TripFreshness;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface TripListItem {
  id: string;
  name: string;
  status: TripStatus;
  startLocation: TripLocation;
  destination: TripLocation;
  stopsCount: number;
  journeyDate: string;
  departureTime: string;
  timezone: string;
  distanceKm?: number;
  durationMinutes?: number;
  safetyScore?: number;
  riskLevel?: string;
  fuelRequiredLitres?: number;
  fuelEstimatedCost?: number;
  lastCalculatedAt?: string | null;
  freshness: TripFreshness;
  createdAt: string;
  updatedAt: string;
}

export interface TripHistoryStats {
  totalTrips: number;
  plannedTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalDistanceKm: number;
}

export interface CreateTripPayload {
  name?: string;
  startLocation: TripLocation;
  destination: TripLocation;
  stops: TripStopItem[];
  journeyDate: string;
  departureTime: string;
  timezone?: string;
  fuelConfig?: TripFuelConfig;
  status?: TripStatus;
  initialSnapshot?: {
    selectedRouteId?: string;
    route?: any;
    alternatives?: any[];
    weatherTimeline?: any;
    riskAnalysis?: any;
    fuelPlan?: any;
  };
}

export interface UpdateTripPayload {
  name?: string;
  startLocation?: TripLocation;
  destination?: TripLocation;
  stops?: TripStopItem[];
  journeyDate?: string;
  departureTime?: string;
  timezone?: string;
  fuelConfig?: TripFuelConfig;
  status?: TripStatus;
  selectedRouteId?: string;
}

export interface TripQueryParams {
  status?: 'ALL' | TripStatus;
  sort?: 'newest' | 'oldest' | 'journeyDate';
  search?: string;
  page?: number;
  limit?: number;
}
