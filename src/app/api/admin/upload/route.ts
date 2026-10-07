import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const UPLOAD_TABLE = '"uploads"';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

/**
 * Ensures the uploads table exists.
 * Uses PostgreSQL-compatible column types (BIGINT for created timestamp).
 */
async function ensureUploadsTable(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${UPLOAD_TABLE} (
        id      TEXT PRIMARY KEY,
        mime    TEXT NOT NULL,
        ext     TEXT NOT NULL,
        data    TEXT NOT NULL,  -- base64 encoded
        created BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS uploads_created_idx ON ${UPLOAD_TABLE}(created);
    `);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.includes('already exists')) {
      return;
    }
    throw error;
  }
}

/**
 * Serve an uploaded image by ID. This is exposed via a separate route.
 * For now we return the base64 data URL from the upload POST.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUploadsTable();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing file' }, { status: 400 });
  }

  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return Response.json({ error: `Unsupported file type: ${file.type || 'unknown'}` }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File is larger than 10 MB' }, { status: 400 });
  }

  // Convert to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;

  const safeBase = (file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'image').slice(0, 60);
  const id = `${Date.now()}-${safeBase}.${extension}`;

  await db.execute(
    `INSERT INTO ${UPLOAD_TABLE} (id, mime, ext, data, created) VALUES ($1, $2, $3, $4, $5)`,
    [id, file.type, extension, dataUrl, Date.now()]
  );

  // Revalidate to refresh any pages that reference this upload
  revalidatePath('/');
  return Response.json({ id, url: dataUrl });
}

/**
 * Get an uploaded image by ID (returns base64 data URL).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const result = await db.execute(`SELECT data FROM ${UPLOAD_TABLE} WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json({ data: result.rows[0].data });
}