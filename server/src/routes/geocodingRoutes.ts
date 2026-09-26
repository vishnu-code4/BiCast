// ============================================================
// Geocoding Routes
// ============================================================
import { Router } from 'express';
import { geocodeHandler, reverseGeocodeHandler } from '../controllers/geocodingController';

const router = Router();

// GET /api/geocoding/search?q=...
router.get('/search', geocodeHandler);

// GET /api/geocoding/reverse?lat=...&lng=...
router.get('/reverse', reverseGeocodeHandler);

export default router;
