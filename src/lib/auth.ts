import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';

/**
 * PostgreSQL connection pool for Better Auth.
 * Uses the Supabase pooler URL from DATABASE_URL.
 */
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Better Auth 1.7.x does not recognise a bare Kysely instance (Kysely 0.29 no
// longer exposes a public `dialect` property), so we hand it the dialect plus
// an explicit database type instead.
const dialect = new PostgresDialect({ pool: pgPool });

const LOCALHOST_URL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i;

/**
 * The origin Better Auth signs callbacks and validates request origins against.
 *
 * `BETTER_AUTH_URL` is always passed explicitly because Better Auth otherwise
 * reads it from the environment itself and we need to be able to reject a
 * bad value. A `BETTER_AUTH_URL=http://localhost:3000` copied from `.env.local`
 * into the hosting dashboard would pin a live deployment to localhost, so on
 * Vercel we prefer the deployment's own URL in that case.
 */
function resolveBaseUrl(): string | undefined {
  const configured = process.env.BETTER_AUTH_URL?.trim();

  if (!process.env.VERCEL) return configured; // local dev — trust .env.local

  if (configured && !LOCALHOST_URL.test(configured)) return configured;

  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (host) {
    if (configured) {
      console.warn(
        `[auth] BETTER_AUTH_URL is "${configured}" (a localhost address) but this is a ` +
          `Vercel deployment — using https://${host} instead. Set BETTER_AUTH_URL to ` +
          'your live domain in Project Settings → Environment Variables.'
      );
    }
    return `https://${host}`;
  }

  return configured; // no deployment URL known — let Better Auth derive it
}

export const auth = betterAuth({
  // Required in production: without it Better Auth throws while building its
  // context. `getAdminEnvIssues()` (src/lib/admin-env.ts) reports the missing
  // variable before any admin page tries to load this module.
  secret: process.env.BETTER_AUTH_SECRET?.trim(),
  baseURL: resolveBaseUrl(),
  database: { dialect, type: 'postgres' },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});
