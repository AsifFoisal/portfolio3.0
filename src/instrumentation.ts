export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { ensureAdminUser } = await import('./lib/ensure-admin');
  await ensureAdminUser();
}
