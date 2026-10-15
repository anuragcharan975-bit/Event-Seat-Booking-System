const Event = require('../models/Event');
const Seat = require('../models/Seat');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/events
 * @desc    Get all events with real-time seat availability
 * @access  Public
 */
const getEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const now = new Date();

  // Find events
  const totalEvents = await Event.countDocuments();
  const events = await Event.find()
    .sort({ startTime: 1 })
    .skip(skip)
    .limit(limit);

  // Compute live seat availability for each event:
  // A seat is available if status == 'AVAILABLE' OR (status == 'HELD' AND holdExpiresAt < now)
  const eventsWithAvailability = await Promise.all(
    events.map(async (event) => {
      const totalSeats = await Seat.countDocuments({ eventId: event._id });
      const availableSeats = await Seat.countDocuments({
        eventId: event._id,
        $or: [
          { status: 'AVAILABLE' },
          { status: 'HELD', holdExpiresAt: { $lt: now } }
        ]
      });

      return {
        _id: event._id,
        title: event.title,
        description: event.description,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        pricePerSeat: event.pricePerSeat,
        totalSeats,
        availableSeats
      };
    })
  );

  return res.status(200).json({
    success: true,
    totalEvents,
    page,
    totalPages: Math.ceil(totalEvents / limit),
    data: eventsWithAvailability
  });
});

/**
 * @route   GET /api/events/:eventId/seats
 * @desc    Get seat map for a specific event with real-time availability
 * @access  Public
 */
const getEventSeats = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const now = new Date();

  // Verify event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Fetch all seats for this event, ordered by row and seatNumber
  const seats = await Seat.find({ eventId }).sort({ row: 1, seatNumber: 1 });

  // Map each seat into public representation:
  // Ensure expired holds are cleanly represented as AVAILABLE without leaking user details
  const seatGrid = seats.map((seat) => {
    let effectiveStatus = seat.status;
    let expiresAt = null;

    if (seat.status === 'HELD') {
      if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) <= now) {
        effectiveStatus = 'AVAILABLE';
      } else {
        effectiveStatus = 'HELD';
        expiresAt = seat.holdExpiresAt;
      }
    }

    return {
      _id: seat._id,
      seatNumber: seat.seatNumber,
      row: seat.row,
      status: effectiveStatus,
      // Only include hold expiry without exposing user identities or holdId
      ...(effectiveStatus === 'HELD' ? { holdExpiresAt: expiresAt } : {})
    };
  });

  return res.status(200).json({
    success: true,
    event: {
      _id: event._id,
      title: event.title,
      venue: event.venue,
      startTime: event.startTime,
      endTime: event.endTime,
      pricePerSeat: event.pricePerSeat
    },
    seats: seatGrid
  });
});

module.exports = {
  getEvents,
  getEventSeats
};
