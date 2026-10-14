import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiRouter } from './routes/index.js';
import { webhooksRouter } from './routes/webhooks.js';

export function createApp() {
  const app = express();

  // Behind Caddy in production: trust the first proxy so rate limits see real client IPs.
  if (config.isProd) app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // Webhooks verify signatures over the raw bytes, so they mount before the JSON parser.
  app.use('/api/webhooks', webhooksRouter);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
