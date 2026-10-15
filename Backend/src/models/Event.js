const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
      maxlength: [150, 'Venue cannot exceed 150 characters']
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: 'End time must be later than start time'
      }
    },
    pricePerSeat: {
      type: Number,
      required: [true, 'Price per seat is required'],
      min: [0, 'Price per seat cannot be negative']
    },
    totalSeats: {
      type: Number,
      default: 0,
      min: [1, 'Event must have at least 1 seat']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for querying upcoming events
eventSchema.index({ startTime: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
