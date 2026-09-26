// ============================================================
// Geocoding service — client-side
// ============================================================
import { apiClient } from './api';

export interface GeocodeResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface GeocodeResponse {
  results: GeocodeResult[];
  provider: string;
}

export async function geocodeSearch(query: string): Promise<GeocodeResponse> {
  return apiClient.get<GeocodeResponse>('/geocoding/search', {
    params: { q: query },
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<{
  formattedAddress: string;
  lat: number;
  lng: number;
}> {
  return apiClient.get('/geocoding/reverse', { params: { lat, lng } });
}
