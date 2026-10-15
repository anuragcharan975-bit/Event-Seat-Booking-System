const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Get all bookings for authenticated user
router.get('/me', requireAuth, bookingController.getMyBookings);

module.exports = router;
