/**
 * One-time migration script: copies the existing content.json from
 * src/app/data/content.json into the Supabase PostgreSQL database.
 *
 * Run with:
 *   npx tsx src/scripts/migrate-content.ts
 *
 * If you're using local development without DATABASE_URL, this imports the
 * existing JSON so the admin editor starts with the current content.
 */
import { execute } from '../lib/db';
import { ensureContentTable } from '../app/data/content-store';
import type { SiteContent } from '../app/data/content-types';
import defaultContent from '../app/data/content.json';

async function main() {
  // Ensure tables exist
  await ensureContentTable();

  // Read the existing content.json (if present) or use default
  let content: SiteContent;
  try {
    const fs = await import('fs');
    const raw = fs.readFileSync('src/app/data/content.json', 'utf8');
    content = JSON.parse(raw) as SiteContent;
    console.log('✅ Found content.json — migrating to database.');
  } catch {
    // No existing file; insert a minimal default
    content = defaultContent as SiteContent;
    console.log('⚠️ No content.json found — inserting default content.');
  }

  // Upsert into the database using PostgreSQL syntax
  const json = JSON.stringify(content, null, 2);
  await execute(
    `INSERT INTO "content" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    ['main', json]
  );

  console.log('✅ Content migrated to database successfully.');
  console.log(`   Database: ${process.env.DATABASE_URL ?? 'not configured (local fallback)'}`);
  await execute(`SELECT 1`); // just to ensure connection is alive
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});