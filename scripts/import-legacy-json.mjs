#!/usr/bin/env node
/**
 * One-off: pushes the old flat-file store (data/splits.json) into the database.
 *
 * The file was the entire backend before this change — a map of group id to the whole
 * group document. Groups that already exist server-side are skipped, so this is safe to
 * run more than once.
 *
 *   node scripts/import-legacy-json.mjs [--api http://localhost:3000] [--file data/splits.json]
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};

const api = argOf('--api', 'http://localhost:3000').replace(/\/$/, '');
const file = argOf('--file', 'data/splits.json');

let raw;
try {
  raw = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Could not read ${file}: ${err.message}`);
  process.exit(1);
}

// Each record is { id, data: Group, updatedAt }; older writes stored the Group directly.
const groups = Object.values(raw)
  .map((record) => record?.data ?? record)
  .filter((g) => g && typeof g === 'object' && g.id && Array.isArray(g.members))
  .filter((g) => g.members.length > 0)
  .map((g) => ({
    ...g,
    // isCurrentUser was device-local state that should never have been shared; the
    // server has no column for it and the import schema would strip it anyway.
    members: g.members.map(({ isCurrentUser, ...m }) => m),
  }));

if (groups.length === 0) {
  console.log('Nothing to import.');
  process.exit(0);
}

console.log(`Importing ${groups.length} group(s) from ${file} into ${api} ...`);

const res = await fetch(`${api}/api/groups/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ groups }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`Import failed (HTTP ${res.status}):`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`  imported: ${body.imported?.length ?? 0}`);
for (const id of body.imported ?? []) console.log(`    + ${id}`);
console.log(`  skipped (already present): ${body.skipped?.length ?? 0}`);
for (const id of body.skipped ?? []) console.log(`    = ${id}`);
