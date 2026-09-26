// ============================================================
// BiCAST Cache Service
// In-memory TTL caching layer for external API results
// Reduces redundant calls, cost, and latency
// ============================================================
import { logger } from '../utils/logger';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // timestamp ms
}

export const CACHE_TTL = {
  ROUTING: parseInt(process.env.ROUTING_CACHE_TTL_SECONDS ?? '1800', 10),
  WEATHER: parseInt(process.env.WEATHER_CACHE_TTL_SECONDS ?? '900', 10), // 15 mins
  PLACES: parseInt(process.env.PLACES_CACHE_TTL_SECONDS ?? '21600', 10), // 6 hours
  GEOCODING: parseInt(process.env.GEOCODING_CACHE_TTL_SECONDS ?? '86400', 10), // 24 hours
};

export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = 2000) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.ROUTING): Promise<void> {
    // Evict oldest if reaching capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictExpiredOrOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictExpiredOrOldest(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [k, v] of this.cache.entries()) {
      if (now > v.expiresAt) {
        this.cache.delete(k);
        deletedCount++;
      }
    }

    // If still at capacity, drop the first 10% of entries (LRU-like approximation)
    if (this.cache.size >= this.maxEntries) {
      const dropCount = Math.max(1, Math.floor(this.maxEntries * 0.1));
      let count = 0;
      for (const k of this.cache.keys()) {
        this.cache.delete(k);
        count++;
        if (count >= dropCount) break;
      }
    }

    logger.debug(`Cache pruned (freed ${deletedCount} expired items)`);
  }
}

// Global cache singleton instance
export const cacheService = new MemoryCacheService();

// Key Generation Helpers
export function roundCoord(val: number, precision: number = 4): string {
  return val.toFixed(precision);
}

export function makeRoutingKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  intermediates?: Array<{ lat: number; lng: number }>,
  mode: string = 'motorcycle',
): string {
  const intermediateStr = (intermediates ?? [])
    .map((i) => `${roundCoord(i.lat)},${roundCoord(i.lng)}`)
    .join('|');
  return `route:${mode}:${roundCoord(originLat)},${roundCoord(originLng)}->${roundCoord(destLat)},${roundCoord(destLng)}:${intermediateStr}`;
}

export function makeGeocodeKey(query: string): string {
  return `geocode:${query.trim().toLowerCase()}`;
}

export function makeReverseGeocodeKey(lat: number, lng: number): string {
  return `revgeocode:${roundCoord(lat)},${roundCoord(lng)}`;
}

export function makePlacesKey(
  lat: number,
  lng: number,
  radiusMetres: number,
  categories: string[],
): string {
  const cats = [...categories].sort().join(',');
  return `places:${roundCoord(lat, 3)},${roundCoord(lng, 3)}:r${radiusMetres}:${cats}`;
}

export function makeWeatherKey(lat: number, lng: number, date: Date): string {
  // Round to nearest hour for weather caching
  const hourIso = new Date(
    Math.round(date.getTime() / (3600 * 1000)) * (3600 * 1000),
  ).toISOString();
  return `weather:${roundCoord(lat, 3)},${roundCoord(lng, 3)}:${hourIso}`;
}
