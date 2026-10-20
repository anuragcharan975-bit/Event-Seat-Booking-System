const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  validateRegister,
  validateLogin,
  validateSendOtp,
  validateChangePassword
} = require('../validators/authValidators');
const validateRequest = require('../middlewares/validateRequest');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/register', validateRegister, validateRequest, authController.register);
router.post('/login', validateLogin, validateRequest, authController.login);
router.get('/me', requireAuth, authController.getMe);
router.put('/profile', requireAuth, authController.updateProfile);

// OTP & Password Management endpoints
router.post('/send-otp', validateSendOtp, validateRequest, authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/change-password', validateChangePassword, validateRequest, authController.changePassword);

module.exports = router;
