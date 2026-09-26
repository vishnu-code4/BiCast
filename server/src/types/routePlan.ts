// ============================================================
// BiCAST Route Planning Types & Models
// ============================================================
import { RouteStep } from '../providers/interfaces/RoutingProvider';

export interface LocationInput {
  name: string;
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
  source?: 'geocoding' | 'place';
  category?: string;
}

export interface RoutePlanRequest {
  start: LocationInput;
  destination: LocationInput;
  stops?: LocationInput[];
  journeyDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm (24hr)
  timezone?: string; // Default: Asia/Kolkata
  alternatives?: boolean;
}

export interface TripStop {
  id: string;
  sequence: number; // 1-indexed for intermediate stops
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  locationType: string;
  userDefined: true;
  source?: 'user' | 'place';
  category?: string;
  estimatedArrival?: string; // ISO 8601
  distanceFromStartMeters?: number;
}

export interface Checkpoint {
  id: string;
  routeId: string;
  sequence: number;
  latitude: number;
  longitude: number;
  name: string;
  locationType: string;
  distanceFromStartMeters: number;
  distanceToNextMeters: number;
  elapsedTravelTimeSeconds: number;
  estimatedArrivalTime: string; // ISO 8601
  routeSegmentId?: string;
  isUserStopNearby: boolean;
}

export interface RouteLeg {
  id: string;
  startLocation: LocationInput;
  endLocation: LocationInput;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Array<[number, number]>; // [lat, lng]
  departureTime: string; // ISO 8601
  arrivalTime: string; // ISO 8601
  steps: RouteStep[];
}

export interface PlannedRoute {
  id: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Array<[number, number]>; // [lat, lng]
  legs: RouteLeg[];
  stops: TripStop[];
  checkpoints: Checkpoint[];
  departureTime: string; // ISO 8601
  arrivalTime: string; // ISO 8601
  startLocation?: LocationInput;
  destination?: LocationInput;
  summary?: string;
}
