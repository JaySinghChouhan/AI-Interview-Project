import mongoose from 'mongoose';
import { env } from '../config/env.js';

let connectionPromise;

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!env.mongodbUri) {
    const error = new Error('Account service is not configured. Set MONGODB_URI on the server.');
    error.status = 503;
    throw error;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDatabaseName,
      serverSelectionTimeoutMS: 5000,
    }).then(() => undefined).catch((cause) => {
      connectionPromise = undefined;
      console.error('MongoDB connection failed', cause);
      const error = new Error('Account database is unavailable. Check MONGODB_URI and database network access.');
      error.status = 503;
      throw error;
    });
  }

  await connectionPromise;
}
