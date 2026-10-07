# Plan: Migrate Database and Auth to Supabase (PostgreSQL)

## Overview
Remove all local SQLite / Turso `@libsql` dependencies and database connections, replacing them with a Supabase PostgreSQL connection using `pg` and `Kysely` (with `PostgresDialect`) for Better Auth, content storage, and image uploads.

---

## Key Changes

### 1. Package Dependencies (`package.json`)
- **Remove**:
  - `@libsql/client`
  - `@libsql/kysely-libsql`
  - `better-sqlite3`
  - `@types/better-sqlite3`
- **Add**:
  - `pg`
  - `@types/pg`
  - `@supabase/supabase-js`

---

### 2. Database Connection Layer (`src/lib/db.ts`)
- Replace the `@libsql/client` initialization with a `pg.Pool` connection pool that connects using `process.env.DATABASE_URL` (Supabase connection string).
- Export a helper `db.execute(sql, params)` function that returns `{ rows }`, preserving compatibility with existing application code while handling parameter conversion (`$1, $2, ...`) and query execution gracefully when `DATABASE_URL` is not yet configured.

---

### 3. Better Auth Integration (`src/lib/auth.ts`)
- Update `better-auth` configuration to use `Kysely` with Kysely's built-in `PostgresDialect` connected to the `pg.Pool`.
- Retain email/password authentication, cookies plugin, and user schema extensions (`role`).

---

### 4. Admin User & Schema Initialization (`src/lib/ensure-admin.ts`)
- Update table creation DDL from SQLite syntax to standard PostgreSQL:
  - `TIMESTAMPTZ` for timestamps (`createdAt`, `updatedAt`, `expiresAt`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`).
  - `BOOLEAN` with `DEFAULT false` for `emailVerified`.
  - `$1, $2, ...` positional parameters for queries.
  - `ON CONFLICT ("email") DO NOTHING` for admin user insertion.

---

### 5. Content Storage (`src/app/data/content-store.ts`)
- Update `ensureContentTable()`, `getContent()`, and `saveContent()` SQL queries to use `$1, $2` parameters and PostgreSQL `ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`.
- Maintain graceful fallback to `src/app/data/content.json` if `DATABASE_URL` is unconfigured or a database error occurs.

---

### 6. Admin Image Upload Endpoint (`src/app/api/admin/upload/route.ts`)
- Update `uploads` table creation to use `BIGINT NOT NULL` for `created` timestamp.
- Update `SELECT` and `INSERT` queries to use `$1, $2` positional parameters.

---

### 7. Content Migration Script (`src/scripts/migrate-content.ts`)
- Update migration script to execute against the new Supabase PostgreSQL client.

---

### 8. Environment Variables & Documentation (`.env.local` & `SUPABASE.md`)
- Update `.env.local` to remove `TURSO_*` variables and provide placeholders for:
  - `DATABASE_URL` (Supabase PostgreSQL connection string, e.g., `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
- Create `SUPABASE.md` with instructions on where to find the Supabase connection string and keys, how to set them up, and how to run the initial content migration.

---

### 9. Local Cleanup
- Delete unused local `portfolio.db` file.

---

## Verification Plan

1. Run `npm install` to update dependencies.
2. Run `npm run check` (or `npx tsc --noEmit`) to verify TypeScript compilation across all changed files.
3. Run `npm run build` to ensure Next.js builds cleanly with the new Supabase PostgreSQL database architecture.
