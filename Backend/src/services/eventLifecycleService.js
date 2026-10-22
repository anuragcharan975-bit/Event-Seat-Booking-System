const Event = require('../models/Event');

/**
 * Synchronizes event status based on admin set timings:
 * Any event whose endTime has passed (now >= endTime) automatically transitions to 'Completed'.
 * This ensures real-time accuracy across user side, admin dashboard, and seat booking pipelines.
 *
 * @returns {Promise<number>} Number of events transitioned to 'Completed'
 */
const syncCompletedEvents = async () => {
  try {
    const now = new Date();
    const result = await Event.updateMany(
      {
        endTime: { $lte: now },
        status: { $ne: 'Completed' }
      },
      {
        $set: { status: 'Completed' }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Event Lifecycle] Automatically marked ${result.modifiedCount} ended event(s) as Completed.`);
    }

    return result.modifiedCount;
  } catch (err) {
    console.error('[Event Lifecycle] Auto-completion error:', err.message);
    return 0;
  }
};

module.exports = {
  syncCompletedEvents
};
