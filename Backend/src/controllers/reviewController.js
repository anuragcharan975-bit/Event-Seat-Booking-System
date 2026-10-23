const mongoose = require('mongoose');
const Review = require('../models/Review');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const { slugify } = require('../utils/slugify');

/**
 * Helper to resolve an event by either MongoDB ObjectId or slug
 */
const resolveEventId = async (eventParam) => {
  if (!eventParam) return null;

  if (mongoose.Types.ObjectId.isValid(eventParam)) {
    const event = await Event.findById(eventParam).select('_id');
    return event ? event._id : null;
  }

  const cleanSlug = slugify(eventParam);
  const event = await Event.findOne({
    $or: [
      { slug: cleanSlug },
      { slug: eventParam.toLowerCase().trim() }
    ]
  }).select('_id');

  return event ? event._id : null;
};

/**
 * @route   GET /api/events/:eventId/reviews
 * @desc    Get all reviews and rating breakdown for an event
 * @access  Public
 */
const getEventReviews = asyncHandler(async (req, res) => {
  const eventParam = req.params.eventId || req.params.slug;
  const eventId = await resolveEventId(eventParam);

  if (!eventId) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  const reviews = await Review.find({ eventId })
    .sort({ createdAt: -1 })
    .lean();

  const totalReviews = reviews.length;
  let ratingSum = 0;
  const breakdownCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  for (const r of reviews) {
    ratingSum += r.rating;
    if (breakdownCounts[r.rating] !== undefined) {
      breakdownCounts[r.rating]++;
    }
  }

  const averageRating = totalReviews > 0
    ? Math.round((ratingSum / totalReviews) * 10) / 10
    : 0;

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = breakdownCounts[stars] || 0;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return {
      stars,
      count,
      percentage
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      eventId,
      totalReviews,
      averageRating,
      ratingBreakdown,
      reviews
    }
  });
});

/**
 * @route   POST /api/events/:eventId/reviews
 * @desc    Submit or update a review for an event
 * @access  Private (Authenticated User)
 */
const createOrUpdateReview = asyncHandler(async (req, res) => {
  const eventParam = req.params.eventId || req.params.slug;
  const eventId = await resolveEventId(eventParam);

  if (!eventId) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  const { rating, comment } = req.body;

  const parsedRating = parseInt(rating, 10);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid rating between 1 and 5 stars'
    });
  }

  if (!comment || typeof comment !== 'string' || comment.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Review comment must be at least 2 characters long'
    });
  }

  if (comment.trim().length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Review comment cannot exceed 1000 characters'
    });
  }

  const userId = req.user._id || req.user.id;
  const userName = req.user.name || 'Anonymous User';
  const userEmail = req.user.email || '';

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User identity could not be verified'
    });
  }

  // Upsert review (update if user already reviewed this event)
  let review = await Review.findOne({ eventId, userId });

  if (review) {
    review.rating = parsedRating;
    review.comment = comment.trim();
    review.userName = userName;
    review.userEmail = userEmail;
    await review.save();
  } else {
    review = await Review.create({
      eventId,
      userId,
      userName,
      userEmail,
      rating: parsedRating,
      comment: comment.trim()
    });
  }

  // Recalculate stats
  await Review.calculateAverageRating(eventId);

  return res.status(200).json({
    success: true,
    message: review.isNew ? 'Review submitted successfully!' : 'Your review has been updated!',
    data: review
  });
});

/**
 * @route   DELETE /api/reviews/:reviewId
 * @desc    Delete a review (Owner or Admin only)
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format'
    });
  }

  const review = await Review.findById(reviewId);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  const currentUserId = (req.user._id || req.user.id || '').toString();
  const isOwner = review.userId.toString() === currentUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to delete this review'
    });
  }

  const eventId = review.eventId;
  await Review.findByIdAndDelete(reviewId);

  // Recalculate stats on Event
  await Review.calculateAverageRating(eventId);

  return res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});

module.exports = {
  getEventReviews,
  createOrUpdateReview,
  deleteReview
};
