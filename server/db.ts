import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

export const isLocalFallbackAllowed =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_FALLBACK === "true";

export let isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "",
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err: any) => {
  if (err.code === "ECONNREFUSED" && (!isDatabaseConfigured || isLocalFallbackAllowed)) {
    return;
  }
  console.error("[PG POOL ERROR]", err);
});

export const db = drizzle(pool, { schema });

export async function verifyDbConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
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
    return false;
  }
}
