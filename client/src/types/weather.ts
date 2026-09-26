// ============================================================
// BiCAST Frontend Route Weather Types
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
  /** Estimated arrival time (ISO 8601 string) */
  estimatedArrivalTime: string;
  /** Matched hourly forecast timestamp from Open-Meteo (ISO 8601 string) */
  forecastTime: string;

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
