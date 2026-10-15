import { createUploadSignature, type CloudinaryResourceType } from '@/lib/cloudinary';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Issues a short-lived, signed payload so the admin browser can upload a file
 * directly to Cloudinary. Keeps the API secret on the server and lets large
 * videos bypass the app server's request-body limits.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let type: CloudinaryResourceType = 'image';
  try {
    const body = (await request.json()) as { type?: unknown };
    if (body?.type === 'video') type = 'video';
  } catch {
    /* no/invalid JSON body — default to image */
  }

  return Response.json(createUploadSignature(type));
}
