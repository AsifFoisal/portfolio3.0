import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  getCloudinaryConfig,
  optimizedDeliveryUrl,
  type CloudinaryResourceType,
} from '@/lib/cloudinary';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MEDIA_TABLE = '"media"';

/** Metadata for every asset uploaded to Cloudinary, keyed by its public id. */
async function ensureMediaTable(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${MEDIA_TABLE} (
        id            TEXT PRIMARY KEY,
        url           TEXT NOT NULL,
        original_url  TEXT,
        resource_type TEXT NOT NULL,
        format        TEXT,
        bytes         BIGINT,
        width         INTEGER,
        height        INTEGER,
        duration      DOUBLE PRECISION,
        folder        TEXT,
        created       BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS media_created_idx ON ${MEDIA_TABLE}(created);
    `);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) return;
    throw error;
  }
}

const asString = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const asNumber = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Called by the admin browser after a direct-to-Cloudinary upload finishes.
 * Verifies the asset belongs to this account, stores its metadata, and returns
 * the optimized delivery URL to save into the site content.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getCloudinaryConfig();
  if (!config) {
    return Response.json({ error: 'Cloudinary is not configured' }, { status: 501 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const publicId = asString(body.publicId);
  const secureUrl = asString(body.secureUrl);
  if (!publicId || !secureUrl) {
    return Response.json({ error: 'Missing publicId or secureUrl' }, { status: 400 });
  }

  // Only trust assets served from this Cloudinary account.
  const expectedPrefix = `https://res.cloudinary.com/${config.cloudName}/`;
  if (!secureUrl.startsWith(expectedPrefix)) {
    return Response.json({ error: 'Unexpected upload URL' }, { status: 400 });
  }

  const type: CloudinaryResourceType = body.resourceType === 'video' ? 'video' : 'image';
  const url = optimizedDeliveryUrl(secureUrl, type);

  await ensureMediaTable();
  await db.execute(
    `INSERT INTO ${MEDIA_TABLE} (id, url, original_url, resource_type, format, bytes, width, height, duration, folder, created)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, original_url = EXCLUDED.original_url`,
    [
      publicId,
      url,
      secureUrl,
      type,
      asString(body.format),
      asNumber(body.bytes),
      asNumber(body.width),
      asNumber(body.height),
      asNumber(body.duration),
      config.folder,
      Date.now(),
    ]
  );

  revalidatePath('/');
  revalidatePath('/work');

  return Response.json({ id: publicId, url, resourceType: type });
}
