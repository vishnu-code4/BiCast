// ============================================================
// Weather Controller
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { weatherProvider } from '../providers';
import {
  getRouteWeatherTimeline,
  getMultiRouteWeatherTimelines,
} from '../services/routeWeatherService';

const WeatherQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
  forecastAt: z.string().datetime({ offset: true }),
});

const WeatherBatchBodySchema = z.object({
  requests: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        forecastAt: z.string().datetime({ offset: true }),
      }),
    )
    .min(1)
    .max(20),
});

export const getWeatherHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = WeatherQuerySchema.parse(req.query);
  const result = await weatherProvider.getForecast({
    lat: query.lat,
    lng: query.lng,
    forecastAt: new Date(query.forecastAt),
  });
  res.json(result);
});

export const getWeatherBatchHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = WeatherBatchBodySchema.parse(req.body);
  const results = await weatherProvider.getForecastBatch(
    body.requests.map((r) => ({
      ...r,
      forecastAt: new Date(r.forecastAt),
    })),
  );
  res.json({ results });
});

// Zod schemas for route weather timeline
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

const RouteWeatherTimelineSchema = z.object({
  route: PlannedRouteSchema,
  timezone: z.string().optional().default('Asia/Kolkata'),
});

const MultiRouteWeatherTimelineSchema = z.object({
  routes: z.array(PlannedRouteSchema).min(1).max(5),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

export const getRouteWeatherTimelineHandler = asyncHandler(async (req: Request, res: Response) => {
  const { route, timezone } = RouteWeatherTimelineSchema.parse(req.body);
  const timeline = await getRouteWeatherTimeline(route as any, timezone);
  res.json({ timeline });
});

export const getMultiRouteWeatherTimelineHandler = asyncHandler(async (req: Request, res: Response) => {
  const { routes, timezone } = MultiRouteWeatherTimelineSchema.parse(req.body);
  const timelines = await getMultiRouteWeatherTimelines(routes as any, timezone);
  res.json({ timelines });
});

