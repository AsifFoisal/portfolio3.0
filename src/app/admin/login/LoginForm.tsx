'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useToast } from '../Toaster';
import '../admin.css';

/**
 * Turns a client error into something actionable.
 *
 * Only JSON responses carry a `message`. A crashed route returns an HTML error
 * page, which the fetch layer reports as a bare HTTP status — rendering that as
 * "check your credentials" sends you looking in the wrong place entirely.
 */
function describeSignInError(error: {
  message?: string;
  status?: number;
  statusText?: string;
}): string {
  const message = error.message?.trim();
  if (message) return message;

  const status = error.status;
  if (status && status > 0) {
    const label = error.statusText?.trim() ? ` ${error.statusText.trim()}` : '';
    return (
      `Login failed (HTTP ${status}${label}). The server did not return a valid ` +
      "response — check the deployment's environment variables and function logs."
    );
  }

  return 'Login failed — the server could not be reached. Check your connection and try again.';
}

export default function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      toast.error(describeSignInError(result.error));
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="admin-eyebrow">SEAM RAHMAN</p>
        <h1 className="admin-title">Admin Login</h1>
        <label className="admin-field">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="admin-field">
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        <button className="admin-solid-button" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <Link className="admin-back-link" href="/">← Back to site</Link>
      </form>
    </div>
  );
}
