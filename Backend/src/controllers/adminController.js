const mongoose = require('mongoose');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const User = require('../models/User');
const SeatHold = require('../models/SeatHold');
const Review = require('../models/Review');
const bookingService = require('../services/bookingService');
const { syncCompletedEvents } = require('../services/eventLifecycleService');
const asyncHandler = require('../utils/asyncHandler');
const { slugify, generateUniqueEventSlug } = require('../utils/slugify');

/**
 * @route   GET /api/admin/stats
 * @desc    Comprehensive stats for admin dashboard
 * @access  Private (Admin only)
 */
const getStats = asyncHandler(async (req, res) => {
  await syncCompletedEvents();
  const [
    totalEvents,
    totalSeats,
    totalBookings,
    totalUsers,
    totalReviews,
    confirmedBookings,
    recentBookings,
    recentUsers
  ] = await Promise.all([
    Event.countDocuments({}),
    Seat.countDocuments({}),
    Booking.countDocuments({ status: 'CONFIRMED' }),
    User.countDocuments({}),
    Review.countDocuments({}),
    Booking.find({ status: 'CONFIRMED' }, 'amount'),
    Booking.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('userId', 'name email')
      .populate('eventId', 'title category pricePerSeat')
      .populate('seatIds', 'seatNumber row'),
    User.find({}, 'name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(6)
  ]);

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  return res.status(200).json({
    success: true,
    stats: {
      totalEvents,
      totalSeats,
      totalBookings,
      totalUsers,
      totalReviews,
      totalRevenue,
      recentBookings,
      recentUsers
    }
  });
});

/**
 * @route   GET /api/admin/events
 * @desc    Fetch all events with seat counts for management
 * @access  Private (Admin only)
 */
const getEvents = asyncHandler(async (req, res) => {
  await syncCompletedEvents();
  const events = await Event.find({}).sort({ createdAt: -1 });

  const now = new Date();
  const eventsWithStats = await Promise.all(
    events.map(async (event) => {
      const isEnded = event.endTime ? new Date(event.endTime) <= now : false;
      const effectiveStatus = isEnded || event.status === 'Completed' ? 'Completed' : (event.status || 'Pending');

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
        status: effectiveStatus,
        category: event.category || 'Other',
        categorySlug: event.categorySlug || slugify(event.category || 'other'),
        slug: event.slug,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        pricePerSeat: event.pricePerSeat,
        totalSeats: event.totalSeats || 40,
        availableSeats,
        averageRating: event.averageRating || 0,
        totalReviews: event.totalReviews || 0,
        imageUrl: event.imageUrl,
        description: event.description,
        createdAt: event.createdAt
      };
    })
  );

  return res.status(200).json({
    success: true,
    count: eventsWithStats.length,
    data: eventsWithStats
  });
});

/**
 * @route   POST /api/admin/events
 * @desc    Create new event and generate seats
 * @access  Private (Admin only)
 */
const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    venue,
    startTime,
    endTime,
    pricePerSeat,
    category,
    imageUrl,
    totalSeats,
    status
  } = req.body;

  if (!title || !description || !venue || !startTime || !endTime || pricePerSeat == null) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, venue, startTime, endTime, and pricePerSeat are required'
    });
  }

  // Robust Start Time & End Time Validation
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start time format. Please provide a valid date and time.'
    });
  }

  if (isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end time format. Please provide a valid date and time.'
    });
  }

  if (end <= start) {
    return res.status(400).json({
      success: false,
      message: 'End time must be later than start time.'
    });
  }

  const validStatuses = ['Pending', 'In Progress', 'Completed'];
  const eventStatus = status && validStatuses.includes(status) ? status : 'Pending';

  const seatCount = parseInt(totalSeats, 10) || 40;
  const newEvent = await Event.create({
    title,
    description,
    venue,
    startTime: start,
    endTime: end,
    pricePerSeat: Number(pricePerSeat),
    category: category || 'Other',
    imageUrl: imageUrl || '',
    totalSeats: seatCount,
    status: eventStatus,
    isGroupBookingEnabled: req.body.isGroupBookingEnabled !== undefined ? Boolean(req.body.isGroupBookingEnabled) : true,
    groupMinSeats: req.body.groupMinSeats ? Number(req.body.groupMinSeats) : 10,
    groupDiscountPercentage: req.body.groupDiscountPercentage != null ? Number(req.body.groupDiscountPercentage) : 10,
    isCoupleTicketEnabled: req.body.isCoupleTicketEnabled !== undefined ? Boolean(req.body.isCoupleTicketEnabled) : true,
    coupleDiscountPercentage: req.body.coupleDiscountPercentage != null ? Number(req.body.coupleDiscountPercentage) : 40
  });

  // Generate standard 4-row seat grid (A, B, C, D)
  const rows = ['A', 'B', 'C', 'D'];
  const seatsPerRow = Math.ceil(seatCount / rows.length);
  const seatsToInsert = [];

  let count = 0;
  for (const row of rows) {
    for (let num = 1; num <= seatsPerRow; num++) {
      if (count >= seatCount) break;
      seatsToInsert.push({
        eventId: newEvent._id,
        seatNumber: `${row}${num}`,
        row: row,
        status: 'AVAILABLE'
      });
      count++;
    }
  }

  await Seat.insertMany(seatsToInsert);

  return res.status(201).json({
    success: true,
    message: 'Event created successfully with seat grid',
    data: newEvent
  });
});

