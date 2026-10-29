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
  if (schemaInitialized) return;
  const localClient = client || (await pool.connect());
  const shouldRelease = !client;
  try {
    const migrationPath = path.join(process.cwd(), "migrations", "001_init.sql");
    let initSql = "";
    if (fs.existsSync(migrationPath)) {
      initSql = fs.readFileSync(migrationPath, "utf-8");
    }
    if (initSql) {
      await localClient.query(initSql);
      // Purge any residual demo campaigns from DB
      await localClient.query(`
        DELETE FROM campaigns
        WHERE title ILIKE '%boAt%' OR title ILIKE '%Myntra%' OR title ILIKE '%Spotify%'
           OR title ILIKE '%Zomato%' OR title ILIKE '%Mamaearth%' OR title ILIKE '%Nykaa%'
           OR title ILIKE '%Puma%' OR title ILIKE '%OnePlus%' OR title ILIKE '%Noise%'
           OR title ILIKE '%Swiggy%' OR title ILIKE '%CRED%' OR title ILIKE '%Cult.fit%'
           OR title ILIKE '%Lookbook%';
      `).catch(() => {});
      schemaInitialized = true;
      console.log("[DB SCHEMA] Applied migrations/001_init.sql successfully.");
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

