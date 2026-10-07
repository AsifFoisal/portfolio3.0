import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please configure it with your Supabase PostgreSQL connection string.'
      );
    }
    pool = new Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 30000,
      ssl: url.includes('supabase') ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

/**
 * Execute a parameterized SQL query.
 * Converts `?` placeholders to PostgreSQL `$1, $2, ...` style.
 * Returns an object with `rows` array for compatibility with existing code.
 */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ rows: any[] }> {
  const p = getPool();
  // Convert ? placeholders to $1, $2, ...
  let paramIndex = 0;
  const convertedSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
  const result = await p.query(convertedSql, params);
  return { rows: result.rows };
}

/**
 * Execute a raw SQL query without parameter conversion (for DDL with template literals).
 * Used internally by ensure-admin.ts etc. where SQL is already parameterized.
 */
export async function query(sql: string, params: unknown[] = []): Promise<{ rows: any[] }> {
  const p = getPool();
  const result = await p.query(sql, params);
  return { rows: result.rows };
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// For backwards compatibility with code that imports `db` directly
export const db = {
  execute,
  query,
  close: closePool,
};