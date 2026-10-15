const mongoose = require('mongoose');

let isReplicaSetInstance = false;

/**
 * Connect to MongoDB and detect server topology (Replica Set vs Standalone)
 * to ensure transaction support is properly verified and communicated.
 */
const connectDB = async (customUri = null) => {
  const uri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_seat_booking';

  try {
    const conn = await mongoose.connect(uri);
    const host = conn.connection.host || '127.0.0.1';
    const port = conn.connection.port || '27017';
    const dbName = conn.connection.name || 'event_seat_booking';
    console.log(`[Database] MongoDB Connected: ${host}:${port}/${dbName}`);

    // Check if connected instance is a replica set (required for multi-document ACID transactions)
    try {
      if (conn.connection.db) {
        const admin = conn.connection.db.admin();
        const serverInfo = await admin.command({ hello: 1 });
        isReplicaSetInstance = Boolean(serverInfo.setName);

        if (isReplicaSetInstance) {
          console.log(`[Database] Replica Set detected ("${serverInfo.setName}"). Multi-document ACID transactions are fully supported.`);
        } else {
          console.warn(`[Database] Running on Standalone MongoDB. Native multi-document transactions require a replica set.`);
          console.warn(`[Database] In-memory test suite runs with MongoMemoryReplSet; for production, enable rs0 as documented in README.`);
        }
      }
    } catch (checkErr) {
      console.warn(`[Database] Could not verify replica set status: ${checkErr.message}`);
      isReplicaSetInstance = false;
    }

    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Check if the active connection supports native MongoDB transactions.
 */
const supportsTransactions = () => isReplicaSetInstance;

/**
 * Close database connection
 */
const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = {
  connectDB,
  disconnectDB,
  supportsTransactions,
  getIsReplicaSet: () => isReplicaSetInstance,
  setIsReplicaSet: (val) => { isReplicaSetInstance = val; }
};
