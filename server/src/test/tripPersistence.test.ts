// ============================================================
// BiCAST Trip Persistence & History Tests (Prompt 8)
// ============================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tripService } from '../services/tripService';
import { evaluateTripFreshness } from '../config/tripRules';
import { CreateTripSchema } from '../types/trip';
import { routePlanningService } from '../services/routePlanningService';
import { routeWeatherService } from '../services/routeWeatherService';
import { weatherRiskService } from '../services/weatherRiskService';
import { fuelPlanningService } from '../services/fuelPlanningService';

describe('BiCAST Trip Persistence, Saved Trips & History Engine', () => {
  const sampleStart = {
    name: 'Silk Board, Bangalore',
    latitude: 12.9172,
    longitude: 77.6229,
  };

  const sampleDestination = {
    name: 'White Town, Pondicherry',
    latitude: 11.9338,
    longitude: 79.8358,
  };

  const sampleStops = [
    {
      sequence: 1,
      name: 'Krishnagiri Fuel Pump',
      latitude: 12.5186,
      longitude: 78.2137,
      userDefined: true,
      source: 'place' as const,
    },
    {
      sequence: 2,
      name: 'Tiruvannamalai Coffee Stop',
      latitude: 12.2253,
      longitude: 79.0747,
      userDefined: true,
      source: 'manual' as const,
    },
  ];

  describe('1. Trip CRUD Operations', () => {
    it('should create a saved trip with smart default name and persistent configuration', async () => {
      const trip = await tripService.createTrip({
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: sampleStops,
        journeyDate: '2026-10-15',
        departureTime: '06:00',
        timezone: 'Asia/Kolkata',
        fuelConfig: {
          mileageKmPerLitre: 35,
          fuelPricePerLitre: 103,
          currentFuelLitres: 10,
          reserveLitres: 1.5,
        },
        status: 'PLANNED',
      });

      assert.ok(trip.id.startsWith('trip_'));
      assert.strictEqual(trip.name, 'Trip to White Town');
      assert.strictEqual(trip.status, 'PLANNED');
      assert.strictEqual(trip.startLocation.name, sampleStart.name);
      assert.strictEqual(trip.destination.name, sampleDestination.name);
      assert.strictEqual(trip.stops.length, 2);
      assert.strictEqual(trip.fuelConfig?.mileageKmPerLitre, 35);

      // Clean up
      await tripService.deleteTrip(trip.id);
    });

    it('should accept custom trip names without overriding with defaults', async () => {
      const trip = await tripService.createTrip({
        name: 'Monsoon Coastal Ride',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: [],
        journeyDate: '2026-10-15',
        departureTime: '06:00',
        timezone: 'Asia/Kolkata',
        status: 'PLANNED',
      });

      assert.strictEqual(trip.name, 'Monsoon Coastal Ride');
      await tripService.deleteTrip(trip.id);
    });

    it('should read, query, filter, and paginate trips', async () => {
      const trip1 = await tripService.createTrip({
        name: 'Bangalore to Mysore Ride',
        startLocation: sampleStart,
        destination: { name: 'Mysore Palace', latitude: 12.3051, longitude: 76.6551 },
        stops: [],
        journeyDate: '2026-10-10',
        departureTime: '07:00',
        timezone: 'Asia/Kolkata',
        status: 'PLANNED',
      });

      const trip2 = await tripService.createTrip({
        name: 'Chennai Highway Ride',
        startLocation: sampleStart,
        destination: { name: 'Marina Beach, Chennai', latitude: 13.0500, longitude: 80.2824 },
        stops: [],
        journeyDate: '2026-10-12',
        departureTime: '06:30',
        timezone: 'Asia/Kolkata',
        status: 'COMPLETED',
      });

      // Filter by status: COMPLETED
      const completedQuery = await tripService.getTrips({
        status: 'COMPLETED',
        sort: 'newest',
        page: 1,
        limit: 10,
      });
      assert.ok(completedQuery.trips.some((t) => t.id === trip2.id));
      assert.ok(!completedQuery.trips.some((t) => t.id === trip1.id));

      // Search by keyword
      const searchQuery = await tripService.getTrips({
        status: 'ALL',
        search: 'Mysore',
        sort: 'newest',
        page: 1,
        limit: 10,
      });
      assert.strictEqual(searchQuery.trips.length, 1);
      assert.strictEqual(searchQuery.trips[0]!.id, trip1.id);

      // Clean up
      await tripService.deleteTrip(trip1.id);
      await tripService.deleteTrip(trip2.id);
    });

    it('should update trip configuration and change status', async () => {
      const trip = await tripService.createTrip({
        name: 'Draft Ride',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: [],
        journeyDate: '2026-10-15',
        departureTime: '06:00',
        timezone: 'Asia/Kolkata',
        status: 'DRAFT',
      });

      const updated = await tripService.updateTrip(trip.id, {
        name: 'Promoted Planned Ride',
        status: 'PLANNED',
        departureTime: '08:00',
      });

      assert.strictEqual(updated?.name, 'Promoted Planned Ride');
      assert.strictEqual(updated?.status, 'PLANNED');
      assert.strictEqual(updated?.departureTime, '08:00');

      await tripService.deleteTrip(trip.id);
    });

    it('should destructively delete a trip and cascade without leaving orphaned data', async () => {
      const trip = await tripService.createTrip({
        name: 'Temporary Ride',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: sampleStops,
        journeyDate: '2026-10-15',
        departureTime: '06:00',
        timezone: 'Asia/Kolkata',
        status: 'PLANNED',
      });

      const deleted = await tripService.deleteTrip(trip.id);
      assert.strictEqual(deleted, true);

      const found = await tripService.getTripById(trip.id);
      assert.strictEqual(found, null);
    });
  });

  describe('2. Stops Persistence & Isolation from Checkpoints', () => {
    it('should persist user stops with sequence and never store automatic checkpoints as TripStops', async () => {
      const trip = await tripService.createTrip({
        name: 'Waypoint Isolation Ride',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: sampleStops,
        journeyDate: '2026-10-15',
        departureTime: '06:00',
        timezone: 'Asia/Kolkata',
        status: 'PLANNED',
      });

      const retrieved = await tripService.getTripById(trip.id);
      assert.strictEqual(retrieved?.stops.length, 2);
      assert.strictEqual(retrieved?.stops[0]?.name, 'Krishnagiri Fuel Pump');
      assert.strictEqual(retrieved?.stops[0]?.source, 'place');
      assert.strictEqual(retrieved?.stops[1]?.name, 'Tiruvannamalai Coffee Stop');
      assert.strictEqual(retrieved?.stops[1]?.source, 'manual');

      // Verify checkpoints are not in stops array
      assert.ok(!retrieved?.stops.some((s) => s.name.includes('Checkpoint')));

      await tripService.deleteTrip(trip.id);
    });

    it('should allow reordering stops without duplicating records', async () => {
      const trip = await tripService.createTrip({
        name: 'Reordering Test',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: sampleStops,
        journeyDate: '2026-10-15',
        departureTime: '06:00',
        timezone: 'Asia/Kolkata',
        status: 'PLANNED',
      });

      // Reverse order of stops
      const reordered = [
        { ...sampleStops[1]!, sequence: 1 },
        { ...sampleStops[0]!, sequence: 2 },
      ];

      const updated = await tripService.updateTrip(trip.id, { stops: reordered });
      assert.strictEqual(updated?.stops.length, 2);
      assert.strictEqual(updated?.stops[0]?.name, 'Tiruvannamalai Coffee Stop');
      assert.strictEqual(updated?.stops[0]?.sequence, 1);
      assert.strictEqual(updated?.stops[1]?.name, 'Krishnagiri Fuel Pump');
      assert.strictEqual(updated?.stops[1]?.sequence, 2);

      await tripService.deleteTrip(trip.id);
    });
  });

  describe('3. Trip Duplication', () => {
    it('should create an independent copy with new ID, copied stops, and copied fuel settings', async () => {
      const original = await tripService.createTrip({
        name: 'Weekend Ride to Pondy',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: sampleStops,
        journeyDate: '2026-10-20',
        departureTime: '05:30',
        timezone: 'Asia/Kolkata',
        fuelConfig: {
          mileageKmPerLitre: 42,
          currentFuelLitres: 8,
          reserveLitres: 2.0,
        },
        status: 'PLANNED',
      });

      const duplicate = await tripService.duplicateTrip(original.id);
      assert.ok(duplicate);
      assert.notStrictEqual(duplicate.id, original.id);
      assert.strictEqual(duplicate.name, 'Weekend Ride to Pondy Copy');
      assert.strictEqual(duplicate.stops.length, 2);
      assert.strictEqual(duplicate.fuelConfig?.mileageKmPerLitre, 42);

      // Verify stop records are independent
      assert.notStrictEqual(duplicate.stops[0]?.id, original.stops[0]?.id);

      // Modifying duplicate stops must not alter original
      await tripService.updateTrip(duplicate.id, {
        stops: [{ sequence: 1, name: 'Brand New Stop', latitude: 12.0, longitude: 78.0, userDefined: true, source: 'manual' }],
      });

      const checkOriginal = await tripService.getTripById(original.id);
      assert.strictEqual(checkOriginal?.stops.length, 2);

      await tripService.deleteTrip(original.id);
      await tripService.deleteTrip(duplicate.id);
    });
  });

  describe('4. Stale Data & Freshness Rules', () => {
    it('should report UNPROCESSED for trips without calculated snapshots', () => {
      const freshness = evaluateTripFreshness({
        journeyDate: '2026-10-25',
        departureTime: '06:00',
        status: 'PLANNED',
        lastCalculatedAt: null,
      });
      assert.strictEqual(freshness.isFresh, false);
      assert.strictEqual(freshness.status, 'UNPROCESSED');
    });

    it('should report FRESH for recently calculated trips with future departure', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const freshness = evaluateTripFreshness({
        journeyDate: '2026-10-25',
        departureTime: '06:00',
        status: 'PLANNED',
        lastCalculatedAt: tenMinutesAgo,
      });
      assert.strictEqual(freshness.isFresh, true);
      assert.strictEqual(freshness.status, 'FRESH');
    });

    it('should report STALE when weather snapshot exceeds 3 hours', () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const freshness = evaluateTripFreshness({
        journeyDate: '2026-10-25',
        departureTime: '06:00',
        status: 'PLANNED',
        lastCalculatedAt: fourHoursAgo,
      });
      assert.strictEqual(freshness.isFresh, false);
      assert.strictEqual(freshness.status, 'STALE');
      assert.ok(freshness.reason?.includes('Weather forecast is'));
    });

    it('should report EXPIRED when scheduled departure time has passed', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const freshness = evaluateTripFreshness({
        journeyDate: yesterday,
        departureTime: '06:00',
        status: 'PLANNED',
        lastCalculatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      });
      assert.strictEqual(freshness.isFresh, false);
      assert.strictEqual(freshness.status, 'EXPIRED');
    });

    it('should consider COMPLETED trips archival and fresh for records', () => {
      const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const freshness = evaluateTripFreshness({
        journeyDate: yesterday,
        departureTime: '06:00',
        status: 'COMPLETED',
        lastCalculatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      });
      assert.strictEqual(freshness.isFresh, true);
      assert.strictEqual(freshness.status, 'FRESH');
    });
  });

  describe('5. Recalculation Pipeline Execution', () => {
    it('should recalculate a saved trip through Route -> Weather -> Risk -> Fuel', async () => {
      // Mock downstream services
      const origPlan = routePlanningService.planRoutes;
      const origWeather = routeWeatherService.getRouteWeatherTimeline;
      const origRisk = weatherRiskService.analyzeRouteRisk;
      const origFuel = fuelPlanningService.planRouteFuel;

      let routeCalled = false;
      let weatherCalled = false;
      let riskCalled = false;
      let fuelCalled = false;

      routePlanningService.planRoutes = async () => {
        routeCalled = true;
        return [
          {
            id: 'rt-1',
            name: 'Fastest Highway Route',
            distanceMeters: 310000,
            durationSeconds: 19800,
            geometry: [[12.91, 77.62], [11.93, 79.83]],
            legs: [],
            stops: [],
            checkpoints: [
              {
                id: 'cp-1',
                routeId: 'rt-1',
                sequence: 1,
                name: 'Krishnagiri',
                latitude: 12.51,
                longitude: 78.21,
                locationType: 'CHECKPOINT',
                distanceFromStartMeters: 90000,
                distanceToNextMeters: 220000,
                elapsedTravelTimeSeconds: 5400,
                estimatedArrivalTime: '2026-10-15T07:30:00Z',
                isUserStopNearby: false,
              },
            ],
            departureTime: '2026-10-15T06:00:00Z',
            arrivalTime: '2026-10-15T11:30:00Z',
          },
        ];
      };

      routeWeatherService.getRouteWeatherTimeline = async () => {
        weatherCalled = true;
        return {
          routeId: 'rt-1',
          routeName: 'Fastest Highway Route',
          departureTime: '2026-10-15T06:00:00Z',
          checkpointsWeather: [],
          timelineSummary: {
            hasRain: false,
            hasThunderstorm: false,
            hasFog: false,
            hasHighWind: false,
            hasExtremeTemp: false,
          },
        } as any;
      };

      weatherRiskService.analyzeRouteRisk = () => {
        riskCalled = true;
        return {
          routeId: 'rt-1',
          overallScore: 92,
          overallLevel: 'GREEN',
          primaryConcern: 'Clear weather conditions along route',
          checkpointsRisk: [],
          segmentsRisk: [],
          alerts: [],
          recommendations: ['Ideal riding weather'],
        } as any;
      };

      fuelPlanningService.planRouteFuel = async () => {
        fuelCalled = true;
        return {
          routeId: 'rt-1',
          calculation: {
            distanceKm: 310,
            mileageKmPerLitre: 35,
            fuelRequiredLitres: 8.86,
            estimatedCost: 913,
            status: 'SUFFICIENT',
          },
          checkpointEstimates: [],
          recommendations: [],
        } as any;
      };

      try {
        const trip = await tripService.createTrip({
          name: 'Pondy Ride for Recalculation',
          startLocation: sampleStart,
          destination: sampleDestination,
          stops: [],
          journeyDate: '2026-10-15',
          departureTime: '06:00',
          timezone: 'Asia/Kolkata',
          fuelConfig: {
            mileageKmPerLitre: 35,
            fuelPricePerLitre: 103,
            currentFuelLitres: 12,
          },
          status: 'PLANNED',
        });

        const recalculated = await tripService.recalculateTrip(trip.id, {
          departureTime: '06:15',
        });

        assert.strictEqual(routeCalled, true, 'Route engine must be invoked');
        assert.strictEqual(weatherCalled, true, 'Weather engine must be invoked');
        assert.strictEqual(riskCalled, true, 'Risk engine must be invoked');
        assert.strictEqual(fuelCalled, true, 'Fuel planning engine must be invoked');

        assert.ok(recalculated?.lastCalculatedAt);
        assert.strictEqual(recalculated?.departureTime, '06:15');
        assert.strictEqual(recalculated?.safetyScore, 92);
        assert.strictEqual(recalculated?.riskLevel, 'GREEN');
        assert.strictEqual(recalculated?.snapshots?.fuelPlan?.calculation?.estimatedCost, 913);

        await tripService.deleteTrip(trip.id);
      } finally {
        routePlanningService.planRoutes = origPlan;
        routeWeatherService.getRouteWeatherTimeline = origWeather;
        weatherRiskService.analyzeRouteRisk = origRisk;
        fuelPlanningService.planRouteFuel = origFuel;
      }
    });
  });

  describe('6. Request Validation (Zod)', () => {
    it('should validate valid trip payloads and reject invalid dates, times or missing locations', () => {
      const valid = CreateTripSchema.safeParse({
        name: 'Valid Ride',
        startLocation: sampleStart,
        destination: sampleDestination,
        stops: [],
        journeyDate: '2026-10-15',
        departureTime: '06:30',
      });
      assert.strictEqual(valid.success, true);

      // Invalid date format (not YYYY-MM-DD)
      const invalidDate = CreateTripSchema.safeParse({
        startLocation: sampleStart,
        destination: sampleDestination,
        journeyDate: '15/10/2026',
        departureTime: '06:30',
      });
      assert.strictEqual(invalidDate.success, false);

      // Invalid time format (not HH:mm)
      const invalidTime = CreateTripSchema.safeParse({
        startLocation: sampleStart,
        destination: sampleDestination,
        journeyDate: '2026-10-15',
        departureTime: '6:30 AM',
      });
      assert.strictEqual(invalidTime.success, false);

      // Missing start location
      const missingStart = CreateTripSchema.safeParse({
        destination: sampleDestination,
        journeyDate: '2026-10-15',
        departureTime: '06:30',
      });
      assert.strictEqual(missingStart.success, false);
    });
  });
});
