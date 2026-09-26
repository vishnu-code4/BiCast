// ============================================================
// Routing Routes
// ============================================================
import { Router } from 'express';
import { getRoutesHandler } from '../controllers/routingController';
import { planRoutesHandler, recalculateEtaHandler } from '../controllers/routePlanningController';

const router = Router();

// GET /api/routing/routes?originLat=...&originLng=...&destLat=...&destLng=...
router.get('/routes', getRoutesHandler);

// POST /api/routes/plan (or /api/routing/plan)
router.post('/plan', planRoutesHandler);

// POST /api/routes/recalculate-eta
router.post('/recalculate-eta', recalculateEtaHandler);

export default router;

