const mongoose = require('mongoose');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const asyncHandler = require('../utils/asyncHandler');
const { slugify } = require('../utils/slugify');
const { syncCompletedEvents } = require('../services/eventLifecycleService');

/**
 * @route   GET /api/events
 * @desc    Get all events with real-time seat availability
 * @access  Public
 */
const getEvents = asyncHandler(async (req, res) => {
  // Sync all events whose endTime has passed to 'Completed' status
  await syncCompletedEvents();

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 5); // 5 records per page
  const skip = (page - 1) * limit;

  const now = new Date();

  // Build filter query using andConditions to support reliable combined filtering
  const andConditions = [];

  // 1. Case-insensitive Search filter by title, category, description, venue, or slug
  if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
    const rawSearch = req.query.search.trim();

    // Support comma-separated queries like "dance, music" as well as multi-word queries
    const commaParts = rawSearch.includes(',')
      ? rawSearch.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const spaceWords = rawSearch
      .split(/[,]+|\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);

    // Combine full phrase, comma tokens, and individual words without duplicates
    const allSearchTokens = Array.from(
      new Set([rawSearch, ...commaParts, ...spaceWords])
    );

    const searchOrConditions = [];

    for (const token of allSearchTokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(escaped, 'i');

      searchOrConditions.push(
        { title: tokenRegex },
        { category: tokenRegex },
        { description: tokenRegex },
        { venue: tokenRegex },
        { slug: tokenRegex },
        { categorySlug: tokenRegex },
        { status: tokenRegex }
      );

      // Handle status keywords in search
      if (/^pend(ing)?$/i.test(token)) {
        searchOrConditions.push({ status: 'Pending' });
      } else if (/^(in_?progress|progress|live)$/i.test(token)) {
        searchOrConditions.push({ status: 'In Progress' });
      } else if (/^complet(ed?)?$/i.test(token)) {
        searchOrConditions.push({ status: 'Completed' });
      }

      // Handle common singular/plural & variant mappings
      if (/^(workshops?|workspaces?)$/i.test(token)) {
        searchOrConditions.push({ category: /(workshops?|workspaces?)/i });
      } else if (/^sports?$/i.test(token)) {
        searchOrConditions.push({ category: /sports?/i });
      } else if (/^theat(re|er)$/i.test(token)) {
        searchOrConditions.push({ category: /theat(re|er)/i });
      } else if (/^dances?$/i.test(token)) {
        searchOrConditions.push({ category: /dance/i });
      } else if (/^musics?$/i.test(token)) {
        searchOrConditions.push({ category: /music/i });
      } else if (/^comed(y|ies)$/i.test(token)) {
        searchOrConditions.push({ category: /comedy/i });
      } else if (/^(games?|gaming|esports?)$/i.test(token)) {
        searchOrConditions.push({ category: /^(game|gaming)$/i });
      } else if (/^(cars?|automotive|supercars?|motorsports?|racing)$/i.test(token)) {
        searchOrConditions.push({ category: /^(car|cars|automotive)$/i });
      }
    }

    // If search term looks like a 4-digit year (e.g. 2026)
    if (/^\d{4}$/.test(rawSearch)) {
      const year = parseInt(rawSearch, 10);
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      searchOrConditions.push({
        startTime: { $gte: startOfYear, $lte: endOfYear }
      });
    }

    andConditions.push({ $or: searchOrConditions });
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
                /^\s*Workshops?\s*$/i,
                /^\s*Spa\s*$/i,
                /^\s*Games?\s*$/i,
                /^\s*Cars?\s*$/i
              ]
            }
          }
        ]
      });
    } else if (/^cars?(\s*events?)?$/i.test(rawCat)) {
      andConditions.push({
        $or: [
          { category: new RegExp('^\\s*Cars?\\s*$', 'i') },
          { categorySlug: { $in: ['car', 'cars', 'car-event', 'car-events', 'automotive'] } }
        ]
      });
    } else if (/^(workshops?|workspaces?)$/i.test(rawCat)) {
      andConditions.push({
        $or: [
          { category: new RegExp('^\\s*(workshops?|workspaces?)\\s*$', 'i') },
          { categorySlug: { $in: ['workshops', 'workshop', 'workspace', 'workspaces'] } }
        ]
      });
    } else if (/^theat(re|er)$/i.test(rawCat)) {
      andConditions.push({
        $or: [
          { category: new RegExp('^\\s*theat(re|er)\\s*$', 'i') },
          { categorySlug: { $in: ['theatre', 'theater'] } }
        ]
      });
    } else if (/^sports?$/i.test(rawCat)) {
      andConditions.push({ category: new RegExp('^\\s*sports?\\s*$', 'i') });
    } else if (/^spa(\s*&?\s*wellness)?$/i.test(rawCat)) {
      andConditions.push({
        $or: [
          { category: new RegExp('^\\s*Spa\\s*$', 'i') },
          { categorySlug: 'spa' }
        ]
      });
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

  // 3. Status filter (All, Upcoming, Past, Available, Sold Out, Pending, In Progress, Completed)
  if (req.query.status && typeof req.query.status === 'string' && req.query.status.trim()) {
    const rawStatus = req.query.status.trim().toLowerCase();
    if (rawStatus === 'upcoming') {
      andConditions.push({
        $or: [
          { endTime: { $gte: now } },
          { startTime: { $gte: now } }
        ]
      });
    } else if (rawStatus === 'past') {
      andConditions.push({
        $or: [
          { endTime: { $lt: now } },
          { endTime: { $exists: false }, startTime: { $lt: now } }
        ]
      });
    } else if (rawStatus === 'pending') {
      andConditions.push({ status: 'Pending' });
    } else if (rawStatus === 'in_progress' || rawStatus === 'in progress' || rawStatus === 'inprogress') {
      andConditions.push({ status: 'In Progress' });
    } else if (rawStatus === 'completed') {
      andConditions.push({ status: 'Completed' });
    } else if (rawStatus === 'available') {
      const availableEventIds = await Seat.distinct('eventId', {
        $or: [
          { status: 'AVAILABLE' },
          { status: 'HELD', holdExpiresAt: { $lt: now } }
        ]
      });
      andConditions.push({ _id: { $in: availableEventIds } });
    } else if (rawStatus === 'sold_out' || rawStatus === 'soldout' || rawStatus === 'sold-out') {
      const availableEventIds = await Seat.distinct('eventId', {
        $or: [
          { status: 'AVAILABLE' },
          { status: 'HELD', holdExpiresAt: { $lt: now } }
        ]
      });
      andConditions.push({ _id: { $nin: availableEventIds } });
    }
  }

  // 4. Date filter (events starting on that calendar date)
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

  // 5. Sorting options: Newest, Oldest, A–Z, Z–A
  const sortParam = (req.query.sort || '').toString().trim().toLowerCase();
  let sortQuery = { startTime: 1 };
  let useCollation = false;

  if (sortParam === 'newest' || sortParam === 'latest' || sortParam === 'date_desc') {
    sortQuery = { startTime: -1, _id: -1 };
  } else if (sortParam === 'oldest' || sortParam === 'date_asc') {
    sortQuery = { startTime: 1, _id: 1 };
  } else if (sortParam === 'a-z' || sortParam === 'az' || sortParam === 'title_asc') {
    sortQuery = { title: 1 };
    useCollation = true;
  } else if (sortParam === 'z-a' || sortParam === 'za' || sortParam === 'title_desc') {
    sortQuery = { title: -1 };
    useCollation = true;
  }

  // Find filtered events count
  const totalEvents = await Event.countDocuments(query);

  let eventsQuery = Event.find(query).sort(sortQuery);
  if (useCollation) {
    eventsQuery = eventsQuery.collation({ locale: 'en', strength: 2 });
  }

  const events = await eventsQuery.skip(skip).limit(limit);

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

      const effectiveStatus = availableSeats > 0 ? 'AVAILABLE' : 'SOLD_OUT';

      const isEnded = event.endTime ? new Date(event.endTime) <= now : false;
      const effectiveEventStatus = isEnded || event.status === 'Completed' ? 'Completed' : (event.status || 'Pending');

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
        availableSeats,
        status: effectiveEventStatus,
        eventStatus: effectiveEventStatus,
        seatStatus: effectiveStatus,
        isSoldOut: availableSeats === 0,
        averageRating: event.averageRating || 0,
        totalReviews: event.totalReviews || 0
      };
    })
  );

  return res.status(200).json({
    success: true,
    totalEvents,
    page,
    limit,
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
  await syncCompletedEvents();
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

  const availableSeatsCount = seatGrid.filter((s) => s.status === 'AVAILABLE').length;

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
      totalSeats: seatGrid.length || event.totalSeats,
      availableSeats: availableSeatsCount,
      status: (event.endTime && new Date(event.endTime) <= now) || event.status === 'Completed' ? 'Completed' : (event.status || 'Pending'),
      eventStatus: (event.endTime && new Date(event.endTime) <= now) || event.status === 'Completed' ? 'Completed' : (event.status || 'Pending'),
      averageRating: event.averageRating || 0,
      totalReviews: event.totalReviews || 0
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
  await syncCompletedEvents();
  let { category, slug } = req.params;

  // Support single parameter routes like /slug/:slug or /:slug
  if (!slug && category) {
    slug = category;
    category = 'all';
  }

  if (!slug) {
    return res.status(400).json({
      success: false,
      message: 'Event slug or identifier parameter is required'
    });
  }

  const normalizedCat = slugify(category || 'all');
  const normalizedSlug = slugify(slug);

  // 1. Primary lookup: Match by unique slug (normalized or trimmed lowercase)
  let event = await Event.findOne({
    $or: [
      { slug: normalizedSlug },
      { slug: slug.toLowerCase().trim() }
    ]
  });

  // 2. Fallback: If not found, check if category param was actually the event slug
  if (!event && normalizedCat && !['all', 'events', 'other'].includes(normalizedCat)) {
    event = await Event.findOne({
      $or: [
        { slug: normalizedCat },
        { slug: category.toLowerCase().trim() }
      ]
    });
  }

  // 3. Fallback: Check if slug is a valid MongoDB ObjectId
  if (!event && mongoose.Types.ObjectId.isValid(slug)) {
    event = await Event.findById(slug);
  }

  // 4. Fallback: Title case-insensitive match (converting hyphens to spaces)
  if (!event) {
    const titleFromSlug = slug.replace(/-/g, ' ').trim();
    const escaped = titleFromSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    event = await Event.findOne({
      title: new RegExp('^' + escaped + '$', 'i')
    });
  }

  if (!event) {
    return res.status(404).json({
      success: false,
      message: `Event not found for slug "${slug}"`
    });
  }

  const eventCatSlug = event.categorySlug || slugify(event.category || 'other');

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

  const availableSeatsCount = seatGrid.filter((s) => s.status === 'AVAILABLE').length;

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
      totalSeats: seatGrid.length || event.totalSeats,
      availableSeats: availableSeatsCount,
      status: (event.endTime && new Date(event.endTime) <= now) || event.status === 'Completed' ? 'Completed' : (event.status || 'Pending'),
      eventStatus: (event.endTime && new Date(event.endTime) <= now) || event.status === 'Completed' ? 'Completed' : (event.status || 'Pending'),
      averageRating: event.averageRating || 0,
      totalReviews: event.totalReviews || 0
    },
    seats: seatGrid
  });
});

