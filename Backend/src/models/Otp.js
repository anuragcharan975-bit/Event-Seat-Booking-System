const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    hashedOtp: {
      type: String
    },
    otp: {
      type: String,
      trim: true
    },
    purpose: {
      type: String,
      enum: ['password_reset', 'change_password'],
      default: 'change_password'
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index to automatically purge expired documents
    },
    used: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    resetToken: {
      type: String,
      index: true
    },
    lastRequestedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
