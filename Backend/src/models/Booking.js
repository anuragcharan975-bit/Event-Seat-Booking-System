const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: [true, 'Booking reference is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
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
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatHold',
      required: false,
      default: null
    },
    seatIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seat',
        required: true
      }
    ],
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    isGroupBooking: {
      type: Boolean,
      default: false
    },
    isCoupleBooking: {
      type: Boolean,
      default: false
    },
    coupleDisclaimerAccepted: {
      type: Boolean,
      default: false
    },
    originalAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED',
      required: true
    },
    checkInStatus: {
      type: String,
      enum: ['PENDING', 'CHECKED_IN'],
      default: 'PENDING',
      index: true
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
bookingSchema.index({ userId: 1, createdAt: -1 });
// Enforce unique holdId ONLY when holdId is a valid ObjectId (not null/undefined)
bookingSchema.index(
  { holdId: 1 },
  {
    unique: true,
    partialFilterExpression: { holdId: { $type: 'objectId' } }
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
