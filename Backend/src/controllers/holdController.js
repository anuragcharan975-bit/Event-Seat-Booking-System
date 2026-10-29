const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const seatHoldService = require('../services/seatHoldService');
const bookingService = require('../services/bookingService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   POST /api/events/:eventId/holds
 * @desc    Hold 1-4 seats atomically for 120 seconds
 * @access  Protected
 */
const createHold = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { seatIds, testClockNow, durationSeconds, isCoupleBooking, coupleDisclaimerAccepted } = req.body;

  // Use testClockNow if provided in testing mode
  const clockNow = process.env.NODE_ENV === 'test' && testClockNow ? new Date(testClockNow) : null;

  const result = await seatHoldService.createSeatHold({
    userId: req.user.id,
    eventId,
    seatIds,
    durationSeconds: durationSeconds || null,
    clockNow,
    isCoupleBooking: Boolean(isCoupleBooking),
    coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted)
  });

  return res.status(201).json({
    success: true,
    message: 'Seats held successfully for 120 seconds',
    data: result
  });
});

/**
 * @route   POST /api/holds/:holdId/confirm
 * @desc    Confirm an active hold and convert into a permanent booking
 * @access  Protected
 */
const confirmHold = asyncHandler(async (req, res) => {
  const { holdId } = req.params;
  const { testClockNow } = req.body;

  const clockNow = process.env.NODE_ENV === 'test' && testClockNow ? new Date(testClockNow) : null;

  const result = await bookingService.confirmBooking({
    holdId,
    userId: req.user.id,
    clockNow
  });

  return res.status(result.isExisting ? 200 : 201).json({
    success: true,
    message: result.isExisting
      ? 'Booking already confirmed (idempotent result)'
      : 'Booking confirmed successfully',
    data: result.booking
  });
});

/**
 * @route   DELETE /api/holds/:holdId
 * @desc    Release an active seat hold and return seats to AVAILABLE
 * @access  Protected
 */
const releaseHold = asyncHandler(async (req, res) => {
  const { holdId } = req.params;
  const { testClockNow } = req.body;

  const clockNow = process.env.NODE_ENV === 'test' && testClockNow ? new Date(testClockNow) : null;

  const result = await seatHoldService.releaseSeatHold({
    holdId,
    userId: req.user.id,
    clockNow
  });

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      holdId: result.holdId,
      status: result.status
    }
  });
});

/**
 * @route   GET /api/events/:eventId/my-hold
 * @desc    Get the current user's active, unexpired hold for an event (page refresh recovery)
 * @access  Protected
 */
const getMyActiveHold = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  let eventMongoId = eventId;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const foundEvent = await Event.findOne({ slug: eventId }).select('_id');
    if (foundEvent) {
      eventMongoId = foundEvent._id;
    }
  }

  const activeHold = await seatHoldService.getUserActiveHold({
    userId: req.user.id,
    eventId: eventMongoId
  });

  let userBookedSeatsCount = 0;
  if (req.user?.id && mongoose.Types.ObjectId.isValid(eventMongoId)) {
    const existingBookings = await Booking.find({
      userId: req.user.id,
      eventId: eventMongoId,
      status: 'CONFIRMED'
    });
    userBookedSeatsCount = existingBookings.reduce(
      (sum, b) => sum + (b.seatIds ? b.seatIds.length : 0),
      0
    );
  }

  let eventDoc = null;
  if (mongoose.Types.ObjectId.isValid(eventMongoId)) {
    eventDoc = await Event.findById(eventMongoId).select('isGroupBookingEnabled groupMinSeats groupDiscountPercentage totalSeats');
  }

  const maxSeatsAllowed = 4;
  const remainingSeatsAllowed = Math.max(0, maxSeatsAllowed - userBookedSeatsCount);
  const isMaxSeatsReached = userBookedSeatsCount >= maxSeatsAllowed;

  return res.status(200).json({
    success: true,
    data: activeHold,
    userBookedSeatsCount,
    maxSeatsAllowed,
    remainingSeatsAllowed,
    isMaxSeatsReached,
    groupBooking: {
      isEnabled: eventDoc ? eventDoc.isGroupBookingEnabled !== false : true,
      minSeats: eventDoc?.groupMinSeats || 10,
      discountPercentage: eventDoc?.groupDiscountPercentage || 10,
      maxSeats: Math.min(20, eventDoc?.totalSeats || 40)
    }
  });
});

/**
 * @route   GET /api/holds/active
 * @desc    Get any active hold the current user has across all events
 * @access  Protected
 */
const getGlobalActiveHold = asyncHandler(async (req, res) => {
  const activeHold = await seatHoldService.getUserActiveHold({
    userId: req.user.id
  });

  return res.status(200).json({
    success: true,
    data: activeHold
  });
});

module.exports = {
  createHold,
  confirmHold,
  releaseHold,
  getMyActiveHold,
  getGlobalActiveHold
};
