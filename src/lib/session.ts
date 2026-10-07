import { headers } from 'next/headers';
import { auth } from './auth';

/** Returns the session if the requester is an authenticated admin, else null. */
export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if ((session.user as { role?: string }).role !== 'admin') return null;
  return session;
}
