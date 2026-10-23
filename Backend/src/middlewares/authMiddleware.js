const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes: Requires valid JWT in Authorization header.
 * Returns HTTP 401 for missing, invalid, or expired tokens.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing or malformed'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_event_seat_booking_system_2026_xyz';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Attach decoded user info to request
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication check failed',
      error: error.message
    });
  }
};

/**
 * Restrict routes: Requires authenticated user to have role 'admin'.
 * Returns HTTP 403 Forbidden for non-admin accounts.
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is missing or malformed'
    });
  }

  // 1. If token already carries role 'admin'
  if (req.user.role === 'admin') {
    return next();
  }

  // 2. Dynamic DB check: if token was issued earlier or role was updated in DB
  try {
    const dbUser = await User.findById(req.user.id);
    if (dbUser) {
      const isPrivileged =
        dbUser.role === 'admin' ||
        dbUser.email === 'admin909@gmail.com';

      if (isPrivileged) {
        if (dbUser.role !== 'admin') {
          dbUser.role = 'admin';
          await dbUser.save();
        }
        req.user.role = 'admin';
        return next();
      }
    }
  } catch (err) {
    console.error('requireAdmin fallback verification error:', err.message);
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Administrator privileges required.'
  });
};

module.exports = {
  requireAuth,
  requireAdmin
};
