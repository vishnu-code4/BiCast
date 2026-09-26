// ============================================================
// Risk & Safety Routes
// ============================================================
import { Router } from 'express';
import {
  analyzeRouteRiskHandler,
  analyzeMultiRouteRiskHandler,
} from '../controllers/riskController';

const router = Router();

// POST /api/risk/route (or /api/routes/risk)
router.post('/route', analyzeRouteRiskHandler);
router.post('/analyze', analyzeRouteRiskHandler);

// POST /api/risk/multi-route
router.post('/multi-route', analyzeMultiRouteRiskHandler);
router.post('/multi', analyzeMultiRouteRiskHandler);

export default router;
