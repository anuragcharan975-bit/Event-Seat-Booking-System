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

  // Calculate authoritative amount on the server
  const trustedAmount = event.pricePerSeat * hold.seatIds.length;
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
 * Returns only the authenticated user's booking history.
 */
const getUserBookings = async (userId) => {
  const bookings = await Booking.find({ userId })
    .sort({ createdAt: -1 })
    .populate('eventId', 'title venue startTime endTime pricePerSeat')
    .populate('seatIds', 'seatNumber row');

  return bookings.map((b) => ({
    _id: b._id,
    bookingReference: b.bookingReference,
    amount: b.amount,
    status: b.status,
    createdAt: b.createdAt,
    event: {
      _id: b.eventId?._id,
      title: b.eventId?.title || 'Unknown Event',
      venue: b.eventId?.venue || 'Unknown Venue',
      startTime: b.eventId?.startTime,
      endTime: b.eventId?.endTime
    },
    seats: (b.seatIds || []).map((s) => ({
      _id: s._id,
      seatNumber: s.seatNumber,
      row: s.row
    }))
  }));
};

module.exports = {
  confirmBooking,
  getUserBookings
};
