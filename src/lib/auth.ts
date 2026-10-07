import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';

/**
 * PostgreSQL connection pool for Better Auth.
 * Uses the Supabase pooler URL from DATABASE_URL.
 */
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Better Auth 1.7.x does not recognise a bare Kysely instance (Kysely 0.29 no
// longer exposes a public `dialect` property), so we hand it the dialect plus
// an explicit database type instead.
const dialect = new PostgresDialect({ pool: pgPool });

export const auth = betterAuth({
  database: { dialect, type: 'postgres' },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});