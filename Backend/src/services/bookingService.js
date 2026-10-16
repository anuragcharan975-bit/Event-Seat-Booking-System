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

module.exports = {
  confirmBooking,
  cancelBooking,
  getUserBookings
};
