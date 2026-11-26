import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import { connectToDatabase } from './services/database.service.js';

async function start() {
  if (env.mongodbUri) {
    await connectToDatabase();
  }

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Server startup failed', error);
  process.exit(1);
});
