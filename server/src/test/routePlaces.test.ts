import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RoutePlacesService } from '../services/routePlacesService';
import { PlannedRoute } from '../types/routePlan';
import { placesProvider } from '../providers';
import { cacheService } from '../cache/CacheService';
import { ALL_PLACE_CATEGORIES, getCategoryConfig } from '../config/placeCategories';

describe('RoutePlacesService', () => {
  let service: RoutePlacesService;

  // Sample route: Bangalore (12.9716, 77.5946) to Mysore (12.2958, 76.6394) ~140 km
  const samplePolyline: Array<[number, number]> = [
    [12.9716, 77.5946],
    [12.8250, 77.4100],
    [12.6500, 77.2000],
    [12.5200, 76.9000],
    [12.2958, 76.6394],
  ];

  const mockRoute: PlannedRoute = {
    id: 'test-route-1',
    name: 'Bangalore to Mysore via NH275',
    distanceMeters: 142000,
    durationSeconds: 10800,
    geometry: samplePolyline,
    legs: [],
    stops: [],
    checkpoints: [],
    departureTime: '2026-09-15T06:30:00Z',
    arrivalTime: '2026-09-15T09:30:00Z',
  };

  beforeEach(async () => {
    service = new RoutePlacesService();
    await cacheService.clear();
  });

  it('should support all 14 centralized rider place categories', () => {
    assert.strictEqual(ALL_PLACE_CATEGORIES.length, 14);

    const fuel = getCategoryConfig('fuel');
    assert.ok(fuel);
    assert.strictEqual(fuel.id, 'fuel');
    assert.strictEqual(fuel.icon, '⛽');
    assert.strictEqual(fuel.isRoutePrimary, true);

    const hospital = getCategoryConfig('hospital');
    assert.ok(hospital);
    assert.strictEqual(hospital.importanceWeight, 10);

    const pharmacy = getCategoryConfig('pharmacy');
    assert.ok(pharmacy);

    const convenience = getCategoryConfig('convenience_store');
    assert.ok(convenience);

    // Aliases
    assert.strictEqual(getCategoryConfig('attraction')?.id, 'tourist_attraction');
    assert.strictEqual(getCategoryConfig('rest_area')?.id, 'restroom');
  });

  it('should generate intelligent route corridor sample points', () => {
    // Short route (< 30km)
    const shortSamples = service.generateCorridorSamplePoints(samplePolyline.slice(0, 2), 20000);
    assert.strictEqual(shortSamples.length, 2);

    // Medium route (142km)
    const medSamples = service.generateCorridorSamplePoints(samplePolyline, 142000);
    assert.ok(medSamples.length >= 4 && medSamples.length <= 6);

    // Long route (500km)
    const longSamples = service.generateCorridorSamplePoints(samplePolyline, 500000);
    assert.ok(longSamples.length <= 10, 'Must cap sample count to prevent excessive API costs');
  });

  it('should calculate deterministic place rank scores without AI', () => {
    // High-quality fuel station right on the highway
    const highwayPump = service.calculatePlaceRank({
      distanceFromRouteMeters: 50,
      rating: 4.6,
      userRatingCount: 450,
      openNow: true,
      category: 'fuel',
      maxCorridorRadius: 5000,
    });

    // Detoured restaurant with mediocre rating and closed
    const detouredClosedDhaba = service.calculatePlaceRank({
      distanceFromRouteMeters: 4500,
      rating: 2.8,
      userRatingCount: 15,
      openNow: false,
      category: 'restaurant',
      maxCorridorRadius: 5000,
    });

    assert.ok(highwayPump >= 80, `Highway pump should rank high, got ${highwayPump}`);
    assert.ok(detouredClosedDhaba < 40, `Closed distant dhaba should rank low, got ${detouredClosedDhaba}`);
    assert.ok(highwayPump > detouredClosedDhaba);
  });

  it('should search, deduplicate by placeId, and filter by route proximity', async () => {
    // Mock placesProvider.searchNearby
    const originalSearchNearby = placesProvider.searchNearby;
    placesProvider.searchNearby = async () => [
      {
        placeId: 'fuel-1',
        name: 'HP Petrol Pump Highway',
        category: 'fuel',
        lat: 12.8255,
        lng: 77.4105, // very close to route (< 100m)
        rating: 4.4,
        userRatingCount: 200,
        isOpen: true,
      },
      {
        placeId: 'fuel-2',
        name: 'Indian Oil Distant Station',
        category: 'fuel',
        lat: 13.5000,
        lng: 78.5000, // very far (> 100km away)
        rating: 4.0,
      },
      {
        // Duplicate placeId across multiple samples
        placeId: 'fuel-1',
        name: 'HP Petrol Pump Highway (dup)',
        category: 'fuel',
        lat: 12.8255,
        lng: 77.4105,
      },
    ];

    try {
      const result = await service.getPlacesAlongRoute(mockRoute, {
        category: 'fuel',
        radiusMeters: 5000,
        limit: 10,
      });

      assert.strictEqual(result.routeId, mockRoute.id);
      assert.strictEqual(result.totalFound, 1, 'Only 1 place should pass proximity and deduplication');
      assert.strictEqual(result.places[0]?.placeId, 'fuel-1');
      assert.ok((result.places[0]?.distanceFromRouteMeters ?? 9999) < 500);
      assert.ok((result.places[0]?.estimatedDetourMeters ?? 9999) < 1000);
    } finally {
      placesProvider.searchNearby = originalSearchNearby;
    }
  });

  it('should leverage TTL cache for repeated queries', async () => {
    let callCount = 0;
    const originalSearchNearby = placesProvider.searchNearby;
    placesProvider.searchNearby = async () => {
      callCount++;
      return [
        {
          placeId: 'cafe-1',
          name: 'Highway Riders Cafe',
          category: 'cafe',
          lat: 12.6502,
          lng: 77.2001,
          rating: 4.7,
        },
      ];
    };

    try {
      // First call
      const res1 = await service.getPlacesAlongRoute(mockRoute, { category: 'cafe' });
      assert.strictEqual(res1.places.length, 1);
      const initialCalls = callCount;
      assert.ok(initialCalls > 0);

      // Second identical call -> should hit cache without calling provider again
      const res2 = await service.getPlacesAlongRoute(mockRoute, { category: 'cafe' });
      assert.strictEqual(res2.places.length, 1);
      assert.strictEqual(callCount, initialCalls, 'Provider should not be called again on cache hit');
    } finally {
      placesProvider.searchNearby = originalSearchNearby;
    }
  });

  it('should gracefully handle empty or failed provider responses', async () => {
    const originalSearchNearby = placesProvider.searchNearby;
    placesProvider.searchNearby = async () => {
      throw new Error('Places provider temporary outage');
    };

    try {
      const res = await service.getPlacesAlongRoute(mockRoute, { category: 'hospital' });
      assert.strictEqual(res.totalFound, 0);
      assert.strictEqual(res.places.length, 0);
    } finally {
      placesProvider.searchNearby = originalSearchNearby;
    }
  });
});
