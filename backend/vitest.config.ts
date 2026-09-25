import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Each test file gets its own SQLite database, so files can run in parallel
    pool: 'forks',
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
