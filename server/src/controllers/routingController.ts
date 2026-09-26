// ============================================================
// Routing Controller
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { getRoutes } from '../services/routingService';
import { AppError } from '../middleware/errorHandler';

const RoutingQuerySchema = z.object({
  originLat: z.string().transform(Number),
  originLng: z.string().transform(Number),
  destLat: z.string().transform(Number),
  destLng: z.string().transform(Number),
  alternatives: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
});

export const getRoutesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = RoutingQuerySchema.parse(req.query);

  const { originLat, originLng, destLat, destLng, alternatives } = query;

  if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
    throw new AppError(400, 'Invalid coordinates', 'INVALID_COORDINATES');
  }

  const result = await getRoutes({
    origin: { lat: originLat, lng: originLng },
    destination: { lat: destLat, lng: destLng },
    alternatives,
    mode: 'motorcycle',
  });

  res.json(result);
});
