import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { OpenMeteoWeatherProvider } from '../providers/weather/OpenMeteoWeatherProvider';
import {
  ForecastUnavailableError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  InvalidCoordinatesError,
} from '../errors/ProviderErrors';

describe('OpenMeteoWeatherProvider', () => {
  const originalGet = axios.get;

  afterEach(() => {
    axios.get = originalGet;
  });

  it('should normalize Open-Meteo hourly response for target checkpoint ETA', async () => {
    axios.get = async () => ({
      data: {
        latitude: 12.97,
        longitude: 77.59,
        timezone: 'Asia/Kolkata',
        hourly: {
          time: [
            '2026-09-10T08:00:00Z',
            '2026-09-10T09:00:00Z',
            '2026-09-10T10:00:00Z',
            '2026-09-10T11:00:00Z',
          ],
          temperature_2m: [24.5, 26.2, 28.0, 29.1],
          apparent_temperature: [25.5, 27.8, 30.1, 31.5],
          precipitation_probability: [10, 45, 80, 85],
          precipitation: [0.0, 1.2, 8.5, 12.0],
          rain: [0.0, 1.2, 8.5, 12.0],
          wind_speed_10m: [12.0, 18.5, 28.4, 32.0],
          wind_direction_10m: [210, 220, 230, 240],
          relative_humidity_2m: [75, 70, 82, 88],
          visibility: [10000, 9000, 4000, 2500],
          weather_code: [1, 61, 95, 96], // 10:00 is 95 (Thunderstorm)
          uv_index: [3.2, 5.1, 4.0, 2.8],
          cloud_cover: [30, 60, 95, 100],
        },
      },
    }) as any;

    const provider = new OpenMeteoWeatherProvider();
    const weather = await provider.getForecast({
      lat: 12.9716,
      lng: 77.5946,
      forecastAt: new Date('2026-09-10T09:45:00.000Z'), // Closest to 10:00:00Z (index 2)
      timezone: 'Asia/Kolkata',
    });

    assert.equal(weather.lat, 12.9716);
    assert.equal(weather.lng, 77.5946);
    assert.equal(weather.timezone, 'Asia/Kolkata');
    assert.equal(weather.temperatureC, 28.0);
    assert.equal(weather.feelsLikeC, 30.1);
    assert.equal(weather.precipitationMm, 8.5);
    assert.equal(weather.precipitationProbPct, 80);
    assert.equal(weather.rainMm, 8.5);
    assert.equal(weather.windSpeedKmh, 28.4);
    assert.equal(weather.windDirectionDeg, 230);
    assert.equal(weather.humidityPct, 82);
    assert.equal(weather.visibilityKm, 4.0);
    assert.equal(weather.weatherCode, 95);
    assert.equal(weather.weatherCondition, 'Thunderstorm');
    assert.equal(weather.isThunderstorm, true); // Thunderstorm flag correctly set for 95
    assert.equal(weather.uvIndex, 4.0);
    assert.equal(weather.cloudCoverPct, 95);
  });

  it('should batch requests for checkpoints with same location into single call', async () => {
    let callCount = 0;
    axios.get = (async () => {
      callCount++;
      return {
        data: {
          latitude: 13.0,
          longitude: 77.5,
          timezone: 'Asia/Kolkata',
          hourly: {
            time: ['2026-09-10T06:00:00Z', '2026-09-10T07:00:00Z'],
            temperature_2m: [22.0, 24.0],
            apparent_temperature: [22.0, 24.0],
            precipitation_probability: [0, 5],
            precipitation: [0, 0],
            rain: [0, 0],
            wind_speed_10m: [10, 12],
            wind_direction_10m: [180, 190],
            relative_humidity_2m: [80, 75],
            visibility: [10000, 10000],
            weather_code: [0, 1],
          },
        },
      };
    }) as any;

    const provider = new OpenMeteoWeatherProvider();
    const batch = await provider.getForecastBatch([
      { lat: 13.0, lng: 77.5, forecastAt: new Date('2026-09-10T06:00:00Z') },
      { lat: 13.0, lng: 77.5, forecastAt: new Date('2026-09-10T07:00:00Z') },
    ]);

    assert.equal(callCount, 1);
    assert.equal(batch.length, 2);
    assert.equal(batch[0]!.temperatureC, 22.0);
    assert.equal(batch[1]!.temperatureC, 24.0);
  });

  it('should throw ForecastUnavailableError if forecast date is too far in future', async () => {
    const provider = new OpenMeteoWeatherProvider();
    const farFuture = new Date(Date.now() + 30 * 86_400_000); // 30 days ahead

    await assert.rejects(
      async () => {
        await provider.getForecast({
          lat: 12.9716,
          lng: 77.5946,
          forecastAt: farFuture,
        });
      },
      (err: any) => err instanceof ForecastUnavailableError,
    );
  });

  it('should throw ProviderRateLimitError on 429', async () => {
    axios.get = async () => {
      const err: any = new Error('Hourly limit reached');
      err.response = { status: 429 };
      throw err;
    };

    const provider = new OpenMeteoWeatherProvider();
    await assert.rejects(
      async () => {
        await provider.getForecast({
          lat: 12.9716,
          lng: 77.5946,
          forecastAt: new Date(),
        });
      },
      (err: any) => err instanceof ProviderRateLimitError,
    );
  });

  it('should throw ProviderTimeoutError on timeout', async () => {
    axios.get = async () => {
      const err: any = new Error('timeout of 10000ms exceeded');
      err.code = 'ECONNABORTED';
      throw err;
    };

    const provider = new OpenMeteoWeatherProvider();
    await assert.rejects(
      async () => {
        await provider.getForecast({
          lat: 12.9716,
          lng: 77.5946,
          forecastAt: new Date(),
        });
      },
      (err: any) => err instanceof ProviderTimeoutError,
    );
  });

  it('should validate coordinates', async () => {
    const provider = new OpenMeteoWeatherProvider();
    await assert.rejects(
      async () => {
        await provider.getForecast({
          lat: 12.9716,
          lng: 200, // Lng > 180
          forecastAt: new Date(),
        });
      },
      (err: any) => err instanceof InvalidCoordinatesError,
    );
  });
});
