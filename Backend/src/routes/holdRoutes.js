const express = require('express');
const router = express.Router();
const holdController = require('../controllers/holdController');
const { validateHoldId } = require('../validators/holdValidators');
const validateRequest = require('../middlewares/validateRequest');
const { requireAuth } = require('../middlewares/authMiddleware');

// Get active hold for the current user
router.get('/active', requireAuth, holdController.getGlobalActiveHold);

// Confirm hold into permanent booking
router.post('/:holdId/confirm', requireAuth, validateHoldId, validateRequest, holdController.confirmHold);

// Release held seats
router.delete('/:holdId', requireAuth, validateHoldId, validateRequest, holdController.releaseHold);

module.exports = router;
