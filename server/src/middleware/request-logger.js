import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../logger.js';

// Hide paste ids and query strings, so logs can't link a visitor to a paste.
export function cleanUrl(url) {
  return url.split('?')[0].replace(/^\/api\/pastes\/[^/]+/, '/api/pastes/:id');
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (_req, res) => {
    const id = randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: cleanUrl(req.url) }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Health checks would flood the logs.
  autoLogging: { ignore: (req) => req.url === '/api/health' },
});
