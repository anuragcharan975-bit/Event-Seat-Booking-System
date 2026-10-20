const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const holdController = require('../controllers/holdController');
const { validateEventId, validateCreateHold } = require('../validators/holdValidators');
const validateRequest = require('../middlewares/validateRequest');
const { requireAuth } = require('../middlewares/authMiddleware');

// Public endpoints
router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.get('/:eventId/seats', validateEventId, validateRequest, eventController.getEventSeats);

// Protected hold endpoints scoped under an event (using MongoDB ObjectId)
router.get('/:eventId/my-hold', requireAuth, validateEventId, validateRequest, holdController.getMyActiveHold);
router.post('/:eventId/holds', requireAuth, validateCreateHold, validateRequest, holdController.createHold);

// SEO-friendly slug endpoints
router.get('/slug/:category/:slug', eventController.getEventBySlug);
router.get('/slug/:slug', eventController.getEventBySlug);
router.get('/by-slug/:slug', eventController.getEventBySlug);
router.get('/:category/:slug/seats', eventController.getEventBySlug);
router.get('/:category/:slug', eventController.getEventBySlug);
router.get('/:slug', eventController.getEventBySlug);

module.exports = router;
