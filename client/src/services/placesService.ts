// ============================================================
// BiCAST Places Service (Client)
// API client for discovering places along route corridors
// ============================================================
import axios from 'axios';
import { RoutePlacesResult } from '@/types/places';
import { PlannedRoute } from '@/types/route';

const API_BASE = '/api';

export interface FetchRoutePlacesParams {
  route: PlannedRoute;
  category?: string;
  categories?: string[];
  radiusMeters?: number;
  limit?: number;
}

/**
 * Fetches places along a selected route.
 * Tries the cached GET endpoint first, and automatically falls back to POST
 * if the route isn't cached on the server.
 */
export async function fetchPlacesAlongRoute(
  params: FetchRoutePlacesParams,
): Promise<RoutePlacesResult> {
  const { route, category = 'fuel', categories, radiusMeters, limit = 25 } = params;

  try {
    const queryParams = new URLSearchParams();
    if (category) queryParams.set('category', category);
    if (categories && categories.length > 0) queryParams.set('categories', categories.join(','));
    if (radiusMeters) queryParams.set('radius', radiusMeters.toString());
    if (limit) queryParams.set('limit', limit.toString());

    // Try fast cached GET endpoint
    const res = await axios.get<RoutePlacesResult>(
      `${API_BASE}/routes/${route.id}/places?${queryParams.toString()}`,
    );
    return res.data;
  } catch (err: any) {
    // If route was not found in server cache, use POST with route payload
    if (err?.response?.status === 404) {
      const res = await axios.post<RoutePlacesResult>(`${API_BASE}/places/along-route`, {
        route,
        category,
        categories,
        radius: radiusMeters,
        limit,
      });
      return res.data;
    }
    throw err;
  }
}

/**
 * Returns formatted distance from route string
 */
export function formatDistanceFromRoute(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m from route`;
  }
  return `${(meters / 1000).toFixed(1)} km from route`;
}

/**
 * Returns formatted detour duration string
 */
export function formatDetourTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'No detour';
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min detour';
  return `+${mins} min detour`;
}
