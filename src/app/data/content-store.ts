import { db } from '@/lib/db';
import type { SiteContent } from './content-types';
import defaultContent from './content.json';

/**
 * Storage strategy:
 *
 * 1. Supabase PostgreSQL (DATABASE_URL env): content is stored in a dedicated
 *    `content` table keyed by 'main'. Works on Vercel/Netlify edge+serverless.
 * 2. Local dev fallback: if DATABASE_URL is missing, return the bundled
 *    content.json directly so the site never has a blank metadata payload.
 */

const TABLE = '"content"';
const KEY_MAIN = 'main';

/**
 * Recursively layer stored content over the bundled defaults.
 *
 * A shallow `{ ...defaults, ...stored }` only backfills missing *sections*.
 * This walks objects and arrays so fields added later (e.g. the per-service
 * showcase images) also appear on rows saved before they existed — a stored
 * array is preserved item-by-item and only gains the keys it is missing.
 */
function mergeDefaults<T>(fallback: T, stored: unknown): T {
  if (Array.isArray(fallback)) {
    if (!Array.isArray(stored)) return fallback;
    return stored.map((item, index) =>
      index < fallback.length ? mergeDefaults(fallback[index], item) : item
    ) as unknown as T;
  }
  if (fallback !== null && typeof fallback === 'object') {
    if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return fallback;
    const base = fallback as Record<string, unknown>;
    const incoming = stored as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...incoming };
    for (const key of Object.keys(base)) {
      merged[key] = key in incoming ? mergeDefaults(base[key], incoming[key]) : base[key];
    }
    return merged as unknown as T;
  }
  return (stored === undefined ? fallback : stored) as T;
}

export async function ensureContentTable(): Promise<void> {
  // The `content` table is created once via the ensure-admin.ts migration.
  // If running standalone, ensure it exists here too.
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  );
}

/**
 * Get the stored site content (the JSON blob).
 * Falls back to the bundled content.json if the store is empty or DB is unavailable.
 */
export async function getContent(): Promise<SiteContent> {
  try {
    const result = await db.execute(`SELECT value FROM ${TABLE} WHERE key = ?`, [
      KEY_MAIN,
    ]);
    if (result.rows.length === 0) return defaultContent as SiteContent;
    const stored = JSON.parse(String(result.rows[0]?.value)) as Partial<SiteContent>;
    // Layer stored values over the bundled defaults so sections (and fields)
    // added after the row was last saved still appear instead of being
    // undefined — e.g. the new `work` page and the service showcase images.
    return mergeDefaults(defaultContent as SiteContent, stored) as SiteContent;
  } catch (error) {
    console.error('Error fetching content from DB:', error);
    return defaultContent as SiteContent;
  }
}

/**
 * Save the entire site content as a single JSON blob.
 * Uses UPSERT (INSERT ... ON CONFLICT) to handle both new and existing keys.
 */
export async function saveContent(content: SiteContent): Promise<void> {
  const json = JSON.stringify(content, null, 2);
  try {
    await db.execute(
      `INSERT INTO ${TABLE} (key, value) VALUES ($1, $2) ` +
        `ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [KEY_MAIN, json]
    );
  } catch (error) {
    // If the upsert fails, try a delete + re-insert fallback
    await db.execute(`DELETE FROM ${TABLE} WHERE key = ?`, [KEY_MAIN]);
    await db.execute(
      `INSERT INTO ${TABLE} (key, value) VALUES ($1, $2)`,
      [KEY_MAIN, json]
    );
  }
}