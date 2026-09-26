// ============================================================
// BiCAST Frontend Route Weather Service
// Communicates with the backend weather engine
// ============================================================
import { apiClient } from './api';
import { PlannedRoute } from '@/types/route';
import { RouteWeatherTimeline, RainExposureLevel } from '@/types/weather';

interface TimelineResponse {
  timeline: RouteWeatherTimeline;
}

interface MultiTimelineResponse {
  timelines: Record<string, RouteWeatherTimeline>;
}

/**
 * Fetches the time-accurate weather timeline for a single planned route
 */
export async function fetchRouteWeatherTimeline(
  route: PlannedRoute,
  timezone: string = 'Asia/Kolkata',
): Promise<RouteWeatherTimeline> {
  const response = await apiClient.post<TimelineResponse>('/weather/route-timeline', {
    route,
    timezone,
  });
  return response.timeline;
}

/**
 * Fetches independent weather timelines for multiple route alternatives
 */
export async function fetchMultiRouteWeatherTimelines(
  routes: PlannedRoute[],
  timezone: string = 'Asia/Kolkata',
): Promise<Record<string, RouteWeatherTimeline>> {
  const response = await apiClient.post<MultiTimelineResponse>('/weather/multi-route-timeline', {
    routes,
    timezone,
  });
  return response.timelines;
}

/**
 * Returns weather icon emoji / representation based on WMO code
 */
export function getWeatherEmoji(code: number, isThunderstorm: boolean): string {
  if (isThunderstorm || code === 95 || code === 96 || code === 99) return '⛈️';
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '🌨️';
  return '⛅';
}

/**
 * Returns badge styling for rain exposure
 */
export function getRainExposureBadge(level: RainExposureLevel): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (level) {
    case 'high':
    case 'severe':
      return {
        label: 'High Rain Risk',
        bgClass: 'bg-rose-500/15',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/30',
      };
    case 'moderate':
      return {
        label: 'Moderate Rain',
        bgClass: 'bg-amber-500/15',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/30',
      };
    case 'low':
      return {
        label: 'Low Rain Chance',
        bgClass: 'bg-emerald-500/15',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/30',
      };
    case 'none':
    default:
      return {
        label: 'Clear / Dry',
        bgClass: 'bg-cyan-500/15',
        textClass: 'text-cyan-400',
        borderClass: 'border-cyan-500/30',
      };
  }
}
