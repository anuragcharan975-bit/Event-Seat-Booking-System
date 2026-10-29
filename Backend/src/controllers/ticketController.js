const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/tickets/verify/:bookingReference
 * @desc    Verify a booking reference and return event details, seats, and ticket status without exposing sensitive user info
 * @access  Public
 */
const verifyTicket = asyncHandler(async (req, res) => {
  const rawRef = req.params.bookingReference;
  if (!rawRef || typeof rawRef !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Booking reference is required',
      ticketStatus: 'Ticket Not Found'
    });
  }

  const cleanRef = rawRef.trim().toUpperCase();

  const booking = await Booking.findOne({ bookingReference: cleanRef })
    .populate('eventId', 'title venue startTime endTime pricePerSeat category imageUrl')
    .populate('seatIds', 'seatNumber row')
    .populate('checkedInBy', 'name role');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Ticket Not Found: No reservation exists for this booking reference.',
      ticketStatus: 'Ticket Not Found'
    });
  }

  // Derive authoritative ticket status (Confirmed tickets valid until checked in; checked in -> Already Used; cancelled -> Invalid)
  let ticketStatus = 'Valid';
  if (booking.status === 'CANCELLED') {
    ticketStatus = 'Invalid';
  } else if (booking.checkInStatus === 'CHECKED_IN') {
    ticketStatus = 'Already Used';
  } else if (booking.status === 'CONFIRMED') {
    ticketStatus = 'Valid';
  }

  return res.status(200).json({
    success: true,
    data: {
      bookingReference: booking.bookingReference,
      eventName: booking.eventId?.title || 'Unknown Event',
      eventVenue: booking.eventId?.venue || 'Venue TBA',
      eventDate: booking.eventId?.startTime,
      eventEndDate: booking.eventId?.endTime,
      eventCategory: booking.eventId?.category || 'General',
      eventImageUrl: booking.eventId?.imageUrl || '',
      bookedSeats: (booking.seatIds || []).map((s) => s.seatNumber),
      seats: (booking.seatIds || []).map((s) => ({
        id: s._id,
        seatNumber: s.seatNumber,
        row: s.row
      })),
      seatCount: (booking.seatIds || []).length,
      ticketStatus,
      checkInStatus: booking.checkInStatus || 'PENDING',
      checkedInAt: booking.checkedInAt || null,
      checkedInBy: booking.checkedInBy ? { name: booking.checkedInBy.name, role: booking.checkedInBy.role } : null,
      isGroupBooking: Boolean(booking.isGroupBooking),
      isCoupleBooking: Boolean(booking.isCoupleBooking),
      coupleDisclaimerAccepted: Boolean(booking.coupleDisclaimerAccepted),
      totalAmount: booking.amount,
      bookingDate: booking.createdAt
    }
  });
});

/**
 * @route   PATCH /api/tickets/:bookingReference/check-in
 * @desc    Atomic admission check-in of a confirmed ticket by authorized event staff or administrators
 * @access  Protected (Staff or Admin only)
 */
const checkInTicket = asyncHandler(async (req, res) => {
  const rawRef = req.params.bookingReference;
  if (!rawRef || typeof rawRef !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Booking reference is required',
      ticketStatus: 'Ticket Not Found'
    });
  }

  const cleanRef = rawRef.trim().toUpperCase();

  // First inspect existing booking state to return descriptive, accurate status
  const existing = await Booking.findOne({ bookingReference: cleanRef })
    .populate('eventId', 'title venue startTime endTime category')
    .populate('seatIds', 'seatNumber row')
    .populate('checkedInBy', 'name role');

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Ticket Not Found: No reservation exists for this booking reference.',
      ticketStatus: 'Ticket Not Found'
    });
  }

  // Reject cancelled tickets
  if (existing.status === 'CANCELLED') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ticket: This reservation has been cancelled.',
      ticketStatus: 'Invalid'
    });
  }

  // Reject already used tickets
  if (existing.checkInStatus === 'CHECKED_IN') {
    const formattedCheckIn = existing.checkedInAt
      ? new Date(existing.checkedInAt).toLocaleString()
      : 'earlier';
    return res.status(409).json({
      success: false,
      message: `Already Used: This ticket was already checked in on ${formattedCheckIn}.`,
      ticketStatus: 'Already Used',
      checkedInAt: existing.checkedInAt,
      checkedInBy: existing.checkedInBy?.name || 'Authorized Staff'
    });
  }

  // Atomic database operation preventing duplicate and concurrent check-ins
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      bookingReference: cleanRef,
      status: 'CONFIRMED',
      checkInStatus: { $ne: 'CHECKED_IN' }
    },
    {
      $set: {
        checkInStatus: 'CHECKED_IN',
        checkedInAt: new Date(),
        checkedInBy: req.user.id
      }
    },
    { new: true }
  )
    .populate('eventId', 'title venue startTime endTime category')
    .populate('seatIds', 'seatNumber row')
    .populate('checkedInBy', 'name email role');

  if (!updatedBooking) {
    // Concurrent check-in collision caught!
    return res.status(409).json({
      success: false,
      message: 'Already Used: Duplicate or concurrent check-in was detected and blocked.',
      ticketStatus: 'Already Used'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Ticket checked in successfully. Admission verified and granted!',
    ticketStatus: 'Already Used',
    data: {
      bookingReference: updatedBooking.bookingReference,
      eventName: updatedBooking.eventId?.title,
      eventVenue: updatedBooking.eventId?.venue,
      eventDate: updatedBooking.eventId?.startTime,
      eventCategory: updatedBooking.eventId?.category,
      bookedSeats: (updatedBooking.seatIds || []).map((s) => s.seatNumber),
      seats: (updatedBooking.seatIds || []).map((s) => ({
        id: s._id,
        seatNumber: s.seatNumber,
        row: s.row
      })),
      seatCount: (updatedBooking.seatIds || []).length,
      isCoupleBooking: Boolean(updatedBooking.isCoupleBooking),
      ticketStatus: 'Already Used',
      checkInStatus: 'CHECKED_IN',
      checkedInAt: updatedBooking.checkedInAt,
      checkedInBy: updatedBooking.checkedInBy?.name || 'Staff'
    }
  });
});

module.exports = {
  verifyTicket,
  checkInTicket
};
