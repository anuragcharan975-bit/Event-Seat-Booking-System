const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z][0-9]{1,3}$/, 'Seat number must be formatted like A1, B4, C12']
    },
    row: {
      type: String,
      required: [true, 'Row is required'],
      trim: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'HELD', 'BOOKED'],
      default: 'AVAILABLE',
      required: true
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatHold',
      default: null
    },
    holdExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index on eventId and seatNumber: prevents duplicate seats per event
seatSchema.index({ eventId: 1, seatNumber: 1 }, { unique: true });

// Query indexes for availability and expiration
seatSchema.index({ eventId: 1, status: 1 });
seatSchema.index({ holdId: 1 });
seatSchema.index({ holdExpiresAt: 1 });

const Seat = mongoose.model('Seat', seatSchema);

module.exports = Seat;
