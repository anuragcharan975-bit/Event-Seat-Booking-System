const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash
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

module.exports = {
  register,
  login,
  getMe
};
