import Database from 'better-sqlite3';
import { AUTH_DB_PATH, auth } from './auth';

/**
 * Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD (see .env.local)
 * on first run. Existing users are left untouched unless their role is missing.
 */
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@seamrahman.com';
  const password = process.env.ADMIN_PASSWORD ?? 'change-this-password';
  const name = process.env.ADMIN_NAME ?? 'Admin';

  try {
    // Accessing the context forces better-auth to initialise its adapter and
    // create the tables before we touch the database directly.
    await auth.$context;

    const db = new Database(AUTH_DB_PATH);
    try {
      const existing = db.prepare('SELECT id, role FROM user WHERE email = ?').get(email) as { id: string; role: string } | undefined;

      if (!existing) {
        const result = await auth.api.signUpEmail({ body: { email, password, name } });
        const userId = result?.user?.id;
        if (userId) {
          db.prepare("UPDATE user SET role = 'admin' WHERE id = ?").run(userId);
          console.log(`[auth] Admin account created for ${email}`);
        }
      } else if (existing.role !== 'admin') {
        db.prepare("UPDATE user SET role = 'admin' WHERE id = ?").run(existing.id);
      }
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('[auth] Failed to ensure admin user:', error);
  }
}
