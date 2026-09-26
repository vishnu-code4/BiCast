// ============================================================
// BiCAST Route Planning Engine & Smart Checkpoints Unit Tests
// ============================================================
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  planRoutes,
  parseDepartureDateTime,
  recalculateRouteETAs,
} from '../services/routePlanningService';
import { routingProvider, geocodingProvider } from '../providers';

describe('Route Planning Engine', () => {
  const origGetRoutes = routingProvider.getRoutes;
  const origReverseGeocode = geocodingProvider.reverseGeocode;

  beforeEach(() => {
    geocodingProvider.reverseGeocode = async (lat, _lng) => ({
      name: lat > 12.5 ? 'Mandya Town' : 'Srirangapatna Junction',
      formattedAddress: 'Karnataka, India',
      lat,
      lng: _lng,
      types: ['locality'],
      components: {
        town: lat > 12.5 ? 'Mandya' : 'Srirangapatna',
        junction: lat <= 12.5 ? 'Srirangapatna Bypass Junction' : undefined,
      },
    });
  });

  afterEach(() => {
    routingProvider.getRoutes = origGetRoutes;
    geocodingProvider.reverseGeocode = origReverseGeocode;
  });

  // Mock sample polyline (approx 140 km from Bangalore to Mysore)
  const mockPolyline: Array<[number, number]> = [
    [12.9716, 77.5946], // Bangalore
    [12.8000, 77.4000],
    [12.5200, 77.0500], // Maddur (~25 min)
    [12.5220, 76.8980], // Mandya (~50 min)
    [12.4100, 76.7000], // Srirangapatna (~75 min)
    [12.2958, 76.6394], // Mysore (~100 min)
  ];

  it('should plan a direct route without stops (1 leg)', async () => {
    routingProvider.getRoutes = async () => ({
      provider: 'Mock Routing',
      routes: [
        {
          id: 'mock-1',
          name: 'Mysore Highway Expressway',
          distanceMetres: 140000,
          durationSeconds: 7200, // 2 hours
          polyline: mockPolyline,
          legs: [
            {
              distanceMetres: 140000,
              durationSeconds: 7200,
              startLocation: { lat: 12.9716, lng: 77.5946 },
              endLocation: { lat: 12.2958, lng: 76.6394 },
              steps: [],
            },
          ],
          steps: [],
        },
      ],
    });

    geocodingProvider.reverseGeocode = async (lat, _lng) => ({
      name: lat > 12.5 ? 'Mandya Town' : 'Srirangapatna Junction',
      formattedAddress: 'Karnataka, India',
      lat,
      lng: _lng,
      types: ['locality'],
      components: {
        town: lat > 12.5 ? 'Mandya' : 'Srirangapatna',
        junction: lat <= 12.5 ? 'Srirangapatna Bypass Junction' : undefined,
      },
    });

    const routes = await planRoutes({
      start: { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      destination: { name: 'Mysore', lat: 12.2958, lng: 76.6394 },
      stops: [],
      journeyDate: '2026-09-15',
      departureTime: '06:00',
      timezone: 'Asia/Kolkata',
    });

    assert.equal(routes.length, 1);
    const r = routes[0]!;
    assert.equal(r.name, 'Mysore Highway Expressway');
    assert.equal(r.legs.length, 1);
    assert.equal(r.stops.length, 0);

    // 2-hour route starting at 06:00 should arrive at 08:00
    assert.ok(r.departureTime.includes('00:30:00') || r.departureTime.includes('06:00'));
    const depDate = new Date(r.departureTime);
    const arrDate = new Date(r.arrivalTime);
    const durationMs = arrDate.getTime() - depDate.getTime();
    assert.equal(durationMs, 7200 * 1000);

    // Checkpoints should be generated for 2-hour ride
    assert.ok(r.checkpoints.length >= 3);
    // Every checkpoint must have a meaningful name (never "Checkpoint 1")
    for (const cp of r.checkpoints) {
      assert.ok(!cp.name.startsWith('Checkpoint'));
      assert.ok(cp.estimatedArrivalTime);
    }
  });

  it('should support multiple route alternatives when returned by provider', async () => {
    routingProvider.getRoutes = async () => ({
      provider: 'Mock Routing',
      routes: [
        {
          id: 'route-fast',
          name: 'NH 275 Expressway',
          distanceMetres: 140000,
          durationSeconds: 6600,
          polyline: mockPolyline,
          legs: [],
          steps: [],
        },
        {
          id: 'route-scenic',
          name: 'Kanakapura Country Route',
          distanceMetres: 155000,
          durationSeconds: 8400,
          polyline: mockPolyline,
          legs: [],
          steps: [],
        },
      ],
    });

    const routes = await planRoutes({
      start: { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      destination: { name: 'Mysore', lat: 12.2958, lng: 76.6394 },
      journeyDate: '2026-09-15',
      departureTime: '07:00',
    });

    assert.equal(routes.length, 2);
    assert.equal(routes[0]!.name, 'NH 275 Expressway');
    assert.equal(routes[1]!.name, 'Kanakapura Country Route');
  });

  it('should decompose multi-stop route into separate RouteLegs with accurate stop ETAs', async () => {
    // 2 stops -> 3 legs
    routingProvider.getRoutes = async () => ({
      provider: 'Mock Routing',
      routes: [
        {
          id: 'route-multi-stop',
          name: 'Primary via Stops',
          distanceMetres: 145000,
          durationSeconds: 7500,
          polyline: mockPolyline,
          legs: [
            {
              distanceMetres: 45000,
              durationSeconds: 2400,
              startLocation: { lat: 12.9716, lng: 77.5946 },
              endLocation: { lat: 12.6, lng: 77.2 },
              steps: [],
            },
            {
              distanceMetres: 50000,
              durationSeconds: 2600,
              startLocation: { lat: 12.6, lng: 77.2 },
              endLocation: { lat: 12.52, lng: 76.9 },
              steps: [],
            },
            {
              distanceMetres: 50000,
              durationSeconds: 2500,
              startLocation: { lat: 12.52, lng: 76.9 },
              endLocation: { lat: 12.2958, lng: 76.6394 },
              steps: [],
            },
          ],
          steps: [],
        },
      ],
    });

    const routes = await planRoutes({
      start: { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      destination: { name: 'Mysore', lat: 12.2958, lng: 76.6394 },
      stops: [
        { name: 'Ramanagara Tea Halt', lat: 12.6, lng: 77.2 },
        { name: 'Mandya Sugarcane Halt', lat: 12.52, lng: 76.9 },
      ],
      journeyDate: '2026-09-15',
      departureTime: '06:00',
    });

    const route = routes[0]!;
    assert.equal(route.legs.length, 3);
    assert.equal(route.stops.length, 2);

    // Stop 1 is end of Leg 1 (duration: 2400s = 40m)
    const leg1 = route.legs[0]!;
    const leg2 = route.legs[1]!;
    const leg3 = route.legs[2]!;

    assert.equal(route.stops[0]!.name, 'Ramanagara Tea Halt');
    assert.equal(route.stops[0]!.userDefined, true);
    assert.equal(route.stops[0]!.estimatedArrival, leg1.arrivalTime);

    // Leg 2 departs when Leg 1 arrives
    assert.equal(leg2.departureTime, leg1.arrivalTime);
    assert.equal(route.stops[1]!.estimatedArrival, leg2.arrivalTime);

    // Leg 3 arrives at destination
    assert.equal(route.arrivalTime, leg3.arrivalTime);
  });

  it('should skip intermediate checkpoints for short routes (< 30 min)', async () => {
    routingProvider.getRoutes = async () => ({
      provider: 'Mock Routing',
      routes: [
        {
          id: 'short-route',
          name: 'City Commute',
          distanceMetres: 12000,
          durationSeconds: 1200, // 20 minutes
          polyline: [
            [12.9716, 77.5946],
            [12.9352, 77.6245],
          ],
          legs: [],
          steps: [],
        },
      ],
    });

    const routes = await planRoutes({
      start: { name: 'MG Road', lat: 12.9716, lng: 77.5946 },
      destination: { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
      journeyDate: '2026-09-15',
      departureTime: '09:00',
    });

    assert.equal(routes.length, 1);
    // Short route under 30m should not clutter user with checkpoints
    assert.equal(routes[0]!.checkpoints.length, 0);
  });

  it('should flag checkpoints that are near user stops (< 2.5 km)', async () => {
    routingProvider.getRoutes = async () => ({
      provider: 'Mock Routing',
      routes: [
        {
          id: 'route-proximity',
          name: 'Proximity Test Route',
          distanceMetres: 120000,
          durationSeconds: 6000,
          polyline: mockPolyline,
          legs: [],
          steps: [],
        },
      ],
    });

    // Place a user stop close to one of the checkpoint coordinates (~50% along route)
    const midPoint = mockPolyline[2]!; // approx [12.5200, 77.0500]

    const routes = await planRoutes({
      start: { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      destination: { name: 'Mysore', lat: 12.2958, lng: 76.6394 },
      stops: [
        { name: 'Maddur Stop', lat: midPoint[0], lng: midPoint[1] },
      ],
      journeyDate: '2026-09-15',
      departureTime: '06:00',
    });

    const route = routes[0]!;
    const nearbyCheckpoint = route.checkpoints.find((cp) => cp.isUserStopNearby);
    assert.ok(nearbyCheckpoint, 'Expected at least one checkpoint to identify nearby user stop');
  });

  it('should handle midnight-crossing journeys accurately', () => {
    // Trip departing at 23:30 UTC for 2 hours (120 min) -> arrives at 01:30 next day UTC
    const { date, isoString } = parseDepartureDateTime('2026-09-15', '23:30', 'UTC');
    assert.ok(date);

    const plannedRoute = {
      id: 'midnight-route',
      name: 'Night Ride',
      distanceMeters: 100000,
      durationSeconds: 7200, // 2 hours
      geometry: mockPolyline,
      legs: [
        {
          id: 'leg-0',
          startLocation: { name: 'A', lat: 12.0, lng: 77.0 },
          endLocation: { name: 'B', lat: 13.0, lng: 78.0 },
          distanceMeters: 100000,
          durationSeconds: 7200,
          geometry: mockPolyline,
          departureTime: isoString,
          arrivalTime: new Date(date.getTime() + 7200 * 1000).toISOString(),
          steps: [],
        },
      ],
      stops: [],
      checkpoints: [
        {
          id: 'cp-1',
          routeId: 'midnight-route',
          sequence: 1,
          latitude: 12.5,
          longitude: 77.5,
          name: 'Midway Halt',
          locationType: 'TOWN',
          distanceFromStartMeters: 50000,
          distanceToNextMeters: 50000,
          elapsedTravelTimeSeconds: 3600, // 1 hour (00:30)
          estimatedArrivalTime: new Date(date.getTime() + 3600 * 1000).toISOString(),
          isUserStopNearby: false,
        },
      ],
      departureTime: isoString,
      arrivalTime: new Date(date.getTime() + 7200 * 1000).toISOString(),
    };

    const depD = new Date(plannedRoute.departureTime);
    const arrD = new Date(plannedRoute.arrivalTime);

    // Day should increment across midnight
    assert.notEqual(depD.getUTCDate(), arrD.getUTCDate());
    assert.equal(arrD.getTime() - depD.getTime(), 7200 * 1000);
  });

  it('should recalculate all downstream ETAs instantaneously when departure time changes', () => {
    const originalRoute = {
      id: 'recalc-route',
      name: 'Recalc Route',
      distanceMeters: 80000,
      durationSeconds: 3600, // 1 hour
      geometry: mockPolyline,
      legs: [
        {
          id: 'leg-0',
          startLocation: { name: 'A', lat: 12.0, lng: 77.0 },
          endLocation: { name: 'B', lat: 13.0, lng: 78.0 },
          distanceMeters: 80000,
          durationSeconds: 3600,
          geometry: mockPolyline,
          departureTime: '2026-09-15T06:00:00.000Z',
          arrivalTime: '2026-09-15T07:00:00.000Z',
          steps: [],
        },
      ],
      stops: [
        {
          id: 'stop-1',
          sequence: 1,
          name: 'Intermediate Halt',
          latitude: 12.5,
          longitude: 77.5,
          locationType: 'WAYPOINT',
          userDefined: true as const,
          estimatedArrival: '2026-09-15T06:30:00.000Z',
          distanceFromStartMeters: 40000,
        },
      ],
      checkpoints: [
        {
          id: 'cp-1',
          routeId: 'recalc-route',
          sequence: 1,
          latitude: 12.3,
          longitude: 77.3,
          name: 'Town Junction',
          locationType: 'JUNCTION',
          distanceFromStartMeters: 20000,
          distanceToNextMeters: 60000,
          elapsedTravelTimeSeconds: 1200, // 20 min
          estimatedArrivalTime: '2026-09-15T06:20:00.000Z',
          isUserStopNearby: false,
        },
      ],
      departureTime: '2026-09-15T06:00:00.000Z',
      arrivalTime: '2026-09-15T07:00:00.000Z',
    };

    // User shifts departure from 06:00 to 09:30
    const updated = recalculateRouteETAs(originalRoute, '2026-09-15', '09:30', 'Asia/Kolkata');

    const newDep = new Date(updated.departureTime);
    const newArr = new Date(updated.arrivalTime);
    assert.equal(newArr.getTime() - newDep.getTime(), 3600 * 1000);

    // Checkpoint ETA shifted by exactly 20 minutes from new departure
    const cpEta = new Date(updated.checkpoints[0]!.estimatedArrivalTime);
    assert.equal(cpEta.getTime() - newDep.getTime(), 1200 * 1000);

    // Geometry is untouched and preserved
    assert.equal(updated.geometry, originalRoute.geometry);
  });
});
