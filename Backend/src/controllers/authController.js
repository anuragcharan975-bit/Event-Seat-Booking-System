const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const emailService = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_event_seat_booking_system_2026_xyz';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role || 'user'
    },
    secret,
    { expiresIn }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  if (password && password.length > 6) {
    return res.status(400).json({
      success: false,
      message: 'Password cannot be more than 6 characters'
    });
  }

  // Check if email already registered (HTTP 409)
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'A user with this email address already exists'
    });
  }

  // Hash password with bcryptjs
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user - strictly enforce 'user' role on public registration
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'user'
  });

  const token = generateToken(user);

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: user.toSafeObject()
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by normalized email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Compare password hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const token = generateToken(user);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: user.toSafeObject()
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get profile of the currently logged-in user
 * @access  Protected
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  return res.status(200).json({
    success: true,
    user: user.toSafeObject()
  });
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update profile details (e.g. name) of the currently logged-in user
 * @access  Protected
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Name is required'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.name = name.trim();
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: user.toSafeObject()
  });
});

/**
 * @route   POST /api/auth/send-otp
 * @desc    Generate and send 4-digit OTP to user email for password reset / change
 * @access  Public
 */
const sendOtp = asyncHandler(async (req, res) => {
  const emailInput = req.body.email || req.user?.email;

  if (!emailInput || !emailInput.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required to receive OTP'
    });
  }

  const normalizedEmail = emailInput.toLowerCase().trim();

  // Verify that a user account with this email exists
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No registered account found with this email address'
    });
  }

  // Generate exact 4-digit numeric OTP (between 1000 and 9999)
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  // Invalidate any existing unused OTP for this email
  await Otp.deleteMany({ email: normalizedEmail });

  // Expiration set to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.create({
    email: normalizedEmail,
    otp,
    purpose: req.body.purpose || 'change_password',
    expiresAt
  });

  // Dispatch email notification
  await emailService.sendOtpEmail({
    to: normalizedEmail,
    otp,
    userName: user.name
  });

  return res.status(200).json({
    success: true,
    message: `A 4-digit verification code has been sent to ${normalizedEmail}`,
    email: normalizedEmail,
    expiresInMinutes: 10,
    ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {})
  });
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify if entered 4-digit OTP is valid
 * @access  Public
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and 4-digit OTP are required'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOtp = otp.toString().trim();

  const record = await Otp.findOne({
    email: normalizedEmail,
    otp: trimmedOtp,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired 4-digit OTP. Please request a new code.'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully'
  });
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Verify 4-digit OTP and update password
 * @access  Public
 */
const changePassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, 4-digit OTP, and new password are required'
    });
  }

  if (newPassword.length > 6) {
    return res.status(400).json({
      success: false,
      message: 'New password cannot be more than 6 characters (maximum 6 characters allowed)'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOtp = otp.toString().trim();

  // Find user
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User account not found'
    });
  }

  // Find matching unexpired OTP
  const record = await Otp.findOne({
    email: normalizedEmail,
    otp: trimmedOtp,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired 4-digit OTP. Please check the code or request a new one.'
    });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update password
  user.passwordHash = passwordHash;
  await user.save();

  // Mark OTP used and purge
  record.used = true;
  await record.save();
  await Otp.deleteMany({ email: normalizedEmail });

  return res.status(200).json({
    success: true,
    message: 'Your password has been changed successfully! You can now log in with your new password.'
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  sendOtp,
  verifyOtp,
  changePassword
};
