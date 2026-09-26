import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fuelCalculationService } from '../services/fuelCalculationService';
import { fuelPlanningService } from '../services/fuelPlanningService';
import { PlannedRoute } from '../types/routePlan';
import { FuelInput } from '../types/fuel';
import { evaluateFuelStatus } from '../config/fuelRules';
import { distanceAlongPolylineMetres } from '../utils/geoMath';
import { routePlacesService } from '../services/routePlacesService';

describe('BiCAST Fuel Calculation & Planning Engine', () => {
  // Mock route: 142.3 km, 10800s (3 hours)
  const mockRoute1: PlannedRoute = {
    id: 'route-1',
    name: 'Bangalore to Mysore via Expressway',
    distanceMeters: 142300,
    durationSeconds: 10800,
    geometry: [
      [12.9716, 77.5946],
      [12.8250, 77.4100],
      [12.6500, 77.2000],
      [12.5200, 76.9000],
      [12.2958, 76.6394],
    ],
    legs: [],
    stops: [],
    checkpoints: [
      {
        id: 'cp-1',
        routeId: 'route-1',
        sequence: 1,
        name: 'Bidadi',
        latitude: 12.825,
        longitude: 77.41,
        locationType: 'CHECKPOINT',
        distanceFromStartMeters: 35000,
        distanceToNextMeters: 35000,
        elapsedTravelTimeSeconds: 2700,
        estimatedArrivalTime: '2026-09-15T07:15:00Z',
        isUserStopNearby: false,
      },
      {
        id: 'cp-2',
        routeId: 'route-1',
        sequence: 2,
        name: 'Mandya',
        latitude: 12.52,
        longitude: 76.9,
        locationType: 'CHECKPOINT',
        distanceFromStartMeters: 100000,
        distanceToNextMeters: 42300,
        elapsedTravelTimeSeconds: 7500,
        estimatedArrivalTime: '2026-09-15T08:35:00Z',
        isUserStopNearby: false,
      },
    ],
    departureTime: '2026-09-15T06:30:00Z',
    arrivalTime: '2026-09-15T09:30:00Z',
  };

  const mockRoute2: PlannedRoute = {
    id: 'route-2',
    name: 'Bangalore to Mysore via Kanakapura (Alternative)',
    distanceMeters: 156000, // 156 km
    durationSeconds: 12000,
    geometry: [
      [12.9716, 77.5946],
      [12.5400, 77.4200],
      [12.2958, 76.6394],
    ],
    legs: [],
    stops: [],
    checkpoints: [],
    departureTime: '2026-09-15T06:30:00Z',
    arrivalTime: '2026-09-15T09:50:00Z',
  };

  const defaultMockPlaces = [
    {
      placeId: 'station-sweetspot',
      name: 'Indian Oil Highway Express',
      category: 'fuel' as const,
      latitude: 12.650,
      longitude: 77.200, // ~70km into ride
      distanceFromRouteMeters: 50,
      rating: 4.5,
      openNow: true,
    },
    {
      placeId: 'station-far',
      name: 'HP Far Station',
      category: 'fuel' as const,
      latitude: 12.300,
      longitude: 76.650, // near Mysore (~140km)
      distanceFromRouteMeters: 400,
      rating: 3.5,
    },
  ];

  const originalGetPlaces = routePlacesService.getPlacesAlongRoute;

  beforeEach(() => {
    routePlacesService.getPlacesAlongRoute = async (route) => ({
      routeId: route.id,
      category: 'fuel',
      categories: ['fuel'],
      radiusMeters: 5000,
      totalFound: defaultMockPlaces.length,
      places: defaultMockPlaces,
    });
  });

  afterEach(() => {
    routePlacesService.getPlacesAlongRoute = originalGetPlaces;
  });

  describe('1. Deterministic Fuel Calculations', () => {
    it('should calculate fuel required and cost accurately', () => {
      const input: FuelInput = {
        mileageKmPerLitre: 45, // 45 km/L
        fuelPricePerLitre: 105, // ₹105/L
        currentFuelLitres: 10,
        fuelTankCapacityLitres: 12,
        reserveLitres: 1.5,
      };

      const calc = fuelCalculationService.calculateRouteFuel(mockRoute1, input);

      // Distance: 142.3 km
      assert.strictEqual(calc.distanceKm, 142.3);
      // Fuel required: 142.3 / 45 = 3.1622 -> 3.16 L
      assert.strictEqual(calc.fuelRequiredLitres, 3.16);
      // Cost: 3.16 * 105 = 331.8 -> ₹332
      assert.strictEqual(calc.estimatedCost, 332);
      // Total range: 10 * 45 = 450 km
      assert.strictEqual(calc.estimatedRangeKm, 450);
      // Usable range: (10 - 1.5) * 45 = 8.5 * 45 = 382.5 -> 383 km
      assert.strictEqual(calc.usableRangeKm, 383);
      // Remaining fuel: 10 - 3.16 = 6.84 L
      assert.strictEqual(calc.estimatedRemainingFuelLitres, 6.84);
      assert.strictEqual(calc.status, 'SUFFICIENT');
    });

    it('should clamp remaining fuel to 0 and never display negative values', () => {
      const input: FuelInput = {
        mileageKmPerLitre: 30, // 30 km/L
        currentFuelLitres: 2.0, // Only 2L available for 142.3 km journey (requires 4.74L)
      };

      const calc = fuelCalculationService.calculateRouteFuel(mockRoute1, input);
      assert.strictEqual(calc.fuelRequiredLitres, 4.74);
      assert.strictEqual(calc.estimatedRemainingFuelLitres, 0); // clamped, never negative
      assert.strictEqual(calc.status, 'REFUEL_REQUIRED');
    });

    it('should handle missing optional fields gracefully without fabricating defaults', () => {
      // Mileage provided, but price and current fuel omitted
      const input: FuelInput = {
        mileageKmPerLitre: 40,
      };

      const calc = fuelCalculationService.calculateRouteFuel(mockRoute1, input);
      assert.strictEqual(calc.fuelRequiredLitres, 3.56);
      assert.strictEqual(calc.estimatedCost, undefined, 'Price omitted should leave cost undefined');
      assert.strictEqual(calc.estimatedRemainingFuelLitres, undefined);
      assert.strictEqual(calc.estimatedRangeKm, undefined);
      assert.strictEqual(calc.status, 'UNKNOWN');
    });
  });

  describe('2. Safety Reserve & Status Evaluation', () => {
    it('should assign SUFFICIENT when arrival fuel is safely above reserve', () => {
      const res = evaluateFuelStatus({
        mileageKmPerLitre: 45,
        routeDistanceKm: 140,
        fuelRequiredLitres: 3.1,
        currentFuelLitres: 8.0,
        reserveLitres: 1.5,
        usableRangeKm: 292,
        estimatedRemainingFuelLitres: 4.9,
      });
      assert.strictEqual(res.status, 'SUFFICIENT');
    });

    it('should assign LOW when arrival fuel is within buffer of safety reserve', () => {
      const res = evaluateFuelStatus({
        mileageKmPerLitre: 40,
        routeDistanceKm: 140,
        fuelRequiredLitres: 3.5,
        currentFuelLitres: 5.3,
        reserveLitres: 1.5, // 1.5 + 0.5 buffer = 2.0
        usableRangeKm: 152,
        estimatedRemainingFuelLitres: 1.8, // 1.8 <= 2.0
      });
      assert.strictEqual(res.status, 'LOW');
    });

    it('should assign REFUEL_RECOMMENDED when usable range is less than trip distance', () => {
      const res = evaluateFuelStatus({
        mileageKmPerLitre: 35,
        routeDistanceKm: 150,
        fuelRequiredLitres: 4.28,
        currentFuelLitres: 4.5,
        reserveLitres: 1.5,
        usableRangeKm: 105, // 105km < 150km (will dip into reserve)
        estimatedRemainingFuelLitres: 0.22,
      });
      assert.strictEqual(res.status, 'REFUEL_RECOMMENDED');
    });

    it('should assign REFUEL_REQUIRED when remaining fuel is depleted', () => {
      const res = evaluateFuelStatus({
        mileageKmPerLitre: 30,
        routeDistanceKm: 200,
        fuelRequiredLitres: 6.67,
        currentFuelLitres: 3.0,
        reserveLitres: 1.5,
        usableRangeKm: 45,
        estimatedRemainingFuelLitres: 0,
      });
      assert.strictEqual(res.status, 'REFUEL_REQUIRED');
    });
  });

  describe('3. Checkpoint Fuel Progression', () => {
    it('should calculate fuel consumed and remaining at each checkpoint', () => {
      const input: FuelInput = {
        mileageKmPerLitre: 50,
        currentFuelLitres: 8.0,
      };

      const estimates = fuelCalculationService.calculateCheckpointEstimates(mockRoute1, input);
      assert.strictEqual(estimates.length, 2);

      // Checkpoint 1 (35 km): 35 / 50 = 0.7 L consumed, 8.0 - 0.7 = 7.3 L remaining
      assert.strictEqual(estimates[0]?.sequence, 1);
      assert.strictEqual(estimates[0]?.distanceFromStartKm, 35.0);
      assert.strictEqual(estimates[0]?.estimatedFuelConsumedLitres, 0.7);
      assert.strictEqual(estimates[0]?.estimatedRemainingFuelLitres, 7.3);

      // Checkpoint 2 (100 km): 100 / 50 = 2.0 L consumed, 8.0 - 2.0 = 6.0 L remaining
      assert.strictEqual(estimates[1]?.sequence, 2);
      assert.strictEqual(estimates[1]?.distanceFromStartKm, 100.0);
      assert.strictEqual(estimates[1]?.estimatedFuelConsumedLitres, 2.0);
      assert.strictEqual(estimates[1]?.estimatedRemainingFuelLitres, 6.0);
    });
  });

  describe('4. Fuel Station Distance Along Route & Planning', () => {
    it('should calculate distance along polyline accurately', () => {
      // Point near checkpoint 1: (12.825, 77.410)
      const dist = distanceAlongPolylineMetres(12.825, 77.410, mockRoute1.geometry);
      assert.ok(dist > 25000 && dist < 45000, `Expected ~35km, got ${dist}m`);
    });

    it('should recommend reachable fuel stations and rank them by suitability', async () => {
      const input: FuelInput = {
        mileageKmPerLitre: 35,
        currentFuelLitres: 3.5, // 3.5L * 35 = 122.5km range; usable = (3.5 - 1.5) * 35 = 70km
        reserveLitres: 1.5,
      };

      const plan = await fuelPlanningService.planRouteFuel(mockRoute1, input);
      assert.ok(plan.recommendations.length > 0);

      const topStation = plan.recommendations[0]!;
      assert.strictEqual(topStation.placeId, 'station-sweetspot');
      assert.strictEqual(topStation.isReachableBeforeReserve, true);
      assert.ok(topStation.rankScore > 60);
    });
  });

  describe('5. Multi-Route Alternative Fuel Comparison', () => {
    it('should evaluate routes independently and tag the most fuel efficient route', async () => {
      const input: FuelInput = {
        mileageKmPerLitre: 40,
        fuelPricePerLitre: 100,
        currentFuelLitres: 8,
      };

      const plans = await fuelPlanningService.planMultiRouteFuel([mockRoute1, mockRoute2], input);

      const plan1 = plans['route-1']!;
      const plan2 = plans['route-2']!;

      assert.strictEqual(plan1.calculation.fuelRequiredLitres, 3.56); // 142.3 km / 40
      assert.strictEqual(plan2.calculation.fuelRequiredLitres, 3.9); // 156 km / 40
      assert.strictEqual(plan1.isMostFuelEfficient, true);
      assert.strictEqual(plan2.isMostFuelEfficient, undefined);
    });
  });
});
