// ============================================================
// BiCAST Route Planning Engine
// Orchestrates multi-stop routing, travel-time checkpoints (15-30m),
// and accurate downstream ETA calculations across timezones
// ============================================================
import { routingProvider, geocodingProvider } from '../providers';
import {
  RoutePlanRequest,
  PlannedRoute,
  RouteLeg,
  TripStop,
  Checkpoint,
  LocationInput,
} from '../types/routePlan';
import {
  interpolatePolyline,
  haversineDistanceMetres,
} from '../utils/geoMath';
import { logger } from '../utils/logger';
import { validateCoordinates } from '../errors/ProviderErrors';
import { cacheService } from '../cache/CacheService';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// Timezone offset mapping (defaults to +05:30 for Asia/Kolkata)
const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Kolkata': '+05:30',
  'Asia/Calcutta': '+05:30',
  UTC: 'Z',
  'Europe/London': '+00:00',
  'America/New_York': '-05:00',
  'America/Los_Angeles': '-08:00',
  'Asia/Dubai': '+04:00',
  'Asia/Singapore': '+08:00',
  'Asia/Tokyo': '+09:00',
};

/**
 * Parses journey date and departure time into an ISO 8601 string and Date object
 * handling timezone offsets, midnight crossings, and multi-day journeys.
 */
