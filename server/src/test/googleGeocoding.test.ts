import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { GoogleGeocodingProvider } from '../providers/geocoding/GoogleGeocodingProvider';
import {
  ProviderAuthError,
  ProviderRateLimitError,
  InvalidCoordinatesError,
} from '../errors/ProviderErrors';

describe('GoogleGeocodingProvider', () => {
  const originalGet = axios.get;

  afterEach(() => {
    axios.get = originalGet;
  });

  it('should normalize forward geocode response', async () => {
    axios.get = async () => ({
      data: {
        status: 'OK',
        results: [
          {
            place_id: 'ChIJbU60yXAWrjsR4E9-AWdmsss',
            formatted_address: 'Bengaluru, Karnataka, India',
            geometry: {
              location: { lat: 12.9716, lng: 77.5946 },
            },
            types: ['locality', 'political'],
            address_components: [
              { long_name: 'Bengaluru', short_name: 'Bengaluru', types: ['locality'] },
              { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1'] },
              { long_name: 'India', short_name: 'IN', types: ['country'] },
            ],
          },
        ],
      },
    }) as any;

    const provider = new GoogleGeocodingProvider('test-api-key');
    const results = await provider.geocode('Bengaluru');

    assert.equal(results.length, 1);
    assert.equal(results[0]!.placeId, 'ChIJbU60yXAWrjsR4E9-AWdmsss');
    assert.equal(results[0]!.name, 'Bengaluru');
    assert.equal(results[0]!.lat, 12.9716);
    assert.equal(results[0]!.lng, 77.5946);
    assert.equal(results[0]!.components?.state, 'Karnataka');
    assert.equal(results[0]!.components?.country, 'India');
  });

  it('should extract junction and town dynamically in reverse geocoding', async () => {
    axios.get = async () => ({
      data: {
        status: 'OK',
        results: [
          {
            place_id: 'ChIJ_junction_123',
            formatted_address: 'Nelamangala Toll Junction, NH 48, Nelamangala, Karnataka 562123, India',
            geometry: {
              location: { lat: 13.0982, lng: 77.3872 },
            },
            types: ['intersection'],
            address_components: [
              { long_name: 'Nelamangala Toll Junction', short_name: 'Nelamangala Toll Junction', types: ['intersection'] },
              { long_name: 'NH 48', short_name: 'NH 48', types: ['route'] },
              { long_name: 'Nelamangala', short_name: 'Nelamangala', types: ['postal_town', 'locality'] },
              { long_name: 'Bengaluru Rural', short_name: 'Bengaluru Rural', types: ['administrative_area_level_2'] },
              { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1'] },
              { long_name: 'India', short_name: 'IN', types: ['country'] },
              { long_name: '562123', short_name: '562123', types: ['postal_code'] },
            ],
          },
        ],
      },
    }) as any;

    const provider = new GoogleGeocodingProvider('test-api-key');
    const result = await provider.reverseGeocode(13.0982, 77.3872);

    assert.equal(result.placeId, 'ChIJ_junction_123');
    // Name prioritized junction
    assert.equal(result.name, 'Nelamangala Toll Junction');
    assert.equal(result.components.junction, 'Nelamangala Toll Junction');
    assert.equal(result.components.town, 'Nelamangala');
    assert.equal(result.components.road, 'NH 48');
    assert.equal(result.components.district, 'Bengaluru Rural');
    assert.equal(result.components.postalCode, '562123');
  });

  it('should return fallback coordinates name on ZERO_RESULTS reverse geocoding', async () => {
    axios.get = async () => ({
      data: {
        status: 'ZERO_RESULTS',
        results: [],
      },
    }) as any;

    const provider = new GoogleGeocodingProvider('test-api-key');
    const result = await provider.reverseGeocode(12.5, 77.5);
    assert.ok(result.name.includes('Location'));
    assert.equal(result.lat, 12.5);
    assert.equal(result.lng, 77.5);
  });

  it('should throw ProviderRateLimitError on OVER_QUERY_LIMIT', async () => {
    axios.get = async () => ({
      data: {
        status: 'OVER_QUERY_LIMIT',
        error_message: 'You have exceeded your daily request quota for this API.',
      },
    }) as any;

    const provider = new GoogleGeocodingProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.geocode('Mysore');
      },
      (err: any) => err instanceof ProviderRateLimitError,
    );
  });

  it('should throw ProviderAuthError on REQUEST_DENIED', async () => {
    axios.get = async () => ({
      data: {
        status: 'REQUEST_DENIED',
        error_message: 'The provided API key is invalid.',
      },
    }) as any;

    const provider = new GoogleGeocodingProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.geocode('Mysore');
      },
      (err: any) => err instanceof ProviderAuthError,
    );
  });

  it('should validate coordinates for reverse geocoding', async () => {
    const provider = new GoogleGeocodingProvider('test-api-key');
    await assert.rejects(
      async () => {
        await provider.reverseGeocode(-120, 77.5); // Lat < -90
      },
      (err: any) => err instanceof InvalidCoordinatesError,
    );
  });
});
