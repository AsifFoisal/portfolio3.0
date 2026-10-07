# Vercel Deployment Setup

## Problem

The admin CMS used `better-sqlite3`, which creates a local SQLite file at
`./portfolio.db`. Vercel's serverless functions have a **read-only
filesystem**, so the database file can't be created — causing:

```
SqliteError: unable to open database file
```

## Solution

Replace `better-sqlite3` with **Turso (libsql)** — a remote, HTTP-based
SQLite-compatible database. This works on Vercel, Netlify, and locally.

## Step 1 — Create a Turso Database

### Option A: Use Turso Cloud (recommended free tier)

1. Go to [tur.so](https://tur.so) and sign up (GitHub/Discord).
2. In the dashboard, click "Create database" → give it a name.
3. Once created, click the database → copy the **`Database URL`** and
   **`Auth Token`** (generate one if it doesn't exist).

### Option B: Self-host libsql-server (advanced)

If you want full control, run a libsql-server instance and use its
`https://` URL + auth token.

## Step 2 — Set Environment Variables

On **Vercel**, go to Project Settings → Environment Variables and add:

| Name                 | Value                                | Environment |
|----------------------|--------------------------------------|-------------|
| `TURSO_DATABASE_URL` | `libsql://your-db-name.turso.io`     | Production  |
| `TURSO_AUTH_TOKEN`   | `<your-turso-auth-token>`            | Production  |
| `ADMIN_EMAIL`        | `admin@yourdomain.com`              | Production  |
| `ADMIN_PASSWORD`     | `<strong-secure-password>`          | Production  |
| `ADMIN_NAME`         | `Admin`                              | Production  |
| `BETTER_AUTH_URL`    | `https://your-site.vercel.app`       | Production  |
| `NEXTAUTH_URL`       | `https://your-site.vercel.app`       | Production  |

### For local development

Create a `.env.local` file (already exists):

```env
# Local: uses file:./portfolio.db (no Turso needed)
ADMIN_EMAIL=admin@seamrahman.com
ADMIN_PASSWORD=admin@seamrahman
ADMIN_NAME=Admin
BETTER_AUTH_URL=http://localhost:3000
```

Leave `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` **unset** for local dev —
`@libsql/client` will automatically fall back to `file:./portfolio.db`.

## Step 3 — Migrate Existing Content

If you have an existing `src/app/data/content.json`, run the migration script
**once** (either locally against your Turso DB, or against a local file):

```bash
# With local DB (default):
npx tsx src/scripts/migrate-content.ts

# With Turso (set env vars first):
TURSO_DATABASE_URL=libsql://xxx.turso.io TURSO_AUTH_TOKEN=xxx npx tsx src/scripts/migrate-content.ts
```

## Step 4 — Deploy

Push to your Vercel-connected branch:

```bash
git add .
git commit -m "Migrate admin CMS to Turso + Vercel-compatible storage"
git push
```

## Architecture

| Component       | Before (broken on Vercel)        | After (Vercel-ready)          |
|-----------------|----------------------------------|-------------------------------|
| Auth DB         | `better-sqlite3` → file          | `@libsql/client` → Turso HTTP  |
| User DB         | `better-sqlite3` → file          | Kysely + `LibsqlDialect`       |
| Site content    | `fs.writeFile` → content.json    | → `content` table in DB        |
| Image uploads   | `fs.writeFile` → public/uploads  | → base64 in `uploads` table   |

## Local Development

The local dev server (`npm run dev`) automatically uses a file-based SQLite
database at `./portfolio.db`. The first request triggers the instrumentation
hook, which:

1. Creates the `user`, `session`, `account`, `verification` tables.
2. Creates the `content` table.
3. Creates the `uploads` table.
4. Seeds the admin user from `.env.local`.

Run the migration script once to copy your existing content into the DB:

```bash
npx tsx src/scripts/migrate-content.ts
```
