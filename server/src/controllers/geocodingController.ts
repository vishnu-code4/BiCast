// ============================================================
// Geocoding Controller
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { geocode, reverseGeocode } from '../services/geocodingService';

const GeocodeQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

const ReverseGeocodeQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
});

export const geocodeHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q } = GeocodeQuerySchema.parse(req.query);
  const results = await geocode(q);
  res.json({ results, provider: 'nominatim' });
});

export const reverseGeocodeHandler = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = ReverseGeocodeQuerySchema.parse(req.query);
  const result = await reverseGeocode(lat, lng);
  res.json(result);
});
