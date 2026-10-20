import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Second safety net: even if a field slips in, it gets removed.
  redact: {
    paths: [
      'req.headers',
      'req.remoteAddress',
      'req.remotePort',
      'req.body',
      'res.headers',
    ],
    remove: true,
  },
});
