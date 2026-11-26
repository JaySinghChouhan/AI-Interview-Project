import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import aiRoutes from './routes/ai.routes.js';
import authRoutes from './routes/auth.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.VERCEL === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  const allowedOrigins = [
    ...(process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((item) => item.trim()),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/ai', requireAuth, aiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const app = createApp();

export default app;
