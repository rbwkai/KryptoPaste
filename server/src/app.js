import express from 'express';
import mongoose from 'mongoose';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  // Liveness: "is the process alive?"
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Readiness: "can it actually serve traffic?" (database connected)
  app.get('/api/ready', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'not_ready' });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