/**
 * @route   POST /api/events
 * @desc    Create a new event and automatically generate its seat grid
 * @access  Public / Admin
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
    totalSeats
  } = req.body;

  if (!title || !description || !venue || !startTime || !endTime || pricePerSeat == null) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, venue, startTime, endTime, and pricePerSeat are required'
    });
  }

  // Validate start & end time
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
    totalSeats: seatCount
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
 * @route   DELETE /api/events/:eventId
 * @desc    Delete an event and its associated seats
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

  // Delete associated seats and any seat holds
  await Seat.deleteMany({ eventId: event._id });
  await Event.findByIdAndDelete(eventId);

  return res.status(200).json({
    success: true,
    message: `Event "${event.title}" and its seats deleted successfully`
  });
});

/**
 * @route   GET /api/events/admin/stats
 * @desc    Get statistics overview for admin panel
 * @access  Private (Admin only)
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const Booking = require('../models/Booking');
  const User = require('../models/User');

  const [totalEvents, totalSeats, totalBookings, totalUsers, confirmedBookings] = await Promise.all([
    Event.countDocuments({}),
    Seat.countDocuments({}),
    Booking.countDocuments({ status: 'CONFIRMED' }),
    User.countDocuments({}),
    Booking.find({ status: 'CONFIRMED' }, 'totalPrice')
  ]);

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  return res.status(200).json({
    success: true,
    stats: {
      totalEvents,
      totalSeats,
      totalBookings,
      totalUsers,
      totalRevenue
    }
  });
});

/**
 * @route   PATCH /api/events/:eventId/status
 * @desc    Admin updates event status
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
    data: event
  });
});

module.exports = {
  getEvents,
  getEventSeats,
  getEventBySlug,
  createEvent,
  deleteEvent,
  getAdminStats,
  updateEventStatus
};

