const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number between 1 and 5'
      }
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [2, 'Review comment must be at least 2 characters'],
      maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true
  }
);

// One review per user per event
reviewSchema.index({ eventId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ eventId: 1, createdAt: -1 });

/**
 * Static method to calculate and sync average rating & total count on Event
 */
reviewSchema.statics.calculateAverageRating = async function (eventId) {
  try {
    const objectId = mongoose.Types.ObjectId.isValid(eventId)
      ? new mongoose.Types.ObjectId(eventId)
      : eventId;

    const stats = await this.aggregate([
      { $match: { eventId: objectId } },
      {
        $group: {
          _id: '$eventId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    let Event;
    try {
      Event = mongoose.model('Event');
    } catch {
      Event = require('./Event');
    }

    if (stats.length > 0) {
      await Event.findByIdAndUpdate(objectId, {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        totalReviews: stats[0].totalReviews
      });
    } else {
      await Event.findByIdAndUpdate(objectId, {
        averageRating: 0,
        totalReviews: 0
      });
    }
  } catch (err) {
    console.error('Failed to update event review statistics:', err.message);
  }
};

// Post-save hook to recalculate rating
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.eventId);
});

module.exports = mongoose.model('Review', reviewSchema);
