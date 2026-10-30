const express = require('express');
const router = express.Router();
const holdController = require('../controllers/holdController');
const { validateHoldId } = require('../validators/holdValidators');
const validateRequest = require('../middlewares/validateRequest');
const { requireAuth } = require('../middlewares/authMiddleware');

// Get active hold for the current user
router.get('/active', requireAuth, holdController.getGlobalActiveHold);

// Direct hold creation fallback supporting { eventId, seatIds }
router.post('/', requireAuth, (req, res, next) => {
  if (req.body.eventId) {
    req.params.eventId = req.body.eventId;
    return holdController.holdSeats(req, res, next);
  }
  return res.status(400).json({ success: false, message: 'eventId is required to hold seats' });
});

// Confirm hold into permanent booking
router.post('/:holdId/confirm', requireAuth, validateHoldId, validateRequest, holdController.confirmHold);

// Release held seats
router.delete('/:holdId', requireAuth, validateHoldId, validateRequest, holdController.releaseHold);

module.exports = router;
