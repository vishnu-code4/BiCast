// ============================================================
// BiCAST Route Weather Engine Tests
// Verifies ETA-based hourly forecast matching, multi-route isolation,
// duplicate suppression, out-of-range dates, and summary computations.
// ============================================================
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import {
  getRouteWeatherTimeline,
  getMultiRouteWeatherTimelines,
} from '../services/routeWeatherService';
import { PlannedRoute } from '../types/routePlan';
import { cacheService } from '../cache/CacheService';

describe('Route Weather Engine', () => {
  const originalGet = axios.get;

  beforeEach(async () => {
    await cacheService.clear();
  });

  afterEach(() => {
    axios.get = originalGet;
  });

  // Base mock route for testing
  const mockRouteA: PlannedRoute = {
    id: 'route-a',
    name: 'Chennai to Kumbakonam via Tindivanam',
    distanceMeters: 280000,
    durationSeconds: 18000, // 5 hours
    geometry: [
      [13.0827, 80.2707],
      [12.2286, 79.6508],
      [11.9416, 79.8083],
      [10.9602, 79.3845],
    ],
    startLocation: { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    destination: { name: 'Kumbakonam', lat: 10.9602, lng: 79.3845 },
    departureTime: '2026-09-12T01:00:00.000Z', // 06:30 IST
    arrivalTime: '2026-09-12T06:00:00.000Z', // 11:30 IST
    legs: [
      {
        id: 'leg-1',
        startLocation: { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
        endLocation: { name: 'Tindivanam', lat: 12.2286, lng: 79.6508 },
        distanceMeters: 130000,
        durationSeconds: 7200,
        geometry: [[13.0827, 80.2707], [12.2286, 79.6508]],
        departureTime: '2026-09-12T01:00:00.000Z',
        arrivalTime: '2026-09-12T03:00:00.000Z',
        steps: [],
      },
      {
        id: 'leg-2',
        startLocation: { name: 'Tindivanam', lat: 12.2286, lng: 79.6508 },
        endLocation: { name: 'Kumbakonam', lat: 10.9602, lng: 79.3845 },
        distanceMeters: 150000,
        durationSeconds: 10800,
        geometry: [[12.2286, 79.6508], [10.9602, 79.3845]],
        departureTime: '2026-09-12T03:00:00.000Z',
        arrivalTime: '2026-09-12T06:00:00.000Z',
        steps: [],
      },
    ],
    stops: [
      {
        id: 'stop-1',
        sequence: 1,
        name: 'Tindivanam Halt',
        latitude: 12.2286,
        longitude: 79.6508,
        locationType: 'TOWN',
        userDefined: true,
        estimatedArrival: '2026-09-12T03:00:00.000Z', // 08:30 IST
        distanceFromStartMeters: 130000,
      },
    ],
    checkpoints: [
      {
        id: 'cp-1',
        routeId: 'route-a',
        sequence: 1,
        latitude: 12.75,
        longitude: 79.98,
        name: 'Chengalpattu Junction',
        locationType: 'JUNCTION',
        distanceFromStartMeters: 60000,
        distanceToNextMeters: 70000,
        elapsedTravelTimeSeconds: 3300, // 55 mins -> 01:55Z (07:25 IST)
        estimatedArrivalTime: '2026-09-12T01:55:00.000Z',
        isUserStopNearby: false,
      },
      {
        id: 'cp-2',
        routeId: 'route-a',
        sequence: 2,
        latitude: 12.23,
        longitude: 79.65,
        name: 'Tindivanam Bypass',
        locationType: 'HIGHWAY',
        distanceFromStartMeters: 131000,
        distanceToNextMeters: 50000,
        elapsedTravelTimeSeconds: 7300,
        estimatedArrivalTime: '2026-09-12T03:02:00.000Z',
        isUserStopNearby: true, // Near stop-1! Must be skipped to avoid duplicate weather
      },
      {
        id: 'cp-3',
        routeId: 'route-a',
        sequence: 3,
        latitude: 11.55,
        longitude: 79.52,
        name: 'Neyveli Township',
        locationType: 'TOWN',
        distanceFromStartMeters: 200000,
        distanceToNextMeters: 80000,
        elapsedTravelTimeSeconds: 12600, // 3h 30m -> 04:30Z (10:00 IST)
        estimatedArrivalTime: '2026-09-12T04:30:00.000Z',
        isUserStopNearby: false,
      },
    ],
  };

  it('should match checkpoint ETA to the closest hourly forecast in local timezone', async () => {
    // Setup mock Open-Meteo response returning hourly data
    axios.get = async (_url: any, config: any) => {
      const lat = config?.params?.latitude;
      return {
        data: {
          latitude: lat,
          longitude: config?.params?.longitude,
          timezone: 'UTC',
          hourly: {
            time: [
              '2026-09-12T01:00:00Z',
              '2026-09-12T02:00:00Z',
              '2026-09-12T03:00:00Z',
              '2026-09-12T04:00:00Z',
              '2026-09-12T05:00:00Z',
              '2026-09-12T06:00:00Z',
            ],
            temperature_2m: [25.0, 27.5, 29.0, 31.0, 32.5, 33.0],
            apparent_temperature: [26.0, 28.5, 31.0, 33.5, 35.0, 36.0],
            precipitation_probability: [10, 15, 60, 40, 20, 10],
            precipitation: [0.0, 0.0, 3.5, 1.2, 0.0, 0.0],
            rain: [0.0, 0.0, 3.5, 1.2, 0.0, 0.0],
            showers: [0.0, 0.0, 0.5, 0.0, 0.0, 0.0],
            snowfall: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            wind_speed_10m: [12.0, 14.0, 22.0, 18.0, 15.0, 16.0],
            wind_gusts_10m: [18.0, 20.0, 32.0, 25.0, 22.0, 24.0],
            wind_direction_10m: [180, 190, 210, 220, 230, 240],
            relative_humidity_2m: [80, 75, 78, 65, 60, 58],
            visibility: [10000, 9000, 6000, 8000, 10000, 10000],
            weather_code: [1, 2, 63, 61, 2, 1], // 03:00 is 63 (Moderate rain)
          },
        },
      } as any;
    };

    const timeline = await getRouteWeatherTimeline(mockRouteA);

    assert.equal(timeline.routeId, 'route-a');
    assert.equal(timeline.status, 'available');
    // Start, cp-1, stop-1, cp-3, Dest = 5 points (cp-2 is skipped because isUserStopNearby=true)
    assert.equal(timeline.points.length, 5);

    // 1. Verify Start point (departure time 01:00Z -> matches 01:00Z)
    const startPoint = timeline.points[0]!;
    assert.equal(startPoint.pointType, 'START');
    assert.equal(startPoint.locationName, 'Chennai');
    assert.equal(startPoint.estimatedArrivalTime, '2026-09-12T01:00:00.000Z');
    assert.equal(new Date(startPoint.forecastTime).toISOString(), '2026-09-12T01:00:00.000Z');
    assert.equal(startPoint.temperature, 25.0);

    // 2. Verify Checkpoint 1 (ETA 01:55Z -> closest to 02:00Z)
    const cp1Point = timeline.points.find((p) => p.pointId === 'cp-1');
    assert.ok(cp1Point);
    assert.equal(cp1Point.pointType, 'CHECKPOINT');
    assert.equal(cp1Point.estimatedArrivalTime, '2026-09-12T01:55:00.000Z');
    // Closest hour to 01:55 is 02:00:00Z
    assert.equal(new Date(cp1Point.forecastTime).toISOString(), '2026-09-12T02:00:00.000Z');
    assert.equal(cp1Point.temperature, 27.5);

    // 3. Verify User Stop (ETA 03:00Z -> matches 03:00Z)
    const stopPoint = timeline.points.find((p) => p.pointType === 'STOP');
    assert.ok(stopPoint);
    assert.equal(stopPoint.locationName, 'Tindivanam Halt');
    assert.equal(new Date(stopPoint.forecastTime).toISOString(), '2026-09-12T03:00:00.000Z');
    assert.equal(stopPoint.precipitationProbability, 60);
    assert.equal(stopPoint.rain, 3.5);

    // 4. Verify Destination point (ETA 06:00Z -> matches 06:00Z)
    const destPoint = timeline.points[timeline.points.length - 1]!;
    assert.equal(destPoint.pointType, 'DESTINATION');
    assert.equal(destPoint.locationName, 'Kumbakonam');
    assert.equal(destPoint.estimatedArrivalTime, '2026-09-12T06:00:00.000Z');
    assert.equal(new Date(destPoint.forecastTime).toISOString(), '2026-09-12T06:00:00.000Z');
    assert.equal(destPoint.temperature, 33.0);

    // 5. Verify Summary calculation
    assert.equal(timeline.summary.minTemperature, 25.0);
    assert.equal(timeline.summary.maxTemperature, 33.0);
    assert.equal(timeline.summary.maxPrecipitationProbability, 60);
    assert.equal(timeline.summary.hasRain, true);
    assert.equal(timeline.summary.rainExposure, 'moderate');
  });

  it('should avoid duplicate weather requests when checkpoint is near a user stop', async () => {
    let requestCount = 0;
    axios.get = async () => {
      requestCount++;
      return {
        data: {
          latitude: 12.0,
          longitude: 79.0,
          timezone: 'UTC',
          hourly: {
            time: ['2026-09-12T03:00:00Z'],
            temperature_2m: [30.0],
            apparent_temperature: [32.0],
            precipitation_probability: [10],
            precipitation: [0.0],
            rain: [0.0],
            wind_speed_10m: [15.0],
            wind_direction_10m: [180],
            relative_humidity_2m: [70],
            visibility: [10000],
            weather_code: [1],
          },
        },
      } as any;
    };

    const timeline = await getRouteWeatherTimeline(mockRouteA);

    // Checkpoint 'cp-2' has isUserStopNearby: true, so it must NOT appear in timeline.points
    const cp2 = timeline.points.find((p) => p.pointId === 'cp-2');
    assert.equal(cp2, undefined);

    // User stop 'stop-1' DOES appear
    const stop1 = timeline.points.find((p) => p.pointType === 'STOP');
    assert.ok(stop1);
  });

  it('should evaluate independent weather timelines for multiple route alternatives', async () => {
    const mockRouteB: PlannedRoute = {
      ...mockRouteA,
      id: 'route-b',
      name: 'ECR Coastal Route',
      distanceMeters: 310000,
      durationSeconds: 21600,
      // Different coastal checkpoints
      checkpoints: [
        {
          id: 'cp-ecr-1',
          routeId: 'route-b',
          sequence: 1,
          latitude: 12.62,
          longitude: 80.19, // Mahabalipuram
          name: 'Mahabalipuram Coast',
          locationType: 'TOWN',
          distanceFromStartMeters: 55000,
          distanceToNextMeters: 65000,
          elapsedTravelTimeSeconds: 3600,
          estimatedArrivalTime: '2026-09-12T02:00:00.000Z',
          isUserStopNearby: false,
        },
      ],
      stops: [],
    };

    axios.get = async (_url: any, config: any) => {
      const lat = config?.params?.latitude;
      // Return coastal high wind vs inland moderate wind
      const isCoast = lat > 12.5 && lat < 12.7;
      return {
        data: {
          latitude: lat,
          longitude: config?.params?.longitude,
          timezone: 'UTC',
          hourly: {
            time: ['2026-09-12T01:00:00Z', '2026-09-12T02:00:00Z', '2026-09-12T06:00:00Z'],
            temperature_2m: [isCoast ? 28.0 : 32.0, isCoast ? 28.0 : 32.0, isCoast ? 28.0 : 32.0],
            apparent_temperature: [30.0, 30.0, 30.0],
            precipitation_probability: [isCoast ? 85 : 10, isCoast ? 85 : 10, isCoast ? 85 : 10],
            precipitation: [isCoast ? 12.0 : 0.0, isCoast ? 12.0 : 0.0, isCoast ? 12.0 : 0.0],
            rain: [isCoast ? 12.0 : 0.0, isCoast ? 12.0 : 0.0, isCoast ? 12.0 : 0.0],
            wind_speed_10m: [isCoast ? 42.0 : 15.0, isCoast ? 42.0 : 15.0, isCoast ? 42.0 : 15.0],
            wind_gusts_10m: [isCoast ? 55.0 : 20.0, isCoast ? 55.0 : 20.0, isCoast ? 55.0 : 20.0],
            wind_direction_10m: [90, 90, 90],
            relative_humidity_2m: [85, 85, 85],
            visibility: [isCoast ? 4000 : 10000, isCoast ? 4000 : 10000, isCoast ? 4000 : 10000],
            weather_code: [isCoast ? 95 : 1, isCoast ? 95 : 1, isCoast ? 95 : 1],
          },
        },
      } as any;
    };

    const multiTimelines = await getMultiRouteWeatherTimelines([mockRouteA, mockRouteB]);

    assert.ok(multiTimelines['route-a']);
    assert.ok(multiTimelines['route-b']);

    // Coastal Route B has higher rain and wind than Inland Route A
    assert.equal(multiTimelines['route-b'].routeId, 'route-b');
    assert.equal(multiTimelines['route-b'].summary.hasThunderstorm, true);
    assert.equal(multiTimelines['route-b'].summary.rainExposure, 'high');
  });

  it('should update weather matching when departure time changes', async () => {
    axios.get = async (_url: any, _config: any) => ({
      data: {
        latitude: 12.0,
        longitude: 80.0,
        timezone: 'UTC',
        hourly: {
          time: [
            '2026-09-12T06:00:00Z',
            '2026-09-12T07:00:00Z',
            '2026-09-12T08:00:00Z',
            '2026-09-12T09:00:00Z',
            '2026-09-12T10:00:00Z',
          ],
          temperature_2m: [28.0, 30.0, 32.0, 34.0, 35.0],
          apparent_temperature: [30.0, 32.0, 34.0, 36.0, 37.0],
          precipitation_probability: [10, 20, 30, 40, 50],
          precipitation: [0.0, 0.0, 0.0, 0.0, 0.0],
          rain: [0.0, 0.0, 0.0, 0.0, 0.0],
          wind_speed_10m: [10.0, 12.0, 14.0, 16.0, 18.0],
          wind_direction_10m: [180, 180, 180, 180, 180],
          relative_humidity_2m: [70, 65, 60, 55, 50],
          visibility: [10000, 10000, 10000, 10000, 10000],
          weather_code: [1, 1, 2, 2, 3],
        },
      },
    }) as any;

    // Shift departure time by 5 hours: 01:00Z -> 06:00Z
    const delayedRoute: PlannedRoute = {
      ...mockRouteA,
      departureTime: '2026-09-12T06:00:00.000Z',
      arrivalTime: '2026-09-12T11:00:00.000Z',
      checkpoints: [
        {
          ...mockRouteA.checkpoints[0]!,
          estimatedArrivalTime: '2026-09-12T06:55:00.000Z', // was 01:55Z
        },
      ],
      stops: [],
    };

    const timeline = await getRouteWeatherTimeline(delayedRoute);

    const cp = timeline.points.find((p) => p.pointId === 'cp-1');
    assert.ok(cp);
    assert.equal(cp.estimatedArrivalTime, '2026-09-12T06:55:00.000Z');
    // Closest hour to 06:55Z is 07:00Z
    assert.equal(new Date(cp.forecastTime).toISOString(), '2026-09-12T07:00:00.000Z');
    assert.equal(cp.temperature, 30.0);
  });

  it('should return status unavailable when journey date is outside 16-day forecast range', async () => {
    // 30 days in future
    const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const farFutureRoute: PlannedRoute = {
      ...mockRouteA,
      departureTime: futureDate.toISOString(),
      arrivalTime: new Date(futureDate.getTime() + 18000 * 1000).toISOString(),
    };

    const timeline = await getRouteWeatherTimeline(farFutureRoute);

    assert.equal(timeline.status, 'unavailable');
    assert.ok(timeline.statusMessage?.includes('16 days'));
    assert.equal(timeline.points.length, 0);
  });

  it('should handle provider errors gracefully without throwing fatal exceptions', async () => {
    axios.get = async () => {
      throw new Error('Network timeout connecting to Open-Meteo');
    };

    const timeline = await getRouteWeatherTimeline(mockRouteA);

    assert.equal(timeline.status, 'unavailable');
    assert.ok(timeline.statusMessage?.includes('Unable to retrieve weather'));
    assert.equal(timeline.points.length, 0);
  });

  it('should correctly select 09:00 for 09:05 ETA and 10:00 for 09:35 ETA with both estimatedArrivalTime and forecastTime', async () => {
    axios.get = async (_url: any, _config: any) => ({
      data: {
        latitude: 12.0,
        longitude: 80.0,
        timezone: 'UTC',
        hourly: {
          time: [
            '2026-09-12T08:00:00Z',
            '2026-09-12T09:00:00Z',
            '2026-09-12T10:00:00Z',
            '2026-09-12T11:00:00Z',
          ],
          temperature_2m: [28.0, 30.0, 32.0, 34.0],
          apparent_temperature: [29.0, 31.0, 34.0, 36.0],
          precipitation_probability: [5, 10, 25, 40],
          precipitation: [0.0, 0.0, 0.0, 0.5],
          rain: [0.0, 0.0, 0.0, 0.5],
          wind_speed_10m: [10.0, 12.0, 15.0, 18.0],
          wind_direction_10m: [180, 180, 180, 180],
          relative_humidity_2m: [70, 65, 60, 55],
          visibility: [10000, 10000, 10000, 9000],
          weather_code: [0, 1, 2, 61],
        },
      },
    }) as any;

    const testRoute: PlannedRoute = {
      ...mockRouteA,
      departureTime: '2026-09-12T06:30:00.000Z',
      arrivalTime: '2026-09-12T11:00:00.000Z',
      stops: [],
      checkpoints: [
        {
          id: 'cp-0905',
          routeId: 'route-test',
          sequence: 1,
          latitude: 12.5,
          longitude: 79.8,
          name: 'Checkpoint 09:05',
          locationType: 'JUNCTION',
          distanceFromStartMeters: 50000,
          distanceToNextMeters: 50000,
          elapsedTravelTimeSeconds: 9300,
          estimatedArrivalTime: '2026-09-12T09:05:00.000Z', // 09:05
          isUserStopNearby: false,
        },
        {
          id: 'cp-0935',
          routeId: 'route-test',
          sequence: 2,
          latitude: 12.1,
          longitude: 79.5,
          name: 'Checkpoint 09:35',
          locationType: 'TOWN',
          distanceFromStartMeters: 100000,
          distanceToNextMeters: 50000,
          elapsedTravelTimeSeconds: 11100,
          estimatedArrivalTime: '2026-09-12T09:35:00.000Z', // 09:35
          isUserStopNearby: false,
        },
      ],
    };

    const timeline = await getRouteWeatherTimeline(testRoute);
    assert.equal(timeline.status, 'available');

    // 1. Checkpoint at 09:05 -> must match 09:00:00Z forecast
    const cp0905 = timeline.points.find((p) => p.pointId === 'cp-0905');
    assert.ok(cp0905);
    assert.equal(cp0905.estimatedArrivalTime, '2026-09-12T09:05:00.000Z');
    assert.equal(new Date(cp0905.forecastTime).toISOString(), '2026-09-12T09:00:00.000Z');
    assert.equal(cp0905.temperature, 30.0);

    // 2. Checkpoint at 09:35 -> must match 10:00:00Z forecast
    const cp0935 = timeline.points.find((p) => p.pointId === 'cp-0935');
    assert.ok(cp0935);
    assert.equal(cp0935.estimatedArrivalTime, '2026-09-12T09:35:00.000Z');
    assert.equal(new Date(cp0935.forecastTime).toISOString(), '2026-09-12T10:00:00.000Z');
    assert.equal(cp0935.temperature, 32.0);
  });

  it('should update weather timeline when user adds or removes stops', async () => {
    axios.get = async (_url: any, _config: any) => ({
      data: {
        latitude: 12.0,
        longitude: 80.0,
        timezone: 'UTC',
        hourly: {
          time: ['2026-09-12T02:00:00Z', '2026-09-12T03:00:00Z', '2026-09-12T06:00:00Z'],
          temperature_2m: [26.0, 28.0, 33.0],
          apparent_temperature: [27.0, 29.0, 35.0],
          precipitation_probability: [10, 10, 10],
          precipitation: [0.0, 0.0, 0.0],
          rain: [0.0, 0.0, 0.0],
          wind_speed_10m: [12.0, 14.0, 16.0],
          wind_direction_10m: [180, 180, 180],
          relative_humidity_2m: [70, 65, 60],
          visibility: [10000, 10000, 10000],
          weather_code: [1, 1, 1],
        },
      },
    }) as any;

    // Route with a user stop
    const timelineWithStop = await getRouteWeatherTimeline(mockRouteA);
    const stopPoint = timelineWithStop.points.find((p) => p.pointType === 'STOP');
    assert.ok(stopPoint);
    assert.equal(stopPoint.locationName, 'Tindivanam Halt');

    // Route with stop removed
    const routeWithoutStop: PlannedRoute = {
      ...mockRouteA,
      stops: [],
    };
    const timelineWithoutStop = await getRouteWeatherTimeline(routeWithoutStop);
    const removedStopPoint = timelineWithoutStop.points.find((p) => p.pointType === 'STOP');
    assert.equal(removedStopPoint, undefined);
  });

  it('should leverage cache on repeated requests without making duplicate provider calls', async () => {
    let providerCalls = 0;
    axios.get = (async (_url: any, _config: any) => {
      providerCalls++;
      return {
        data: {
          latitude: 13.08,
          longitude: 80.27,
          timezone: 'UTC',
          hourly: {
            time: ['2026-09-12T01:00:00Z', '2026-09-12T06:00:00Z'],
            temperature_2m: [28.0, 34.0],
            apparent_temperature: [30.0, 36.0],
            precipitation_probability: [10, 15],
            precipitation: [0.0, 0.0],
            rain: [0.0, 0.0],
            wind_speed_10m: [12.0, 14.0],
            wind_direction_10m: [180, 180],
            relative_humidity_2m: [70, 60],
            visibility: [10000, 10000],
            weather_code: [1, 2],
          },
        },
      };
    }) as any;

    const simpleRoute: PlannedRoute = {
      ...mockRouteA,
      stops: [],
      checkpoints: [],
    };

    // First call: populates cache
    const firstTimeline = await getRouteWeatherTimeline(simpleRoute);
    assert.equal(firstTimeline.status, 'available');
    const initialCalls = providerCalls;
    assert.ok(initialCalls > 0);

    // Second call with same route & time: must be served from cache
    const secondTimeline = await getRouteWeatherTimeline(simpleRoute);
    assert.equal(secondTimeline.status, 'available');
    assert.equal(providerCalls, initialCalls, 'Provider should not be called again due to caching');
  });
});
