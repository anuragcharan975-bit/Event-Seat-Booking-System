const Event = require('../models/Event');
const Seat = require('../models/Seat');
const asyncHandler = require('../utils/asyncHandler');
const { slugify } = require('../utils/slugify');

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

  // Build filter query using andConditions to support reliable combined filtering
  const andConditions = [];

  // 1. Search filter by title, description, or venue (case-insensitive with regex escaping)
  if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
    const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');
    andConditions.push({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { venue: searchRegex }
      ]
    });
  }

  // 2. Category filter
  if (
    req.query.category &&
    typeof req.query.category === 'string' &&
    req.query.category.trim() &&
    req.query.category.trim().toLowerCase() !== 'all' &&
    req.query.category.trim().toLowerCase() !== 'all events'
  ) {
    const rawCat = req.query.category.trim();
    if (rawCat.toLowerCase() === 'other') {
      // Matches 'Other' explicitly, or anything not in the primary categories
      andConditions.push({
        $or: [
          { category: new RegExp('^\\s*Other\\s*$', 'i') },
          {
            category: {
              $nin: [
                /^\s*Music\s*$/i,
                /^\s*Dance\s*$/i,
                /^\s*Comedy\s*$/i,
                /^\s*Theat(re|er)\s*$/i,
                /^\s*Sports?\s*$/i,
                /^\s*Workshops?\s*$/i
              ]
            }
          }
        ]
      });
    } else if (/^workshops?$/i.test(rawCat)) {
      andConditions.push({ category: new RegExp('^\\s*workshops?\\s*$', 'i') });
    } else if (/^theat(re|er)$/i.test(rawCat)) {
      andConditions.push({ category: new RegExp('^\\s*theat(re|er)\\s*$', 'i') });
    } else if (/^sports?$/i.test(rawCat)) {
      andConditions.push({ category: new RegExp('^\\s*sports?\\s*$', 'i') });
    } else {
      const catSlug = slugify(rawCat);
      const escaped = rawCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { category: new RegExp(`^\\s*${escaped}\\s*$`, 'i') },
          { categorySlug: catSlug }
        ]
      });
    }
  }

  // 3. Date filter (events starting on that calendar date)
  if (req.query.date && typeof req.query.date === 'string' && req.query.date.trim()) {
    const parsedDate = new Date(req.query.date.trim());
    if (!isNaN(parsedDate.getTime())) {
      const startOfDay = new Date(parsedDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      andConditions.push({ startTime: { $gte: startOfDay, $lte: endOfDay } });
    }
  }

  const query = andConditions.length > 0 ? { $and: andConditions } : {};

  // Find filtered events count and list
  const totalEvents = await Event.countDocuments(query);
  const events = await Event.find(query)
    .sort({ startTime: 1 })
    .skip(skip)
    .limit(limit);

  // Retrieve all distinct categories across the event catalog for filter dropdowns
  const distinctCategories = await Event.distinct('category');
  const sanitizedCategories = distinctCategories
    .filter(Boolean)
    .map((c) => c.trim())
    .filter((v, i, a) => a.indexOf(v) === i);

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
        category: event.category || 'Other',
        categorySlug: event.categorySlug || slugify(event.category || 'Other'),
        slug: event.slug || slugify(event.title),
        imageUrl: event.imageUrl || '',
        description: event.description,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        pricePerSeat: event.pricePerSeat,
        totalSeats: totalSeats || event.totalSeats,
        availableSeats
      };
    })
  );

  return res.status(200).json({
    success: true,
    totalEvents,
    page,
    totalPages: Math.ceil(totalEvents / limit) || 1,
    categories: sanitizedCategories,
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
      category: event.category || 'Other',
      categorySlug: event.categorySlug || slugify(event.category || 'Other'),
      slug: event.slug || slugify(event.title),
      imageUrl: event.imageUrl || '',
      description: event.description,
      venue: event.venue,
      startTime: event.startTime,
      endTime: event.endTime,
      pricePerSeat: event.pricePerSeat,
      totalSeats: event.totalSeats
    },
    seats: seatGrid
  });
});

/**
 * @route   GET /api/events/:category/:slug
 * @desc    Get event details and real-time seat map using SEO-friendly category & event slugs
 * @access  Public
 */
const getEventBySlug = asyncHandler(async (req, res) => {
  const { category, slug } = req.params;

  if (!category || !slug) {
    return res.status(400).json({
      success: false,
      message: 'Category and event slug parameters are required'
    });
  }

  const normalizedCat = slugify(category);
  const normalizedSlug = slugify(slug);

  // Find event by unique slug
  const event = await Event.findOne({
    $or: [
      { slug: normalizedSlug },
      { slug: slug.toLowerCase().trim() }
    ]
  });

  if (!event) {
    return res.status(404).json({
      success: false,
      message: `Event not found for slug "${slug}"`
    });
  }

  // Validate category: the event's category must match the URL category
  const eventCatSlug = event.categorySlug || slugify(event.category || 'other');
  if (
    eventCatSlug !== normalizedCat &&
    normalizedCat !== 'events' &&
    normalizedCat !== 'all'
  ) {
    return res.status(404).json({
      success: false,
      message: `Event "${event.title}" belongs to category "${event.category}", not "${category}"`
    });
  }

  const now = new Date();
  const seats = await Seat.find({ eventId: event._id }).sort({ row: 1, seatNumber: 1 });

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
      ...(effectiveStatus === 'HELD' ? { holdExpiresAt: expiresAt } : {})
    };
  });

  return res.status(200).json({
    success: true,
    event: {
      _id: event._id,
      title: event.title,
      category: event.category || 'Other',
      categorySlug: eventCatSlug,
      slug: event.slug || normalizedSlug,
      imageUrl: event.imageUrl || '',
      description: event.description,
      venue: event.venue,
      startTime: event.startTime,
      endTime: event.endTime,
      pricePerSeat: event.pricePerSeat,
      totalSeats: event.totalSeats
    },
    seats: seatGrid
  });
});

module.exports = {
  getEvents,
  getEventSeats,
  getEventBySlug
};
