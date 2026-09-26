// ============================================================
// Google Routes API Provider
// Uses Google Routes API (v2:computeRoutes)
// Supports motorcycle mode, intermediates, alternatives, legs & steps
// ============================================================
import axios, { AxiosError } from 'axios';
import {
  RoutingProvider,
  RoutingRequest,
  RoutingResponse,
  RouteAlternative,
  RouteLeg,
  RouteStep,
  LatLng,
} from '../interfaces/RoutingProvider';
import { logger } from '../../utils/logger';
import { decodePolyline } from '../../utils/geoMath';
import {
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  RouteNotFoundError,
  ProviderError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

interface GoogleLatLng {
  latitude: number;
  longitude: number;
}

interface GoogleStep {
  distanceMeters?: number;
  staticDuration?: string;
  startLocation?: { latLng?: GoogleLatLng };
  endLocation?: { latLng?: GoogleLatLng };
  navigationInstruction?: {
    instructions?: string;
    maneuver?: string;
  };
}

interface GoogleLeg {
  distanceMeters?: number;
  duration?: string;
  startLocation?: { latLng?: GoogleLatLng };
  endLocation?: { latLng?: GoogleLatLng };
  steps?: GoogleStep[];
}

interface GoogleRoute {
  description?: string;
  distanceMeters?: number;
  duration?: string; // e.g. "3600s"
  polyline?: {
    encodedPolyline?: string;
  };
  legs?: GoogleLeg[];
}

interface GoogleRoutesApiResponse {
  routes?: GoogleRoute[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(parseFloat(match[1])) : 0;
}

function toLatLng(googleLatLng?: GoogleLatLng, fallback: LatLng = { lat: 0, lng: 0 }): LatLng {
  if (!googleLatLng) return fallback;
  return {
    lat: googleLatLng.latitude,
    lng: googleLatLng.longitude,
  };
}

export class GoogleRoutesProvider implements RoutingProvider {
  readonly name = 'Google Routes';
  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ??
      process.env.GOOGLE_ROUTES_API_KEY ??
      process.env.GOOGLE_MAPS_API_KEY;
  }

  async getRoutes(request: RoutingRequest): Promise<RoutingResponse> {
    const { origin, destination, intermediates = [], alternatives = true, mode = 'motorcycle' } = request;

    // Validate inputs
    validateCoordinates(origin.lat, origin.lng, this.name);
    validateCoordinates(destination.lat, destination.lng, this.name);
    for (const stop of intermediates) {
      validateCoordinates(stop.lat, stop.lng, this.name);
    }

    if (!this.apiKey) {
      throw new ProviderAuthError(
        this.name,
        'Google Routes API key is missing. Please configure GOOGLE_ROUTES_API_KEY or GOOGLE_MAPS_API_KEY.',
      );
    }

    // Google Routes API supports TWO_WHEELER mode (ideal for motorcycle)
    const travelMode = mode === 'motorcycle' ? 'TWO_WHEELER' : 'DRIVE';

    const payload = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      intermediates: intermediates.map((item) => ({
        location: {
          latLng: { latitude: item.lat, longitude: item.lng },
        },
      })),
      travelMode,
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: alternatives,
    };

    const fieldMask = [
      'routes.duration',
      'routes.distanceMeters',
      'routes.description',
      'routes.polyline.encodedPolyline',
      'routes.legs',
    ].join(',');

    try {
      logger.debug(`Google Routes API request: (${origin.lat}, ${origin.lng}) -> (${destination.lat}, ${destination.lng})`);

      const response = await axios.post<GoogleRoutesApiResponse>(
        GOOGLE_ROUTES_ENDPOINT,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          timeout: 12_000,
        },
      );

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new RouteNotFoundError(this.name, 'No routes found for the given coordinates.');
      }

      const routes: RouteAlternative[] = response.data.routes.map((gRoute, idx) => {
        const polylineStr = gRoute.polyline?.encodedPolyline ?? '';
        const decodedCoords = polylineStr ? decodePolyline(polylineStr) : [];
        const durationSec = parseDurationSeconds(gRoute.duration);
        const distanceM = gRoute.distanceMeters ?? 0;

        const legs: RouteLeg[] = (gRoute.legs ?? []).map((leg) => {
          const legStart = toLatLng(leg.startLocation?.latLng, origin);
          const legEnd = toLatLng(leg.endLocation?.latLng, destination);

          const steps: RouteStep[] = (leg.steps ?? []).map((st) => ({
            instruction: st.navigationInstruction?.instructions ?? 'Continue',
            distanceMetres: st.distanceMeters ?? 0,
            durationSeconds: parseDurationSeconds(st.staticDuration),
            startLocation: toLatLng(st.startLocation?.latLng, legStart),
            endLocation: toLatLng(st.endLocation?.latLng, legEnd),
          }));

          return {
            distanceMetres: leg.distanceMeters ?? 0,
            durationSeconds: parseDurationSeconds(leg.duration),
            startLocation: legStart,
            endLocation: legEnd,
            steps,
          };
        });

        const allSteps = legs.flatMap((l) => l.steps);

        return {
          id: `google-route-${idx}`,
          name: gRoute.description || (idx === 0 ? 'Primary Route' : `Alternative ${idx}`),
          distanceMetres: distanceM,
          durationSeconds: durationSec,
          polyline: decodedCoords,
          legs,
          steps: allSteps,
          summary: gRoute.description,
        };
      });

      return {
        routes,
        provider: this.name,
      };
    } catch (err) {
      if (err instanceof ProviderError) {
        throw err;
      }

      const axiosErr = err as AxiosError<GoogleRoutesApiResponse>;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, 'Google Routes API request timed out');
      }

      const status = axiosErr.response?.status;
      if (status === 401 || status === 403) {
        throw new ProviderAuthError(this.name, 'Google Routes API authentication failed (invalid API key or billing disabled)');
      }
      if (status === 429) {
        throw new ProviderRateLimitError(this.name, 'Google Routes API rate limit exceeded');
      }

      const serverMsg = axiosErr.response?.data?.error?.message;
      throw new ProviderError(
        this.name,
        serverMsg ? `Google Routes error: ${serverMsg}` : (axiosErr.message || 'Routing request failed'),
        status ?? 502,
      );
    }
  }
}
