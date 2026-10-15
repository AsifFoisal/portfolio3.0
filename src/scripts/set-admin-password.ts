/**
 * Creates the admin account if it is missing, or resets its password if it
 * already exists.
 *
 * `ensureAdminUser()` deliberately never overwrites an existing password, so
 * editing ADMIN_PASSWORD in a hosting dashboard (Vercel) has no effect once the
 * account has been created. Run this instead — locally, against the same
 * DATABASE_URL the deployment uses, and the new password applies everywhere.
 *
 * Run with:
 *   npx tsx src/scripts/set-admin-password.ts                        # ADMIN_EMAIL / ADMIN_PASSWORD from .env.local
 *   npx tsx src/scripts/set-admin-password.ts <email> <new-password>
 *
 * Loads .env.local manually so it works outside of the Next.js runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

  const email = process.argv[2]?.trim() || process.env.ADMIN_EMAIL?.trim();
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Admin';

  if (!email || !password) {
    console.error(
      'Missing credentials.\n' +
        'Usage: npx tsx src/scripts/set-admin-password.ts <email> <new-password>\n' +
        '   or: set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local and run it with no arguments.'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters (Better Auth default).');
    process.exit(1);
  }

  const { execute } = await import('../lib/db');

  console.log('Database:', masked(process.env.DATABASE_URL));
  console.log('Admin email:', email);

  const existing = await execute('SELECT id FROM "user" WHERE email = $1', [email]);
  const userId = (existing.rows[0] as { id: string } | undefined)?.id;

  if (!userId) {
    console.log('No account with that email — creating it...');
    const { auth } = await import('../lib/auth');
    const created = await auth.api.signUpEmail({ body: { email, password, name } });
    const createdId = (created as { user?: { id: string } } | null)?.user?.id;
    if (!createdId) throw new Error('Better Auth did not return the new user.');

    await execute("UPDATE \"user\" SET role = 'admin' WHERE id = $1", [createdId]);
    console.log(`✅ Created admin account for ${email}.`);
    return;
  }

  const { hashPassword } = await import('better-auth/crypto');
  const hash = await hashPassword(password);

  const stored = await execute(
    'SELECT id FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
    [userId, 'credential']
  );

  if (stored.rows[0]) {
    await execute(
      'UPDATE "account" SET password = $1, "updatedAt" = now() WHERE "userId" = $2 AND "providerId" = $3',
      [hash, userId, 'credential']
    );
  } else {
    // Account row missing (unusual) — write one directly.
    await execute(
      `INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $3, $4, now(), now())`,
      [randomUUID(), randomUUID(), userId, hash]
    );
  }

  await execute("UPDATE \"user\" SET role = 'admin' WHERE id = $1", [userId]);

  console.log(`✅ Password updated for ${email}. Sign in at /admin/login.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
