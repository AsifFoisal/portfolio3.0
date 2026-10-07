import { revalidatePath } from 'next/cache';
import { getContent, saveContent } from '@/app/data/content-store';
import type { SiteContent } from '@/app/data/content-types';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({ content: await getContent() });
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const content = (body as { content?: unknown })?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return Response.json({ error: 'Missing content object' }, { status: 400 });
  }
  if (!('hero' in content) || !('services' in content) || !('experience' in content)) {
    return Response.json({ error: 'Content is missing required sections' }, { status: 400 });
  }

  await saveContent(content as SiteContent);
  revalidatePath('/');
  revalidatePath('/admin');
  return Response.json({ ok: true });
}
