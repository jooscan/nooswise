import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    // The repo and route tests share one Postgres database and truncate between cases,
    // so they must not run concurrently.
    fileParallelism: false,
    globalSetup: ['./server/test/globalSetup.ts'],
    setupFiles: ['./server/test/setup.ts'],
    testTimeout: 20_000,
  },
});
