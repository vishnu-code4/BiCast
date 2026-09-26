// ============================================================
// BiCAST Weather Risk, Safety Score & Alert Engine Tests
// Comprehensive verification of deterministic scoring, boundaries,
// segment risk, alert deduplication, and multi-route comparisons
// ============================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRiskService, weatherRiskService } from '../services/weatherRiskService';
import { RouteWeatherPoint, RouteWeatherTimeline } from '../types/weatherTimeline';
import { PlannedRoute } from '../types/routePlan';

describe('BiCAST Weather Risk & Safety Engine', () => {
  const basePoint: RouteWeatherPoint = {
    pointId: 'cp-1',
    checkpointId: 'cp-1',
    routeId: 'route-1',
    pointType: 'CHECKPOINT',
    sequence: 1,
    latitude: 12.5,
    longitude: 80.0,
    locationName: 'Tindivanam',
    estimatedArrivalTime: '2026-09-12T03:00:00.000Z',
    forecastTime: '2026-09-12T03:00:00.000Z',
    temperature: 28.0,
    apparentTemperature: 29.0,
    precipitationProbability: 5,
    precipitation: 0.0,
    rain: 0.0,
    showers: 0.0,
    snowfall: 0.0,
    thunderstorm: false,
    windSpeed: 15.0,
    windGusts: 18.0,
    windDirection: 180,
    humidity: 65,
    visibility: 10.0,
    weatherCode: 1,
    weatherCondition: 'Mainly clear',
  };

  describe('1. Individual Factor Scoring & Determinism', () => {
    it('should assign a perfect safety score of 100 (GREEN) for clear, benign weather', () => {
      const risk = weatherRiskService.calculatePointRisk(basePoint);
      assert.equal(risk.score, 100);
      assert.equal(risk.level, 'GREEN');
      assert.equal(risk.factors.length, 0);
      assert.equal(risk.primaryConcern, null);
    });

    it('should penalize light drizzle moderately and flag LOW severity', () => {
      const drizzlePoint: RouteWeatherPoint = {
        ...basePoint,
        precipitation: 0.5,
        rain: 0.5,
        precipitationProbability: 35,
        weatherCode: 51,
        weatherCondition: 'Light drizzle',
      };
      const risk = weatherRiskService.calculatePointRisk(drizzlePoint);
      assert.equal(risk.score, 92); // 100 - 8
      assert.equal(risk.level, 'GREEN');
      assert.equal(risk.factors[0]?.type, 'RAIN');
      assert.equal(risk.factors[0]?.severity, 'LOW');
    });

    it('should penalize heavy rain significantly (HIGH severity)', () => {
      const heavyRainPoint: RouteWeatherPoint = {
        ...basePoint,
        precipitation: 8.5,
        rain: 8.5,
        precipitationProbability: 85,
        weatherCode: 65,
        weatherCondition: 'Heavy rain',
      };
      const risk = weatherRiskService.calculatePointRisk(heavyRainPoint);
      assert.equal(risk.score, 72); // 100 - 28
      assert.equal(risk.level, 'YELLOW');
      assert.equal(risk.factors[0]?.type, 'RAIN');
      assert.equal(risk.factors[0]?.severity, 'HIGH');
    });

    it('should penalize thunderstorms critically and generate high priority warning', () => {
      const stormPoint: RouteWeatherPoint = {
        ...basePoint,
        thunderstorm: true,
        weatherCode: 95,
        weatherCondition: 'Thunderstorm',
      };
      const risk = weatherRiskService.calculatePointRisk(stormPoint);
      assert.equal(risk.score, 60); // 100 - 40
      assert.equal(risk.level, 'YELLOW');
      const stormFactor = risk.factors.find((f) => f.type === 'THUNDERSTORM');
      assert.ok(stormFactor);
      assert.equal(stormFactor.severity, 'CRITICAL');
      assert.equal(stormFactor.penalty, 40);
    });

    it('should penalize dangerous crosswind gusts above 65 km/h critically', () => {
      const gustPoint: RouteWeatherPoint = {
        ...basePoint,
        windSpeed: 40.0,
        windGusts: 68.0,
      };
      const risk = weatherRiskService.calculatePointRisk(gustPoint);
      // Wind speed 40 km/h: -16, Gusts 68 km/h: -35 => Total 51 penalty => score 49
      assert.equal(risk.score, 49);
      assert.equal(risk.level, 'ORANGE');
      const gustFactor = risk.factors.find((f) => f.type === 'GUSTS');
      assert.ok(gustFactor);
      assert.equal(gustFactor.severity, 'CRITICAL');
    });

    it('should penalize dense fog with visibility < 1 km', () => {
      const fogPoint: RouteWeatherPoint = {
        ...basePoint,
        visibility: 0.6,
        weatherCode: 45,
        weatherCondition: 'Fog',
      };
      const risk = weatherRiskService.calculatePointRisk(fogPoint);
      assert.equal(risk.score, 70); // 100 - 30
      assert.equal(risk.level, 'YELLOW');
      const visFactor = risk.factors.find((f) => f.type === 'VISIBILITY');
      assert.ok(visFactor);
      assert.equal(visFactor.severity, 'CRITICAL');
    });

    it('should penalize extreme heat index (apparent temp >= 45 C)', () => {
      const heatPoint: RouteWeatherPoint = {
        ...basePoint,
        temperature: 39.0,
        apparentTemperature: 46.0,
      };
      const risk = weatherRiskService.calculatePointRisk(heatPoint);
      assert.equal(risk.score, 76); // 100 - 24
      assert.equal(risk.level, 'YELLOW');
      const heatFactor = risk.factors.find((f) => f.type === 'HEAT');
      assert.ok(heatFactor);
      assert.equal(heatFactor.severity, 'HIGH');
    });

    it('should clamp scores between 0 and 100 even with extreme combined penalties', () => {
      const nightmarePoint: RouteWeatherPoint = {
        ...basePoint,
        precipitation: 20.0,
        rain: 20.0,
        thunderstorm: true,
        weatherCode: 99,
        windSpeed: 60.0,
        windGusts: 80.0,
        visibility: 0.5,
        apparentTemperature: 46.0,
      };
      const risk = weatherRiskService.calculatePointRisk(nightmarePoint);
      assert.equal(risk.score, 0);
      assert.equal(risk.level, 'RED');
      assert.ok(risk.factors.length >= 4);
    });
  });

  describe('2. Risk Level Boundaries', () => {
    it('should accurately verify exact boundary transitions', () => {
      const service = new WeatherRiskService();

      // GREEN: 80 - 100
      assert.equal(service.getRiskLevel(100), 'GREEN');
      assert.equal(service.getRiskLevel(80), 'GREEN');

      // YELLOW: 60 - 79
      assert.equal(service.getRiskLevel(79), 'YELLOW');
      assert.equal(service.getRiskLevel(60), 'YELLOW');

      // ORANGE: 40 - 59
      assert.equal(service.getRiskLevel(59), 'ORANGE');
      assert.equal(service.getRiskLevel(40), 'ORANGE');

      // RED: 0 - 39
      assert.equal(service.getRiskLevel(39), 'RED');
      assert.equal(service.getRiskLevel(0), 'RED');
    });
  });

  describe('3. Route Segments & Severe Event Detection', () => {
    it('should calculate segment risk between adjacent checkpoints and flag severe events', () => {
      const cp1 = weatherRiskService.calculatePointRisk({
        ...basePoint,
        pointId: 'cp-1',
        locationName: 'Tindivanam',
      });
      const cp2 = weatherRiskService.calculatePointRisk({
        ...basePoint,
        pointId: 'cp-2',
        locationName: 'Villupuram',
        thunderstorm: true,
        precipitation: 10.0,
        rain: 10.0,
      });

      const segments = weatherRiskService.calculateRouteSegments([cp1, cp2]);
      assert.equal(segments.length, 1);

      const seg = segments[0]!;
      assert.equal(seg.fromLocationName, 'Tindivanam');
      assert.equal(seg.toLocationName, 'Villupuram');
      assert.equal(seg.isSevereEvent, true);
      assert.ok(seg.severeEventDescription?.includes('Thunderstorm cell forecast'));
      assert.ok(seg.score < cp1.score);
    });
  });

  describe('4. Alert Deduplication & Spatial-Temporal Grouping', () => {
    it('should consolidate consecutive rainy checkpoints into a single unified alert span', () => {
      const rainyPoint1 = weatherRiskService.calculatePointRisk({
        ...basePoint,
        pointId: 'cp-1',
        locationName: 'Tindivanam',
        estimatedArrivalTime: '2026-09-12T03:00:00.000Z',
        precipitation: 5.0,
        rain: 5.0,
        precipitationProbability: 70,
      });
      const rainyPoint2 = weatherRiskService.calculatePointRisk({
        ...basePoint,
        pointId: 'cp-2',
        locationName: 'Villupuram',
        estimatedArrivalTime: '2026-09-12T03:45:00.000Z',
        precipitation: 6.0,
        rain: 6.0,
        precipitationProbability: 75,
      });
      const rainyPoint3 = weatherRiskService.calculatePointRisk({
        ...basePoint,
        pointId: 'cp-3',
        locationName: 'Chidambaram',
        estimatedArrivalTime: '2026-09-12T04:30:00.000Z',
        precipitation: 4.0,
        rain: 4.0,
        precipitationProbability: 60,
      });

      const alerts = weatherRiskService.generateConsolidatedAlerts(
        [rainyPoint1, rainyPoint2, rainyPoint3],
        'route-test',
      );

      // Should be grouped into 1 consolidated alert instead of 3 separate spam alerts
      assert.equal(alerts.length, 1);
      const alert = alerts[0]!;
      assert.equal(alert.type, 'RAIN');
      assert.ok(alert.message.includes('between Tindivanam and Chidambaram'));
      assert.equal(alert.affectedLocations.length, 3);
    });
  });

  describe('5. Overall Route Score & Severe Segment Override', () => {
    it('should cap overall score at 59 (ORANGE) if a severe thunderstorm segment exists', () => {
      // 4 benign checkpoints, 1 severe thunderstorm checkpoint
      const safe1 = weatherRiskService.calculatePointRisk({ ...basePoint, pointId: '1' });
      const safe2 = weatherRiskService.calculatePointRisk({ ...basePoint, pointId: '2' });
      const safe3 = weatherRiskService.calculatePointRisk({ ...basePoint, pointId: '3' });
      const severe = weatherRiskService.calculatePointRisk({
        ...basePoint,
        pointId: '4',
        thunderstorm: true,
        precipitation: 16.0,
        rain: 16.0,
      });

      const checkpoints = [safe1, safe2, safe3, severe];
      const segments = weatherRiskService.calculateRouteSegments(checkpoints);
      const overall = weatherRiskService.calculateOverallRouteScore(checkpoints, segments);

      // Even though 3 of 4 points are 100, the severe storm segment prevents a false Green
      assert.ok(overall.overallScore <= 59);
      assert.equal(overall.overallLevel, 'ORANGE');
      assert.equal(overall.severeSegments.length > 0, true);
    });
  });

  describe('6. Multi-Route Comparison & Tags', () => {
    it('should identify fastest, shortest, and safest routes correctly', () => {
      const mockRouteA: PlannedRoute = {
        id: 'route-fast',
        name: 'Highway Route',
        distanceMeters: 200000,
        durationSeconds: 10000, // fastest
        geometry: [[13.0, 80.0], [12.0, 79.5]],
        legs: [],
        stops: [],
        checkpoints: [],
        departureTime: '2026-09-12T01:00:00.000Z',
        arrivalTime: '2026-09-12T03:45:00.000Z',
      };

      const mockRouteB: PlannedRoute = {
        id: 'route-scenic-safe',
        name: 'Inland Safe Route',
        distanceMeters: 190000, // shortest
        durationSeconds: 12000,
        geometry: [[13.0, 80.0], [12.0, 79.5]],
        legs: [],
        stops: [],
        checkpoints: [],
        departureTime: '2026-09-12T01:00:00.000Z',
        arrivalTime: '2026-09-12T04:20:00.000Z',
      };

      // Route A has heavy storm; Route B is completely clear
      const stormTimeline: RouteWeatherTimeline = {
        routeId: 'route-fast',
        generatedAt: new Date().toISOString(),
        status: 'available',
        points: [
          {
            ...basePoint,
            pointId: 'a-1',
            thunderstorm: true,
            precipitation: 12.0,
            rain: 12.0,
          },
        ],
        summary: {
          minTemperature: 28,
          maxTemperature: 28,
          maxPrecipitationProbability: 90,
          totalPrecipitationMm: 12,
          maxWindSpeedKmh: 35,
          maxWindGustsKmh: 45,
          hasThunderstorm: true,
          hasRain: true,
          rainExposure: 'high',
          weatherPointsCount: 1,
        },
      };

      const clearTimeline: RouteWeatherTimeline = {
        routeId: 'route-scenic-safe',
        generatedAt: new Date().toISOString(),
        status: 'available',
        points: [basePoint],
        summary: {
          minTemperature: 28,
          maxTemperature: 28,
          maxPrecipitationProbability: 5,
          totalPrecipitationMm: 0,
          maxWindSpeedKmh: 15,
          maxWindGustsKmh: 18,
          hasThunderstorm: false,
          hasRain: false,
          rainExposure: 'none',
          weatherPointsCount: 1,
        },
      };

      const multiAnalysis = weatherRiskService.analyzeMultiRouteRisk(
        [mockRouteA, mockRouteB],
        {
          'route-fast': stormTimeline,
          'route-scenic-safe': clearTimeline,
        },
      );

      // Verify tags
      assert.equal(multiAnalysis['route-fast']?.tags?.isFastest, true);
      assert.equal(multiAnalysis['route-scenic-safe']?.tags?.isShortest, true);
      assert.equal(multiAnalysis['route-scenic-safe']?.tags?.isSafest, true);
      assert.equal(multiAnalysis['route-fast']?.tags?.isSafest, false);
      assert.equal(multiAnalysis['route-scenic-safe']?.overallScore, 100);
      assert.ok(multiAnalysis['route-fast']!.overallScore < 70);
    });
  });
});
