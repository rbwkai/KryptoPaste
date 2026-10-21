import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    env: { LOG_LEVEL: 'silent' }, // no log noise in test output
    fileParallelism: false, // integration tests share one database
    testTimeout: 15_000,
  },
});
