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

/** How long the diagnostics page waits for the database before giving up. */
const DB_PING_TIMEOUT_MS = 5000;

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

/** Hostname of a connection string, or undefined if it isn't parseable. */
function databaseHost(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The direct host (`db.<ref>.supabase.co`) resolves to IPv6 only, which
 * serverless functions cannot reach — the classic "works locally, times out in
 * production" Supabase mistake. Detected from the URL so the answer is immediate
 * instead of a DNS failure several seconds later.
 */
function isDirectSupabaseHost(host: string | undefined): boolean {
  return Boolean(host && /^db\.[a-z0-9-]+\.supabase\.co$/i.test(host));
}

/** Every blocking misconfiguration, ready to render as a setup checklist. */
export function getAdminEnvIssues(): AdminEnvIssue[] {
  const issues: AdminEnvIssue[] = [];

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    issues.push({
      key: 'DATABASE_URL',
      problem: 'not set',
      fix: 'Add the PostgreSQL connection string for your Supabase project (Project → Connect → pooler host).',
    });
  } else if (process.env.VERCEL && isDirectSupabaseHost(databaseHost(databaseUrl))) {
    issues.push({
      key: 'DATABASE_URL',
      problem: `points at ${databaseHost(databaseUrl)}, the direct Supabase host — it is IPv6-only and cannot be resolved from serverless functions`,
      fix: 'Use the connection-pooling string instead: Supabase → Connect → Connection pooling, host …pooler.supabase.com, port 6543.',
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

/** Keeps credentials out of anything rendered into the page. */
function scrubConnectionString(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Confirms the database actually answers.
 *
 * A `DATABASE_URL` can be present and still be unusable — wrong password, a
 * paused Supabase project, a host that only resolves over IPv6. The environment
 * checks above cannot see that, and the resulting failure mode is nasty: the
 * public site looks fine (it falls back to `content.json`) while every auth
 * request dies with an HTML error page, so signing in only says "check your
 * credentials".
 */
export async function checkDatabase(): Promise<AdminEnvIssue | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { execute } = await import('./db');
    await Promise.race([
      execute('SELECT 1'),
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`no response within ${DB_PING_TIMEOUT_MS}ms`)),
          DB_PING_TIMEOUT_MS
        );
      }),
    ]);
    return null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      key: 'DATABASE_URL',
      problem: `set, but the database is not reachable — ${scrubConnectionString(detail)}`,
      fix: 'Check the pooler connection string and that the Supabase project is running. Port 6543 is recommended for serverless.',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Every blocking misconfiguration: the environment checks plus a live database
 * probe. Used by the admin pages so a broken deployment explains itself instead
 * of failing later with an opaque error.
 */
export async function getAdminConfigIssues(): Promise<AdminEnvIssue[]> {
  const issues = getAdminEnvIssues();
  if (issues.some((issue) => issue.key === 'DATABASE_URL')) return issues;

  const databaseIssue = await checkDatabase();
  if (databaseIssue) issues.push(databaseIssue);
  return issues;
}
