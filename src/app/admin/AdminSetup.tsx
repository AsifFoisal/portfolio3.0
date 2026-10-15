import Link from 'next/link';
import './admin.css';
import type { AdminEnvIssue } from '@/lib/admin-env';

/**
 * Rendered instead of the admin UI when required environment variables are
 * missing. Without this the page would fail inside the auth module and Next
 * would show its generic "This page couldn't load" error, which says nothing
 * about the actual cause.
 *
 * Server component on purpose — it must not import anything that touches
 * auth or the database.
 */
export default function AdminSetup({ issues }: { issues: AdminEnvIssue[] }) {
  return (
    <div className="admin-login">
      <div className="admin-login-card admin-setup-card">
        <p className="admin-eyebrow">SEAM RAHMAN</p>
        <h1 className="admin-title">Admin isn&rsquo;t configured yet</h1>

        <p className="admin-setup-lead">
          This deployment is missing environment variables the CMS needs. Add them in{' '}
          <strong>Vercel → Project → Settings → Environment Variables</strong>, then redeploy.
        </p>

        <ul className="admin-setup-list">
          {issues.map((issue) => (
            <li key={issue.key}>
              <code className="admin-setup-key">{issue.key}</code>
              <span className="admin-setup-problem">{issue.problem}</span>
              <span className="admin-setup-fix">{issue.fix}</span>
            </li>
          ))}
        </ul>

        <p className="admin-setup-note">
          Also required: <code>BETTER_AUTH_URL</code> (your live site URL, e.g.{' '}
          <code>https://your-domain.com</code>), <code>ADMIN_EMAIL</code>,{' '}
          <code>ADMIN_PASSWORD</code>. Add <code>CLOUDINARY_*</code> if you want media uploads.
          See <code>.env.example</code> for the full list.
        </p>

        <Link className="admin-back-link" href="/">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
