import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import AdminSetup from '../AdminSetup';
import { ToastProvider } from '../Toaster';
import { getAdminSession } from '@/lib/session';
import { getAdminConfigIssues } from '@/lib/admin-env';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Login | Seam Rahman',
};

export default async function AdminLoginPage() {
  // Checked before anything touches auth or the database: a missing variable or
  // an unreachable database would otherwise show up as a failed sign-in with
  // "check your credentials", which sends you looking in the wrong place.
  const issues = await getAdminConfigIssues();
  if (issues.length > 0) return <AdminSetup issues={issues} />;

  const session = await getAdminSession();
  if (session) redirect('/admin');
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}
