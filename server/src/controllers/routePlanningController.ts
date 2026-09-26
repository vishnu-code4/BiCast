// ============================================================
// Route Planning Controller
// Handles POST /api/routes/plan and ETA recalculation
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { planRoutes, recalculateRouteETAs } from '../services/routePlanningService';

const LocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
});

const RoutePlanRequestSchema = z.object({
  start: LocationSchema,
  destination: LocationSchema,
  stops: z.array(LocationSchema).optional().default([]),
  journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  departureTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Invalid time format (HH:mm)'),
  timezone: z.string().optional().default('Asia/Kolkata'),
  alternatives: z.boolean().optional().default(true),
});

const RecalculateETASchema = z.object({
  route: z.any(),
  journeyDate: z.string(),
  departureTime: z.string(),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

export const planRoutesHandler = asyncHandler(async (req: Request, res: Response) => {
  const planRequest = RoutePlanRequestSchema.parse(req.body);
  const routes = await planRoutes(planRequest);
  res.json({ routes });
});

export const recalculateEtaHandler = asyncHandler(async (req: Request, res: Response) => {
  const { route, journeyDate, departureTime, timezone } = RecalculateETASchema.parse(req.body);
  const updatedRoute = recalculateRouteETAs(route, journeyDate, departureTime, timezone);
  res.json({ route: updatedRoute });
});
