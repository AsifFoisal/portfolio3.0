// One-off: sync about.segments from src/app/data/content.json into the DB 'main' row.
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!url) throw new Error('DATABASE_URL not found in .env.local');

const local = JSON.parse(
  readFileSync('src/app/data/content.json', 'utf8')
);

const pool = new Pool({
  connectionString: url,
  max: 1,
  ssl: url.includes('supabase') ? { rejectUnauthorized: false } : false,
});

const { rows } = await pool.query(
  'SELECT value FROM "content" WHERE key = $1',
  ['main']
);
if (rows.length === 0) {
  console.log('No saved content row; site already uses content.json defaults.');
  await pool.end();
  process.exit(0);
}

const stored = JSON.parse(String(rows[0].value));
stored.about.segments = local.about.segments;
const json = JSON.stringify(stored, null, 2);

await pool.query(
  'UPDATE "content" SET value = $2 WHERE key = $1',
  ['main', json]
);
console.log('about.segments updated in DB. New text preview:');
for (const s of local.about.segments) {
  console.log((s.accent ? '[red] ' : '      ') + JSON.stringify(s.text));
}
await pool.end();
