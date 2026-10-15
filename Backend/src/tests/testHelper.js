const mongoose = require('mongoose');
const { MongoMemoryReplSet, MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB, setIsReplicaSet } = require('../config/db');

let replSetInstance = null;
let singleServerInstance = null;

/**
 * Initializes an in-memory replica set for testing transactions.
 * Falls back to single-instance memory server if replica set initialization fails.
 */
const setupTestDatabase = async () => {
  // If already connected, return
  if (mongoose.connection.readyState !== 0) {
    return;
  }

  try {
    replSetInstance = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    await replSetInstance.waitUntilRunning();
    const uri = replSetInstance.getUri();
    await connectDB(uri);
    setIsReplicaSet(true);
  } catch (err) {
    console.warn('[Test DB] MongoMemoryReplSet failed, falling back to MongoMemoryServer:', err.message);
    singleServerInstance = await MongoMemoryServer.create();
    const uri = singleServerInstance.getUri();
    await connectDB(uri);
    setIsReplicaSet(false);
  }
};

/**
 * Clears all collections between tests
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

/**
 * Tears down test database after all tests complete
 */
const teardownTestDatabase = async () => {
  await disconnectDB();
  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
  if (singleServerInstance) {
    await singleServerInstance.stop();
    singleServerInstance = null;
  }
};

module.exports = {
  setupTestDatabase,
  clearDatabase,
  teardownTestDatabase
};
