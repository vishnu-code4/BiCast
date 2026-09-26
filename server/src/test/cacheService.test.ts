import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryCacheService,
  roundCoord,
  makeRoutingKey,
  makeGeocodeKey,
  makeReverseGeocodeKey,
  makePlacesKey,
  makeWeatherKey,
} from '../cache/CacheService';

describe('MemoryCacheService', () => {
  it('should store and retrieve cached items', async () => {
    const cache = new MemoryCacheService(100);
    await cache.set('test-key', { foo: 'bar' }, 60);

    const res = await cache.get<{ foo: string }>('test-key');
    assert.deepEqual(res, { foo: 'bar' });
    assert.equal(cache.size(), 1);
  });

  it('should return null for non-existent keys', async () => {
    const cache = new MemoryCacheService(100);
    const res = await cache.get('does-not-exist');
    assert.equal(res, null);
  });

  it('should expire items after TTL', async () => {
    const cache = new MemoryCacheService(100);
    // Set 0 second TTL
    await cache.set('expiring-key', 'data', -1);

    const res = await cache.get('expiring-key');
    assert.equal(res, null);
  });

  it('should delete and clear cached items', async () => {
    const cache = new MemoryCacheService(100);
    await cache.set('k1', 'v1', 60);
    await cache.set('k2', 'v2', 60);

    const deleted = await cache.delete('k1');
    assert.equal(deleted, true);
    assert.equal(await cache.get('k1'), null);
    assert.equal(await cache.get('k2'), 'v2');

    await cache.clear();
    assert.equal(cache.size(), 0);
  });

  it('should prune entries when exceeding max capacity', async () => {
    const cache = new MemoryCacheService(5);
    for (let i = 0; i < 10; i++) {
      await cache.set(`k${i}`, `v${i}`, 60);
    }
    assert.ok(cache.size() <= 5);
  });

  it('should build consistent normalized cache keys', () => {
    assert.equal(roundCoord(12.9715987, 4), '12.9716');
    assert.equal(roundCoord(77.5945627, 3), '77.595');

    const routeKey = makeRoutingKey(12.9716, 77.5946, 13.0827, 80.2707, undefined, 'motorcycle');
    assert.ok(routeKey.startsWith('route:motorcycle:'));

    const geoKey = makeGeocodeKey('  Bangalore  ');
    assert.equal(geoKey, 'geocode:bangalore');

    const revKey = makeReverseGeocodeKey(12.9716, 77.5946);
    assert.equal(revKey, 'revgeocode:12.9716,77.5946');

    const placesKey = makePlacesKey(12.9716, 77.5946, 5000, ['restaurant', 'fuel']);
    assert.ok(placesKey.includes('fuel,restaurant'));

    const d = new Date('2026-09-10T08:23:45.000Z');
    const weatherKey = makeWeatherKey(12.9716, 77.5946, d);
    assert.ok(weatherKey.startsWith('weather:12.972,77.595:'));
  });
});
