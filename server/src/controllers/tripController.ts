// ============================================================
// BiCAST Trip Controller
// ============================================================
import { Request, Response } from 'express';
import { tripService } from '../services/tripService';
import {
  CreateTripSchema,
  UpdateTripSchema,
  TripQuerySchema,
} from '../types/trip';
import { logger } from '../utils/logger';

export class TripController {
  /**
   * POST /api/trips
   */
  async createTrip(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateTripSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid trip input',
          details: parsed.error.issues,
        });
        return;
      }

      const trip = await tripService.createTrip(parsed.data);
      res.status(201).json({
        message: 'Trip saved successfully',
        trip,
      });
    } catch (err: any) {
      logger.error(`Error saving trip: ${err.message}`);
      res.status(500).json({ error: 'Failed to save trip', details: err.message });
    }
  }

  /**
   * GET /api/trips
   */
  async getTrips(req: Request, res: Response): Promise<void> {
    try {
      const parsed = TripQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await tripService.getTrips(parsed.data);
      res.json(result);
    } catch (err: any) {
      logger.error(`Error fetching trips: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch trips', details: err.message });
    }
  }

  /**
   * GET /api/trips/history
   */
  async getTripHistory(req: Request, res: Response): Promise<void> {
    try {
      const parsed = TripQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await tripService.getTripHistory(parsed.data);
      res.json(result);
    } catch (err: any) {
      logger.error(`Error fetching trip history: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch trip history', details: err.message });
    }
  }

  /**
   * GET /api/trips/:tripId
   */
  async getTripById(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      if (!tripId) {
        res.status(400).json({ error: 'tripId is required' });
        return;
      }

      const trip = await tripService.getTripById(tripId);
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      res.json({ trip });
    } catch (err: any) {
      logger.error(`Error fetching trip ${req.params.tripId}: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch trip', details: err.message });
    }
  }

  /**
   * PATCH /api/trips/:tripId
   */
  async updateTrip(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      if (!tripId) {
        res.status(400).json({ error: 'tripId is required' });
        return;
      }

      const parsed = UpdateTripSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid update data',
          details: parsed.error.issues,
        });
        return;
      }

      const updated = await tripService.updateTrip(tripId, parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      res.json({
        message: 'Trip updated successfully',
        trip: updated,
      });
    } catch (err: any) {
      logger.error(`Error updating trip ${req.params.tripId}: ${err.message}`);
      res.status(500).json({ error: 'Failed to update trip', details: err.message });
    }
  }

  /**
   * DELETE /api/trips/:tripId
   */
  async deleteTrip(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      if (!tripId) {
        res.status(400).json({ error: 'tripId is required' });
        return;
      }

      const success = await tripService.deleteTrip(tripId);
      if (!success) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      res.json({ message: 'Trip deleted successfully', id: tripId });
    } catch (err: any) {
      logger.error(`Error deleting trip ${req.params.tripId}: ${err.message}`);
      res.status(500).json({ error: 'Failed to delete trip', details: err.message });
    }
  }

  /**
   * POST /api/trips/:tripId/duplicate
   */
  async duplicateTrip(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      const { name } = req.body || {};

      if (!tripId) {
        res.status(400).json({ error: 'tripId is required' });
        return;
      }

      const duplicated = await tripService.duplicateTrip(tripId, name);
      if (!duplicated) {
        res.status(404).json({ error: 'Trip not found to duplicate' });
        return;
      }

      res.status(201).json({
        message: 'Trip duplicated successfully',
        trip: duplicated,
      });
    } catch (err: any) {
      logger.error(`Error duplicating trip ${req.params.tripId}: ${err.message}`);
      res.status(500).json({ error: 'Failed to duplicate trip', details: err.message });
    }
  }

  /**
   * POST /api/trips/:tripId/recalculate
   */
  async recalculateTrip(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;
      const { departureTime, journeyDate } = req.body || {};

      if (!tripId) {
        res.status(400).json({ error: 'tripId is required' });
        return;
      }

      const recalculated = await tripService.recalculateTrip(tripId, {
        departureTime,
        journeyDate,
      });

      if (!recalculated) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      res.json({
        message: 'Trip recalculated successfully',
        trip: recalculated,
      });
    } catch (err: any) {
      logger.error(`Error recalculating trip ${req.params.tripId}: ${err.message}`);
      res.status(500).json({ error: 'Failed to recalculate trip', details: err.message });
    }
  }
}

export const tripController = new TripController();
