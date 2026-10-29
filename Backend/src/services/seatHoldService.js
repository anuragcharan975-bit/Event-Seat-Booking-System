const mongoose = require('mongoose');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const SeatHold = require('../models/SeatHold');
const Booking = require('../models/Booking');
const { supportsTransactions } = require('../config/db');

/**
 * Creates an atomic hold on 1-4 seats for an upcoming event.
 * Uses MongoDB transactions when connected to a replica set,
 * or atomic conditional updates with compensating rollback on standalone.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user's ObjectId string
 * @param {string} params.eventId - Target event's ObjectId string
 * @param {Array<string>} params.seatIds - Array of 1-4 seat ObjectIds
 * @param {number} [params.durationSeconds] - Hold duration in seconds (default 120)
 * @param {Date} [params.clockNow] - Optional clock injection for deterministic testing
 */
const createSeatHold = async ({
  userId,
  eventId,
  seatIds,
  durationSeconds = null,
  clockNow = null,
  isCoupleBooking = false,
  coupleDisclaimerAccepted = false
}) => {
  const now = clockNow ? new Date(clockNow) : new Date();
  const holdSeconds = durationSeconds !== null
    ? durationSeconds
    : parseInt(process.env.HOLD_DURATION_SECONDS, 10) || 120;
  const expiresAt = new Date(now.getTime() + holdSeconds * 1000);

  // 1. Verify Event exists
  const event = await Event.findById(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify Event is not completed
  if (event.status === 'Completed') {
    const error = new Error('Completed Event! Bookings are closed for this event.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Verify Event has not passed its close time (endTime)
  const closeTime = event.endTime ? new Date(event.endTime) : (event.startTime ? new Date(event.startTime) : null);
  if (closeTime && now > closeTime) {
    const formattedCloseTime = closeTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const error = new Error(`Event Time Over! Booking time has ended. This event closed at ${formattedCloseTime}.`);
    error.statusCode = 400;
    throw error;
  }

  // 4. Determine if this qualifies as a Group Booking (min 10 seats or event.groupMinSeats)
  const isGroupBooking = Boolean(
    !isCoupleBooking &&
    event.isGroupBookingEnabled !== false &&
    seatIds.length >= (event.groupMinSeats || 10)
  );

  // 4b. Validate Couple Ticket condition (strictly 2 seats for 1 Boy and 1 Girl)
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

  // 5. Verify all requested seats exist and belong to this event
  const seats = await Seat.find({
    _id: { $in: seatIds },
    eventId: event._id
  });

  if (seats.length !== seatIds.length) {
    const error = new Error('One or more requested seat IDs do not belong to this event');
    error.statusCode = 400;
    throw error;
  }

  // 3b. Verify none of the requested seats are already booked
  for (const s of seats) {
    if (s.status === 'BOOKED') {
      const error = new Error(`Seat ${s.seatNumber} is already booked.`);
      error.statusCode = 409;
      throw error;
    }
  }

  // 4. Generate new hold ObjectId and calculate authoritative group or couple discount
  const holdId = new mongoose.Types.ObjectId();
  const baseAmount = event.pricePerSeat * seatIds.length;
  let discountPct = 0;
  if (isGroupBooking) {
    discountPct = event.groupDiscountPercentage || 10;
  } else if (isCoupleBooking) {
    discountPct = event.coupleDiscountPercentage != null ? event.coupleDiscountPercentage : 40;
  }
  const discountAmount = discountPct > 0 ? Math.round((baseAmount * discountPct) / 100) : 0;
  const totalAmount = baseAmount - discountAmount;

  // Check if replica set transaction is available
  const useReplicaSetTransaction = supportsTransactions();

  if (useReplicaSetTransaction) {
    // -------------------------------------------------------------
    // ATOMIC ALLOCATION VIA MONGODB ACID TRANSACTION (REPLICA SET)
    // -------------------------------------------------------------
    const session = await mongoose.startSession();
    try {
      let createdHold = null;

      await session.withTransaction(async () => {
        // Condition: seat must be AVAILABLE or have an expired hold
        // Note: status 'BOOKED' will NEVER match this query!
        for (const seatId of seatIds) {
          const claimedSeat = await Seat.findOneAndUpdate(
            {
              _id: seatId,
              eventId: event._id,
              $or: [
                { status: 'AVAILABLE' },
                { status: 'HELD', holdExpiresAt: { $lt: now } }
              ]
            },
            {
              $set: {
                status: 'HELD',
                holdId: holdId,
                holdExpiresAt: expiresAt
              }
            },
            { session, new: true }
          );

          if (!claimedSeat) {
            // Concurrency conflict: seat is already held or booked by someone else
            const conflictError = new Error('One or more selected seats are no longer available.');
            conflictError.statusCode = 409;
            throw conflictError;
          }
        }

        // Create the SeatHold record inside the same transaction
        const [holdDoc] = await SeatHold.create(
          [
            {
              _id: holdId,
              userId,
              eventId: event._id,
              seatIds,
              status: 'ACTIVE',
              expiresAt,
              isGroupBooking,
              isCoupleBooking: Boolean(isCoupleBooking),
              coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted),
              originalAmount: baseAmount,
              discountAmount,
              discountPercentage: discountPct,
              totalAmount
            }
          ],
          { session }
        );

        createdHold = holdDoc;
      });

      return {
        holdId: createdHold._id,
        eventId: event._id,
        eventTitle: event.title,
        seatIds,
        seats: seats.map((s) => ({ id: s._id, seatNumber: s.seatNumber, row: s.row })),
        pricePerSeat: event.pricePerSeat,
        isGroupBooking,
        originalAmount: baseAmount,
        discountAmount,
        discountPercentage: discountPct,
        totalAmount,
        expiresAt,
        serverTime: now
      };
    } finally {
      await session.endSession();
    }
  } else {
    // -------------------------------------------------------------
    // ATOMIC ALLOCATION VIA CONDITIONAL UPDATES & ROLLBACK (STANDALONE)
    // -------------------------------------------------------------
    const successfullyClaimed = [];

    try {
      for (const seatId of seatIds) {
        const claimedSeat = await Seat.findOneAndUpdate(
          {
            _id: seatId,
            eventId: event._id,
            $or: [
              { status: 'AVAILABLE' },
              { status: 'HELD', holdExpiresAt: { $lt: now } }
            ]
          },
          {
            $set: {
              status: 'HELD',
              holdId: holdId,
              holdExpiresAt: expiresAt
            }
          },
          { new: true }
        );

        if (!claimedSeat) {
          const conflictError = new Error('One or more selected seats are no longer available.');
          conflictError.statusCode = 409;
          throw conflictError;
        }

        successfullyClaimed.push(seatId);
      }

      // Create SeatHold document
      const holdDoc = await SeatHold.create({
        _id: holdId,
        userId,
        eventId: event._id,
        seatIds,
        status: 'ACTIVE',
        expiresAt,
        isGroupBooking,
        isCoupleBooking: Boolean(isCoupleBooking),
        coupleDisclaimerAccepted: Boolean(coupleDisclaimerAccepted),
        originalAmount: baseAmount,
        discountAmount,
        discountPercentage: discountPct,
        totalAmount
      });

      return {
        holdId: holdDoc._id,
        eventId: event._id,
        eventTitle: event.title,
        seatIds,
        seats: seats.map((s) => ({ id: s._id, seatNumber: s.seatNumber, row: s.row })),
        pricePerSeat: event.pricePerSeat,
        isGroupBooking,
        originalAmount: baseAmount,
        discountAmount,
        discountPercentage: discountPct,
        totalAmount,
        expiresAt,
        serverTime: now
      };
    } catch (err) {
      // Compensating rollback: release all seats that were claimed in this failed attempt
      if (successfullyClaimed.length > 0) {
        await Seat.updateMany(
          {
            _id: { $in: successfullyClaimed },
            holdId: holdId,
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
      throw err;
    }
  }
};

/**
 * Releases an active seat hold, setting seats back to AVAILABLE.
 * Only the owner can release their hold.
 * Protects against releasing seats that belong to newer holds or have been booked.
 */
const releaseSeatHold = async ({ holdId, userId, clockNow = null }) => {
  const now = clockNow ? new Date(clockNow) : new Date();

  const hold = await SeatHold.findById(holdId);
  if (!hold) {
    const error = new Error('Seat hold not found');
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification: User B cannot release User A's hold
  if (hold.userId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this seat hold');
    error.statusCode = 403;
    throw error;
  }

  // Idempotency: If already released, return success
  if (hold.status === 'RELEASED') {
    return {
      message: 'Hold has already been released',
      holdId: hold._id,
      status: 'RELEASED'
    };
  }

  // Cannot release if already confirmed into a booking
  if (hold.status === 'CONFIRMED') {
    const error = new Error('Cannot release a hold that has already been confirmed as a booking');
    error.statusCode = 409;
    throw error;
  }

  // Atomic release of seats:
  // Match ONLY seats where holdId equals this holdId AND status is 'HELD'.
  // This guarantees we NEVER release booked seats or seats claimed by a newer hold!
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

  hold.status = 'RELEASED';
  await hold.save();

  return {
    message: 'Seats have been successfully released',
    holdId: hold._id,
    status: 'RELEASED'
  };
};

/**
 * Retrieves the current user's active, unexpired hold for an event (or across all events).
 * Used for page-refresh recovery so the visual timer and selected seats can be restored.
 */
const getUserActiveHold = async ({ userId, eventId = null, clockNow = null }) => {
  const now = clockNow ? new Date(clockNow) : new Date();

  const query = {
    userId,
    status: 'ACTIVE',
    expiresAt: { $gt: now }
  };

  if (eventId) {
    query.eventId = eventId;
  }

  const activeHold = await SeatHold.findOne(query)
    .populate('eventId', 'title venue pricePerSeat startTime')
    .populate('seatIds', 'seatNumber row status');

  if (!activeHold) {
    return null;
  }

  const pricePerSeat = activeHold.eventId?.pricePerSeat || 0;
  const baseAmount = activeHold.originalAmount || (pricePerSeat * activeHold.seatIds.length);
  const totalAmount = activeHold.totalAmount != null ? activeHold.totalAmount : (pricePerSeat * activeHold.seatIds.length);

  return {
    holdId: activeHold._id,
    eventId: activeHold.eventId._id,
    eventTitle: activeHold.eventId.title,
    venue: activeHold.eventId.venue,
    startTime: activeHold.eventId.startTime,
    seats: activeHold.seatIds.map((s) => ({
      id: s._id,
      seatNumber: s.seatNumber,
      row: s.row
    })),
    pricePerSeat,
    isGroupBooking: Boolean(activeHold.isGroupBooking),
    originalAmount: baseAmount,
    discountAmount: activeHold.discountAmount || 0,
    discountPercentage: activeHold.discountPercentage || 0,
    totalAmount,
    expiresAt: activeHold.expiresAt,
    serverTime: now
  };
};

module.exports = {
  createSeatHold,
  releaseSeatHold,
  getUserActiveHold
};
