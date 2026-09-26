// ============================================================
// Route Places Routes
// ============================================================
import { Router } from 'express';
import {
  getRoutePlacesHandler,
  postRoutePlacesHandler,
  getCategoriesHandler,
} from '../controllers/routePlacesController';

const router = Router();

// GET /api/places/categories
router.get('/categories', getCategoriesHandler);

// POST /api/places/along-route (or /api/routes/places/along-route)
router.post('/along-route', postRoutePlacesHandler);

// GET /api/routes/:routeId/places
router.get('/:routeId/places', getRoutePlacesHandler);

export default router;
