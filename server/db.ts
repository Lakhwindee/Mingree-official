import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

export const isLocalFallbackAllowed = true;

function getValidDatabaseUrl(): string | undefined {
  const raw = (process.env.DATABASE_URL || "").trim();
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

export async function verifyDbConnection(): Promise<boolean> {
  if (!isDatabaseConfigured) {
    return false;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    isDatabaseConfigured = false;
    return false;
  }
}

