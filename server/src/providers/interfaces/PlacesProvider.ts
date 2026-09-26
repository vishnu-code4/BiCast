// ============================================================
// Provider interfaces — PlacesProvider
// ============================================================

export type PlaceCategory =
  | 'fuel'
  | 'ev_charging'
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'hospital'
  | 'motorcycle_service'
  | 'tyre_repair'
  | 'atm'
  | 'restroom'
  | 'tourist_attraction'
  | 'parking'
  | 'rest_area'
  | 'pharmacy'
  | 'convenience_store';

export interface PlaceResult {
  placeId: string;
  name: string;
  category: PlaceCategory | string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  distanceMetres?: number;
  distanceFromRouteMetres?: number;
  isOpen?: boolean;
  openNow?: boolean;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  phone?: string;
  website?: string;
  types?: string[];
  categories?: string[];
  distanceFromRouteMeters?: number;
  distanceFromCurrentRoutePointMeters?: number;
  estimatedDetourMeters?: number;
  estimatedDetourSeconds?: number;
  rankScore?: number;
}

export interface Place {
  placeId: string;
  name: string;
  category: PlaceCategory | string;
  categories?: string[];
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  isOpen?: boolean;
  businessStatus?: string;
  distanceFromRouteMeters: number;
  distanceFromCurrentRoutePointMeters?: number;
  estimatedDetourMeters?: number;
  estimatedDetourSeconds?: number;
  rankScore?: number;
  phone?: string;
  website?: string;
  types?: string[];
}

export interface PlacesRequest {
  lat: number;
  lng: number;
  radiusMetres: number;
  categories: Array<PlaceCategory | string>;
  limit?: number;
}

export interface PlacesAlongRouteRequest {
  polyline: Array<[number, number]>;
  categories: Array<PlaceCategory | string>;
  maxDeviationMetres?: number;
  limit?: number;
}

export interface PlacesProvider {
  readonly name: string;
  searchNearby(request: PlacesRequest): Promise<PlaceResult[]>;
  searchAlongRoute?(request: PlacesAlongRouteRequest): Promise<PlaceResult[]>;
}
