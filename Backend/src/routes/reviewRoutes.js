const express = require('express');
const router = express.Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Get all reviews for an event (public)
router.get('/', reviewController.getEventReviews);
router.get('/event/:eventId', reviewController.getEventReviews);

// Submit or update a review (requires user login)
router.post('/', requireAuth, reviewController.createOrUpdateReview);
router.post('/event/:eventId', requireAuth, reviewController.createOrUpdateReview);

// Delete a review (owner or admin)
router.delete('/:reviewId', requireAuth, reviewController.deleteReview);

module.exports = router;
