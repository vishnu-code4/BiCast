// ============================================================
// BiCAST Trip Routes
// ============================================================
import { Router } from 'express';
import { tripController } from '../controllers/tripController';

const router = Router();

// Trip list and history
router.get('/', (req, res) => tripController.getTrips(req, res));
router.get('/history', (req, res) => tripController.getTripHistory(req, res));

// Trip creation
router.post('/', (req, res) => tripController.createTrip(req, res));

// Specific trip actions
router.get('/:tripId', (req, res) => tripController.getTripById(req, res));
router.patch('/:tripId', (req, res) => tripController.updateTrip(req, res));
router.delete('/:tripId', (req, res) => tripController.deleteTrip(req, res));
router.post('/:tripId/duplicate', (req, res) => tripController.duplicateTrip(req, res));
router.post('/:tripId/recalculate', (req, res) => tripController.recalculateTrip(req, res));

export { router as tripRouter };
