import { db } from './db';
import { auth } from './auth';

/**
 * Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD (see .env.local)
 * on first run. Existing users are left untouched unless their role is missing.
 *
 * All SQL uses PostgreSQL syntax ($N parameter placeholders, TIMESTAMPTZ for dates,
 * BOOLEAN for emailVerified, EXCLUDED for ON CONFLICT updates).
 */
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@seamrahman.com';
  const password = process.env.ADMIN_PASSWORD ?? 'change-this-password';
  const name = process.env.ADMIN_NAME ?? 'Admin';

  try {
    // Ensure tables exist before we touch them. Schema built for PostgreSQL.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id"         text PRIMARY KEY NOT NULL,
        "name"       text NOT NULL,
        "email"      text NOT NULL UNIQUE,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "image"      text,
        "createdAt"  TIMESTAMPTZ NOT NULL,
        "updatedAt"  TIMESTAMPTZ NOT NULL,
        "role"       text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "session" (
        "id"         text PRIMARY KEY NOT NULL,
        "expiresAt"  TIMESTAMPTZ NOT NULL,
        "token"      text NOT NULL UNIQUE,
        "createdAt"  TIMESTAMPTZ NOT NULL,
        "updatedAt"  TIMESTAMPTZ NOT NULL,
        "ipAddress"  text,
        "userAgent"  text,
        "userId"     text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "account" (
        "id"                   text PRIMARY KEY NOT NULL,
        "accountId"            text NOT NULL,
        "providerId"           text NOT NULL,
        "userId"               text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken"          text,
        "refreshToken"         text,
        "idToken"              text,
        "accessTokenExpiresAt" TIMESTAMPTZ,
        "refreshTokenExpiresAt" TIMESTAMPTZ,
        "scope"                text,
        "password"             text,
        "createdAt"            TIMESTAMPTZ NOT NULL,
        "updatedAt"            TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "verification" (
        "id"         text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value"      text NOT NULL,
        "expiresAt"  TIMESTAMPTZ NOT NULL,
        "createdAt"  TIMESTAMPTZ NOT NULL,
        "updatedAt"  TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");
      CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session"("token");
      CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
    `);

    // Check if admin user already exists
    const result = await db.execute(
      'SELECT id, role FROM "user" WHERE email = $1',
      [email]
    );
    const existing = (result.rows[0] as { id: string; role: string } | undefined);

    if (!existing) {
      // Use Better Auth's internal signUp to hash the password correctly
      const signUpResult = await auth.api.signUpEmail({ body: { email, password, name } });
      const userId = (signUpResult as { user?: { id: string } } | null)?.user?.id;
      if (userId) {
        await db.execute(
          "UPDATE \"user\" SET role = 'admin' WHERE id = $1",
          [userId]
        );
        console.log(`[auth] Admin account created for ${email}`);
      }
    } else if ((existing.role as string) !== 'admin') {
      await db.execute(
        "UPDATE \"user\" SET role = 'admin' WHERE id = $1",
        [existing.id]
      );
    }
  } catch (error) {
    console.error('[auth] Failed to ensure admin user:', error);
  }
}