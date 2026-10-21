import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { connectDb, disconnectDb } from '../../src/db.js';
import { Paste } from '../../src/models/paste.js';

const uri =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/kryptopaste-test';

// Safety net: tests delete data, so they must never touch Atlas or a real database.
function assertSafe() {
  const dbName = uri.split('/').pop().split('?')[0];
  if (uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net')) {
    throw new Error('Refusing to run tests against a cloud database');
  }
  if (!dbName.toLowerCase().includes('test')) {
    throw new Error('Test database name must contain "test"');
  }
}

export function useTestDb() {
  assertSafe();

  beforeAll(async () => {
    await connectDb(uri);
    await Paste.init(); // make sure the TTL index exists
  });

  beforeEach(async () => {
    await Paste.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });
}
