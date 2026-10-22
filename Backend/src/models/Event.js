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
    },
    category: {
      type: String,
      trim: true,
      default: 'Other',
      maxlength: [50, 'Category cannot exceed 50 characters']
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true
    },
    categorySlug: {
      type: String,
      trim: true,
      lowercase: true
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'In Progress', 'Completed'],
        message: '{VALUE} is not a valid event status'
      },
      default: 'Pending',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for querying upcoming events, categories, status, and readable slugs
eventSchema.index({ startTime: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ slug: 1 }, { unique: true, sparse: true });
eventSchema.index({ categorySlug: 1, slug: 1 });

const { slugify, generateUniqueEventSlug } = require('../utils/slugify');

// Automatically generate unique slug and categorySlug before saving
eventSchema.pre('save', async function (next) {
  try {
    if (this.isModified('category') || !this.categorySlug) {
      this.categorySlug = slugify(this.category || 'Other') || 'other';
    }

    if (this.isModified('title') || !this.slug) {
      this.slug = await generateUniqueEventSlug(this.constructor, this.title, this._id);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
