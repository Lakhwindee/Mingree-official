import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import * as schema from "../shared/schema";

const { Pool } = pg;

export const isLocalFallbackAllowed = true;

function getValidDatabaseUrl(): string | undefined {
  const raw = (
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).trim();
  if (!raw) return undefined;
  try {
    // Validate URL pattern before passing to pg Pool so invalid strings never throw DOMException / SyntaxError
    new URL(raw);
    return raw;
  } catch {
    return undefined;
  }
}

const validDbUrl = getValidDatabaseUrl();
export let isDatabaseConfigured = Boolean(validDbUrl);

const rawPool = new Pool(
  validDbUrl
    ? {
        connectionString: validDbUrl,
        ssl: (validDbUrl.includes("localhost") || validDbUrl.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      }
    : {
        host: "127.0.0.1",
        port: 5432,
        connectionTimeoutMillis: 500,
      }
);

rawPool.on("error", (err: any) => {
  // Never crash serverless process on pool idle connection issues
  console.warn("[PG POOL NON-FATAL EVENT]", err?.message || err);
});

const originalQuery = rawPool.query.bind(rawPool);
(rawPool as any).query = (...args: any[]) => {
  if (!isDatabaseConfigured) {
    return Promise.reject(Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" }));
  }
  return (originalQuery as any)(...args);
};

export const pool = rawPool;

export const db = drizzle(pool, { schema });

let schemaInitialized = false;

export async function ensureSchemaInitialized(client?: pg.PoolClient): Promise<void> {
  if (!isDatabaseConfigured || schemaInitialized) return;
  schemaInitialized = true;
  let localClient: pg.PoolClient | undefined;
  try {
    localClient = client || (await pool.connect());
  } catch (connErr: any) {
    console.warn("[DB SCHEMA CONNECT SKIPPED]", connErr?.message || connErr);
    return;
  }
  const shouldRelease = !client;
  try {
    const migrationPath = path.join(process.cwd(), "migrations", "001_init.sql");
    let initSql = "";
    if (fs.existsSync(migrationPath)) {
      initSql = fs.readFileSync(migrationPath, "utf-8");
    }
    if (initSql) {
      await localClient.query(initSql);
      await localClient.query(`
        ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
      `).catch(() => {});

      // Purge any residual demo campaigns and demo users from DB
      await localClient.query(`
        DELETE FROM campaigns
        WHERE title ILIKE '%boAt%' OR title ILIKE '%Myntra%' OR title ILIKE '%Spotify%'
           OR title ILIKE '%Zomato%' OR title ILIKE '%Mamaearth%' OR title ILIKE '%Nykaa%'
           OR title ILIKE '%Puma%' OR title ILIKE '%OnePlus%' OR title ILIKE '%Noise%'
           OR title ILIKE '%Swiggy%' OR title ILIKE '%CRED%' OR title ILIKE '%Cult.fit%'
           OR title ILIKE '%Lookbook%';

        DELETE FROM creator_profiles 
        WHERE user_id IN (
          SELECT id FROM users 
          WHERE email IN ('creator@mingree.com', 'artist@mingree.com', 'brand@mingree.com', 'sponsor@mingree.com')
             OR handle IN ('@creator', '@sponsor', '@rohanmusic', '@brandpartner')
        );

        DELETE FROM users 
        WHERE email IN ('creator@mingree.com', 'artist@mingree.com', 'brand@mingree.com', 'sponsor@mingree.com')
           OR handle IN ('@creator', '@sponsor', '@rohanmusic', '@brandpartner');
      `).catch(() => {});
      schemaInitialized = true;
      console.log("[DB SCHEMA] Applied migrations/001_init.sql and purged demo accounts successfully.");
    }
  } catch (err: any) {
    console.error("[DB SCHEMA INIT ERROR]", err?.message || err);
  } finally {
    if (shouldRelease) {
      localClient.release();
    }
  }
}

export async function verifyDbConnection(): Promise<boolean> {
  if (!isDatabaseConfigured) {
    return false;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      await ensureSchemaInitialized(client);
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    isDatabaseConfigured = false;
    return false;
  }
}

