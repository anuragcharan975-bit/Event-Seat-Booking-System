const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const holdController = require('../controllers/holdController');
const { validateEventId, validateCreateHold } = require('../validators/holdValidators');
const validateRequest = require('../middlewares/validateRequest');
const { requireAuth } = require('../middlewares/authMiddleware');

// Public endpoints
router.get('/', eventController.getEvents);
router.get('/:eventId/seats', validateEventId, validateRequest, eventController.getEventSeats);

// Protected hold endpoints scoped under an event
router.post('/:eventId/holds', requireAuth, validateCreateHold, validateRequest, holdController.createHold);
router.get('/:eventId/my-hold', requireAuth, validateEventId, validateRequest, holdController.getMyActiveHold);

module.exports = router;
