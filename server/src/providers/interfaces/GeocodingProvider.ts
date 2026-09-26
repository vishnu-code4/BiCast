// ============================================================
// Provider interfaces — GeocodingProvider
// ============================================================

export interface GeocodeComponents {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
  locality?: string;
  sublocality?: string;
  junction?: string;
  intersection?: string;
  landmark?: string;
  road?: string;
  highway?: string;
  postalCode?: string;
}

export interface GeocodeResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types: string[];
  components?: GeocodeComponents;
}

export type GeocodedLocation = GeocodeResult;

export interface ReverseGeocodeResult {
  placeId?: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types: string[];
  components: GeocodeComponents;
}

export interface GeocodingProvider {
  readonly name: string;
  geocode(query: string): Promise<GeocodeResult[]>;
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
}
