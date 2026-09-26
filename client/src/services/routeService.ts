// ============================================================
// BiCAST Route Client Service
// ============================================================
import { apiClient } from './api';
import {
  RoutePlanRequest,
  RoutePlanResponse,
  PlannedRoute,
  RouteLeg,
  TripStop,
  Checkpoint,
} from '@/types/route';

/**
 * Plans routes via BiCAST backend route engine
 */
export async function planRoute(request: RoutePlanRequest): Promise<PlannedRoute[]> {
  const response = await apiClient.post<RoutePlanResponse>('/routes/plan', request);
  return response.routes;
}

/**
 * Fast client-side recalculation of leg, stop, and checkpoint ETAs
 * when user changes departure date/time without modifying stops/geometry.
 */
export function recalculateRouteETAsLocally(
  route: PlannedRoute,
  journeyDate: string,
  departureTime: string,
  timezoneOffset: string = '+05:30',
): PlannedRoute {
  const [hh, mm] = departureTime.split(':').map((v) => parseInt(v, 10));
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoWithOffset = `${journeyDate}T${pad(hh ?? 0)}:${pad(mm ?? 0)}:00${timezoneOffset}`;
  const startDate = new Date(isoWithOffset);
  const startMs = startDate.getTime();

  let currentLegDepMs = startMs;
  const updatedLegs: RouteLeg[] = route.legs.map((leg) => {
    const legDepIso = new Date(currentLegDepMs).toISOString();
    const legArrMs = currentLegDepMs + leg.durationSeconds * 1000;
    const legArrIso = new Date(legArrMs).toISOString();
    currentLegDepMs = legArrMs;

    return {
      ...leg,
      departureTime: legDepIso,
      arrivalTime: legArrIso,
    };
  });

  const updatedStops: TripStop[] = route.stops.map((stop, sIdx) => {
    const precedingLeg = updatedLegs[sIdx];
    return {
      ...stop,
      estimatedArrival: precedingLeg?.arrivalTime,
    };
  });

  const updatedCheckpoints: Checkpoint[] = route.checkpoints.map((cp) => ({
    ...cp,
    estimatedArrivalTime: new Date(startMs + cp.elapsedTravelTimeSeconds * 1000).toISOString(),
  }));

  const tripArrivalIso =
    updatedLegs.length > 0
      ? updatedLegs[updatedLegs.length - 1]!.arrivalTime
      : new Date(startMs).toISOString();

  return {
    ...route,
    departureTime: new Date(startMs).toISOString(),
    arrivalTime: tripArrivalIso,
    legs: updatedLegs,
    stops: updatedStops,
    checkpoints: updatedCheckpoints,
  };
}
