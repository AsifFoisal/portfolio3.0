# Vercel Deployment Setup

The site is a Next.js App Router app with a Postgres (Supabase) backend for both
the CMS content and admin auth, and Cloudinary for media. Nothing is written to
the filesystem, so it runs on Vercel's serverless runtime.

---

## 1. Environment variables

Vercel → **Project → Settings → Environment Variables**. Add each one for
*Production* (and *Preview* if you want preview deployments to work), then
**redeploy** — variables only apply to new deployments.

| Name                   | Required | Value                                                                 |
|------------------------|----------|-----------------------------------------------------------------------|
| `DATABASE_URL`         | ✅       | Supabase connection string (**pooler** host — see below)              |
| `BETTER_AUTH_SECRET`   | ✅       | `openssl rand -base64 32`                                             |
| `BETTER_AUTH_URL`      | ✅       | The URL you actually visit, e.g. `https://your-domain.com`             |
| `ADMIN_EMAIL`          | ✅       | Login email for the admin                                             |
| `ADMIN_PASSWORD`       | ✅       | Login password (the account is created on first boot)                 |
| `ADMIN_NAME`           | –        | Display name, defaults to `Admin`                                     |
| `CLOUDINARY_CLOUD_NAME`| –        | Enables Cloudinary uploads. Without it, uploads fall back to base64   |
| `CLOUDINARY_API_KEY`   | –        | "                                                                     |
| `CLOUDINARY_API_SECRET`| –        | "                                                                     |
| `CLOUDINARY_FOLDER`    | –        | Defaults to `seam-rahman`                                             |

`.env.example` in the repo is the same list, ready to copy.

### `DATABASE_URL` — use the pooler host

Supabase → **Connect → Connection pooling**. Use the pooler hostname:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Do **not** use the direct `db.<ref>.supabase.co` host: it resolves to IPv6 only
and serverless functions cannot reach it.

### Why `BETTER_AUTH_SECRET` matters

Better Auth validates its signing secret while building the auth context. In a
production build a missing secret makes it **throw**, which takes down every
route that uses auth — `/admin` and `/admin/login`. The public site keeps
working, so the only symptom is the admin failing, which is easy to misread as a
database problem.

`/admin` now detects this before loading auth and renders a checklist of the
missing variables instead of the generic error screen
(see `src/lib/admin-env.ts` + `src/app/admin/AdminSetup.tsx`).

---

## 2. Database schema

The tables are created automatically the first time the app boots
(`src/instrumentation.ts` → `src/lib/ensure-admin.ts`):

- `user`, `session`, `account`, `verification` — Better Auth
- `content` — the CMS payload (`key` / `value`)
- `uploads` — base64 fallback for uploads when Cloudinary is not configured

The admin account is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` and given the
`admin` role.

To push your existing local `content.json` into the database once:

```bash
npx tsx src/scripts/migrate-content.ts
```

---

## 3. Deploy

```bash
git add .
git commit -m "…"
git push
```

Vercel builds and deploys the connected branch automatically.

---

## 4. Troubleshooting

### “This page couldn't load — a server error occurred” on `/admin`

Almost always a missing `BETTER_AUTH_SECRET` (see above). Confirm it in
**Deployments → Functions → Runtime Logs**; you will see:

```
BetterAuthError: You are using the default secret. Please set `BETTER_AUTH_SECRET` …
```

Add the variable and redeploy.

### Signed in, but every save fails with a 500 / “Invalid origin”

`BETTER_AUTH_URL` doesn't match the domain in the address bar. Set it to the URL
you actually use, or delete it and let the origin be taken from the request.
A `BETTER_AUTH_URL=http://localhost:3000` copied from `.env.local` is ignored on
Vercel (the deployment URL is used instead) and a warning is logged — but the
value should still be corrected.

### Content changes don't appear

The public pages read from the database and revalidate on save. If you edited
the database directly, hit **Redeploy** or run a new deployment to clear the
route cache.

### Uploads fail

Check the `CLOUDINARY_*` trio. If Cloudinary isn't configured, uploads are
stored as base64 in the `uploads` table — fine for small images, not for video.
