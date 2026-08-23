import { execSync } from 'node:child_process';

/**
 * Points every test at a throwaway database and brings its schema up to date before any
 * test file loads — server/db/client.ts reads DATABASE_URL at import time.
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    `postgresql://${process.env.USER ?? 'postgres'}@localhost:5432/nooswise_test`;

  process.env.DATABASE_URL = url;

  execSync('npx drizzle-kit migrate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
