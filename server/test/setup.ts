import { afterAll, beforeEach } from 'vitest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://${process.env.USER ?? 'postgres'}@localhost:5432/nooswise_test`;

const { pool } = await import('../db/client');

beforeEach(async () => {
  // RESTART IDENTITY resets the expense_splits serial so ids stay predictable across
  // tests; CASCADE is only reaching the tables already named.
  await pool.query(
    'TRUNCATE groups, members, expenses, expense_splits, settlements RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await pool.end();
});
