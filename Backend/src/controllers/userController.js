const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const emailService = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   POST /api/users/password-otp/send
 * @desc    Validate current password and send 6-digit OTP to authenticated user's email
 * @access  Protected (requireAuth)
 */
const sendPasswordOtp = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is required to verify your identity.'
    });
  }

  // Find user by ID from JWT token
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User account not found.'
    });
  }

  // Verify current password against database hash
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect. Please enter your valid current password.'
    });
  }

  // Generate 6-digit numeric OTP (100000 - 999999)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Securely hash OTP before database storage (Requirement 10)
  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(otp, salt);

  // OTP validity (Requirement 4: 5 minutes)
  const validityMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10);
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

  // Invalidate any previous unexpired OTPs for this user
  await Otp.deleteMany({ userId: user._id, purpose: 'change_password' });

  // Store hashed OTP in MongoDB
  await Otp.create({
    userId: user._id,
    email: user.email,
    hashedOtp,
    purpose: 'change_password',
    attempts: 0,
    maxAttempts: 5,
    expiresAt
  });

  // Send OTP Email via Nodemailer
  const emailResult = await emailService.sendOtpEmail({
    to: user.email,
    otp,
    userName: user.name,
    validityMinutes
  });

  // Handle email delivery errors if real SMTP was configured (Requirement 12)
  if (!emailResult.success && emailResult.isSmtpConfigured) {
    return res.status(502).json({
      success: false,
      message: `Failed to deliver OTP email: ${emailResult.error || 'SMTP Connection Error'}. Please check SMTP configuration.`
    });
  }

  return res.status(200).json({
    success: true,
    message: `A 6-digit verification code has been sent to ${user.email}. Valid for ${validityMinutes} minutes.`,
    email: user.email,
    expiresInMinutes: validityMinutes,
    ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {})
  });
});

/**
 * @route   POST /api/users/password-otp/verify
 * @desc    Verify 6-digit OTP and update password
 * @access  Protected (requireAuth)
 */
const verifyPasswordOtpAndChange = asyncHandler(async (req, res) => {
  const { otp, newPassword, confirmPassword } = req.body;

  // Validation
  if (!otp || !otp.toString().trim()) {
    return res.status(400).json({
      success: false,
      message: '6-digit verification OTP is required.'
    });
  }

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password is required.'
    });
  }

  if (newPassword.length > 6) {
    return res.status(400).json({
      success: false,
      message: 'Password cannot be more than 6 characters.'
    });
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirm password do not match.'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User account not found.'
    });
  }

  // Find latest unused OTP for this user
  const otpRecord = await Otp.findOne({
    userId: user._id,
    purpose: 'change_password',
    used: false
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: 'No active OTP found. Please request an OTP with your current password first.'
    });
  }

  // Check Expiry (Requirement 4 & 7)
  if (new Date() > otpRecord.expiresAt) {
    otpRecord.used = true;
    await otpRecord.save();
    return res.status(400).json({
      success: false,
      message: 'The verification OTP has expired (5-minute validity). Please request a new OTP.'
    });
  }

  // Check Attempt Limit (Requirement 8: Max 5 incorrect attempts)
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    otpRecord.used = true;
    await otpRecord.save();
    return res.status(400).json({
      success: false,
      message: 'Maximum OTP verification attempts (5) exceeded. Please request a new OTP.'
    });
  }

  // Securely compare entered OTP with stored hash (Requirement 6 & 10)
  const isMatch = await bcrypt.compare(otp.toString().trim(), otpRecord.hashedOtp);

  if (!isMatch) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      otpRecord.used = true;
    }
    await otpRecord.save();

    const remaining = otpRecord.maxAttempts - otpRecord.attempts;
    if (remaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Maximum attempts (5) exceeded. Please request a new OTP.'
      });
    }

    return res.status(400).json({
      success: false,
      message: `Invalid OTP code. You have ${remaining} attempt(s) remaining.`
    });
  }

  // OTP verified successfully! Hash new password with bcrypt (Requirement 11)
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  // Invalidate OTP immediately so it cannot be reused (Requirement 9)
  otpRecord.used = true;
  await otpRecord.save();
  await Otp.deleteMany({ userId: user._id, purpose: 'change_password' });

  return res.status(200).json({
    success: true,
    message: 'Your password has been changed successfully! You can now use your new password.'
  });
});

module.exports = {
  sendPasswordOtp,
  verifyPasswordOtpAndChange
};
