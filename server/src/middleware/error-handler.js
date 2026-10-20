export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'not_found' });
}

// Express knows this is an error handler because it has 4 arguments.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'bad_json' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code });
  }
  // Log only the error type, never err.message: messages can contain user data.
  req.log.error({ err: { name: err.name, code: err.code } }, 'unhandled error');
  return res.status(500).json({ error: 'internal_error' });
}
