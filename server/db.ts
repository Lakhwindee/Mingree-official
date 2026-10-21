import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/mingree",
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err: any) => {
  if (err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) {
    return;
  }
  console.error("[PG POOL ERROR]", err);
});

export const db = drizzle(pool, { schema });
