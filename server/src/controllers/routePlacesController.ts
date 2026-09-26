// ============================================================
// Route Places Controller
// Handles route-aware place searches along route corridors
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { routePlacesService } from '../services/routePlacesService';
import { getPlannedRouteById } from '../services/routePlanningService';
import { PlannedRoute } from '../types/routePlan';
import { ALL_PLACE_CATEGORIES } from '../config/placeCategories';

// Query schema for GET /api/routes/:routeId/places
const GetRoutePlacesQuerySchema = z.object({
  category: z.string().optional(),
  categories: z.string().optional(),
  radius: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= 500 && val <= 30000), {
      message: 'Radius must be between 500 and 30000 metres',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val >= 1 && val <= 100), {
      message: 'Limit must be between 1 and 100',
    }),
});

// Post body schema for POST /api/routes/places/along-route
const PostRoutePlacesBodySchema = z.object({
  route: z.object({
    id: z.string(),
    geometry: z.array(z.tuple([z.number(), z.number()])).min(2, 'Route geometry must have at least 2 points'),
    distanceMeters: z.number().optional().default(0),
    durationSeconds: z.number().optional().default(0),
  }).passthrough(),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  radius: z.number().min(500).max(30000).optional(),
  limit: z.number().min(1).max(100).optional(),
});

/**
 * GET /api/routes/:routeId/places
 * Discovers places along a cached route corridor
 */
export const getRoutePlacesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { routeId } = req.params;
  if (!routeId) {
    res.status(400).json({ error: { message: 'Route ID is required' } });
    return;
  }

  const query = GetRoutePlacesQuerySchema.parse(req.query);

  // Look up route in cache
  const cachedRoute = await getPlannedRouteById(routeId);
  if (!cachedRoute) {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route '${routeId}' not found or session expired. Please provide route geometry via POST /api/routes/places/along-route.`,
      },
    });
    return;
  }

  // Parse categories list from comma-separated string if provided
  let categoriesList: string[] | undefined;
  if (query.categories) {
    categoriesList = query.categories.split(',').map((c) => c.trim()).filter(Boolean);
  }

  const result = await routePlacesService.getPlacesAlongRoute(cachedRoute, {
    category: query.category,
    categories: categoriesList,
    radiusMeters: query.radius,
    limit: query.limit,
  });

  res.json(result);
});

/**
 * POST /api/routes/places/along-route
 * Discovers places along a provided route geometry directly
 */
export const postRoutePlacesHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = PostRoutePlacesBodySchema.parse(req.body);
  const plannedRoute = body.route as unknown as PlannedRoute;

  const result = await routePlacesService.getPlacesAlongRoute(plannedRoute, {
    category: body.category,
    categories: body.categories,
    radiusMeters: body.radius,
    limit: body.limit,
  });

  res.json(result);
});

/**
 * GET /api/places/categories
 * Returns metadata of all supported place categories
 */
export const getCategoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    categories: ALL_PLACE_CATEGORIES,
  });
});
