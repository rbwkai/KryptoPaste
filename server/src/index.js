import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';

try {
  await connectDb(config.mongodbUri);
  console.log('database connected');
} catch (err) {
  console.error('database connection failed:', err.message);
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  console.log(`listening on port ${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
