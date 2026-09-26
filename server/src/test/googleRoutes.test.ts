import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { GoogleRoutesProvider } from '../providers/routing/GoogleRoutesProvider';
import {
  ProviderAuthError,
  InvalidCoordinatesError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  RouteNotFoundError,
} from '../errors/ProviderErrors';

describe('GoogleRoutesProvider', () => {
  const originalPost = axios.post;

  afterEach(() => {
    axios.post = originalPost;
  });

  it('should normalize Google Routes API response into RouteAlternative[] with legs & steps', async () => {
    // Encoded polyline for roughly Bangalore to Hosur
    const mockPolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    
    axios.post = async () => ({
      data: {
        routes: [
          {
            description: 'NH 44 Route',
            distanceMeters: 42000,
            duration: '3120s',
            polyline: {
              encodedPolyline: mockPolyline,
            },
            legs: [
              {
                distanceMeters: 42000,
                duration: '3120s',
                startLocation: { latLng: { latitude: 12.9716, longitude: 77.5946 } },
                endLocation: { latLng: { latitude: 12.7409, longitude: 77.8253 } },
                steps: [
                  {
                    distanceMeters: 5000,
                    staticDuration: '600s',
                    navigationInstruction: { instructions: 'Head south on Hosur Rd' },
                    startLocation: { latLng: { latitude: 12.9716, longitude: 77.5946 } },
                    endLocation: { latLng: { latitude: 12.9300, longitude: 77.6100 } },
                  },
                ],
              },
            ],
          },
          {
            description: 'Alternative via Electronic City Flyover',
            distanceMeters: 44000,
            duration: '2980s',
            polyline: {
              encodedPolyline: mockPolyline,
            },
            legs: [],
          },
        ],
      },
    }) as any;

    const provider = new GoogleRoutesProvider('test-api-key');
    const response = await provider.getRoutes({
      origin: { lat: 12.9716, lng: 77.5946 },
      destination: { lat: 12.7409, lng: 77.8253 },
      mode: 'motorcycle',
      alternatives: true,
    });

    assert.equal(response.provider, 'Google Routes');
    assert.equal(response.routes.length, 2);

    const primary = response.routes[0]!;
    assert.equal(primary.id, 'google-route-0');
    assert.equal(primary.name, 'NH 44 Route');
    assert.equal(primary.distanceMetres, 42000);
    assert.equal(primary.durationSeconds, 3120);
    assert.ok(primary.polyline.length > 0);
    assert.equal(primary.legs.length, 1);
    assert.equal(primary.steps.length, 1);
    assert.equal(primary.steps[0]!.instruction, 'Head south on Hosur Rd');

    const alt = response.routes[1]!;
    assert.equal(alt.id, 'google-route-1');
    assert.equal(alt.name, 'Alternative via Electronic City Flyover');
    assert.equal(alt.distanceMetres, 44000);
    assert.equal(alt.durationSeconds, 2980);
  });

  it('should throw ProviderAuthError if API key is missing', async () => {
    const provider = new GoogleRoutesProvider('');
    await assert.rejects(
      async () => {
        await provider.getRoutes({
          origin: { lat: 12.9716, lng: 77.5946 },
          destination: { lat: 12.7409, lng: 77.8253 },
        });
      },
      (err: any) => err instanceof ProviderAuthError,
    );
  });

  it('should throw InvalidCoordinatesError if coords are out of bounds', async () => {
    const provider = new GoogleRoutesProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.getRoutes({
          origin: { lat: 95.0, lng: 77.5946 }, // Lat > 90
          destination: { lat: 12.7409, lng: 77.8253 },
        });
      },
      (err: any) => err instanceof InvalidCoordinatesError,
    );
  });

  it('should throw RouteNotFoundError if API returns 0 routes', async () => {
    axios.post = async () => ({
      data: { routes: [] },
    }) as any;

    const provider = new GoogleRoutesProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.getRoutes({
          origin: { lat: 12.9716, lng: 77.5946 },
          destination: { lat: 12.7409, lng: 77.8253 },
        });
      },
      (err: any) => err instanceof RouteNotFoundError,
    );
  });

  it('should throw ProviderRateLimitError on 429 status', async () => {
    axios.post = async () => {
      const err: any = new Error('Request failed with status code 429');
      err.response = { status: 429 };
      throw err;
    };

    const provider = new GoogleRoutesProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.getRoutes({
          origin: { lat: 12.9716, lng: 77.5946 },
          destination: { lat: 12.7409, lng: 77.8253 },
        });
      },
      (err: any) => err instanceof ProviderRateLimitError,
    );
  });

  it('should throw ProviderTimeoutError on timeout', async () => {
    axios.post = async () => {
      const err: any = new Error('timeout of 12000ms exceeded');
      err.code = 'ECONNABORTED';
      throw err;
    };

    const provider = new GoogleRoutesProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.getRoutes({
          origin: { lat: 12.9716, lng: 77.5946 },
          destination: { lat: 12.7409, lng: 77.8253 },
        });
      },
      (err: any) => err instanceof ProviderTimeoutError,
    );
  });
});