/**
 * @route   PUT /api/admin/events/:eventId
 * @desc    Update existing event details
 * @access  Private (Admin only)
 */
const updateEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const {
    title,
    description,
    venue,
    startTime,
    endTime,
    pricePerSeat,
    category,
    imageUrl
  } = req.body;

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (title) event.title = title;
  if (description) event.description = description;
  if (venue) event.venue = venue;

  // Validate start & end time updates
  if (startTime !== undefined || endTime !== undefined) {
    const nextStart = startTime ? new Date(startTime) : event.startTime;
    const nextEnd = endTime ? new Date(endTime) : event.endTime;

    if (isNaN(nextStart.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format. Please provide a valid date and time.'
      });
    }

    if (isNaN(nextEnd.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format. Please provide a valid date and time.'
      });
    }

    if (nextEnd <= nextStart) {
      return res.status(400).json({
        success: false,
        message: 'End time must be later than start time.'
      });
    }

    event.startTime = nextStart;
    event.endTime = nextEnd;
  }

  if (pricePerSeat != null) event.pricePerSeat = Number(pricePerSeat);
  if (category) {
    event.category = category;
    event.categorySlug = slugify(category);
  }
  if (imageUrl !== undefined) event.imageUrl = imageUrl;
  if (req.body.status && ['Pending', 'In Progress', 'Completed'].includes(req.body.status)) {
    event.status = req.body.status;
  }
  if (req.body.isGroupBookingEnabled !== undefined) {
    event.isGroupBookingEnabled = Boolean(req.body.isGroupBookingEnabled);
  }
  if (req.body.groupMinSeats != null) {
    event.groupMinSeats = Math.max(2, Number(req.body.groupMinSeats));
  }
  if (req.body.groupDiscountPercentage != null) {
    event.groupDiscountPercentage = Math.max(0, Math.min(100, Number(req.body.groupDiscountPercentage)));
  }
  if (req.body.isCoupleTicketEnabled !== undefined) {
    event.isCoupleTicketEnabled = Boolean(req.body.isCoupleTicketEnabled);
  }
  if (req.body.coupleDiscountPercentage != null) {
    event.coupleDiscountPercentage = Math.max(0, Math.min(100, Number(req.body.coupleDiscountPercentage)));
  }

  await event.save();

  return res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: event
  });
});

/**
 * @route   PATCH /api/admin/events/:eventId/status
 * @desc    Update event lifecycle status (Pending, In Progress, Completed)
 * @access  Private (Admin only)
 */
const updateEventStatus = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'In Progress', 'Completed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`
    });
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  event.status = status;
  await event.save();

  return res.status(200).json({
    success: true,
    message: `Event status updated to "${status}" successfully`,
    data: {
      _id: event._id,
      title: event.title,
      status: event.status
    }
  });
});

