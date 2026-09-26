// ============================================================
// Routes — root aggregator
// ============================================================
import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';
import geocodingRoutes from './geocodingRoutes';
import routingRoutes from './routingRoutes';
import weatherRoutes from './weatherRoutes';
import riskRoutes from './riskRoutes';
import routePlacesRoutes from './routePlacesRoutes';
import fuelRoutes from './fuelRoutes';
import { tripRouter } from './tripRoutes';

export const router = Router();

// Health check
router.get('/health', healthCheck);

// Feature routes
router.use('/geocoding', geocodingRoutes);
router.use('/routing', routingRoutes);
router.use('/routes', routingRoutes); // Alias for POST /api/routes/plan
router.use('/routes', routePlacesRoutes); // GET /api/routes/:routeId/places & POST /api/routes/along-route
router.use('/routes', fuelRoutes); // POST /api/routes/:routeId/fuel/calculate
router.use('/fuel', fuelRoutes); // POST /api/fuel/calculate-multi
router.use('/places', routePlacesRoutes); // GET /api/places/categories & POST /api/places/along-route
router.use('/weather', weatherRoutes);
router.use('/risk', riskRoutes);
router.use('/trips', tripRouter);

