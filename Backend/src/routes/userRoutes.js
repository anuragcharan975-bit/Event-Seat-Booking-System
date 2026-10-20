const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/users/password-otp/send
 * @desc    Validate current password and send 6-digit OTP to user email
 * @access  Protected
 */
router.post('/password-otp/send', requireAuth, userController.sendPasswordOtp);

/**
 * @route   POST /api/users/password-otp/verify
 * @desc    Verify 6-digit OTP and change password
 * @access  Protected
 */
router.post('/password-otp/verify', requireAuth, userController.verifyPasswordOtpAndChange);

module.exports = router;
