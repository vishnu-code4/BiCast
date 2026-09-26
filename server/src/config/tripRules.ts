// ============================================================
// BiCAST Trip Freshness & Lifecycle Rules
// ============================================================
import { TripFreshness, TripStatus } from '../types/trip';

export const TRIP_RULES = {
  WEATHER_MAX_AGE_HOURS: 3, // Weather older than 3h is marked STALE
  ROUTE_MAX_AGE_DAYS: 7, // Route older than 7d is marked STALE
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  ALLOWED_STATUSES: ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TripStatus[],
} as const;

/**
 * Generates a clean, non-personal default trip name based on destination.
 * e.g., "Trip to Pondicherry", "Trip to Bangalore"
 */
export function generateDefaultTripName(destinationName: string): string {
  const clean = destinationName.split(',')[0]?.trim();
  return clean ? `Trip to ${clean}` : 'My Bike Trip';
}

/**
 * Evaluates the freshness of a saved trip's calculated snapshots.
 * Distinguishes persistent configuration from stale/expired weather and risk results.
 */
export function evaluateTripFreshness(trip: {
  journeyDate: string;
  departureTime: string;
  status: TripStatus;
  lastCalculatedAt?: string | null;
  snapshots?: any;
}): TripFreshness {
  // If no snapshot has ever been calculated
  if (!trip.lastCalculatedAt) {
    return {
      isFresh: false,
      status: 'UNPROCESSED',
      reason: 'Trip has not been calculated yet.',
    };
  }

  const now = new Date();
  const calculatedDate = new Date(trip.lastCalculatedAt);
  const diffMs = now.getTime() - calculatedDate.getTime();
  const ageHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));

  // If completed or cancelled, historical results are considered archival (fresh for records)
  if (trip.status === 'COMPLETED') {
    return {
      isFresh: true,
      status: 'FRESH',
      reason: 'Trip completed — historical record preserved.',
      ageHours,
    };
  }

  if (trip.status === 'CANCELLED') {
    return {
      isFresh: false,
      status: 'EXPIRED',
      reason: 'Trip was cancelled.',
      ageHours,
    };
  }

  // Check if departure time has passed
  try {
    const departureIso = `${trip.journeyDate}T${trip.departureTime}:00`;
    const departureDate = new Date(departureIso);
    if (!isNaN(departureDate.getTime()) && departureDate.getTime() < now.getTime()) {
      return {
        isFresh: false,
        status: 'EXPIRED',
        reason: 'Scheduled departure time has passed — update departure time to refresh forecast.',
        ageHours,
      };
    }
  } catch {
    // Ignore date parse issues
  }

  // Check weather staleness
  if (ageHours > TRIP_RULES.WEATHER_MAX_AGE_HOURS) {
    return {
      isFresh: false,
      status: 'STALE',
      reason: `Weather forecast is ${ageHours}h old (threshold: ${TRIP_RULES.WEATHER_MAX_AGE_HOURS}h) — recalculation recommended.`,
      ageHours,
    };
  }

  return {
    isFresh: true,
    status: 'FRESH',
    reason: 'Forecast and route metrics are up-to-date.',
    ageHours,
  };
}
