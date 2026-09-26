// ============================================================
// Map types — client-side
// ============================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface RouteAlternative {
  id: string;
  name: string;
  distanceMetres: number;
  durationSeconds: number;
  polyline: Array<[number, number]>;
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distanceMetres: number;
  durationSeconds: number;
  startLocation: LatLng;
  endLocation: LatLng;
}
