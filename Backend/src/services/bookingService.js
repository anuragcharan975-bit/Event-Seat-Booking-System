const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const SeatHold = require('../models/SeatHold');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const generateBookingReference = require('../utils/generateBookingReference');
const { supportsTransactions } = require('../config/db');

/**
 * Confirms an active seat hold into a permanent booking.
 * Idempotent: Subsequent calls for the same hold return the existing booking.
 * Concurrency-safe: Utilizes MongoDB transactions and a unique index on holdId.
 *
 * @param {Object} params
 * @param {string} params.holdId - SeatHold ObjectId string
 * @param {string} params.userId - Authenticated user's ObjectId string
 * @param {Date} [params.clockNow] - Optional clock injection for deterministic testing
 */
const confirmBooking = async ({ holdId, userId, clockNow = null }) => {
  const now = clockNow ? new Date(clockNow) : new Date();

  // 1. Fetch the SeatHold document
  const hold = await SeatHold.findById(holdId);
  if (!hold) {
    const error = new Error('Seat hold not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Ownership verification: User B cannot confirm or access User A's hold
  if (hold.userId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this seat hold');
    error.statusCode = 403;
    throw error;
  }

  // 3. Idempotency Check: Did this hold already produce a booking?
  const existingBooking = await Booking.findOne({ holdId: hold._id })
    .populate('eventId', 'title venue startTime endTime pricePerSeat')
    .populate('seatIds', 'seatNumber row');

  if (existingBooking) {
    // If the booking exists and belongs to the authenticated user, return it safely (idempotent retry)
    return {
      booking: existingBooking,
      isExisting: true
    };
  }

  // 4. Validate hold state
  if (hold.status === 'RELEASED') {
    const error = new Error('Cannot confirm a hold that has already been released');
    error.statusCode = 409;
    throw error;
  }

  // 5. Expiration check: Use authoritative server clock
  if (hold.status === 'EXPIRED' || hold.expiresAt <= now) {
    // Mark as expired in DB if not already marked
    if (hold.status !== 'EXPIRED') {
      hold.status = 'EXPIRED';
      await hold.save();

      // Free up the seats if they still point to this expired hold
      await Seat.updateMany(
        {
          _id: { $in: hold.seatIds },
          holdId: hold._id,
          status: 'HELD'
        },
        {
          $set: {
            status: 'AVAILABLE',
            holdId: null,
            holdExpiresAt: null
          }
        }
      );
    }

    const error = new Error('Seat hold has expired. Please select seats again.');
    error.statusCode = 409;
    throw error;
  }

  if (hold.status !== 'ACTIVE') {
    const error = new Error(`Invalid hold status: ${hold.status}`);
    error.statusCode = 409;
    throw error;
  }

  // 6. Fetch Event to obtain authoritative server-side pricePerSeat
  const event = await Event.findById(hold.eventId);
  if (!event) {
    const error = new Error('Associated event not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify Event is not completed
  if (event.status === 'Completed') {
    const error = new Error('Completed Event! Bookings are closed for this event.');
    error.statusCode = 400;
    throw error;
  }

  // Determine if this booking qualifies as a Group Booking (min 10 seats or event.groupMinSeats)
  const isGroupBooking = Boolean(
    hold.isGroupBooking ||
    (event.isGroupBookingEnabled !== false && hold.seatIds.length >= (event.groupMinSeats || 10))
  );
  const isCoupleBooking = Boolean(hold.isCoupleBooking);
  const coupleDisclaimerAccepted = Boolean(hold.coupleDisclaimerAccepted);

  // Verify user maximum seat limit (4 seats per user per event, OR group booking capacity)
  const existingBookings = await Booking.find({
    userId: hold.userId,
    eventId: hold.eventId,
    status: 'CONFIRMED',
    holdId: { $ne: hold._id }
  });
  const alreadyBookedSeatsCount = existingBookings.reduce(
    (sum, b) => sum + (b.seatIds ? b.seatIds.length : 0),
    0
  );

  if (!isGroupBooking) {
    if (alreadyBookedSeatsCount >= 4) {
      const error = new Error('You already booked your max seats for this event. Maximum limit is 4 seats per event.');
      error.statusCode = 400;
      throw error;
    }

    if (alreadyBookedSeatsCount + hold.seatIds.length > 4) {
      const remaining = 4 - alreadyBookedSeatsCount;
      const error = new Error(`You can only book up to ${remaining} more seat(s) for this event. Maximum limit is 4 seats per event.`);
      error.statusCode = 400;
      throw error;
    }
  } else {
    const maxGroupAllowed = Math.min(20, event.totalSeats || 40);
    if (alreadyBookedSeatsCount + hold.seatIds.length > maxGroupAllowed) {
      const error = new Error(`Group reservation exceeds maximum allowed capacity of ${maxGroupAllowed} seats.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate authoritative amount on the server (with Group Discount if 10+ seats, or Couple Discount if couple booking)
  const baseAmount = event.pricePerSeat * hold.seatIds.length;
  let discountPct = 0;
  if (isGroupBooking) {
    discountPct = event.groupDiscountPercentage || 10;
  } else if (isCoupleBooking) {
    discountPct = event.coupleDiscountPercentage != null ? event.coupleDiscountPercentage : 40;
  }
  const discountAmount = discountPct > 0 ? Math.round((baseAmount * discountPct) / 100) : 0;
  const trustedAmount = baseAmount - discountAmount;
  const bookingReference = generateBookingReference();

  const useReplicaSetTransaction = supportsTransactions();

  if (useReplicaSetTransaction) {
    // -------------------------------------------------------------
    // ATOMIC CONFIRMATION VIA MONGODB ACID TRANSACTION (REPLICA SET)
    // -------------------------------------------------------------
    const session = await mongoose.startSession();
    try {
      let createdBooking = null;

      await session.withTransaction(async () => {
        // Double check for race condition inside transaction
        const inTxBooking = await Booking.findOne({ holdId: hold._id }).session(session);
        if (inTxBooking) {
          createdBooking = inTxBooking;
          return;
        }

        // Update hold status to CONFIRMED
        const updatedHold = await SeatHold.findOneAndUpdate(
          { _id: hold._id, status: 'ACTIVE' },
          { $set: { status: 'CONFIRMED' } },
          { session, new: true }
        );

        if (!updatedHold) {
          const conflict = new Error('Hold status conflict: Hold is no longer active.');
          conflict.statusCode = 409;
          throw conflict;
        }

        // Transition seats from HELD to BOOKED
        const seatUpdateResult = await Seat.updateMany(
          {
            _id: { $in: hold.seatIds },
            holdId: hold._id,
            status: 'HELD'
          },
          {
            $set: {
              status: 'BOOKED',
              holdExpiresAt: null
            }
          },
          { session }
        );

        if (seatUpdateResult.modifiedCount !== hold.seatIds.length) {
          const seatError = new Error('One or more held seats could not be confirmed.');
          seatError.statusCode = 409;
          throw seatError;
        }

        // Create Booking document
        const [newBooking] = await Booking.create(
          [
            {
              bookingReference,
              userId,
              eventId: event._id,
              holdId: hold._id,
              seatIds: hold.seatIds,
              amount: trustedAmount,
              isGroupBooking,
              isCoupleBooking: Boolean(isCoupleBooking),
              coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted),
              originalAmount: baseAmount,
              discountAmount,
              discountPercentage: discountPct,
              status: 'CONFIRMED'
            }
          ],
          { session }
        );

        createdBooking = newBooking;
      });

      // Populate booking details for response
      const populated = await Booking.findById(createdBooking._id)
        .populate('eventId', 'title venue startTime endTime pricePerSeat')
        .populate('seatIds', 'seatNumber row');

      return {
        booking: populated,
        isExisting: false
      };
    } catch (txErr) {
      // Handle unique constraint conflict (e.g. concurrent confirm requests)
      if (txErr.code === 11000) {
        const found = await Booking.findOne({ holdId: hold._id })
          .populate('eventId', 'title venue startTime endTime pricePerSeat')
          .populate('seatIds', 'seatNumber row');
        if (found) {
          return { booking: found, isExisting: true };
        }
      }
      throw txErr;
    } finally {
      await session.endSession();
    }
  } else {
    // -------------------------------------------------------------
    // ATOMIC CONFIRMATION VIA CONDITIONAL STATUS & UNIQUE CONSTRAINT (STANDALONE)
    // -------------------------------------------------------------
    // Atomically transition hold status from ACTIVE to CONFIRMED
    const updatedHold = await SeatHold.findOneAndUpdate(
      { _id: hold._id, status: 'ACTIVE' },
      { $set: { status: 'CONFIRMED' } },
      { new: true }
    );

    if (!updatedHold) {
      // If hold was already confirmed, return existing booking
      const existing = await Booking.findOne({ holdId: hold._id })
        .populate('eventId', 'title venue startTime endTime pricePerSeat')
        .populate('seatIds', 'seatNumber row');
      if (existing) {
        return { booking: existing, isExisting: true };
      }
      const conflict = new Error('Hold is no longer active.');
      conflict.statusCode = 409;
      throw conflict;
    }

    // Mark seats as BOOKED
    await Seat.updateMany(
      {
        _id: { $in: hold.seatIds },
        holdId: hold._id,
        status: 'HELD'
      },
      {
        $set: {
          status: 'BOOKED',
          holdExpiresAt: null
        }
      }
    );

    try {
      const newBooking = await Booking.create({
        bookingReference,
        userId,
        eventId: event._id,
        holdId: hold._id,
        seatIds: hold.seatIds,
        amount: trustedAmount,
        isGroupBooking,
        isCoupleBooking: Boolean(isCoupleBooking),
        coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted),
        originalAmount: baseAmount,
        discountAmount,
        discountPercentage: discountPct,
        status: 'CONFIRMED'
      });

      const populated = await Booking.findById(newBooking._id)
        .populate('eventId', 'title venue startTime endTime pricePerSeat')
        .populate('seatIds', 'seatNumber row');

      return {
        booking: populated,
        isExisting: false
      };
    } catch (bookingErr) {
      if (bookingErr.code === 11000) {
        // Idempotency: Unique key on holdId caught concurrent booking creation
        const winningBooking = await Booking.findOne({ holdId: hold._id })
          .populate('eventId', 'title venue startTime endTime pricePerSeat')
          .populate('seatIds', 'seatNumber row');
        return { booking: winningBooking, isExisting: true };
      }
      throw bookingErr;
    }
  }
};

/**
 * Cancels a confirmed booking and immediately releases all reserved seats back to AVAILABLE.
 * - Enforces server-side authentication and ownership check (User A cannot cancel User B's booking).
 * - Safe against repeated cancellations (HTTP 400 if already cancelled).
 * - Multi-document ACID transaction safe when supported by MongoDB replica set.
 * - Atomically marks booking as CANCELLED and returns seats to AVAILABLE with zero race conditions.
 *
 * @param {Object} params
 * @param {string} params.bookingId - Booking ObjectId string
 * @param {string} params.userId - Authenticated user's ObjectId string
 */
const cancelBooking = async ({ bookingId, userId, userRole = 'user' }) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid booking ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Server-side authorization check: ownership verification (subject to admin rules)
  const isAdmin = userRole === 'admin';
  if (!isAdmin && booking.userId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this booking');
    error.statusCode = 403;
    throw error;
  }

  // 3. Status checks
  if (booking.status === 'CANCELLED') {
    const error = new Error('Booking has already been cancelled');
    error.statusCode = 400;
    throw error;
  }

  if (booking.status !== 'CONFIRMED') {
    const error = new Error(`Cannot cancel booking with status: ${booking.status}`);
    error.statusCode = 400;
    throw error;
  }

  const useReplicaSetTransaction = supportsTransactions();

  if (useReplicaSetTransaction) {
    // -------------------------------------------------------------
    // ATOMIC CANCELLATION VIA MONGODB ACID TRANSACTION (REPLICA SET)
    // -------------------------------------------------------------
    const session = await mongoose.startSession();
    try {
      let cancelledBooking = null;

      await session.withTransaction(async () => {
        // Atomically transition booking status
        const updatedBooking = await Booking.findOneAndUpdate(
          { _id: booking._id, status: 'CONFIRMED' },
          { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
          { session, new: true }
        );

        if (!updatedBooking) {
          const conflict = new Error('Booking status conflict: could not cancel.');
          conflict.statusCode = 409;
          throw conflict;
        }

        // Atomically release booked seats back to AVAILABLE
        await Seat.updateMany(
          {
            _id: { $in: booking.seatIds },
            eventId: booking.eventId,
            status: 'BOOKED'
          },
          {
            $set: {
              status: 'AVAILABLE',
              holdId: null,
              holdExpiresAt: null
            }
          },
          { session }
        );

        // Also release associated hold if present
        if (booking.holdId) {
          await SeatHold.updateOne(
            { _id: booking.holdId },
            { $set: { status: 'RELEASED' } },
            { session }
          );
        }

        cancelledBooking = updatedBooking;
      });

      const populated = await Booking.findById(cancelledBooking._id)
        .populate('eventId', 'title venue startTime endTime pricePerSeat category')
        .populate('seatIds', 'seatNumber row');

      return populated;
    } finally {
      await session.endSession();
    }
  } else {
    // -------------------------------------------------------------
    // ATOMIC CANCELLATION VIA CONDITIONAL STATUS (STANDALONE MONGODB)
    // -------------------------------------------------------------
    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'CONFIRMED' },
      { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
      { new: true }
    );

    if (!updatedBooking) {
      const conflict = new Error('Booking status conflict: could not cancel.');
      conflict.statusCode = 409;
      throw conflict;
    }

    // Release seats back to AVAILABLE
    await Seat.updateMany(
      {
        _id: { $in: booking.seatIds },
        eventId: booking.eventId,
        status: 'BOOKED'
      },
      {
        $set: {
          status: 'AVAILABLE',
          holdId: null,
          holdExpiresAt: null
        }
      }
    );

    // Also release associated hold if present
    if (booking.holdId) {
      await SeatHold.updateOne(
        { _id: booking.holdId },
        { $set: { status: 'RELEASED' } }
      );
    }

    const populated = await Booking.findById(updatedBooking._id)
      .populate('eventId', 'title venue startTime endTime pricePerSeat category')
      .populate('seatIds', 'seatNumber row');

    return populated;
  }
};

/**
 * Returns only the authenticated user's booking history.
 */
const getUserBookings = async (userId) => {
  const bookings = await Booking.find({ userId })
    .sort({ createdAt: -1 })
    .populate('eventId', 'title venue startTime endTime pricePerSeat category imageUrl')
    .populate('seatIds', 'seatNumber row');

  return bookings.map((b) => ({
    _id: b._id,
    bookingReference: b.bookingReference,
    amount: b.amount,
    status: b.status,
    createdAt: b.createdAt,
    cancelledAt: b.cancelledAt || null,
    event: {
      _id: b.eventId?._id,
      title: b.eventId?.title || 'Unknown Event',
      category: b.eventId?.category || 'General',
      venue: b.eventId?.venue || 'Unknown Venue',
      startTime: b.eventId?.startTime,
      endTime: b.eventId?.endTime,
      pricePerSeat: b.eventId?.pricePerSeat,
      imageUrl: b.eventId?.imageUrl || ''
    },
    seats: (b.seatIds || []).map((s) => ({
      _id: s._id,
      seatNumber: s.seatNumber,
      row: s.row
    }))
  }));
};

/**
 * Creates a direct booking atomically with full server-side validations:
 * - Checks event exists (404)
 * - Checks event date is not in the past (400)
 * - Checks empty seat selection (400)
 * - Checks duplicate seat IDs (400)
 * - Checks that seats belong to the correct event (400)
 * - Checks that no seats are already booked or actively held (409)
 * - Atomically marks seats as BOOKED and creates Booking record
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.eventId
 * @param {Array<string>} params.seatIds
 * @param {Date} [params.clockNow]
 */
const createDirectBooking = async ({
  userId,
  eventId,
  seatIds,
  clockNow = null,
  isCoupleBooking = false,
  coupleDisclaimerAccepted = false
}) => {
  const now = clockNow ? new Date(clockNow) : new Date();

  // 1. Validate empty seat selection
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    const error = new Error('Empty seat selection: You must select at least 1 seat to book');
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate duplicate seat selection
  const uniqueSeatIds = new Set(seatIds.map(String));
  if (uniqueSeatIds.size !== seatIds.length) {
    const error = new Error('Duplicate seats selected: Each seat can only be selected once');
    error.statusCode = 400;
    throw error;
  }

  // 3. Verify event exists
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  // 4. Verify Event is not completed
  if (event.status === 'Completed') {
    const error = new Error('Completed Event! Bookings are closed for this event.');
    error.statusCode = 400;
    throw error;
  }

  // 5. Verify Event has not passed its close time (endTime)
  const closeTime = event.endTime ? new Date(event.endTime) : (event.startTime ? new Date(event.startTime) : null);
  if (closeTime && now > closeTime) {
    const formattedCloseTime = closeTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const error = new Error(`Event Time Over! Booking time has ended. This event closed at ${formattedCloseTime}.`);
    error.statusCode = 400;
    throw error;
  }

  // 5b. Determine if this qualifies as a Group Booking (min 10 seats or event.groupMinSeats)
  const isGroupBooking = Boolean(
    !isCoupleBooking &&
    event.isGroupBookingEnabled !== false &&
    seatIds.length >= (event.groupMinSeats || 10)
  );

  // 5c. Validate Couple Ticket condition
  if (isCoupleBooking) {
    if (event.isCoupleTicketEnabled === false) {
      const error = new Error('Couple tickets are not available for this event.');
      error.statusCode = 400;
      throw error;
    }
    if (seatIds.length !== 2) {
      const error = new Error('Couple Ticket Condition: You must select exactly 2 seats for 1 Boy and 1 Girl.');
      error.statusCode = 400;
      throw error;
    }
    if (!coupleDisclaimerAccepted) {
      const error = new Error('You must accept the strict couple entry policy (1 Boy + 1 Girl required at gate) to book a couple ticket.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Verify user maximum seat limit (4 seats per user per event, OR group booking capacity)
  if (userId) {
    const existingBookings = await Booking.find({
      userId,
      eventId: event._id,
      status: 'CONFIRMED'
    });
    const alreadyBookedSeatsCount = existingBookings.reduce(
      (sum, b) => sum + (b.seatIds ? b.seatIds.length : 0),
      0
    );

    if (!isGroupBooking) {
      if (alreadyBookedSeatsCount >= 4) {
        const error = new Error('You already booked your max seats for this event. Maximum limit is 4 seats per event.');
        error.statusCode = 400;
        throw error;
      }

      if (alreadyBookedSeatsCount + seatIds.length > 4) {
        const remaining = 4 - alreadyBookedSeatsCount;
        const error = new Error(`You can only book up to ${remaining} more seat(s) for this event. Maximum limit is 4 seats per event.`);
        error.statusCode = 400;
        throw error;
      }
    } else {
      const maxGroupAllowed = Math.min(20, event.totalSeats || 40);
      if (alreadyBookedSeatsCount + seatIds.length > maxGroupAllowed) {
        const error = new Error(`Group reservation exceeds maximum allowed capacity of ${maxGroupAllowed} seats.`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // 6. Verify all requested seats exist and belong to this event
  const seats = await Seat.find({
    _id: { $in: seatIds },
    eventId: event._id
  });

  if (seats.length !== seatIds.length) {
    const error = new Error('One or more selected seats do not belong to this event');
    error.statusCode = 400;
    throw error;
  }

  // 6. Verify none of the seats are already booked or actively held
  for (const s of seats) {
    if (s.status === 'BOOKED') {
      const error = new Error(`Seat ${s.seatNumber} is already booked.`);
      error.statusCode = 409;
      throw error;
    }
    if (s.status === 'HELD' && s.holdExpiresAt && new Date(s.holdExpiresAt) > now) {
      const error = new Error(`Seat ${s.seatNumber} is currently held by another customer.`);
      error.statusCode = 409;
      throw error;
    }
  }

  // Authoritative amount calculation with Group or Couple Discount applied
  const baseAmount = event.pricePerSeat * seatIds.length;
  let discountPct = 0;
  if (isGroupBooking) {
    discountPct = event.groupDiscountPercentage || 10;
  } else if (isCoupleBooking) {
    discountPct = event.coupleDiscountPercentage != null ? event.coupleDiscountPercentage : 40;
  }
  const discountAmount = discountPct > 0 ? Math.round((baseAmount * discountPct) / 100) : 0;
  const trustedAmount = baseAmount - discountAmount;
  const bookingReference = generateBookingReference();
  const useReplicaSetTransaction = supportsTransactions();

  if (useReplicaSetTransaction) {
    const session = await mongoose.startSession();
    try {
      let createdBooking = null;
      await session.withTransaction(async () => {
        // Atomically claim seats
        for (const seatId of seatIds) {
          const claimedSeat = await Seat.findOneAndUpdate(
            {
              _id: seatId,
              eventId: event._id,
              $or: [
                { status: 'AVAILABLE' },
                { status: 'HELD', holdExpiresAt: { $lte: now } }
              ]
            },
            {
              $set: {
                status: 'BOOKED',
                holdId: null,
                holdExpiresAt: null
              }
            },
            { session, new: true }
          );

          if (!claimedSeat) {
            const conflict = new Error('One or more selected seats are no longer available.');
            conflict.statusCode = 409;
            throw conflict;
          }
        }

        const [newBooking] = await Booking.create(
          [
            {
              bookingReference,
              userId,
              eventId: event._id,
              seatIds,
              amount: trustedAmount,
              isGroupBooking,
              isCoupleBooking: Boolean(isCoupleBooking),
              coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted),
              originalAmount: baseAmount,
              discountAmount,
              discountPercentage: discountPct,
              status: 'CONFIRMED'
            }
          ],
          { session }
        );
        createdBooking = newBooking;
      });

      const populated = await Booking.findById(createdBooking._id)
        .populate('eventId', 'title venue startTime endTime pricePerSeat category')
        .populate('seatIds', 'seatNumber row');

      return populated;
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone MongoDB atomic conditional update with rollback
    const claimedSeatIds = [];
    try {
      for (const seatId of seatIds) {
        const claimedSeat = await Seat.findOneAndUpdate(
          {
            _id: seatId,
            eventId: event._id,
            $or: [
              { status: 'AVAILABLE' },
              { status: 'HELD', holdExpiresAt: { $lte: now } }
            ]
          },
          {
            $set: {
              status: 'BOOKED',
              holdId: null,
              holdExpiresAt: null
            }
          },
          { new: true }
        );

        if (!claimedSeat) {
          const conflict = new Error('One or more selected seats are no longer available.');
          conflict.statusCode = 409;
          throw conflict;
        }

        claimedSeatIds.push(seatId);
      }

      const newBooking = await Booking.create({
        bookingReference,
        userId,
        eventId: event._id,
        seatIds,
        amount: trustedAmount,
        isGroupBooking,
        isCoupleBooking: Boolean(isCoupleBooking),
        coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted),
        originalAmount: baseAmount,
        discountAmount,
        discountPercentage: discountPct,
        status: 'CONFIRMED'
      });

      const populated = await Booking.findById(newBooking._id)
        .populate('eventId', 'title venue startTime endTime pricePerSeat category')
        .populate('seatIds', 'seatNumber row');

      return populated;
    } catch (err) {
      if (claimedSeatIds.length > 0) {
        await Seat.updateMany(
          { _id: { $in: claimedSeatIds }, eventId: event._id, status: 'BOOKED' },
          { $set: { status: 'AVAILABLE', holdId: null, holdExpiresAt: null } }
        );
      }
      throw err;
    }
  }
};

module.exports = {
  confirmBooking,
  cancelBooking,
  getUserBookings,
  createDirectBooking
};
