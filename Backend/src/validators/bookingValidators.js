const { body } = require('express-validator');
const mongoose = require('mongoose');

const validateCreateBooking = [
  body('eventId')
    .notEmpty().withMessage('Event ID is required')
    .isMongoId().withMessage('Event ID must be a valid MongoDB ObjectId'),
  body('seatIds')
    .custom((seatIds) => {
      if (!Array.isArray(seatIds) || seatIds.length === 0) {
        throw new Error('Empty seat selection: You must select at least 1 seat to book');
      }
      for (const id of seatIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid seat ID format: ${id}`);
        }
      }
      const uniqueIds = new Set(seatIds.map(String));
      if (uniqueIds.size !== seatIds.length) {
        throw new Error('Duplicate seat selection: Each seat can only be selected once');
      }
      return true;
    })
];

module.exports = {
  validateCreateBooking
};
