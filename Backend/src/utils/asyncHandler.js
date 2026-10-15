/**
 * Simple higher-order function to wrap async Express route handlers.
 * Catches any unhandled Promise rejections and forwards them to the Express error middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
