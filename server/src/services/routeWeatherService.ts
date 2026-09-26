// ============================================================
// BiCAST Route Weather Service
// Evaluates weather along a motorcycle route based on BOTH
// geographic coordinates and expected arrival time (ETA).
// ============================================================
import { PlannedRoute } from '../types/routePlan';
import {
  RouteWeatherTimeline,
  RouteWeatherPoint,
  RouteWeatherSummary,
  RainExposureLevel,
  PointType,
} from '../types/weatherTimeline';
import { weatherProvider } from '../providers';
import { WeatherRequest, WeatherDataPoint } from '../providers/interfaces/WeatherProvider';
import { logger } from '../utils/logger';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const MAX_FUTURE_FORECAST_MS = 16 * 24 * 3600 * 1000; // 16 days

interface WeatherSampleTarget {
  pointId: string;
  pointType: PointType;
  sequence: number;
  latitude: number;
  longitude: number;
  locationName: string;
  estimatedArrivalTime: string; // ISO
}

/**
 * Builds the list of non-duplicated sampling locations along the route:
 * 1. Journey Start
 * 2. Intermediate User Stops
 * 3. Travel-time Checkpoints (filtering out ones near user stops to prevent duplicates)
 * 4. Destination
 */
function extractWeatherSampleTargets(route: PlannedRoute): WeatherSampleTarget[] {
  const targets: WeatherSampleTarget[] = [];
  let seq = 1;

  // 1. Start point
  if (route.startLocation) {
    targets.push({
      pointId: `${route.id}-start`,
      pointType: 'START',
      sequence: seq++,
      latitude: route.startLocation.lat,
      longitude: route.startLocation.lng,
      locationName: route.startLocation.name || 'Start Location',
      estimatedArrivalTime: route.departureTime,
    });
  }

  // Combine user stops and checkpoints sorted chronologically
  interface IntermediatePoint {
    id: string;
    type: PointType;
    lat: number;
    lng: number;
    name: string;
    eta: string;
    isDuplicate: boolean;
  }

  const intermediateList: IntermediatePoint[] = [];

  // 2. User-defined stops
  for (const stop of route.stops) {
    intermediateList.push({
      id: `${route.id}-stop-${stop.sequence}`,
      type: 'STOP',
      lat: stop.latitude,
      lng: stop.longitude,
      name: stop.name,
      eta: stop.estimatedArrival || route.departureTime,
      isDuplicate: false,
    });
  }

  // 3. Automatic Checkpoints (filter out if near user stop)
  for (const cp of route.checkpoints) {
    intermediateList.push({
      id: cp.id,
      type: 'CHECKPOINT',
      lat: cp.latitude,
      lng: cp.longitude,
      name: cp.name,
      eta: cp.estimatedArrivalTime,
      isDuplicate: cp.isUserStopNearby, // Skip duplicate weather request
    });
  }

  // Sort by ETA ascending
  intermediateList.sort(
    (a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime(),
  );

  for (const pt of intermediateList) {
    if (pt.isDuplicate) continue;
    targets.push({
      pointId: pt.id,
      pointType: pt.type,
      sequence: seq++,
      latitude: pt.lat,
      longitude: pt.lng,
      locationName: pt.name,
      estimatedArrivalTime: pt.eta,
    });
  }

  // 4. Destination
  if (route.destination) {
    targets.push({
      pointId: `${route.id}-dest`,
      pointType: 'DESTINATION',
      sequence: seq++,
      latitude: route.destination.lat,
      longitude: route.destination.lng,
      locationName: route.destination.name || 'Destination',
      estimatedArrivalTime: route.arrivalTime,
    });
  }

  return targets;
}

/**
 * Calculates factual weather exposure summary across all route points
 */
function computeWeatherSummary(points: RouteWeatherPoint[]): RouteWeatherSummary {
  if (points.length === 0) {
    return {
      minTemperature: 0,
      maxTemperature: 0,
      maxPrecipitationProbability: 0,
      totalPrecipitationMm: 0,
      maxWindSpeedKmh: 0,
      maxWindGustsKmh: 0,
      hasThunderstorm: false,
      hasRain: false,
      rainExposure: 'none',
      weatherPointsCount: 0,
    };
  }

  let minTemp = points[0]!.temperature;
  let maxTemp = points[0]!.temperature;
  let maxPrecipProb = 0;
  let totalPrecipMm = 0;
  let maxWind = 0;
  let maxGusts = 0;
  let hasThunderstorm = false;
  let hasRain = false;

  for (const p of points) {
    if (p.temperature < minTemp) minTemp = p.temperature;
    if (p.temperature > maxTemp) maxTemp = p.temperature;
    if (p.precipitationProbability > maxPrecipProb) maxPrecipProb = p.precipitationProbability;
    totalPrecipMm += p.precipitation;
    if (p.windSpeed > maxWind) maxWind = p.windSpeed;
    if (p.windGusts > maxGusts) maxGusts = p.windGusts;
    if (p.thunderstorm) hasThunderstorm = true;
    if (p.rain > 0 || p.showers > 0 || p.precipitationProbability >= 40) hasRain = true;
  }

  let rainExposure: RainExposureLevel = 'none';
  if (maxPrecipProb >= 70 || totalPrecipMm >= 10 || hasThunderstorm) {
    rainExposure = 'high';
  } else if (maxPrecipProb >= 40 || totalPrecipMm >= 2) {
    rainExposure = 'moderate';
  } else if (maxPrecipProb >= 15 || totalPrecipMm > 0) {
    rainExposure = 'low';
  }

  return {
    minTemperature: Math.round(minTemp * 10) / 10,
    maxTemperature: Math.round(maxTemp * 10) / 10,
    maxPrecipitationProbability: maxPrecipProb,
    totalPrecipitationMm: Math.round(totalPrecipMm * 10) / 10,
    maxWindSpeedKmh: Math.round(maxWind * 10) / 10,
    maxWindGustsKmh: Math.round(maxGusts * 10) / 10,
    hasThunderstorm,
    hasRain,
    rainExposure,
    weatherPointsCount: points.length,
  };
}

/**
 * Evaluates route weather for a single planned route
 */
export async function getRouteWeatherTimeline(
  route: PlannedRoute,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<RouteWeatherTimeline> {
  const generatedAt = new Date().toISOString();

  // Check if journey date is outside Open-Meteo range (> 16 days into future)
  const departureDate = new Date(route.departureTime);
  const now = Date.now();
  if (departureDate.getTime() - now > MAX_FUTURE_FORECAST_MS) {
    logger.info(`Route ${route.id} departure date is outside 16-day Open-Meteo forecast range`);
    return {
      routeId: route.id,
      generatedAt,
      status: 'unavailable',
      statusMessage:
        'Weather forecast is not available yet for this journey date (available up to 16 days ahead). Check again closer to departure.',
      points: [],
      summary: computeWeatherSummary([]),
    };
  }

  const targets = extractWeatherSampleTargets(route);
  if (targets.length === 0) {
    return {
      routeId: route.id,
      generatedAt,
      status: 'unavailable',
      statusMessage: 'No route sampling checkpoints available.',
      points: [],
      summary: computeWeatherSummary([]),
    };
  }

  const weatherRequests: WeatherRequest[] = targets.map((t) => ({
    lat: t.latitude,
    lng: t.longitude,
    forecastAt: new Date(t.estimatedArrivalTime),
    timezone,
  }));

  try {
    logger.info(
      `Fetching weather timeline for route "${route.name}" (${route.id}): ${targets.length} sampling points`,
    );

    const weatherResults: WeatherDataPoint[] = await weatherProvider.getForecastBatch(weatherRequests);

    const points: RouteWeatherPoint[] = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      const weather = weatherResults[i];

      if (!weather) continue;

      points.push({
        pointId: target.pointId,
        checkpointId: target.pointId,
        routeId: route.id,
        pointType: target.pointType,
        sequence: target.sequence,
        latitude: target.latitude,
        longitude: target.longitude,
        locationName: target.locationName,
        estimatedArrivalTime: target.estimatedArrivalTime,
        forecastTime: weather.matchedForecastTime
          ? weather.matchedForecastTime.toISOString()
          : weather.forecastAt.toISOString(),
        temperature: weather.temperatureC,
        apparentTemperature: weather.feelsLikeC,
        precipitationProbability: weather.precipitationProbPct,
        precipitation: weather.precipitationMm,
        rain: weather.rainMm,
        showers: weather.showersMm ?? 0,
        snowfall: weather.snowfallCm ?? 0,
        thunderstorm: weather.isThunderstorm,
        windSpeed: weather.windSpeedKmh,
        windGusts: weather.windGustsKmh ?? weather.windSpeedKmh,
        windDirection: weather.windDirectionDeg,
        humidity: weather.humidityPct,
        visibility: weather.visibilityKm,
        weatherCode: weather.weatherCode,
        weatherCondition: weather.weatherCondition,
      });
    }

    const isPartial = points.length < targets.length && points.length > 0;
    const status = points.length === 0 ? 'unavailable' : isPartial ? 'partially_available' : 'available';

    return {
      routeId: route.id,
      generatedAt,
      status,
      statusMessage: isPartial ? 'Some checkpoint forecasts could not be retrieved.' : undefined,
      points,
      summary: computeWeatherSummary(points),
    };
  } catch (err) {
    logger.error(`Failed to generate weather timeline for route ${route.id}: ${err}`);
    return {
      routeId: route.id,
      generatedAt,
      status: 'unavailable',
      statusMessage: 'Unable to retrieve weather forecast at this time.',
      points: [],
      summary: computeWeatherSummary([]),
    };
  }
}

/**
 * Evaluates independent weather timelines for multiple route alternatives
 */
export async function getMultiRouteWeatherTimelines(
  routes: PlannedRoute[],
  timezone: string = DEFAULT_TIMEZONE,
): Promise<Record<string, RouteWeatherTimeline>> {
  const result: Record<string, RouteWeatherTimeline> = {};

  // Process all route alternatives concurrently
  await Promise.all(
    routes.map(async (route) => {
      result[route.id] = await getRouteWeatherTimeline(route, timezone);
    }),
  );

  return result;
}

export const routeWeatherService = {
  getRouteWeatherTimeline,
  getMultiRouteWeatherTimelines,
};
