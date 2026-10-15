/**
 * Environment diagnostics for the admin area.
 *
 * Better Auth throws while building its context when `BETTER_AUTH_SECRET` is
 * missing in a production build (`create-context.mjs` → `validateSecret`), and
 * that happens inside the `/admin` server component. The result is the opaque
 * "This page couldn't load — a server error occurred" screen with no hint about
 * the cause, which is very hard to debug from a deployment.
 *
 * The admin pages check this module *before* touching auth/db, so a missing
 * variable renders the exact fix instead of a crash.
 *
 * Only problems that genuinely stop the admin from working are reported here.
 * A `BETTER_AUTH_URL` that still points at localhost is *not* one of them — the
 * auth config detects that on Vercel and falls back to the deployment URL.
 */

const DEFAULT_SECRET = 'better-auth-secret-12345678901234567890';

export type AdminEnvIssue = {
  /** Environment variable to add or fix in the hosting dashboard. */
  key: string;
  /** What is wrong with the current value. */
  problem: string;
  /** How to fix it. */
  fix: string;
};

/**
 * True when the auth stack has the two variables it cannot start without:
 * a database URL and a non-default signing secret.
 */
export function isAuthConfigured(): boolean {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? '';
  return Boolean(process.env.DATABASE_URL?.trim()) && secret !== '' && secret !== DEFAULT_SECRET;
}

/** Every blocking misconfiguration, ready to render as a setup checklist. */
export function getAdminEnvIssues(): AdminEnvIssue[] {
  const issues: AdminEnvIssue[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    issues.push({
      key: 'DATABASE_URL',
      problem: 'not set',
      fix: 'Add the PostgreSQL connection string for your Supabase project (Project → Connect → pooler host).',
    });
  }

  const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? '';
  if (secret === '') {
    issues.push({
      key: 'BETTER_AUTH_SECRET',
      problem: 'not set — this is what breaks /admin in production',
      fix: 'Generate one with `openssl rand -base64 32` and paste the result.',
    });
  } else if (secret === DEFAULT_SECRET) {
    issues.push({
      key: 'BETTER_AUTH_SECRET',
      problem: 'still the library placeholder value',
      fix: 'Generate a real secret with `openssl rand -base64 32`.',
    });
  }

  return issues;
}
