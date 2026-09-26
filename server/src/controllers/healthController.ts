// ============================================================
// Health Controller
// ============================================================
import { Request, Response } from 'express';

export function healthCheck(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'BiCAST API',
    timestamp: new Date().toISOString(),
    providers: {
      routing: process.env.ROUTING_PROVIDER ?? 'osrm',
      weather: process.env.WEATHER_PROVIDER ?? 'openmeteo',
      geocoding: process.env.GEOCODING_PROVIDER ?? 'nominatim',
      places: process.env.PLACES_PROVIDER ?? 'overpass',
    },
    environment: process.env.NODE_ENV ?? 'development',
  });
}
