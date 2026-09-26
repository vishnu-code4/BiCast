// ============================================================
// Open-Meteo Weather Provider
// Free, high-resolution, no API key required. https://open-meteo.com/
// Fully timezone-aware (default: Asia/Kolkata)
// ============================================================
import axios, { AxiosError } from 'axios';
import {
  WeatherProvider,
  WeatherRequest,
  WeatherDataPoint,
} from '../interfaces/WeatherProvider';
import { logger } from '../../utils/logger';
import { toDateString } from '../../utils/timeUtils';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ForecastUnavailableError,
  validateCoordinates,
} from '../../errors/ProviderErrors';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// WMO weather code descriptions
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

interface OpenMeteoHourlyResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    apparent_temperature: (number | null)[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    rain: (number | null)[];
    showers?: (number | null)[];
    snowfall?: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    wind_direction_10m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    visibility: (number | null)[];
    weather_code: (number | null)[];
    uv_index?: (number | null)[];
    cloud_cover?: (number | null)[];
  };
}

/**
 * Finds the index in hourly.time closest to targetDate.
 * Open-Meteo returns time formatted in the requested timezone or ISO8601.
 */
function findClosestHourIndex(times: string[], targetDate: Date): number {
  const targetMs = targetDate.getTime();
  let bestIdx = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    // Parse time - if no offset, append Z or parse directly
    const tStr = times[i];
    const itemMs = new Date(tStr.endsWith('Z') ? tStr : `${tStr}Z`).getTime();
    const diff = Math.abs(itemMs - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly name = 'Open-Meteo';

  async getForecast(request: WeatherRequest): Promise<WeatherDataPoint> {
    const results = await this.getForecastBatch([request]);
    if (!results[0]) {
      throw new ForecastUnavailableError(
        this.name,
        `No weather forecast returned for coordinates (${request.lat}, ${request.lng}) at ${request.forecastAt.toISOString()}`,
      );
    }
    return results[0];
  }

  async getForecastBatch(requests: WeatherRequest[]): Promise<WeatherDataPoint[]> {
    if (requests.length === 0) return [];

    // Group by location & timezone to minimize API calls
    const locationMap = new Map<string, WeatherRequest[]>();
    for (const req of requests) {
      validateCoordinates(req.lat, req.lng, this.name);
      const tz = req.timezone || DEFAULT_TIMEZONE;
      const key = `${req.lat.toFixed(4)},${req.lng.toFixed(4)}@${tz}`;
      const group = locationMap.get(key) ?? [];
      group.push(req);
      locationMap.set(key, group);
    }

    const results: WeatherDataPoint[] = [];

    for (const [, group] of locationMap) {
      const { lat, lng } = group[0]!;
      const tz = group[0]!.timezone || DEFAULT_TIMEZONE;
      const dates = group.map((r) => r.forecastAt);
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      // Open-Meteo forecast is available for up to 16 days in the future and 7 days in the past
      const now = Date.now();
      const maxAllowedFuture = now + 16 * 86_400_000;
      const maxAllowedPast = now - 90 * 86_400_000;

      if (maxDate.getTime() > maxAllowedFuture || minDate.getTime() < maxAllowedPast) {
        throw new ForecastUnavailableError(
          this.name,
          `Requested forecast dates must be within Open-Meteo range (past 90 days to future 16 days)`,
        );
      }

      logger.debug(`Open-Meteo request for (${lat}, ${lng}) timezone=${tz}`);

      try {
        const response = await axios.get<OpenMeteoHourlyResponse>(BASE_URL, {
          params: {
            latitude: lat,
            longitude: lng,
            hourly: [
              'temperature_2m',
              'apparent_temperature',
              'precipitation_probability',
              'precipitation',
              'rain',
              'showers',
              'snowfall',
              'wind_speed_10m',
              'wind_gusts_10m',
              'wind_direction_10m',
              'relative_humidity_2m',
              'visibility',
              'weather_code',
              'uv_index',
              'cloud_cover',
            ].join(','),
            wind_speed_unit: 'kmh',
            timezone: 'UTC', // Keep response time in UTC for clean, unambiguous parsing
            start_date: toDateString(minDate),
            end_date: toDateString(new Date(maxDate.getTime() + 86_400_000)), // +1 day buffer
          },
          timeout: 10_000,
        });

        const { hourly, timezone } = response.data;
        if (!hourly || !hourly.time || hourly.time.length === 0) {
          throw new ForecastUnavailableError(
            this.name,
            `No hourly forecast data returned from Open-Meteo for (${lat}, ${lng})`,
          );
        }

        for (const req of group) {
          const idx = findClosestHourIndex(hourly.time, req.forecastAt);
          const rawCode = hourly.weather_code?.[idx];
          const code = typeof rawCode === 'number' ? rawCode : 0;
          const isThunderstorm = code === 95 || code === 96 || code === 99;

          const tStr = hourly.time[idx] ?? req.forecastAt.toISOString();
          const matchedForecastTime = new Date(tStr.endsWith('Z') ? tStr : `${tStr}Z`);

          const temp = hourly.temperature_2m?.[idx];
          const feelsLike = hourly.apparent_temperature?.[idx];
          const precip = hourly.precipitation?.[idx];
          const precipProb = hourly.precipitation_probability?.[idx];
          const rain = hourly.rain?.[idx];
          const showers = hourly.showers?.[idx];
          const snowfall = hourly.snowfall?.[idx];
          const windSpd = hourly.wind_speed_10m?.[idx];
          const windGusts = hourly.wind_gusts_10m?.[idx];
          const windDir = hourly.wind_direction_10m?.[idx];
          const humidity = hourly.relative_humidity_2m?.[idx];
          const visibility = hourly.visibility?.[idx];

          results.push({
            forecastAt: req.forecastAt,
            matchedForecastTime,
            lat,
            lng,
            timezone: req.timezone || timezone || DEFAULT_TIMEZONE,
            temperatureC: temp != null ? Number(temp) : 0,
            feelsLikeC: feelsLike != null ? Number(feelsLike) : (temp != null ? Number(temp) : 0),
            precipitationMm: precip != null ? Number(precip) : 0,
            precipitationProbPct: precipProb != null ? Number(precipProb) : 0,
            rainMm: rain != null ? Number(rain) : 0,
            showersMm: showers != null ? Number(showers) : 0,
            snowfallCm: snowfall != null ? Number(snowfall) : 0,
            windSpeedKmh: windSpd != null ? Number(windSpd) : 0,
            windGustsKmh: windGusts != null ? Number(windGusts) : (windSpd != null ? Number(windSpd) : 0),
            windDirectionDeg: windDir != null ? Number(windDir) : 0,
            humidityPct: humidity != null ? Number(humidity) : 0,
            visibilityKm: visibility != null ? Number(visibility) / 1000 : 10,
            weatherCode: code,
            weatherCondition: WMO_DESCRIPTIONS[code] ?? 'Unknown',
            isThunderstorm,
            uvIndex: hourly.uv_index?.[idx] != null ? Number(hourly.uv_index[idx]) : undefined,
            cloudCoverPct: hourly.cloud_cover?.[idx] != null ? Number(hourly.cloud_cover[idx]) : undefined,
          });
        }
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        const axiosErr = err as AxiosError;
        if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
          throw new ProviderTimeoutError(this.name, 'Open-Meteo forecast request timed out');
        }
        if (axiosErr.response?.status === 429) {
          throw new ProviderRateLimitError(this.name, 'Open-Meteo API hourly rate limit exceeded');
        }
        throw new ProviderError(
          this.name,
          axiosErr.message || 'Open-Meteo request failed',
          axiosErr.response?.status ?? 502,
        );
      }
    }

    return results;
  }
}
