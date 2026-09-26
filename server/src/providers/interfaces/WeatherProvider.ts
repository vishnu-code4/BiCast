// ============================================================
// Provider interfaces — WeatherProvider
// ============================================================

export interface WeatherDataPoint {
  /** The requested forecast datetime */
  forecastAt: Date;
  /** The actual matched hourly forecast datetime from provider */
  matchedForecastTime: Date;
  lat: number;
  lng: number;
  timezone: string;
  temperatureC: number;
  feelsLikeC: number;
  precipitationMm: number;
  precipitationProbPct: number;
  rainMm: number;
  showersMm?: number;
  snowfallCm?: number;
  windSpeedKmh: number;
  windGustsKmh?: number;
  windDirectionDeg: number;
  humidityPct: number;
  visibilityKm: number;
  weatherCode: number;
  weatherCondition: string;
  isThunderstorm: boolean;
  uvIndex?: number;
  cloudCoverPct?: number;
}

export type WeatherForecast = WeatherDataPoint;

export interface WeatherRequest {
  lat: number;
  lng: number;
  /** The exact datetime for which the forecast is needed */
  forecastAt: Date;
  /** Timezone for request/response (defaults to Asia/Kolkata) */
  timezone?: string;
}

export interface WeatherProvider {
  readonly name: string;
  getForecast(request: WeatherRequest): Promise<WeatherDataPoint>;
  getForecastBatch(requests: WeatherRequest[]): Promise<WeatherDataPoint[]>;
}
