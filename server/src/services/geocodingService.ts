// ============================================================
// Geocoding Service — wraps geocoding provider
// ============================================================
import { geocodingProvider } from '../providers';
import {
  GeocodeResult,
  ReverseGeocodeResult,
} from '../providers/interfaces/GeocodingProvider';
import { logger } from '../utils/logger';

export async function geocode(query: string): Promise<GeocodeResult[]> {
  logger.info(`Geocoding: "${query}"`);
  return geocodingProvider.geocode(query);
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  logger.info(`Reverse geocoding: (${lat}, ${lng})`);
  return geocodingProvider.reverseGeocode(lat, lng);
}
