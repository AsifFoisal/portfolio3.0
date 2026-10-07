import { redirect } from 'next/navigation';
import AdminApp from './AdminApp';
import { getContent } from '../data/content-store';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin | Seam Rahman',
};

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const content = await getContent();
  return <AdminApp initialContent={content} />;
}
