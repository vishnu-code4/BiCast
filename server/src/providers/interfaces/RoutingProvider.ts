// ============================================================
// Provider interfaces — RoutingProvider
// ============================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export type RoutePoint = LatLng;

export interface RouteStep {
  instruction: string;
  distanceMetres: number;
  durationSeconds: number;
  startLocation: LatLng;
  endLocation: LatLng;
}

export interface RouteLeg {
  distanceMetres: number;
  durationSeconds: number;
  startLocation: LatLng;
  endLocation: LatLng;
  steps: RouteStep[];
}

export interface RouteAlternative {
  id: string;
  name: string;
  distanceMetres: number;
  durationSeconds: number;
  polyline: Array<[number, number]>; // [lat, lng] pairs
  legs: RouteLeg[];
  steps: RouteStep[];
  summary?: string;
}

export type Route = RouteAlternative;

export interface RoutingRequest {
  origin: LatLng;
  destination: LatLng;
  intermediates?: LatLng[];
  alternatives?: boolean;
  mode?: 'motorcycle' | 'drive' | 'car' | 'bicycle';
}

export interface RoutingResponse {
  routes: RouteAlternative[];
  provider: string;
}

export interface RoutingProvider {
  readonly name: string;
  getRoutes(request: RoutingRequest): Promise<RoutingResponse>;
}
