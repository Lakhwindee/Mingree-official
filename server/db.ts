import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as schema from "../shared/schema";

const { Pool } = pg;

// OID 20 = int8 (BIGINT / BIGSERIAL / COUNT(*))
// Parse into native JavaScript Number safely with overflow detection
pg.types.setTypeParser(20, (val: string) => {
  const n = Number(val);
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`PostgreSQL BIGINT value "${val}" exceeds JS Number.MAX_SAFE_INTEGER`);
  }
  return n;
});

export const isLocalFallbackAllowed = process.env.NODE_ENV !== "production";

function getValidDatabaseUrl(): string | undefined {
  const raw = (
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_POSTGRES_URL ||
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

let currentDbUrl = getValidDatabaseUrl();
export let isDatabaseConfigured = Boolean(currentDbUrl);

if (process.env.NODE_ENV === "production" && !currentDbUrl && !process.env.HYPERDRIVE) {
  console.error("================================================================================");
  console.error("FATAL ERROR: DATABASE_URL / Hyperdrive is missing or invalid in production.");
  console.error("Production launch requires a persistent PostgreSQL database (Supabase PostgreSQL via Cloudflare Hyperdrive).");
  console.error("In-memory database fallbacks are strictly disabled in production.");
  console.error("Halting server startup.");
  console.error("================================================================================");
  process.exit(1);
}

function createPgPool(url?: string): pg.Pool {
  return new Pool(
    url
      ? {
          connectionString: url,
          ssl: (url.includes("localhost") || url.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        }
      : {
          host: "127.0.0.1",
          port: 5432,
          connectionTimeoutMillis: 500,
        }
  );
}

let activePool = createPgPool(currentDbUrl);
let activeDb = drizzle(activePool, { schema });

activePool.on("error", (err: any) => {
  console.warn("[PG POOL NON-FATAL EVENT]", err?.message || err);
});

/**
 * Dynamically reconfigures the active PostgreSQL connection pool (e.g. when Cloudflare Hyperdrive
 * provides env.HYPERDRIVE.connectionString at runtime).
 */
export function reconfigureDatabase(newConnectionString: string): void {
  if (!newConnectionString) return;
  const clean = newConnectionString.trim();
  if (currentDbUrl === clean) return;
  currentDbUrl = clean;
  isDatabaseConfigured = true;
  const newPool = createPgPool(clean);
  newPool.on("error", (err: any) => {
    console.warn("[PG POOL NON-FATAL EVENT]", err?.message || err);
  });
  activePool = newPool;
  activeDb = drizzle(activePool, { schema });
  console.log("[DB] Active database connection routed to Hyperdrive / Supabase PostgreSQL pool.");
}

// Proxied pool delegating to activePool
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop: string | symbol) {
    if (prop === "query") {
      return (...args: any[]) => {
        if (!isDatabaseConfigured) {
          return Promise.reject(Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" }));
        }
        return (activePool as any).query(...args);
      };
    }
    const val = (activePool as any)[prop];
    return typeof val === "function" ? val.bind(activePool) : val;
  },
});

// Proxied Drizzle ORM instance delegating to activeDb
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop: string | symbol) {
    const val = (activeDb as any)[prop];
    return typeof val === "function" ? val.bind(activeDb) : val;
  },
});

/**
 * Explicit migration runner invoked ONLY by the dedicated migration CLI (`scripts/migrate.ts`).
 * Never called automatically during normal API server startup or runtime requests,
 * tracks applied migration versions in `schema_migrations`,
 * and never executes destructive DELETE/TRUNCATE statements.
 */
export async function runDatabaseMigrations(client?: pg.PoolClient | any): Promise<void> {
  if (!isDatabaseConfigured && !client) {
    throw new Error("DATABASE_URL is not configured. Cannot run database migrations.");
  }
  const localClient = client || (await pool.connect());
  const shouldRelease = !client;
  try {
    // Ensure schema_migrations tracking table exists
    await localClient.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Ordered migration files for canonical clean launch
    const migrationFiles = ["0001_clean_launch_schema.sql"];
    for (const fileName of migrationFiles) {
      const migrationPath = path.join(process.cwd(), "migrations", fileName);
      if (fs.existsSync(migrationPath)) {
        const checkRes = await localClient.query(
          "SELECT name FROM schema_migrations WHERE name = $1",
          [fileName]
        );
        if (checkRes.rows.length === 0) {
          const sqlContent = fs.readFileSync(migrationPath, "utf-8");
          if (sqlContent.trim()) {
            await localClient.query(sqlContent);
            const checksum = crypto.createHash("sha256").update(sqlContent).digest("hex");
            await localClient.query(
              "INSERT INTO schema_migrations (name, checksum, applied_at) VALUES ($1, $2, now()) ON CONFLICT (name) DO NOTHING",
              [fileName, checksum]
            );
            console.log(`[DB MIGRATE] Applied migrations/${fileName} (checksum: ${checksum.slice(0, 8)})`);
          }
        } else {
          console.log(`[DB MIGRATE] Skip migrations/${fileName} (already applied)`);
        }
      }
    }
  } finally {
    if (shouldRelease) {
      localClient.release();
    }
  }
}

/**
 * Verifies database connectivity on server startup using a lightweight read-only check.
 * Never executes DDL migrations or destructive SQL automatically on startup.
 */
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
  } catch {
    isDatabaseConfigured = false;
    return false;
  }
}
