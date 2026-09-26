// ============================================================
// OSRM Routing Provider
// Uses the public OSRM demo API (project-osrm.org)
// ============================================================
import axios, { AxiosError } from 'axios';
import {
  RoutingProvider,
  RoutingRequest,
  RoutingResponse,
  RouteAlternative,
  RouteLeg,
  RouteStep,
} from '../interfaces/RoutingProvider';
import { logger } from '../../utils/logger';
import {
  ProviderError,
  ProviderTimeoutError,
  RouteNotFoundError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

interface OsrmStep {
  maneuver: { location: [number, number] };
  distance: number;
  duration: number;
  name: string;
}

interface OsrmLeg {
  distance: number;
  duration: number;
  steps: OsrmStep[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: Array<[number, number]>; // [lng, lat]
    type: string;
  };
  legs: OsrmLeg[];
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = 'OSRM';
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org';
  }

  async getRoutes(request: RoutingRequest): Promise<RoutingResponse> {
    const { origin, destination, intermediates = [], alternatives = true } = request;

    validateCoordinates(origin.lat, origin.lng, this.name);
    validateCoordinates(destination.lat, destination.lng, this.name);
    for (const stop of intermediates) {
      validateCoordinates(stop.lat, stop.lng, this.name);
    }

    // Build coordinates sequence: origin;intermediates;destination (lng,lat)
    const points = [
      `${origin.lng},${origin.lat}`,
      ...intermediates.map((i) => `${i.lng},${i.lat}`),
      `${destination.lng},${destination.lat}`,
    ];
    const coords = points.join(';');
    const url = `${this.baseUrl}/route/v1/driving/${coords}`;

    logger.debug(`OSRM request: ${url}`);

    try {
      const response = await axios.get<OsrmResponse>(url, {
        params: {
          alternatives: alternatives ? 'true' : 'false',
          steps: 'true',
          geometries: 'geojson',
          overview: 'full',
        },
        timeout: 10_000,
      });

      if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
        throw new RouteNotFoundError(this.name, `OSRM could not find route (${response.data.code})`);
      }

      const routes: RouteAlternative[] = response.data.routes.map((route, idx) => {
        const polyline = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );

        const legs: RouteLeg[] = (route.legs ?? []).map((leg, legIdx) => {
          const steps: RouteStep[] = (leg.steps ?? []).map((step) => {
            const loc = { lat: step.maneuver.location[1], lng: step.maneuver.location[0] };
            return {
              instruction: step.name || 'Continue',
              distanceMetres: step.distance,
              durationSeconds: step.duration,
              startLocation: loc,
              endLocation: loc,
            };
          });

          const startPt = legIdx === 0 ? origin : (intermediates[legIdx - 1] ?? origin);
          const endPt =
            legIdx === route.legs.length - 1
              ? destination
              : (intermediates[legIdx] ?? destination);

          return {
            distanceMetres: leg.distance,
            durationSeconds: leg.duration,
            startLocation: startPt,
            endLocation: endPt,
            steps,
          };
        });

        const allSteps = legs.flatMap((l) => l.steps);

        return {
          id: `osrm-route-${idx}`,
          name: idx === 0 ? 'Fastest Route' : `Alternative ${idx}`,
          distanceMetres: route.distance,
          durationSeconds: route.duration,
          polyline,
          legs,
          steps: allSteps,
        };
      });

      return { routes, provider: this.name };
    } catch (err) {
      if (err instanceof ProviderError) {
        throw err;
      }
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, 'OSRM route calculation timed out');
      }
      throw new ProviderError(
        this.name,
        axiosErr.message || 'OSRM routing failed',
        axiosErr.response?.status ?? 502,
      );
    }
  }
}
