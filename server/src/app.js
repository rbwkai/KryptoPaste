import express from 'express';
import mongoose from 'mongoose';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { requestLogger } from './middleware/request-logger.js';
import { securityHeaders } from './middleware/security.js';
import { pastesRouter } from './routes/pastes.js';

export function createApp({ trustProxy = 0 } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);

  app.use(securityHeaders);
  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: process.env.GIT_SHA ?? 'dev' });
  });

  // TEMPORARY (step 14): shows what the proxies in front of us tell us about the
  // caller, so we can pick the right TRUST_PROXY number. Off unless DEBUG_PROXY=1.
  if (process.env.DEBUG_PROXY === '1') {
    app.get('/api/_proxy', (req, res) => {
      res.json({ xff: req.headers['x-forwarded-for'] ?? null, ip: req.ip });
    });
  }

  app.get('/api/ready', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'not_ready' });
  });

  // Limit BEFORE parsing the body, so spammers cost us as little as possible.
  app.use('/api', apiLimiter);
  app.use(express.json({ limit: '150kb' }));

  app.use('/api/pastes', pastesRouter);

  app.use('/api', notFound);
  app.use(errorHandler); // must be last

  return app;
}
