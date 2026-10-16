const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

const validateBookingId = (req, res, next) => {
  const id = req.params.bookingId || req.params.id;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID is required'
    });
  }
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID must be a valid MongoDB ObjectId',
      errors: [
        {
          field: req.params.id ? 'id' : 'bookingId',
          message: 'Booking ID must be a valid MongoDB ObjectId',
          value: id
        }
      ]
    });
  }
  next();
};

// Get all bookings for authenticated user (supports both /my and /me)
router.get('/my', requireAuth, bookingController.getMyBookings);
router.get('/me', requireAuth, bookingController.getMyBookings);

// Cancel a booking — Support PATCH, POST, DELETE with /:id/cancel or /:bookingId/cancel
router.patch('/:id/cancel', requireAuth, validateBookingId, bookingController.cancelBooking);
router.post('/:id/cancel', requireAuth, validateBookingId, bookingController.cancelBooking);
router.delete('/:id/cancel', requireAuth, validateBookingId, bookingController.cancelBooking);
router.delete('/:id', requireAuth, validateBookingId, bookingController.cancelBooking);

router.patch('/:bookingId/cancel', requireAuth, validateBookingId, bookingController.cancelBooking);
router.post('/:bookingId/cancel', requireAuth, validateBookingId, bookingController.cancelBooking);
router.delete('/:bookingId/cancel', requireAuth, validateBookingId, bookingController.cancelBooking);
router.delete('/:bookingId', requireAuth, validateBookingId, bookingController.cancelBooking);

module.exports = router;

