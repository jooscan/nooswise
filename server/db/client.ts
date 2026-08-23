import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point it at your local Postgres.'
  );
}

/**
 * The pool is deliberately small. In production this runs on a 1 GB e2-micro alongside
 * Postgres itself, and every idle connection costs the server a few megabytes of
 * backend process. Five is far more than a single-process Express app needs.
 */
export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
/** The handle passed to a callback inside db.transaction(). */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export async function closeDb(): Promise<void> {
  await pool.end();
}
