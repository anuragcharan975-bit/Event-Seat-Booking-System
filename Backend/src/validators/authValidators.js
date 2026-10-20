const { body } = require('express-validator');

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 6 }).withMessage('Password cannot be more than 6 characters')
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const validateSendOtp = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const validateChangePassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty().withMessage('4-digit OTP is required')
    .matches(/^\d{4}$/).withMessage('OTP must be exactly 4 numeric digits'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 1, max: 6 }).withMessage('New password cannot be more than 6 characters')
];

module.exports = {
  validateRegister,
  validateLogin,
  validateSendOtp,
  validateChangePassword
};
