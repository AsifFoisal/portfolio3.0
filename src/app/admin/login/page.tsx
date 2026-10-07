import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Login | Seam Rahman',
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect('/admin');
  return <LoginForm />;
}
