// ============================================================
// Weather Service — orchestrates weather lookups per checkpoint
// ============================================================
import { weatherProvider } from '../providers';
import { WeatherDataPoint } from '../providers/interfaces/WeatherProvider';
import { Checkpoint } from './checkpointService';
import { logger } from '../utils/logger';

export interface CheckpointWeather {
  checkpoint: Checkpoint;
  weather: WeatherDataPoint;
}

/**
 * Fetch weather for all checkpoints in batch.
 * Each checkpoint uses its estimatedArrival as the forecast target time.
 */
export async function fetchWeatherForCheckpoints(
  checkpoints: Checkpoint[],
): Promise<CheckpointWeather[]> {
  logger.info(`Fetching weather for ${checkpoints.length} checkpoints`);

  const requests = checkpoints.map((cp) => ({
    lat: cp.lat,
    lng: cp.lng,
    forecastAt: cp.estimatedArrival,
  }));

  const weatherData = await weatherProvider.getForecastBatch(requests);

  return checkpoints.map((cp, idx) => ({
    checkpoint: cp,
    weather: weatherData[idx]!,
  }));
}

/**
 * Analyze a weather data point for riding risk.
 * Returns a risk score 0–100 (lower = safer).
 */
export function calcWeatherRiskScore(weather: WeatherDataPoint): number {
  let score = 0;

  // Rain
  if (weather.precipitationProbPct > 70) score += 25;
  else if (weather.precipitationProbPct > 40) score += 12;

  if (weather.precipitationMm > 10) score += 25;
  else if (weather.precipitationMm > 2) score += 12;

  // Wind
  if (weather.windSpeedKmh > 60) score += 20;
  else if (weather.windSpeedKmh > 40) score += 10;
  else if (weather.windSpeedKmh > 25) score += 5;

  // Visibility
  if (weather.visibilityKm < 1) score += 25;
  else if (weather.visibilityKm < 5) score += 12;

  // Temperature extremes
  if (weather.feelsLikeC > 45) score += 10;
  else if (weather.feelsLikeC < 5) score += 10;

  // WMO code based
  const code = weather.weatherCode;
  if (code >= 95) score += 20; // thunderstorm
  else if (code >= 61) score += 10; // rain
  else if (code === 45 || code === 48) score += 15; // fog

  return Math.min(100, score);
}

/**
 * Convert a risk score to a risk level label.
 */
export function riskScoreToLevel(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
  if (score < 20) return 'LOW';
  if (score < 45) return 'MODERATE';
  if (score < 70) return 'HIGH';
  return 'EXTREME';
}
