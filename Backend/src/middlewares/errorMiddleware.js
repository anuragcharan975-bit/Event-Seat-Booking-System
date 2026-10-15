/**
 * Centralized Error Handling Middleware for Express.
 * Formats known Mongoose/MongoDB errors and unhandled exceptions into consistent JSON responses.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose CastError (e.g. malformed ObjectId in params or body)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}': ${err.value}`;
  }

  // Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // MongoDB Duplicate Key Error (e.g. unique email or unique holdId on Booking)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'resource';
    message = `Duplicate entry conflict on ${duplicateField}.`;
  }

  // Log server errors internally (do not expose stack to client in production)
  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Server Error]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
