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
 * @desc    Generate and send 6-digit OTP to user email for password reset / change (5-minute expiration)
 * @access  Public
 */
const sendOtp = asyncHandler(async (req, res) => {
  const emailInput = req.body.email || req.user?.email;

  if (!emailInput || !emailInput.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required to receive verification code'
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

  // Anti-Spam / Rate-limiting: prevent requesting multiple OTPs within 60 seconds
  const recentOtp = await Otp.findOne({
    email: normalizedEmail,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
  });

  if (recentOtp) {
    const secondsRemaining = Math.max(
      1,
      Math.ceil((recentOtp.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000)
    );
    return res.status(429).json({
      success: false,
      message: `Please wait ${secondsRemaining} second(s) before requesting a new verification code.`
    });
  }

  // Generate 6-digit numeric OTP (between 100000 and 999999)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Invalidate any existing unused OTP for this email
  await Otp.deleteMany({ email: normalizedEmail });

  // Expiration set to 5 minutes from now
  const validityMinutes = 5;
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

  // Securely hash OTP before database storage
  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(otp, salt);

  await Otp.create({
    userId: user._id,
    email: normalizedEmail,
    otp,
    hashedOtp,
    purpose: req.body.purpose || 'change_password',
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
    used: false,
    isVerified: false
  });

  // Dispatch email notification using existing SMTP configuration
  const emailResult = await emailService.sendOtpEmail({
    to: normalizedEmail,
    otp,
    userName: user.name,
    validityMinutes
  });

  // Handle email delivery errors if real SMTP was configured but failed
  if (!emailResult.success && emailResult.isSmtpConfigured) {
    return res.status(502).json({
      success: false,
      message: `Failed to deliver verification email: ${emailResult.error || 'SMTP Connection Error'}. Please check SMTP configuration.`
    });
  }

  return res.status(200).json({
    success: true,
    message: `A 6-digit verification code has been sent to ${normalizedEmail}. Valid for ${validityMinutes} minutes.`,
    email: normalizedEmail,
    expiresInMinutes: validityMinutes
  });
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify if entered 6-digit OTP is valid (tracks attempts and prevents brute-force)
 * @access  Public
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and verification code are required'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOtp = otp.toString().trim();

  // Find active, unexpired, unused OTP record
  const record = await Otp.findOne({
    email: normalizedEmail,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code. Please request a new code.'
    });
  }

  // Prevent invalid attempts / brute force
  if (record.attempts >= record.maxAttempts) {
    await Otp.deleteMany({ email: normalizedEmail });
    return res.status(429).json({
      success: false,
      message: 'Maximum verification attempts exceeded. This code has been invalidated for security. Please request a new code.'
    });
  }

  // Verify OTP against stored plain OTP or hashed OTP
  let isMatch = record.otp === trimmedOtp;
  if (!isMatch && record.hashedOtp) {
    isMatch = await bcrypt.compare(trimmedOtp, record.hashedOtp);
  }

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remainingAttempts = Math.max(0, record.maxAttempts - record.attempts);

    if (remainingAttempts === 0) {
      await Otp.deleteMany({ email: normalizedEmail });
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Maximum attempts reached. Please request a new code.'
      });
    }

    return res.status(400).json({
      success: false,
      message: `Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`
    });
  }

  // OTP is valid: generate a cryptographically secure reset token
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  record.isVerified = true;
  record.resetToken = resetToken;
  await record.save();

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully. You may now set your new password.',
    resetToken
  });
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Update password after OTP verification (hashes with bcrypt, prevents OTP reuse)
 * @access  Public
 */
const changePassword = asyncHandler(async (req, res) => {
  const { email, resetToken, otp, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email and new password are required'
    });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 4 characters long'
    });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirm password do not match'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User account not found'
    });
  }

  // Look up verified OTP record
  const query = {
    email: normalizedEmail,
    used: false,
    expiresAt: { $gt: new Date() }
  };

  if (resetToken) {
    query.resetToken = resetToken;
  }

  const record = await Otp.findOne(query);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Verification session expired or invalid. Please verify your OTP again.'
    });
  }

  // If record was not marked verified yet, check if valid OTP was passed directly
  if (!record.isVerified) {
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please verify the OTP code before updating your password.'
      });
    }
    const cleanOtp = otp.toString().trim();
    let isMatch = record.otp === cleanOtp;
    if (!isMatch && record.hashedOtp) {
      isMatch = await bcrypt.compare(cleanOtp, record.hashedOtp);
    }
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code.'
      });
    }
  }

  // Hash new password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update password in MongoDB
  user.passwordHash = passwordHash;
  await user.save();

  // Invalidate OTP immediately to prevent reuse
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
