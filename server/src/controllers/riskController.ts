// ============================================================
// BiCAST Weather Risk & Safety Controller
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { weatherRiskService } from '../services/weatherRiskService';
import { getRouteWeatherTimeline, getMultiRouteWeatherTimelines } from '../services/routeWeatherService';
import { PlannedRoute } from '../types/routePlan';
import { RouteWeatherTimeline } from '../types/weatherTimeline';

const LocationInputSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
});

const CheckpointSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  sequence: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string(),
  locationType: z.string(),
  distanceFromStartMeters: z.number(),
  distanceToNextMeters: z.number(),
  elapsedTravelTimeSeconds: z.number(),
  estimatedArrivalTime: z.string(),
  isUserStopNearby: z.boolean(),
});

const TripStopSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  placeId: z.string().optional(),
  locationType: z.string(),
  userDefined: z.literal(true),
  estimatedArrival: z.string().optional(),
  distanceFromStartMeters: z.number().optional(),
});

const PlannedRouteSchema = z.object({
  id: z.string(),
  name: z.string(),
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  geometry: z.array(z.tuple([z.number(), z.number()])),
  legs: z.array(z.any()),
  stops: z.array(TripStopSchema),
  checkpoints: z.array(CheckpointSchema),
  departureTime: z.string(),
  arrivalTime: z.string(),
  startLocation: LocationInputSchema.optional(),
  destination: LocationInputSchema.optional(),
  summary: z.string().optional(),
});

const RouteRiskRequestSchema = z.object({
  route: PlannedRouteSchema,
  timeline: z.any().optional(),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

const MultiRouteRiskRequestSchema = z.object({
  routes: z.array(PlannedRouteSchema).min(1).max(5),
  timelines: z.record(z.any()).optional(),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

export const analyzeRouteRiskHandler = asyncHandler(async (req: Request, res: Response) => {
  const { route, timeline: providedTimeline, timezone } = RouteRiskRequestSchema.parse(req.body);
  const plannedRoute = route as unknown as PlannedRoute;

  // If timeline wasn't provided, fetch it directly
  const timeline: RouteWeatherTimeline =
    providedTimeline || (await getRouteWeatherTimeline(plannedRoute, timezone));

  const riskAnalysis = weatherRiskService.analyzeRouteRisk(plannedRoute, timeline);
  res.json({ riskAnalysis });
});

export const analyzeMultiRouteRiskHandler = asyncHandler(async (req: Request, res: Response) => {
  const { routes, timelines: providedTimelines, timezone } = MultiRouteRiskRequestSchema.parse(req.body);
  const plannedRoutes = routes as unknown as PlannedRoute[];

  // If timelines weren't provided, fetch for all routes concurrently
  const timelines: Record<string, RouteWeatherTimeline> =
    providedTimelines || (await getMultiRouteWeatherTimelines(plannedRoutes, timezone));

  const riskAnalyses = weatherRiskService.analyzeMultiRouteRisk(plannedRoutes, timelines);
  res.json({ riskAnalyses });
});
