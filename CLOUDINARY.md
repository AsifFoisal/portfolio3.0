# Cloudinary Media Uploads

The admin media fields (images **and** videos) upload to **Cloudinary**. The
media is delivered through an optimization transformation that cuts file size
without a visible quality loss, and every upload is recorded in the database.

---

## 1. Credentials

Add these to `.env.local` (and to your host's env vars — Vercel → Settings →
Environment Variables):

| Variable | Description | Example |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | `my-cloud` |
| `CLOUDINARY_API_KEY` | API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | API secret (server-side only) | `abcdEF...` |
| `CLOUDINARY_FOLDER` | Optional upload folder | `seam-rahman` (default) |

Alternatively, use the single connection string form:

```
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

> If **none** of these are set, the admin still works: images fall back to the
> built-in database uploader (`uploads` table), and video uploads return a clear
> "Cloudinary is not configured" message until you add the credentials.

Find the values in the Cloudinary dashboard → **Product Environment Settings →
API Keys**.

---

## 2. How an upload flows

1. The browser asks `POST /api/admin/upload/sign` (admin-only) for a short-lived
   **signed payload**.
2. The browser uploads the file **directly to Cloudinary** using that signature.
   Large videos never pass through the app server, so serverless request-body
   limits (Vercel: ~4.5 MB) are not an issue.
3. The browser posts the result to `POST /api/admin/upload/complete`, which
   validates that the asset belongs to your cloud, stores its metadata in the
   `media` table, and returns the **optimized delivery URL**.
4. That URL is written into the site content (`content` table) and revalidated
   on `/` and `/work`.

The API secret never leaves the server — only the short-lived SHA-1 signature is
sent to the browser.

---

## 3. Video & image optimization

Every stored URL carries a delivery transformation:

| Resource | Transformation | Effect |
|---|---|---|
| Image | `f_auto,q_auto:good,c_limit,w_2400` | Auto format (AVIF/WebP), perceptually-optimized quality, downscale only |
| Video | `f_auto,q_auto:good,vc_auto,c_limit,w_1920` | Auto format (WebM/MP4), optimized bitrate, best codec, downscale only |

- `f_auto` — delivers the best format the requesting browser supports.
- `q_auto:good` — Cloudinary's perceptual quality/bitrate optimizer.
- `vc_auto` — picks the most efficient video codec.
- `c_limit,w_*` — only shrinks oversized media; never upscales.

The **original** file is preserved in Cloudinary (`original_url` column), so the
transformation can be changed later without re-uploading.

---

## 4. Database

Uploads are recorded in a `media` table (created automatically on first upload):

```sql
CREATE TABLE IF NOT EXISTS "media" (
  id            TEXT PRIMARY KEY,  -- Cloudinary public_id
  url           TEXT NOT NULL,     -- optimized delivery URL
  original_url  TEXT,              -- raw Cloudinary secure_url
  resource_type TEXT NOT NULL,     -- image | video
  format        TEXT,
  bytes         BIGINT,
  width         INTEGER,
  height        INTEGER,
  duration      DOUBLE PRECISION,
  folder        TEXT,
  created       BIGINT NOT NULL
);
```

The existing `uploads` table remains as the offline fallback (base64 images).

---

## 5. Notes

- `res.cloudinary.com` is whitelisted in `next.config.ts` → `images.remotePatterns`
  so `next/image` can render Cloudinary assets.
- Cloudinary's free plan caps a single upload at **100 MB**; the admin enforces
  the same limit client-side with a friendly message.
