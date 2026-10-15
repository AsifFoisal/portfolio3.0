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

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * The origin Better Auth signs cookies, callbacks and CSRF checks against.
 *
 * `BETTER_AUTH_URL` is always passed explicitly because Better Auth otherwise
 * reads it from the environment itself and we need to be able to reject a bad
 * value. Two deployment realities it has to survive:
 *
 *   1. `BETTER_AUTH_URL=http://localhost:3000` copied from `.env.local` into
 *      the hosting dashboard — pinning every origin check to localhost.
 *   2. A single deployment being reachable on several hosts: the production
 *      domain, `*.vercel.app` preview URLs, and the deployment URL. Whichever
 *      one is used must be accepted, and the session cookie must be set for it.
 *
 * So on Vercel we hand over a dynamic allowlist and let the origin come from the
 * request; the fallback is only used when there is no request to inspect
 * (e.g. during a build).
 */
function resolveBaseUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim();

  // Local development has exactly one known origin.
  if (!process.env.VERCEL) return configured;

  const configuredIsLocalhost = Boolean(configured && LOCALHOST_URL.test(configured));
  const deploymentHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();

  const allowedHosts = new Set<string>(['*.vercel.app', 'localhost:3000', '127.0.0.1:3000']);
  const configuredHost = configuredIsLocalhost ? undefined : hostOf(configured);
  if (configuredHost) allowedHosts.add(configuredHost);
  for (const host of [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]) {
    if (host?.trim()) allowedHosts.add(host.trim());
  }

  const fallback =
    (configured && !configuredIsLocalhost ? configured : undefined) ??
    (deploymentHost ? `https://${deploymentHost}` : undefined);

  if (!fallback) return configured; // nothing to anchor on — let Better Auth derive it

  if (configuredIsLocalhost) {
    console.warn(
      `[auth] BETTER_AUTH_URL is "${configured}", a localhost address, but this is a Vercel ` +
        'deployment — ignoring it. Set BETTER_AUTH_URL to your live domain in ' +
        'Project Settings → Environment Variables.'
    );
  }

  return { allowedHosts: [...allowedHosts], protocol: 'auto' as const, fallback };
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
