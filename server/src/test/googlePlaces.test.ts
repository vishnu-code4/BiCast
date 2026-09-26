import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import {
  GooglePlacesProvider,
  filterPlacesByRouteProximity,
} from '../providers/places/GooglePlacesProvider';
import {
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  InvalidCoordinatesError,
} from '../errors/ProviderErrors';

describe('GooglePlacesProvider', () => {
  const originalPost = axios.post;

  afterEach(() => {
    axios.post = originalPost;
  });

  it('should normalize Google Places API (New) searchNearby response', async () => {
    axios.post = async () => ({
      data: {
        places: [
          {
            id: 'places/ChIJ_hp_petrol_1',
            displayName: { text: 'HP Petrol Pump Highway Fuel Station' },
            primaryType: 'gas_station',
            types: ['gas_station', 'point_of_interest', 'establishment'],
            location: { latitude: 12.9720, longitude: 77.5950 },
            formattedAddress: 'MG Road, Bengaluru, Karnataka',
            rating: 4.3,
            userRatingCount: 310,
            regularOpeningHours: { openNow: true },
            nationalPhoneNumber: '080 1234 5678',
            websiteUri: 'https://hindustanpetroleum.com',
          },
          {
            id: 'places/ChIJ_cafe_1',
            displayName: { text: 'Highway Riders Cafe' },
            primaryType: 'cafe',
            types: ['cafe', 'restaurant', 'food'],
            location: { latitude: 12.9750, longitude: 77.5980 },
            formattedAddress: 'Brigade Road, Bengaluru',
            rating: 4.7,
            userRatingCount: 820,
            regularOpeningHours: { openNow: true },
          },
        ],
      },
    }) as any;

    const provider = new GooglePlacesProvider('test-api-key');
    const places = await provider.searchNearby({
      lat: 12.9716,
      lng: 77.5946,
      radiusMetres: 3000,
      categories: ['fuel', 'cafe'],
      limit: 10,
    });

    assert.equal(places.length, 2);

    const fuel = places.find((p) => p.placeId === 'places/ChIJ_hp_petrol_1');
    assert.ok(fuel);
    assert.equal(fuel.name, 'HP Petrol Pump Highway Fuel Station');
    assert.equal(fuel.category, 'fuel');
    assert.equal(fuel.lat, 12.9720);
    assert.equal(fuel.lng, 77.5950);
    assert.equal(fuel.isOpen, true);
    assert.equal(fuel.rating, 4.3);
    assert.equal(fuel.phone, '080 1234 5678');
    assert.ok((fuel.distanceMetres ?? 0) < 500);

    const cafe = places.find((p) => p.placeId === 'places/ChIJ_cafe_1');
    assert.ok(cafe);
    assert.equal(cafe.category, 'cafe');
  });

  it('should filter places by route proximity corridor', () => {
    // Route from (12.0, 77.0) to (12.0, 77.1) (approx 10.8 km along latitude 12)
    const routePolyline: Array<[number, number]> = [
      [12.0, 77.0],
      [12.0, 77.05],
      [12.0, 77.1],
    ];

    const mockPlaces = [
      {
        placeId: 'close-1',
        name: 'Right on Highway',
        category: 'fuel',
        lat: 12.0005, // ~55 metres from route line
        lng: 77.02,
      },
      {
        placeId: 'moderate-2',
        name: 'Nearby Town Fuel Station',
        category: 'fuel',
        lat: 12.015, // ~1.6 km from route line
        lng: 77.05,
      },
      {
        placeId: 'far-3',
        name: 'Faraway Mountain Lodge',
        category: 'hotel',
        lat: 12.15, // ~16.5 km away
        lng: 77.05,
      },
    ];

    // Filter with max deviation of 3000m (3km)
    const filtered = filterPlacesByRouteProximity(mockPlaces, routePolyline, 3000);

    assert.equal(filtered.length, 2);
    assert.equal(filtered[0]!.placeId, 'close-1');
    assert.ok((filtered[0]!.distanceFromRouteMetres ?? 0) < 100);
    assert.equal(filtered[1]!.placeId, 'moderate-2');
    assert.ok((filtered[1]!.distanceFromRouteMetres ?? 0) < 2000);
  });

  it('should throw ProviderAuthError on 403 unauthorized', async () => {
    axios.post = async () => {
      const err: any = new Error('Forbidden');
      err.response = { status: 403 };
      throw err;
    };

    const provider = new GooglePlacesProvider('invalid-key');
    await assert.rejects(
      async () => {
        await provider.searchNearby({
          lat: 12.9716,
          lng: 77.5946,
          radiusMetres: 2000,
          categories: ['fuel'],
        });
      },
      (err: any) => err instanceof ProviderAuthError,
    );
  });

  it('should throw ProviderRateLimitError on 429', async () => {
    axios.post = async () => {
      const err: any = new Error('Rate limit exceeded');
      err.response = { status: 429 };
      throw err;
    };

    const provider = new GooglePlacesProvider('test-key');
    await assert.rejects(
      async () => {
        await provider.searchNearby({
          lat: 12.9716,
          lng: 77.5946,
          radiusMetres: 2000,
          categories: ['fuel'],
        });
      },
      (err: any) => err instanceof ProviderRateLimitError,
    );
  });

  it('should throw ProviderTimeoutError on timeout', async () => {
    axios.post = async () => {
      const err: any = new Error('timeout of 10000ms exceeded');
      err.code = 'ECONNABORTED';
      throw err;
    };

    const provider = new GooglePlacesProvider('test-key');
    await assert.rejects(
      async () => {
        await provider.searchNearby({
          lat: 12.9716,
          lng: 77.5946,
          radiusMetres: 2000,
          categories: ['fuel'],
        });
      },
      (err: any) => err instanceof ProviderTimeoutError,
    );
  });

  it('should validate coordinates for places search', async () => {
    const provider = new GooglePlacesProvider('test-key');
    await assert.rejects(
      async () => {
        await provider.searchNearby({
          lat: 100, // Lat > 90
          lng: 77.5946,
          radiusMetres: 2000,
          categories: ['fuel'],
        });
      },
      (err: any) => err instanceof InvalidCoordinatesError,
    );
  });
});
