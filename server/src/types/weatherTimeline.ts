// ============================================================
// BiCAST Route Weather Engine Types & Timeline Models
// ============================================================

export type PointType = 'START' | 'CHECKPOINT' | 'STOP' | 'DESTINATION';

export interface RouteWeatherPoint {
  pointId: string;
  checkpointId?: string;
  routeId: string;
  pointType: PointType;
  sequence: number;
  latitude: number;
  longitude: number;
  locationName: string;
  /** Expected arrival time calculated by the route engine (ISO 8601 string) */
  estimatedArrivalTime: string;
  /** Exact hourly forecast timestamp matched by the weather provider (ISO 8601 string) */
  forecastTime: string;

  // Weather variables
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  thunderstorm: boolean;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  humidity: number;
  visibility: number; // in km
  weatherCode: number;
  weatherCondition: string;
}

export type RainExposureLevel = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export interface RouteWeatherSummary {
  minTemperature: number;
  maxTemperature: number;
  maxPrecipitationProbability: number;
  totalPrecipitationMm: number;
  maxWindSpeedKmh: number;
  maxWindGustsKmh: number;
  hasThunderstorm: boolean;
  hasRain: boolean;
  rainExposure: RainExposureLevel;
  weatherPointsCount: number;
}

export type ForecastAvailabilityStatus = 'available' | 'partially_available' | 'unavailable';

export interface RouteWeatherTimeline {
  routeId: string;
  generatedAt: string;
  status: ForecastAvailabilityStatus;
  statusMessage?: string;
  points: RouteWeatherPoint[];
  summary: RouteWeatherSummary;
}

export interface RouteWeatherRequest {
  route: import('./routePlan').PlannedRoute;
  timezone?: string;
}

export interface MultiRouteWeatherRequest {
  routes: import('./routePlan').PlannedRoute[];
  timezone?: string;
}
