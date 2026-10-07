export async function register() {
  // Only run on the Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Ensure the database connection is ready before touching tables.
  // This is a no-op if the db client hasn't been imported yet, and the
  // Turso client connects lazily on first query anyway.
  try {
    const { ensureAdminUser } = await import('./lib/ensure-admin');
    // Fire-and-forget: don't block server startup if admin seeding fails.
    // The worst case is the admin has to be created manually via the DB.
    ensureAdminUser().catch((err) => {
      console.error('[instrumentation] ensureAdminUser failed:', err);
    });
  } catch (err) {
    console.error('[instrumentation] failed to import ensureAdminUser:', err);
  }
}