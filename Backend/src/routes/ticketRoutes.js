const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireStaffOrAdmin } = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/tickets/verify/:bookingReference
 * @desc    Public ticket verification endpoint
 * @access  Public
 */
router.get('/verify/:bookingReference', ticketController.verifyTicket);

/**
 * @route   PATCH /api/tickets/:bookingReference/check-in
 * @desc    Atomic gatekeeper/staff admission check-in
 * @access  Protected (Staff or Admin only)
 */
router.patch('/:bookingReference/check-in', requireAuth, requireStaffOrAdmin, ticketController.checkInTicket);

module.exports = router;
