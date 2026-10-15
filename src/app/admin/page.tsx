import { redirect } from 'next/navigation';
import AdminApp from './AdminApp';
import AdminSetup from './AdminSetup';
import { ToastProvider } from './Toaster';
import { getContent } from '../data/content-store';
import { getAdminSession } from '@/lib/session';
import { getAdminEnvIssues } from '@/lib/admin-env';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin | Seam Rahman',
};

export default async function AdminPage() {
  // Checked before anything touches auth or the database: a missing variable
  // would otherwise crash the route with an opaque server error.
  const issues = getAdminEnvIssues();
  if (issues.length > 0) return <AdminSetup issues={issues} />;

  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const content = await getContent();
  return (
    <ToastProvider>
      <AdminApp initialContent={content} />
    </ToastProvider>
  );
}
