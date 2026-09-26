// ============================================================
// BiCAST Fuel Controller
// Handles motorcycle fuel calculations and station recommendations
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { fuelPlanningService } from '../services/fuelPlanningService';
import { getPlannedRouteById } from '../services/routePlanningService';
import { PlannedRoute } from '../types/routePlan';

// Zod Schema for Fuel Inputs
const FuelInputSchema = z
  .object({
    mileageKmPerLitre: z
      .number({ required_error: 'Mileage in km/L is required' })
      .positive('Mileage must be greater than 0'),
    fuelPricePerLitre: z
      .number()
      .nonnegative('Fuel price cannot be negative')
      .optional(),
    currentFuelLitres: z
      .number()
      .nonnegative('Current fuel cannot be negative')
      .optional(),
    fuelTankCapacityLitres: z
      .number()
      .positive('Tank capacity must be greater than 0')
      .optional(),
    reserveLitres: z
      .number()
      .nonnegative('Safety reserve cannot be negative')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.currentFuelLitres != null && data.fuelTankCapacityLitres != null) {
        return data.currentFuelLitres <= data.fuelTankCapacityLitres;
      }
      return true;
    },
    {
      message: 'Current fuel level cannot exceed total fuel tank capacity',
      path: ['currentFuelLitres'],
    },
  )
  .refine(
    (data) => {
      if (data.currentFuelLitres != null && data.reserveLitres != null) {
        return data.reserveLitres <= data.currentFuelLitres;
      }
      return true;
    },
    {
      message: 'Safety reserve cannot exceed current fuel level',
      path: ['reserveLitres'],
    },
  );

const CalculateRouteFuelBodySchema = z.object({
  fuelInput: FuelInputSchema,
  route: z.any().optional(),
});

const CalculateMultiRouteFuelBodySchema = z.object({
  fuelInput: FuelInputSchema,
  routes: z.array(z.any()).min(1, 'At least one route is required'),
});

/**
 * POST /api/routes/:routeId/fuel/calculate
 * Calculates fuel consumption, range, and station recommendations for a single route
 */
export const calculateRouteFuelHandler = asyncHandler(async (req: Request, res: Response) => {
  const { routeId } = req.params;
  const body = CalculateRouteFuelBodySchema.parse(req.body);

  // Retrieve route from cache or request body fallback
  let plannedRoute: PlannedRoute | null = null;
  if (body.route) {
    plannedRoute = body.route as PlannedRoute;
  } else if (routeId) {
    plannedRoute = await getPlannedRouteById(routeId);
  }

  if (!plannedRoute) {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route '${routeId}' not found. Please provide route object in request body.`,
      },
    });
    return;
  }

  const fuelPlan = await fuelPlanningService.planRouteFuel(plannedRoute, body.fuelInput);
  res.json({ fuelPlan });
});

/**
 * POST /api/routes/fuel/calculate-multi
 * Calculates fuel metrics and recommendations across multiple route alternatives
 */
export const calculateMultiRouteFuelHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = CalculateMultiRouteFuelBodySchema.parse(req.body);
  const plannedRoutes = body.routes as PlannedRoute[];

  const fuelPlans = await fuelPlanningService.planMultiRouteFuel(plannedRoutes, body.fuelInput);
  res.json({ fuelPlans });
});
