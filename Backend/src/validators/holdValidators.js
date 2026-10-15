const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const validateEventId = [
  param('eventId')
    .notEmpty().withMessage('Event ID is required')
    .isMongoId().withMessage('Event ID must be a valid MongoDB ObjectId')
];

const validateCreateHold = [
  param('eventId')
    .notEmpty().withMessage('Event ID is required')
    .isMongoId().withMessage('Event ID must be a valid MongoDB ObjectId'),
  body('seatIds')
    .isArray({ min: 1, max: 4 }).withMessage('You must select between 1 and 4 seats')
    .custom((seatIds) => {
      // Validate each element is a valid MongoDB ObjectId
      for (const id of seatIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid seat ID format: ${id}`);
        }
      }
      // Check for uniqueness
      const uniqueIds = new Set(seatIds.map(String));
      if (uniqueIds.size !== seatIds.length) {
        throw new Error('Duplicate seat IDs are not permitted in a hold request');
      }
      return true;
    })
];

const validateHoldId = [
  param('holdId')
    .notEmpty().withMessage('Hold ID is required')
    .isMongoId().withMessage('Hold ID must be a valid MongoDB ObjectId')
];

module.exports = {
  validateEventId,
  validateCreateHold,
  validateHoldId
};