export function parseDepartureDateTime(
  journeyDate: string,
  departureTime: string,
  timezone: string = DEFAULT_TIMEZONE,
): { date: Date; isoString: string } {
  const [hours, minutes] = departureTime.split(':').map((v) => parseInt(v, 10));
  const offset = TIMEZONE_OFFSETS[timezone] ?? '+05:30';

  // Construct ISO string with timezone offset e.g. "2026-09-15T06:30:00+05:30"
  const hh = String(hours ?? 0).padStart(2, '0');
  const mm = String(minutes ?? 0).padStart(2, '0');
  const offsetStr = offset === 'Z' ? 'Z' : offset;
  const isoWithOffset = `${journeyDate}T${hh}:${mm}:00${offsetStr}`;

  const date = new Date(isoWithOffset);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid journey date or departure time: date=${journeyDate}, time=${departureTime}`);
  }

  return { date, isoString: date.toISOString() };
}

/**
 * Adds seconds to an ISO timestamp and returns new ISO timestamp
 */
export function addSecondsToIso(iso: string, seconds: number): string {
  const d = new Date(iso);
  return new Date(d.getTime() + seconds * 1000).toISOString();
}

/**
 * Plans complete routes with legs, user stops, and smart travel-time checkpoints
 */
export async function planRoutes(request: RoutePlanRequest): Promise<PlannedRoute[]> {
  const {
    start,
    destination,
    stops = [],
    journeyDate,
    departureTime,
    timezone = DEFAULT_TIMEZONE,
    alternatives = true,
  } = request;

  // 1. Validate coordinates
  validateCoordinates(start.lat, start.lng, 'Route Engine (Start)');
  validateCoordinates(destination.lat, destination.lng, 'Route Engine (Destination)');
  for (let i = 0; i < stops.length; i++) {
    validateCoordinates(stops[i]!.lat, stops[i]!.lng, `Route Engine (Stop ${i + 1})`);
  }

  // 2. Parse departure time
  const { isoString: tripDepartureIso } = parseDepartureDateTime(
    journeyDate,
    departureTime,
    timezone,
  );

  logger.info(
    `Planning route: "${start.name}" -> "${destination.name}" with ${stops.length} stops at ${tripDepartureIso} (${timezone})`,
  );

  // 3. Query routing provider
  const intermediateCoords = stops.map((s) => ({ lat: s.lat, lng: s.lng }));
  const routingResponse = await routingProvider.getRoutes({
    origin: { lat: start.lat, lng: start.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    intermediates: intermediateCoords,
    alternatives,
    mode: 'motorcycle',
  });

  if (!routingResponse.routes || routingResponse.routes.length === 0) {
    throw new Error('No routes could be found for the specified locations.');
  }

  // 4. Transform each alternative route
  const waypoints: LocationInput[] = [start, ...stops, destination];
  const plannedRoutes: PlannedRoute[] = [];

  for (let rIdx = 0; rIdx < routingResponse.routes.length; rIdx++) {
    const rawRoute = routingResponse.routes[rIdx]!;
    const routeId = `route-${rIdx}`;

    // A. Construct legs (Start -> Stop 1 -> Stop 2 -> Destination)
    const legs: RouteLeg[] = [];
    let currentLegDepartureIso = tripDepartureIso;
    let cumulativeDistance = 0;

    for (let lIdx = 0; lIdx < waypoints.length - 1; lIdx++) {
      const legStart = waypoints[lIdx]!;
      const legEnd = waypoints[lIdx + 1]!;
      const rawLeg = rawRoute.legs[lIdx];

      const legDistance = rawLeg?.distanceMetres ?? Math.round(rawRoute.distanceMetres / (waypoints.length - 1));
      const legDuration = rawLeg?.durationSeconds ?? Math.round(rawRoute.durationSeconds / (waypoints.length - 1));
      const legArrivalIso = addSecondsToIso(currentLegDepartureIso, legDuration);

      // Extract geometry slice for this leg if possible, or fallback to polyline portion
      const legGeometry = rawRoute.polyline; // complete polyline for single leg or overall

      legs.push({
        id: `${routeId}-leg-${lIdx}`,
        startLocation: legStart,
        endLocation: legEnd,
        distanceMeters: legDistance,
        durationSeconds: legDuration,
        geometry: legGeometry,
        departureTime: currentLegDepartureIso,
        arrivalTime: legArrivalIso,
        steps: rawLeg?.steps ?? [],
      });

      currentLegDepartureIso = legArrivalIso;
      cumulativeDistance += legDistance;
    }

    const tripArrivalIso = legs.length > 0 ? legs[legs.length - 1]!.arrivalTime : tripDepartureIso;

    // B. Construct user-defined stops (TripStop[])
    const tripStops: TripStop[] = [];
    let stopCumDist = 0;
    for (let sIdx = 0; sIdx < stops.length; sIdx++) {
      const stop = stops[sIdx]!;
      const precedingLeg = legs[sIdx];
      stopCumDist += precedingLeg?.distanceMeters ?? 0;

      tripStops.push({
        id: `stop-${sIdx + 1}`,
        sequence: sIdx + 1,
        name: stop.name,
        latitude: stop.lat,
        longitude: stop.lng,
        placeId: stop.placeId,
        locationType: 'WAYPOINT',
        userDefined: true,
        estimatedArrival: precedingLeg?.arrivalTime,
        distanceFromStartMeters: stopCumDist,
      });
    }

    // C. Generate smart checkpoints (15–30 min travel time intervals)
    const checkpoints = await generateSmartCheckpoints({
      routeId,
      polyline: rawRoute.polyline,
      totalDurationSeconds: rawRoute.durationSeconds,
      totalDistanceMeters: rawRoute.distanceMetres,
      tripDepartureIso,
      userStops: tripStops,
    });

    plannedRoutes.push({
      id: routeId,
      name: rawRoute.name || (rIdx === 0 ? 'Primary Route' : `Alternative ${rIdx}`),
      distanceMeters: rawRoute.distanceMetres,
      durationSeconds: rawRoute.durationSeconds,
      geometry: rawRoute.polyline,
      legs,
      stops: tripStops,
      checkpoints,
      departureTime: tripDepartureIso,
      arrivalTime: tripArrivalIso,
      startLocation: request.start,
      destination: request.destination,
      summary: rawRoute.summary,
    });
  }

  // Cache planned routes for subsequent places queries (TTL: 2 hours)
  for (const r of plannedRoutes) {
    await cacheService.set(`route:${r.id}`, r, 7200);
  }

  return plannedRoutes;
}

/**
 * Retrieves a cached planned route by ID
 */
export async function getPlannedRouteById(routeId: string): Promise<PlannedRoute | null> {
  return cacheService.get<PlannedRoute>(`route:${routeId}`);
}

interface CheckpointGenerationParams {
  routeId: string;
  polyline: Array<[number, number]>;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  tripDepartureIso: string;
  userStops: TripStop[];
}

/**
 * Generates intelligent travel-time checkpoints spaced ~20–25 min apart (range: 15–30 min),
 * eliminates duplicates near user stops (< 2.5km), and reverse-geocodes final locations.
 */
async function generateSmartCheckpoints(params: CheckpointGenerationParams): Promise<Checkpoint[]> {
  const {
    routeId,
    polyline,
    totalDurationSeconds,
    totalDistanceMeters,
    tripDepartureIso,
    userStops,
  } = params;

  if (polyline.length < 2) return [];

  // Short routes: routes under 30 minutes (1800s) do not need intermediate checkpoints
  if (totalDurationSeconds < 1800) {
    logger.debug(`Route duration ${totalDurationSeconds}s < 30m; skipping intermediate checkpoints`);
    return [];
  }

  // Target interval: 22 minutes (1320s), clamped between 15m (900s) and 30m (1800s)
  const targetIntervalSeconds = 1320; // 22 min
  const rawNumCheckpoints = Math.floor(totalDurationSeconds / targetIntervalSeconds);
  // Cap at 20 checkpoints max for reasonable count on long cross-country rides
  const numCheckpoints = Math.max(1, Math.min(20, rawNumCheckpoints));

  const candidateTimes: number[] = [];
  for (let i = 1; i <= numCheckpoints; i++) {
    const elapsed = Math.round(i * (totalDurationSeconds / (numCheckpoints + 1)));
    // Avoid checkpoint if too close to destination (within 10 minutes)
    if (elapsed < totalDurationSeconds - 600) {
      candidateTimes.push(elapsed);
    }
  }

  // Generate candidate checkpoints
  interface RawCandidate {
    sequence: number;
    lat: number;
    lng: number;
    elapsedSeconds: number;
    distFromStart: number;
    isUserStopNearby: boolean;
  }

  const rawCandidates: RawCandidate[] = [];

  for (let i = 0; i < candidateTimes.length; i++) {
    const elapsedSeconds = candidateTimes[i]!;
    const fraction = elapsedSeconds / totalDurationSeconds;
    const pos = interpolatePolyline(polyline, fraction);
    const distFromStart = Math.round(fraction * totalDistanceMeters);

    // Proximity check with user stops (< 2.5 km)
    let isNearby = false;
    for (const stop of userStops) {
      const distToStop = haversineDistanceMetres(pos.lat, pos.lng, stop.latitude, stop.longitude);
      if (distToStop < 2500) {
        isNearby = true;
        break;
      }
    }

    rawCandidates.push({
      sequence: i + 1,
      lat: pos.lat,
      lng: pos.lng,
      elapsedSeconds,
      distFromStart,
      isUserStopNearby: isNearby,
    });
  }

  // Reverse-geocode final selected checkpoints to assign meaningful geographic names
  const checkpoints: Checkpoint[] = [];

  for (let idx = 0; idx < rawCandidates.length; idx++) {
    const cand = rawCandidates[idx]!;
    const nextCand = rawCandidates[idx + 1];
    const distToNext = nextCand
      ? nextCand.distFromStart - cand.distFromStart
      : totalDistanceMeters - cand.distFromStart;

    let meaningfulName = '';
    let locationType = 'WAYPOINT';

    try {
      const geoResult = await geocodingProvider.reverseGeocode(cand.lat, cand.lng);
      const comps = geoResult.components;

      // Meaningful order:
      // 1. Named junction/intersection
      // 2. Town/city
      // 3. Village
      // 4. Locality
      // 5. Landmark
      // 6. Road/highway
      if (comps.junction) {
        meaningfulName = comps.junction;
        locationType = 'JUNCTION';
      } else if (comps.town) {
        meaningfulName = comps.town;
        locationType = 'TOWN';
      } else if (comps.village) {
        meaningfulName = comps.village;
        locationType = 'VILLAGE';
      } else if (comps.locality) {
        meaningfulName = comps.locality;
        locationType = 'LOCALITY';
      } else if (comps.city) {
        meaningfulName = comps.city;
        locationType = 'CITY';
      } else if (comps.landmark) {
        meaningfulName = comps.landmark;
        locationType = 'LANDMARK';
      } else if (comps.road || comps.highway) {
        meaningfulName = `${comps.road || comps.highway} Corridor`;
        locationType = 'HIGHWAY';
      } else if (geoResult.name && !geoResult.name.includes('Location (')) {
        meaningfulName = geoResult.name;
        locationType = 'LOCALITY';
      } else {
        meaningfulName = `Route Waypoint km ${Math.round(cand.distFromStart / 1000)}`;
        locationType = 'WAYPOINT';
      }
    } catch (err) {
      logger.warn(`Reverse geocoding failed for checkpoint at (${cand.lat}, ${cand.lng}): ${err}`);
      meaningfulName = `Route Waypoint km ${Math.round(cand.distFromStart / 1000)}`;
    }

    checkpoints.push({
      id: `${routeId}-cp-${idx + 1}`,
      routeId,
      sequence: idx + 1,
      latitude: cand.lat,
      longitude: cand.lng,
      name: meaningfulName,
      locationType,
      distanceFromStartMeters: cand.distFromStart,
      distanceToNextMeters: distToNext,
      elapsedTravelTimeSeconds: cand.elapsedSeconds,
      estimatedArrivalTime: addSecondsToIso(tripDepartureIso, cand.elapsedSeconds),
      isUserStopNearby: cand.isUserStopNearby,
    });
  }

  return checkpoints;
}

/**
 * Fast client/server helper to recalculate downstream ETAs when only departure time changes
 * without re-fetching route polylines or calling routing APIs.
 */
export function recalculateRouteETAs(
  route: PlannedRoute,
  newJourneyDate: string,
  newDepartureTime: string,
  timezone: string = DEFAULT_TIMEZONE,
): PlannedRoute {
  const { isoString: newStartIso } = parseDepartureDateTime(
    newJourneyDate,
    newDepartureTime,
    timezone,
  );

  let currentLegDep = newStartIso;
  const updatedLegs: RouteLeg[] = route.legs.map((leg) => {
    const arr = addSecondsToIso(currentLegDep, leg.durationSeconds);
    const updated = {
      ...leg,
      departureTime: currentLegDep,
      arrivalTime: arr,
    };
    currentLegDep = arr;
    return updated;
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
    estimatedArrivalTime: addSecondsToIso(newStartIso, cp.elapsedTravelTimeSeconds),
  }));

  const updatedRoute: PlannedRoute = {
    ...route,
    departureTime: newStartIso,
    arrivalTime: updatedLegs.length > 0 ? updatedLegs[updatedLegs.length - 1]!.arrivalTime : newStartIso,
    legs: updatedLegs,
    stops: updatedStops,
    checkpoints: updatedCheckpoints,
  };

  // Update cached route
  cacheService.set(`route:${updatedRoute.id}`, updatedRoute, 7200).catch(() => {});

  return updatedRoute;
}

export const routePlanningService = {
  planRoutes,
  recalculateRouteETAs,
  getPlannedRouteById,
};
