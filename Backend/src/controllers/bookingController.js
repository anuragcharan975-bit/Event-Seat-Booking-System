const bookingService = require('../services/bookingService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/bookings/me
 * @desc    Get all bookings belonging to the authenticated user
 * @access  Protected
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getUserBookings(req.user.id);

  return res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

/**
 * @route   POST /api/bookings/:bookingId/cancel
 * @desc    Cancel a confirmed booking and release the seats back to available
 * @access  Protected
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const bookingId = req.params.bookingId || req.params.id;
  const booking = await bookingService.cancelBooking({
    bookingId,
    userId: req.user.id,
    userRole: req.user.role || 'user'
  });

  return res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully. Seats have been released.',
    data: booking
  });
});

module.exports = {
  getMyBookings,
  cancelBooking
};
