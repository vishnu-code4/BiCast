// ============================================================
// BiCAST Client Places Types
// Normalized places, categories, and route corridor results
// ============================================================

export interface Place {
  placeId: string;
  name: string;
  category: string;
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

export interface RoutePlacesResult {
  routeId: string;
  category: string;
  categories: string[];
  radiusMeters: number;
  totalFound: number;
  places: Place[];
  groupedPlaces?: Record<string, Place[]>;
}
