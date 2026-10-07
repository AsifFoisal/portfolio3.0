/**
 * Initializes the Supabase PostgreSQL database:
 *   1. Creates the Better Auth tables (user, session, account, verification)
 *   2. Creates the `content` table and seeds it from src/app/data/content.json
 *
 * Run with:
 *   npx tsx src/scripts/init-db.ts
 *
 * Loads .env.local manually so it works outside of the Next.js runtime.
 */
import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function masked(url: string | undefined): string {
  if (!url) return '(not set)';
  return url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');
}

async function main(): Promise<void> {
  // Load env BEFORE importing app modules, because src/lib/auth.ts reads
  // process.env.DATABASE_URL at import time when it constructs its pg Pool.
  loadEnvLocal();

  const { execute } = await import('../lib/db');
  const { ensureAdminUser } = await import('../lib/ensure-admin');
  const { ensureContentTable, saveContent } = await import('../app/data/content-store');

  console.log('Database:', masked(process.env.DATABASE_URL));

  console.log('\n1. Creating auth tables and admin user...');
  await ensureAdminUser();

  console.log('2. Creating content table and seeding content...');
  await ensureContentTable();
  const raw = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'data', 'content.json'),
    'utf8'
  );
  await saveContent(JSON.parse(raw));

  console.log('3. Verifying tables...');
  const { rows } = await execute(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log('   Tables:', rows.map((r) => r.table_name).join(', '));

  const contentCount = await execute('SELECT COUNT(*)::int AS n FROM "content"');
  console.log('   content rows:', contentCount.rows[0].n);

  const userCount = await execute('SELECT COUNT(*)::int AS n FROM "user"');
  console.log('   user rows:', userCount.rows[0].n);

  console.log('\nDone.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Initialization failed:', err);
    process.exit(1);
  });