// ============================================================
// BiCAST Trip Persistence & History Types
// ============================================================
import { z } from 'zod';
import { RouteFuelPlan } from './fuel';
import { PlannedRoute } from './routePlan';
import { RouteWeatherTimeline } from './weatherTimeline';
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

  // Last calculated snapshot (decoupled from persistent configuration)
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

// Zod Validation Schemas
export const LocationInputSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  placeId: z.string().optional(),
});

export const TripStopInputSchema = z.object({
  id: z.string().optional(),
  sequence: z.number().int().nonnegative(),
  name: z.string().min(1, 'Stop name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  placeId: z.string().optional(),
  userDefined: z.boolean().default(true),
  source: z.enum(['manual', 'place']).default('manual'),
  estimatedArrival: z.string().optional(),
  distanceFromStart: z.number().optional(),
});

export const FuelConfigSchema = z.object({
  mileageKmPerLitre: z.number().nonnegative().optional(),
  fuelPricePerLitre: z.number().nonnegative().optional(),
  currentFuelLitres: z.number().nonnegative().optional(),
  fuelTankCapacityLitres: z.number().nonnegative().optional(),
  reserveLitres: z.number().nonnegative().optional(),
});

export const CreateTripSchema = z.object({
  name: z.string().optional(),
  startLocation: LocationInputSchema,
  destination: LocationInputSchema,
  stops: z.array(TripStopInputSchema).default([]),
  journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Journey date must be YYYY-MM-DD'),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/, 'Departure time must be HH:mm'),
  timezone: z.string().default('Asia/Kolkata'),
  fuelConfig: FuelConfigSchema.optional(),
  status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  // Optional initial calculated snapshot to avoid immediate recalculation on save
  initialSnapshot: z.object({
    selectedRouteId: z.string().optional(),
    route: z.any().optional(),
    alternatives: z.array(z.any()).optional(),
    weatherTimeline: z.any().optional(),
    riskAnalysis: z.any().optional(),
    fuelPlan: z.any().optional(),
  }).optional(),
});

export type CreateTripInput = z.infer<typeof CreateTripSchema>;

export const UpdateTripSchema = z.object({
  name: z.string().min(1).optional(),
  startLocation: LocationInputSchema.optional(),
  destination: LocationInputSchema.optional(),
  stops: z.array(TripStopInputSchema).optional(),
  journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Journey date must be YYYY-MM-DD').optional(),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/, 'Departure time must be HH:mm').optional(),
  timezone: z.string().optional(),
  fuelConfig: FuelConfigSchema.optional(),
  status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  selectedRouteId: z.string().optional(),
});

export type UpdateTripInput = z.infer<typeof UpdateTripSchema>;

export const TripQuerySchema = z.object({
  status: z.enum(['ALL', 'DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('ALL'),
  sort: z.enum(['newest', 'oldest', 'journeyDate']).default('newest'),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export type TripQueryOptions = z.infer<typeof TripQuerySchema>;
