import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import Database from 'better-sqlite3';

export const AUTH_DB_PATH = process.env.AUTH_DB_PATH ?? './portfolio.db';

export const auth = betterAuth({
  database: new Database(AUTH_DB_PATH),
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
