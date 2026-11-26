import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';

async function start() {
  if (env.mongodbUri) {
    await mongoose.connect(env.mongodbUri);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Server startup failed', error);
  process.exit(1);
});
