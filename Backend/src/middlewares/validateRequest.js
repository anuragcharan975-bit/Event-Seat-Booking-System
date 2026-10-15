const { validationResult } = require('express-validator');

/**
 * Middleware that inspects express-validator results.
 * If validation errors exist, returns HTTP 400 with standard formatted error list.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: formattedErrors[0]?.message || 'Validation error',
      errors: formattedErrors
    });
  }
  next();
};

module.exports = validateRequest;
