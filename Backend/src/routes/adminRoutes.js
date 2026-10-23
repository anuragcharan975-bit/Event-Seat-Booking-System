const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Enforce authentication AND admin privileges for all admin routes
router.use(requireAuth, requireAdmin);

// Dashboard overview stats
router.get('/stats', adminController.getStats);

// Event management endpoints
router.get('/events', adminController.getEvents);
router.post('/events', adminController.createEvent);
router.put('/events/:eventId', adminController.updateEvent);
router.patch('/events/:eventId/status', adminController.updateEventStatus);
router.put('/events/:eventId/status', adminController.updateEventStatus);
router.delete('/events/:eventId', adminController.deleteEvent);

// User management endpoints
router.get('/users', adminController.getUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// All bookings management endpoints
router.get('/bookings', adminController.getBookings);
router.post('/bookings/:bookingId/cancel', adminController.cancelBooking);

// Reviews management endpoints
router.get('/reviews', adminController.getReviews);
router.delete('/reviews/:reviewId', adminController.deleteReview);

module.exports = router;
