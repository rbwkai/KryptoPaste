import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { logger } from './logger.js';

try {
  await connectDb(config.mongodbUri);
  logger.info('database connected');
} catch (err) {
  logger.error(
    { err: { name: err.name, message: err.message } },
    'database connection failed',
  );
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  logger.info({ port: config.port }, 'server listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
