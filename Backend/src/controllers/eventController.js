const mongoose = require('mongoose');
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

  // 1. Search filter by title, category, description, venue, or slug
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
        { categorySlug: tokenRegex }
      );

      // Handle common singular/plural & variant mappings
      if (/^workshops?$/i.test(token)) {
        searchOrConditions.push({ category: /workshops?/i });
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
                /^\s*Spa\s*$/i
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
      availableSeats: availableSeatsCount
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
      availableSeats: availableSeatsCount
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

  const seatCount = parseInt(totalSeats, 10) || 40;
  const newEvent = await Event.create({
    title,
    description,
    venue,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
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

module.exports = {
  getEvents,
  getEventSeats,
  getEventBySlug,
  createEvent
};

