// ============================================================
// Provider Registry — instantiates providers based on env config
// Decorates providers with automatic caching & safe credential management
// ============================================================
import {
  RoutingProvider,
  RoutingRequest,
  RoutingResponse,
} from './interfaces/RoutingProvider';
import {
  WeatherProvider,
  WeatherRequest,
  WeatherDataPoint,
} from './interfaces/WeatherProvider';
import {
  GeocodingProvider,
  GeocodeResult,
  ReverseGeocodeResult,
} from './interfaces/GeocodingProvider';
import {
  PlacesProvider,
  PlacesRequest,
  PlacesAlongRouteRequest,
  PlaceResult,
} from './interfaces/PlacesProvider';

import { OsrmRoutingProvider } from './routing/OsrmRoutingProvider';
import { GoogleRoutesProvider } from './routing/GoogleRoutesProvider';
import { OpenMeteoWeatherProvider } from './weather/OpenMeteoWeatherProvider';
import { NominatimGeocodingProvider } from './geocoding/NominatimGeocodingProvider';
import { GoogleGeocodingProvider } from './geocoding/GoogleGeocodingProvider';
import { OverpassPlacesProvider } from './places/OverpassPlacesProvider';
import { GooglePlacesProvider } from './places/GooglePlacesProvider';

import {
  cacheService,
  CACHE_TTL,
  makeRoutingKey,
  makeGeocodeKey,
  makeReverseGeocodeKey,
  makePlacesKey,
  makeWeatherKey,
} from '../cache/CacheService';
import { logger } from '../utils/logger';

// ------------------------------------------------------------
// Caching Decorators
// ------------------------------------------------------------

export class CachedRoutingProvider implements RoutingProvider {
  constructor(private readonly inner: RoutingProvider) {}

  get name(): string {
    return `${this.inner.name} (Cached)`;
  }

  async getRoutes(request: RoutingRequest): Promise<RoutingResponse> {
    const key = makeRoutingKey(
      request.origin.lat,
      request.origin.lng,
      request.destination.lat,
      request.destination.lng,
      request.intermediates,
      request.mode,
    );

    const cached = await cacheService.get<RoutingResponse>(key);
    if (cached) {
      logger.debug(`Cache hit for routing: ${key}`);
      return cached;
    }

    const res = await this.inner.getRoutes(request);
    await cacheService.set(key, res, CACHE_TTL.ROUTING);
    return res;
  }
}

export class CachedGeocodingProvider implements GeocodingProvider {
  constructor(private readonly inner: GeocodingProvider) {}

  get name(): string {
    return `${this.inner.name} (Cached)`;
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    const key = makeGeocodeKey(query);
    const cached = await cacheService.get<GeocodeResult[]>(key);
    if (cached) {
      logger.debug(`Cache hit for geocode: ${key}`);
      return cached;
    }

    const res = await this.inner.geocode(query);
    if (res.length > 0) {
      await cacheService.set(key, res, CACHE_TTL.GEOCODING);
    }
    return res;
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const key = makeReverseGeocodeKey(lat, lng);
    const cached = await cacheService.get<ReverseGeocodeResult>(key);
    if (cached) {
      logger.debug(`Cache hit for reverseGeocode: ${key}`);
      return cached;
    }

    const res = await this.inner.reverseGeocode(lat, lng);
    await cacheService.set(key, res, CACHE_TTL.GEOCODING);
    return res;
  }
}

export class CachedPlacesProvider implements PlacesProvider {
  constructor(private readonly inner: PlacesProvider) {}

  get name(): string {
    return `${this.inner.name} (Cached)`;
  }

  async searchNearby(request: PlacesRequest): Promise<PlaceResult[]> {
    const key = makePlacesKey(request.lat, request.lng, request.radiusMetres, request.categories);
    const cached = await cacheService.get<PlaceResult[]>(key);
    if (cached) {
      logger.debug(`Cache hit for places: ${key}`);
      return cached;
    }

    const res = await this.inner.searchNearby(request);
    await cacheService.set(key, res, CACHE_TTL.PLACES);
    return res;
  }

  async searchAlongRoute(request: PlacesAlongRouteRequest): Promise<PlaceResult[]> {
    if (this.inner.searchAlongRoute) {
      return this.inner.searchAlongRoute(request);
    }
    return [];
  }
}

export class CachedWeatherProvider implements WeatherProvider {
  constructor(private readonly inner: WeatherProvider) {}

  get name(): string {
    return `${this.inner.name} (Cached)`;
  }

