// ============================================================
// Checkpoint Service
// Calculates time-based checkpoints along a route.
// Given a departure time + route polyline + total duration,
// evenly distributes checkpoints and calculates ETA for each.
// ============================================================
import { interpolatePolyline, haversineDistanceMetres } from '../utils/geoMath';
import { addSeconds } from '../utils/timeUtils';

export interface Checkpoint {
  index: number;
  name: string;
  lat: number;
  lng: number;
  distanceFromStartMetres: number;
  estimatedArrival: Date;
  fractionAlongRoute: number;
}

export interface CheckpointOptions {
  departureTime: Date;
  durationSeconds: number;
  distanceMetres: number;
  polyline: Array<[number, number]>; // [lat, lng]
  numCheckpoints?: number; // default: auto based on distance
}

/**
 * Generates evenly-spaced checkpoints along a route.
 * Each checkpoint has an estimated arrival time derived
 * from the fraction of total duration elapsed.
 */
export function generateCheckpoints(options: CheckpointOptions): Checkpoint[] {
  const {
    departureTime,
    durationSeconds,
    distanceMetres,
    polyline,
    numCheckpoints,
  } = options;

  if (polyline.length < 2) {
    throw new Error('Route polyline must have at least 2 points');
  }

  // Auto-calculate number of checkpoints: ~1 per 30 km, min 3, max 10
  const autoCount = Math.max(
    3,
    Math.min(10, Math.ceil(distanceMetres / 30_000)),
  );
  const count = numCheckpoints ?? autoCount;

  // We want count+2 points: start + intermediates + end
  const checkpoints: Checkpoint[] = [];

  // Origin
  const origin = polyline[0]!;
  checkpoints.push({
    index: 0,
    name: 'Start',
    lat: origin[0],
    lng: origin[1],
    distanceFromStartMetres: 0,
    estimatedArrival: departureTime,
    fractionAlongRoute: 0,
  });

  // Intermediate checkpoints
  for (let i = 1; i <= count; i++) {
    const fraction = i / (count + 1);
    const pos = interpolatePolyline(polyline, fraction);
    const eta = addSeconds(departureTime, fraction * durationSeconds);
    const distFromStart = fraction * distanceMetres;

    checkpoints.push({
      index: i,
      name: `Checkpoint ${i}`,
      lat: pos.lat,
      lng: pos.lng,
      distanceFromStartMetres: distFromStart,
      estimatedArrival: eta,
      fractionAlongRoute: fraction,
    });
  }

  // Destination
  const dest = polyline[polyline.length - 1]!;
  checkpoints.push({
    index: count + 1,
    name: 'Destination',
    lat: dest[0],
    lng: dest[1],
    distanceFromStartMetres: distanceMetres,
    estimatedArrival: addSeconds(departureTime, durationSeconds),
    fractionAlongRoute: 1,
  });

  return checkpoints;
}

/**
 * Verify that two sequential polyline points are at least
 * minDistanceMetres apart (for deduplication).
 */
export function deduplicateCheckpoints(
  checkpoints: Checkpoint[],
  minDistanceMetres: number = 5000,
): Checkpoint[] {
  if (checkpoints.length === 0) return [];
  const result: Checkpoint[] = [checkpoints[0]!];
  for (let i = 1; i < checkpoints.length; i++) {
    const prev = result[result.length - 1]!;
    const curr = checkpoints[i]!;
    const dist = haversineDistanceMetres(prev.lat, prev.lng, curr.lat, curr.lng);
    if (dist >= minDistanceMetres || i === checkpoints.length - 1) {
      result.push(curr);
    }
  }
  return result;
}
