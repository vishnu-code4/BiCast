// ============================================================
// BiCAST Fuel Routes
// ============================================================
import { Router } from 'express';
import {
  calculateRouteFuelHandler,
  calculateMultiRouteFuelHandler,
} from '../controllers/fuelController';

const router = Router();

// POST /api/routes/fuel/calculate-multi (or /api/fuel/calculate-multi)
router.post('/fuel/calculate-multi', calculateMultiRouteFuelHandler);
router.post('/calculate-multi', calculateMultiRouteFuelHandler);

// POST /api/routes/:routeId/fuel/calculate (or /api/fuel/:routeId/calculate)
router.post('/:routeId/fuel/calculate', calculateRouteFuelHandler);
router.post('/:routeId/calculate', calculateRouteFuelHandler);

export default router;
