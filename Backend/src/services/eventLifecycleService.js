const Event = require('../models/Event');

/**
 * Synchronizes event lifecycle status based on real-time event timings:
 * 1. Any event whose endTime has passed (now >= endTime) automatically transitions to 'Completed'.
 * 2. Any event whose startTime has arrived (startTime <= now < endTime) and is currently 'Pending'
 *    automatically transitions to 'In Progress'.
 *
 * @returns {Promise<number>} Number of events transitioned
 */
const syncCompletedEvents = async () => {
  try {
    const now = new Date();

    // 1. Mark ended events as Completed
    const completedResult = await Event.updateMany(
      {
        endTime: { $lte: now },
        status: { $ne: 'Completed' }
      },
      {
        $set: { status: 'Completed' }
      }
    );

    // 2. Mark ongoing events as In Progress (if currently Pending and within event duration)
    const inProgressResult = await Event.updateMany(
      {
        startTime: { $lte: now },
        $or: [
          { endTime: { $gt: now } },
          { endTime: { $exists: false } }
        ],
        status: 'Pending'
      },
      {
        $set: { status: 'In Progress' }
      }
    );

    const totalModified = (completedResult.modifiedCount || 0) + (inProgressResult.modifiedCount || 0);
    if (totalModified > 0) {
      console.log(
        `[Event Lifecycle] Auto-synced: ${completedResult.modifiedCount || 0} marked Completed, ${inProgressResult.modifiedCount || 0} marked In Progress.`
      );
    }

    return totalModified;
  } catch (err) {
    console.error('[Event Lifecycle] Auto-sync error:', err.message);
    return 0;
  }
};

module.exports = {
  syncCompletedEvents
};
