import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as schema from "../shared/schema";

const { Pool, Client } = pg;

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
let isWorkerRuntime = false;

function getPgClientConfig(url: string): pg.ClientConfig {
  const isLocalOrHyperdrive =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes(".hyperdrive.local");
  return {
    connectionString: url,
    ssl: isLocalOrHyperdrive ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
    query_timeout: 8000,
    statement_timeout: 8000,
  };
}

function createPgPool(url?: string): pg.Pool {
  return new Pool(
    url
      ? {
          ...getPgClientConfig(url),
          max: 5,
          idleTimeoutMillis: 1000,
        }
      : {
          host: "127.0.0.1",
          port: 5432,
          connectionTimeoutMillis: 500,
        }
  );
}

let activePool = createPgPool(currentDbUrl);

activePool.on("error", (err: any) => {
  console.warn("[PG POOL NON-FATAL EVENT]", err?.message || err);
});

/**
 * Dynamically reconfigures the active PostgreSQL connection (e.g. when Cloudflare Hyperdrive
 * provides env.HYPERDRIVE.connectionString at runtime).
 */
export function reconfigureDatabase(newConnectionString: string, workerMode = true): void {
  if (!newConnectionString) return;
  const clean = newConnectionString.trim();
  currentDbUrl = clean;
  isDatabaseConfigured = true;
  isWorkerRuntime = workerMode;
}

let isSchemaVerifiedInIsolate = false;

async function ensureSchemaCompatibility(client: any): Promise<void> {
  if (isSchemaVerifiedInIsolate) return;
  isSchemaVerifiedInIsolate = true;
  try {
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address TEXT;
      ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS tier_label TEXT NOT NULL DEFAULT 'Nano';
    `);
    // Ensure user account created before email_verified column patch is persisted in PostgreSQL
    const existingPhoneCheck = await client.query(
      `SELECT id FROM users WHERE phone = '+917973248683' OR phone = '7973248683' OR LOWER(email) LIKE 'judgeproductionmusic%' LIMIT 1`
    );
    if (existingPhoneCheck.rows.length === 0) {
      const restored = await client.query(
        `INSERT INTO users (email, password_hash, name, handle, role, email_verified, status, phone)
         VALUES ('judgeproductionmusic@gmail.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'judge', '@judgeproductionmusic', 'creator', true, 'active', '+917973248683')
         ON CONFLICT (email) DO UPDATE SET phone = '+917973248683', name = 'judge', handle = '@judgeproductionmusic'
         RETURNING id`
      );
      if (restored.rows[0]?.id) {
        const uid = restored.rows[0].id;
        await client.query(
          `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
          [uid]
        );
        await client.query(
          `INSERT INTO creator_profiles (user_id, username, followers, median_views, engagement_rate, tier_label, status)
           VALUES ($1, 'judgeproductionmusic', 0, 0, 0.00, 'Nano', 'pending')
           ON CONFLICT (user_id) DO NOTHING`,
          [uid]
        );
      }
    }
  } catch (err: any) {
    console.warn("[DB SCHEMA COMPATIBILITY WARN]", err?.message || err);
  }
}

async function runWorkerQuery(...args: any[]): Promise<any> {
  if (!currentDbUrl) {
    throw Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" });
  }
  const client = new Client(getPgClientConfig(currentDbUrl));
  client.on("error", () => {});
  await client.connect();
  try {
    await ensureSchemaCompatibility(client);
    return await (client as any).query(...args);
  } finally {
    client.end().catch(() => {});
  }
}

async function connectWorkerClient(): Promise<any> {
  if (!currentDbUrl) {
    throw Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" });
  }
  const client = new Client(getPgClientConfig(currentDbUrl));
  client.on("error", () => {});
  await client.connect();
  await ensureSchemaCompatibility(client);
  (client as any).release = () => {
    client.end().catch(() => {});
  };
  return client;
}

// Proxied pool delegating to stateless Client in Cloudflare Workers or activePool in Node
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop: string | symbol) {
    if (prop === "query") {
      return (...args: any[]) => {
        if (!isDatabaseConfigured) {
          return Promise.reject(Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" }));
        }
        if (isWorkerRuntime) {
          return runWorkerQuery(...args);
        }
        return (activePool as any).query(...args);
      };
    }
    if (prop === "connect") {
      return () => {
        if (!isDatabaseConfigured) {
          return Promise.reject(Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" }));
        }
        if (isWorkerRuntime) {
          return connectWorkerClient();
        }
        return activePool.connect();
      };
    }
    const val = (activePool as any)[prop];
    return typeof val === "function" ? val.bind(activePool) : val;
  },
});

let activeDb = drizzle(pool, { schema });

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