  async getForecast(request: WeatherRequest): Promise<WeatherDataPoint> {
    const key = makeWeatherKey(request.lat, request.lng, request.forecastAt);
    const cached = await cacheService.get<WeatherDataPoint>(key);
    if (cached) {
      logger.debug(`Cache hit for weather: ${key}`);
      return cached;
    }

    const res = await this.inner.getForecast(request);
    await cacheService.set(key, res, CACHE_TTL.WEATHER);
    return res;
  }

  async getForecastBatch(requests: WeatherRequest[]): Promise<WeatherDataPoint[]> {
    const uncachedRequests: WeatherRequest[] = [];
    const results: WeatherDataPoint[] = new Array(requests.length);

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i]!;
      const key = makeWeatherKey(req.lat, req.lng, req.forecastAt);
      const cached = await cacheService.get<WeatherDataPoint>(key);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedRequests.push(req);
      }
    }

    if (uncachedRequests.length > 0) {
      const freshData = await this.inner.getForecastBatch(uncachedRequests);
      let freshIdx = 0;
      for (let i = 0; i < requests.length; i++) {
        if (!results[i]) {
          const freshItem = freshData[freshIdx++]!;
          results[i] = freshItem;
          const key = makeWeatherKey(freshItem.lat, freshItem.lng, freshItem.forecastAt);
          await cacheService.set(key, freshItem, CACHE_TTL.WEATHER);
        }
      }
    }

    return results;
  }
}

// ------------------------------------------------------------
// Factory Functions
// ------------------------------------------------------------

function createRoutingProvider(): RoutingProvider {
  const provider = (process.env.ROUTING_PROVIDER ?? 'osrm').toLowerCase();
  const googleKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  let rawProvider: RoutingProvider;
  if (provider === 'google') {
    if (googleKey) {
      logger.info('Using Google Routes provider');
      rawProvider = new GoogleRoutesProvider(googleKey);
    } else {
      logger.warn('ROUTING_PROVIDER is "google" but no Google API key configured, falling back to OSRM');
      rawProvider = new OsrmRoutingProvider();
    }
  } else {
    rawProvider = new OsrmRoutingProvider();
  }

  return new CachedRoutingProvider(rawProvider);
}

function createWeatherProvider(): WeatherProvider {
  const provider = (process.env.WEATHER_PROVIDER ?? 'openmeteo').toLowerCase();
  let rawProvider: WeatherProvider;

  switch (provider) {
    case 'openmeteo':
    default:
      rawProvider = new OpenMeteoWeatherProvider();
      break;
  }

  return new CachedWeatherProvider(rawProvider);
}

function createGeocodingProvider(): GeocodingProvider {
  const provider = (process.env.GEOCODING_PROVIDER ?? 'nominatim').toLowerCase();
  const googleKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  let rawProvider: GeocodingProvider;
  if (provider === 'google') {
    if (googleKey) {
      logger.info('Using Google Geocoding provider');
      rawProvider = new GoogleGeocodingProvider(googleKey);
    } else {
      logger.warn('GEOCODING_PROVIDER is "google" but no Google API key configured, falling back to Nominatim');
      rawProvider = new NominatimGeocodingProvider();
    }
  } else {
    rawProvider = new NominatimGeocodingProvider();
  }

  return new CachedGeocodingProvider(rawProvider);
}

function createPlacesProvider(): PlacesProvider {
  const provider = (process.env.PLACES_PROVIDER ?? 'overpass').toLowerCase();
  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  let rawProvider: PlacesProvider;
  if (provider === 'google') {
    if (googleKey) {
      logger.info('Using Google Places provider');
      rawProvider = new GooglePlacesProvider(googleKey);
    } else {
      logger.warn('PLACES_PROVIDER is "google" but no Google API key configured, falling back to Overpass');
      rawProvider = new OverpassPlacesProvider();
    }
  } else {
    rawProvider = new OverpassPlacesProvider();
  }

  return new CachedPlacesProvider(rawProvider);
}

// Export singleton instances
export const routingProvider: RoutingProvider = createRoutingProvider();
export const weatherProvider: WeatherProvider = createWeatherProvider();
export const geocodingProvider: GeocodingProvider = createGeocodingProvider();
export const placesProvider: PlacesProvider = createPlacesProvider();

// Export classes for testing or custom instantiation
export {
  GoogleRoutesProvider,
  OsrmRoutingProvider,
  GoogleGeocodingProvider,
  NominatimGeocodingProvider,
  GooglePlacesProvider,
  OverpassPlacesProvider,
  OpenMeteoWeatherProvider,
};
