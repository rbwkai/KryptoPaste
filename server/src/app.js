import express from 'express';
import mongoose from 'mongoose';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/ready', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'not_ready' });
  });

  app.use('/api', notFound);
  app.use(errorHandler); // must be last

  return app;
}
