const mongoose = require('mongoose');

const seatHoldSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true
    },
    seatIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seat',
        required: true
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED'],
      default: 'ACTIVE',
      required: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast lookup of active user holds and expiration queries
seatHoldSchema.index({ userId: 1, status: 1 });
seatHoldSchema.index({ eventId: 1, status: 1, expiresAt: 1 });

const SeatHold = mongoose.model('SeatHold', seatHoldSchema);

module.exports = SeatHold;
