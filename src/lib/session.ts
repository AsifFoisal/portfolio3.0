import { headers } from 'next/headers';
import { isAuthConfigured } from './admin-env';

/** Returns the session if the requester is an authenticated admin, else null. */
export async function getAdminSession() {
  // `./auth` is imported lazily on purpose: it throws while building its
  // context when BETTER_AUTH_SECRET is missing in production, and a top-level
  // import would take the whole admin route down before the page can say why.
  if (!isAuthConfigured()) return null;

  try {
    const { auth } = await import('./auth');
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;
    if ((session.user as { role?: string }).role !== 'admin') return null;
    return session;
  } catch (error) {
    // A database hiccup should send the admin to the login screen, not blow up
    // the route with a server error.
    console.error('[admin] session lookup failed:', error);
    return null;
  }
}
