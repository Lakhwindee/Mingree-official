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
        ssl: validDbUrl.includes("render.com") ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 3000,
      }
    : {
        host: "127.0.0.1",
        port: 5432,
        connectionTimeoutMillis: 500,
      }
);

rawPool.on("error", (err: any) => {
  if (err.code === "ECONNREFUSED" || !isDatabaseConfigured || isLocalFallbackAllowed) {
    return;
  }
  console.error("[PG POOL ERROR]", err);
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

