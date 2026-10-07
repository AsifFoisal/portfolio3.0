import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { execute } from './db';

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

/**
 * Kysely PostgresDialect wrapper.
 *
 * Important: We provide a real pg Pool to satisfy the Kysely type system,
 * but all actual SQL execution in this project goes through `db.execute()`
 * (which wraps pg and converts `?` → `$N` placeholders). The dialect's `execute`
 * method is not used for our queries, but it must exist and return a compatible
 * shape so Kysey types are satisfied.
 */
const kyselyDialect = new PostgresDialect({
  pool: pgPool,
});

export const auth = betterAuth({
  database: new Kysely({
    dialect: kyselyDialect,
  }),
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