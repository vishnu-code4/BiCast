// ============================================================
// BiCAST Frontend Route Planning Types
// ============================================================

export interface LocationInput {
  name: string;
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
  source?: 'geocoding' | 'place';
  category?: string;
}

export interface TripStop {
  id: string;
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  locationType: string;
  userDefined: true;
  source?: 'user' | 'place';
  category?: string;
  estimatedArrival?: string;
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
  estimatedArrivalTime: string;
  routeSegmentId?: string;
  isUserStopNearby: boolean;
}

export interface RouteLeg {
  id: string;
  startLocation: LocationInput;
  endLocation: LocationInput;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Array<[number, number]>;
  departureTime: string;
  arrivalTime: string;
  steps: Array<{
    instruction: string;
    distanceMetres: number;
    durationSeconds: number;
  }>;
}

export interface PlannedRoute {
  id: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: Array<[number, number]>;
  legs: RouteLeg[];
  stops: TripStop[];
  checkpoints: Checkpoint[];
  departureTime: string;
  arrivalTime: string;
  summary?: string;
}

export interface RoutePlanRequest {
  start: LocationInput;
  destination: LocationInput;
  stops?: LocationInput[];
  journeyDate: string;
  departureTime: string;
  timezone?: string;
  alternatives?: boolean;
}

export interface RoutePlanResponse {
  routes: PlannedRoute[];
}
