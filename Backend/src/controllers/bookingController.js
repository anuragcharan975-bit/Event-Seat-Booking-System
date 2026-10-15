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

module.exports = {
  getMyBookings
};