/**
 * @route   DELETE /api/admin/events/:eventId
 * @desc    Delete event and its seats
 * @access  Private (Admin only)
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  await Seat.deleteMany({ eventId: event._id });
  await Event.findByIdAndDelete(eventId);

  return res.status(200).json({
    success: true,
    message: `Event "${event.title}" and its seats were deleted successfully`
  });
});

/**
 * @route   GET /api/admin/users
 * @desc    List all users with their bookings stats
 * @access  Private (Admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });

  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const userBookings = await Booking.find({ userId: user._id });
      const confirmedCount = userBookings.filter((b) => b.status === 'CONFIRMED').length;
      const totalSpent = userBookings
        .filter((b) => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        createdAt: user.createdAt,
        bookingsCount: confirmedCount,
        totalBookings: userBookings.length,
        totalSpent
      };
    })
  );

  return res.status(200).json({
    success: true,
    count: usersWithStats.length,
    data: usersWithStats
  });
});

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Update a user's role (user <-> admin)
 * @access  Private (Admin only)
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be either "user" or "admin"'
    });
  }

  // Prevent self demotion
  if (req.user.id.toString() === userId.toString() && role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'You cannot remove admin privileges from your own account'
    });
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  targetUser.role = role;
  await targetUser.save();

  return res.status(200).json({
    success: true,
    message: `User ${targetUser.email} role updated to ${role}`,
    user: targetUser.toSafeObject()
  });
});

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user from system
 * @access  Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Prevent self deletion
  if (req.user.id.toString() === userId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own admin account'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await User.findByIdAndDelete(userId);

  return res.status(200).json({
    success: true,
    message: `User ${user.email} was removed successfully`
  });
});

/**
 * @route   GET /api/admin/bookings
 * @desc    List all system bookings across all users
 * @access  Private (Admin only)
 */
const getBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({})
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role')
    .populate('eventId', 'title category venue pricePerSeat startTime')
    .populate('seatIds', 'seatNumber row');

  const formatted = bookings.map((b) => ({
    _id: b._id,
    bookingReference: b.bookingReference,
    amount: b.amount,
    status: b.status,
    createdAt: b.createdAt,
    cancelledAt: b.cancelledAt || null,
    user: {
      _id: b.userId?._id,
      name: b.userId?.name || 'Deleted User',
      email: b.userId?.email || 'N/A'
    },
    event: {
      _id: b.eventId?._id,
      title: b.eventId?.title || 'Unknown Event',
      category: b.eventId?.category || 'General',
      venue: b.eventId?.venue || 'Unknown Venue',
      pricePerSeat: b.eventId?.pricePerSeat,
      startTime: b.eventId?.startTime
    },
    seats: (b.seatIds || []).map((s) => ({
      _id: s._id,
      seatNumber: s.seatNumber,
      row: s.row
    }))
  }));

  return res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted
  });
});

/**
 * @route   POST /api/admin/bookings/:bookingId/cancel
 * @desc    Admin cancels a booking and releases seats back to AVAILABLE
 * @access  Private (Admin only)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await bookingService.cancelBooking({
    bookingId,
    userId: req.user.id,
    userRole: 'admin'
  });

  return res.status(200).json({
    success: true,
    message: `Booking ${booking.bookingReference} cancelled successfully and seats released.`,
    data: booking
  });
});

/**
 * @route   GET /api/admin/reviews
 * @desc    Get all reviews with optional eventId, rating, or keyword search
 * @access  Private (Admin only)
 */
const getReviews = asyncHandler(async (req, res) => {
  const { eventId, rating, search } = req.query;

  const query = {};

  if (eventId && eventId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      query.eventId = eventId;
    }
  }

  if (rating && rating !== 'all') {
    const num = parseInt(rating, 10);
    if (!isNaN(num)) query.rating = num;
  }

  if (search && typeof search === 'string' && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { userName: regex },
      { userEmail: regex },
      { comment: regex }
    ];
  }

  const reviews = await Review.find(query)
    .sort({ createdAt: -1 })
    .populate('eventId', 'title category imageUrl slug');

  return res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews
  });
});

/**
 * @route   DELETE /api/admin/reviews/:reviewId
 * @desc    Admin deletes a review and triggers recalculation of event statistics
 * @access  Private (Admin only)
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format'
    });
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  const eventId = review.eventId;
  await Review.findByIdAndDelete(reviewId);

  // Recalculate event rating statistics
  await Review.calculateAverageRating(eventId);

  return res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});

module.exports = {
  getStats,
  getEvents,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  getUsers,
  updateUserRole,
  deleteUser,
  getBookings,
  cancelBooking,
  getReviews,
  deleteReview
};
