// ============================================================
// BiCAST Trip Service
// High-level trip lifecycle, persistence, recalculation pipeline,
// and history management.
// ============================================================
import { tripRepository, TripRepository } from '../repositories/tripRepository';
import {
  SavedTrip,
  TripListItem,
  CreateTripInput,
  UpdateTripInput,
  TripQueryOptions,
  TripHistoryStats,
} from '../types/trip';
import { routePlanningService } from './routePlanningService';
import { routeWeatherService } from './routeWeatherService';
import { weatherRiskService } from './weatherRiskService';
import { fuelPlanningService } from './fuelPlanningService';
import { FuelInput } from '../types/fuel';
import { logger } from '../utils/logger';

export class TripService {
  constructor(private repo: TripRepository = tripRepository) {}

  /**
   * Creates a new trip with persistent configuration and optional initial snapshot.
   */
  async createTrip(input: CreateTripInput): Promise<SavedTrip> {
    return this.repo.create(input);
  }

  /**
   * Retrieves a paginated list of trips matching query filters.
   */
  async getTrips(options: TripQueryOptions): Promise<{ trips: TripListItem[]; total: number; page: number; limit: number }> {
    const { trips, total } = await this.repo.findMany(options);
    return {
      trips,
      total,
      page: options.page,
      limit: options.limit,
    };
  }

  /**
   * Retrieves full trip details by ID.
   */
  async getTripById(id: string): Promise<SavedTrip | null> {
    return this.repo.findById(id);
  }

  /**
   * Updates an existing trip's persistent configuration.
   */
  async updateTrip(id: string, input: UpdateTripInput): Promise<SavedTrip | null> {
    return this.repo.update(id, input);
  }

  /**
   * Destructively deletes a trip and related records.
   */
  async deleteTrip(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  /**
   * Duplicates an existing trip with an independent copy of stops and configuration.
   */
  async duplicateTrip(id: string, newName?: string): Promise<SavedTrip | null> {
    return this.repo.duplicate(id, newName);
  }

  /**
   * Retrieves trip history with summary statistics.
   */
  async getTripHistory(options: TripQueryOptions): Promise<{
    trips: TripListItem[];
    total: number;
    page: number;
    limit: number;
    stats: TripHistoryStats;
  }> {
    const { trips, total } = await this.repo.findMany(options);

    // Compute overall history stats from all trips
    const { trips: allTrips } = await this.repo.findMany({
      status: 'ALL',
      sort: 'newest',
      page: 1,
      limit: 1000,
    });

    let plannedTrips = 0;
    let completedTrips = 0;
    let cancelledTrips = 0;
    let totalDistanceKm = 0;

    for (const t of allTrips) {
      if (t.status === 'PLANNED') plannedTrips++;
      else if (t.status === 'COMPLETED') completedTrips++;
      else if (t.status === 'CANCELLED') cancelledTrips++;

      if (t.distanceKm) totalDistanceKm += t.distanceKm;
    }

    return {
      trips,
      total,
      page: options.page,
      limit: options.limit,
      stats: {
        totalTrips: allTrips.length,
        plannedTrips,
        completedTrips,
        cancelledTrips,
        totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      },
    };
  }

  /**
   * Recalculates a saved trip through the complete BiCAST pipeline:
   * Saved Trip -> Route -> Checkpoints -> ETA -> Weather -> Risk -> Places -> Fuel
   * and updates the persisted snapshot.
   */
  async recalculateTrip(
    id: string,
    overrides?: { departureTime?: string; journeyDate?: string },
  ): Promise<SavedTrip | null> {
    const trip = await this.repo.findById(id);
    if (!trip) return null;

    // Apply schedule overrides if provided
    let journeyDate = trip.journeyDate;
    let departureTime = trip.departureTime;

    if (overrides?.journeyDate || overrides?.departureTime) {
      if (overrides.journeyDate) journeyDate = overrides.journeyDate;
      if (overrides.departureTime) departureTime = overrides.departureTime;
      await this.repo.update(id, { journeyDate, departureTime });
    }

    const departureIso = `${journeyDate}T${departureTime}:00Z`;

    // 1. Prepare start, destination, and user stops
    const startLoc = {
      name: trip.startLocation.name,
      lat: trip.startLocation.latitude,
      lng: trip.startLocation.longitude,
    };
    const destLoc = {
      name: trip.destination.name,
      lat: trip.destination.latitude,
      lng: trip.destination.longitude,
    };
    const stopsLoc = trip.stops.map((s) => ({
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      placeId: s.placeId,
    }));

    logger.info(`Recalculating saved trip ${id} ("${trip.name}") for departure ${departureIso}`);

    // 2. Run Route & Checkpoints Engine
    const routes = await routePlanningService.planRoutes({
      start: startLoc,
      destination: destLoc,
      stops: stopsLoc,
      journeyDate,
      departureTime,
      timezone: trip.timezone || 'Asia/Kolkata',
      alternatives: true,
    });

    const activeRoute = routes[0];
    if (!activeRoute) {
      throw new Error(`Failed to calculate route for trip ${id}`);
    }

    // 3. Run Weather Timeline Engine
    let weatherTimeline: any;
    try {
      weatherTimeline = await routeWeatherService.getRouteWeatherTimeline(
        activeRoute,
        trip.timezone || 'Asia/Kolkata',
      );
    } catch (err) {
      logger.warn(`Recalculation weather fetch failed for trip ${id}: ${err}`);
    }

    // 4. Run Risk Engine
    let riskAnalysis: any;
    if (weatherTimeline) {
      try {
        riskAnalysis = weatherRiskService.analyzeRouteRisk(
          activeRoute,
          weatherTimeline,
        );
      } catch (err) {
        logger.warn(`Recalculation risk analysis failed for trip ${id}: ${err}`);
      }
    }

    // 5. Run Fuel Planning Engine
    let fuelPlan: any;
    if (trip.fuelConfig && trip.fuelConfig.mileageKmPerLitre && trip.fuelConfig.mileageKmPerLitre > 0) {
      try {
        const fuelInput: FuelInput = {
          mileageKmPerLitre: trip.fuelConfig.mileageKmPerLitre,
          fuelPricePerLitre: trip.fuelConfig.fuelPricePerLitre,
          currentFuelLitres: trip.fuelConfig.currentFuelLitres,
          fuelTankCapacityLitres: trip.fuelConfig.fuelTankCapacityLitres,
          reserveLitres: trip.fuelConfig.reserveLitres,
        };
        fuelPlan = await fuelPlanningService.planRouteFuel(activeRoute, fuelInput);
      } catch (err) {
        logger.warn(`Recalculation fuel planning failed for trip ${id}: ${err}`);
      }
    }

    // 6. Update persistent calculated snapshot
    const updated = await this.repo.updateSnapshots(id, {
      selectedRouteId: activeRoute.id,
      route: activeRoute,
      alternatives: routes,
      weatherTimeline,
      riskAnalysis,
      fuelPlan,
    });

    return updated;
  }
}

export const tripService = new TripService();
