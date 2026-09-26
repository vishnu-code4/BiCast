// ============================================================
// Weather Routes
// ============================================================
import { Router } from 'express';
import {
  getWeatherHandler,
  getWeatherBatchHandler,
  getRouteWeatherTimelineHandler,
  getMultiRouteWeatherTimelineHandler,
} from '../controllers/weatherController';

const router = Router();

// GET /api/weather?lat=...&lng=...&forecastAt=...
router.get('/', getWeatherHandler);

// POST /api/weather/batch
router.post('/batch', getWeatherBatchHandler);

// POST /api/weather/route-timeline (also alias /timeline)
router.post('/route-timeline', getRouteWeatherTimelineHandler);
router.post('/timeline', getRouteWeatherTimelineHandler);

// POST /api/weather/multi-route-timeline
router.post('/multi-route-timeline', getMultiRouteWeatherTimelineHandler);

export default router;

