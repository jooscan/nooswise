import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Applies pending migrations, then exits.
 *
 * Deliberately a separate entry point rather than something the server does on boot:
 * a server that migrates as it starts will race itself if it is ever restarted twice in
 * quick succession, and a failed migration should stop a deploy rather than leave a
 * half-migrated database serving traffic.
 *
 * Uses drizzle-orm's migrator rather than the drizzle-kit CLI so the production image
 * does not need dev dependencies.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    console.log('Applying migrations...');
    await migrate(db, { migrationsFolder: './server/db/migrations' });
    console.log('Migrations up to date.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
