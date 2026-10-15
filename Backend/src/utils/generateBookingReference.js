const crypto = require('crypto');

/**
 * Generates a unique, human-readable booking reference.
 * Format: BK-YYYYMMDD-XXXXXX (e.g., BK-20261014-A7F92C)
 */
const generateBookingReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK-${dateStr}-${randomHex}`;
};

module.exports = generateBookingReference;
