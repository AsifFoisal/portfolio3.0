# Supabase PostgreSQL Migration Guide

This project has been migrated from **`better-sqlite3` / `@libsql` (Turso)** to **Supabase PostgreSQL** for full Vercel / serverless compatibility.

## Why Supabase?

- **Zero filesystem dependencies**: PostgreSQL over HTTPS — no native binaries, works on Vercel's read-only filesystem.
- **Better Auth native support**: Kysely's `PostgresDialect` integrates seamlessly with Better Auth's Kysely adapter.
- **Edge-ready**: Connection pooling and SSL configuration optimized for serverless environments.
- **Familiar SQL**: Standard PostgreSQL syntax; all existing SQL queries migrated.

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (or use an existing one).
2. In your Supabase project, go to **Settings → Database**.
3. Find the **Connection string** (pooler) — copy it. It looks like:

   ```
   postgresql://postgres.xxxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

4. Paste that value into `.env.local` at the `DATABASE_URL=` line.

## 2. Configure Environment Variables

Update `.env.local` with the following values:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase connection string (required) | `postgresql://postgres.xxxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres` |
| `ADMIN_EMAIL` | Admin account email (created on first run) | `admin@seamrahman.com` |
| `ADMIN_PASSWORD` | Admin account password | `change-this-password` |
| `ADMIN_NAME` | Admin display name | `Admin` |
| `BETTER_AUTH_URL` | Base URL for the app (used for cookies / callbacks) | `https://your-domain.com` |
| `BETTER_AUTH_SECRET` | Random secret for Better Auth sessions | `openssl rand -base64 32` |

### Generate a `BETTER_AUTH_SECRET`

```bash
openssl rand -base64 32
```

Paste the output into `.env.local` as `BETTER_AUTH_SECRET=<your-secret>`.

## 3. Set up the Database Schema

The first time you run the app (or run the migration script), the following tables will be created automatically via `ensureAdminUser()` in `src/lib/ensure-admin.ts`:

- `user` — stores user accounts, emails, roles (`admin` / `user`), and profile data
- `session` — session tokens with expiration
- `account` — OAuth provider linking (if used later)
- `verification` — email verification tokens
- `content` — site content JSON blob (key/value store)
- `uploads` — base64-encoded uploaded images

**Manual SQL (optional, for verification):**

You can also run this SQL directly in the Supabase SQL editor to create the schema ahead of time:

```sql
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

CREATE TABLE IF NOT EXISTS "content" (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "uploads" (
  id      TEXT PRIMARY KEY,
  mime    TEXT NOT NULL,
  ext     TEXT NOT NULL,
  data    TEXT NOT NULL,
  created BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session"("token");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");
```

## 4. Run the Migration

To migrate your existing `content.json` into the database:

```bash
npx tsx src/scripts/migrate-content.ts
```

This will:

1. Create the `content` table if it doesn't exist.
2. Insert the JSON blob from `src/app/data/content.json` keyed as `'main'`.
3. Log success or fallback to the bundled JSON if no file is found.

## 5. Local Development

- If `DATABASE_URL` is **not set** in `.env.local`, the app will gracefully fall back to the bundled `src/app/data/content.json` for content rendering.
- Authentication will use the default values from `.env.local` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- The admin UI at `/admin` will still function, but all content edits will write to the JSON file locally (no DB writes).

**To force DB mode locally**, set `DATABASE_URL` to a local PostgreSQL instance (e.g., using Supabase local Docker, Neon, or Postgres.app).

## 6. Production (Vercel / Netlify)

1. Add the following environment variables to your Vercel/Netlify dashboard:

   - `DATABASE_URL` (from step 2)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
   - `BETTER_AUTH_URL`
   - `BETTER_AUTH_SECRET`

2. Deploy. The first request may be slightly slower as the database schema is created on-demand via `ensureAdminUser()`.

3. After deploy, run the migration script (or trigger it once via a curl request to `/api/admin/...` if you've set up the admin route).

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `connection timed out` or `too many connections` | `max: 1` pool size too low for traffic, or `DATABASE_URL` points to a non-Pool endpoint | Use a connection pooler (Supabase `pooler` endpoint, not direct), or increase `max` in `src/lib/db.ts` |
| `auth` cookies not working | `BETTER_AUTH_URL` doesn't match the deployed domain | Set `BETTER_AUTH_URL` to your exact deployed URL (no trailing slash) |
| `getContent()` returns empty object | `content` table row not found; DB may not have been migrated | Run `npx tsx src/scripts/migrate-content.ts` |
| `Cannot read properties of undefined` on `/admin` | Missing `DATABASE_URL` and no fallback JSON | Ensure `DATABASE_URL` is set OR ensure `content.json` exists and is valid |
| `invalid input syntax for type boolean` | `emailVerified` column type mismatch | Re-run `ensure-admin.ts` migration or manually set the column type to `boolean` in Supabase SQL editor |

## 8. Moving from Local SQLite / Turso to Supabase

If you previously had a `portfolio.db` file in the repo root:

1. **Delete** `portfolio.db` (it is no longer used).
2. **Remove** any references to `TURSO_DATABASE_URL` or `TURSO_AUTH_TOKEN` from `.env.local`.
3. Follow the setup steps above to configure `DATABASE_URL`.
4. Run the migration script to populate the `content` table.

---

## Development Checklist

- [ ] `DATABASE_URL` set in `.env.local`
- [ ] `BETTER_AUTH_SECRET` generated and set
- [ ] `BETTER_AUTH_URL` set to deployed domain (or `http://localhost:3000` for local dev)
- [ ] `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` configured
- [ ] Run `npx tsx src/scripts/migrate-content.ts` to populate content
- [ ] Run `npm run typecheck` / `npm run build` to verify no TypeScript errors
- [ ] Deploy to Vercel/Netlify and verify the admin login works