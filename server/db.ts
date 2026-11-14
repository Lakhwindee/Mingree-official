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

let schemaEnsured = false;
let schemaPromise: Promise<void> | null = null;

/**
 * Idempotently verifies and patches core database tables and columns (such as creator_profiles.username)
 * so serverless workers and production databases never throw "column cp.username does not exist".
 */
export async function ensureDatabaseSchema(force = false): Promise<void> {
  if (schemaEnsured && !force) return;
  if (schemaPromise && !force) return schemaPromise;

  schemaPromise = (async () => {
    if (!currentDbUrl) return;
    const client = new Client(getPgClientConfig(currentDbUrl));
    client.on("error", () => {});
    try {
      await client.connect();
      await client.query(`
        DO $$
        BEGIN
          -- 1. Ensure users table exists with all necessary columns
          CREATE TABLE IF NOT EXISTS users (
            id bigserial PRIMARY KEY,
            email text UNIQUE NOT NULL,
            password_hash text NOT NULL DEFAULT '!',
            name text NOT NULL DEFAULT '',
            role text NOT NULL DEFAULT 'creator',
            email_verified boolean NOT NULL DEFAULT false,
            status text NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now()
          );

          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS handle text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Unlinked';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS followers int DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_followers int DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

          -- 2. Ensure creator_profiles exists with all required columns
          CREATE TABLE IF NOT EXISTS creator_profiles (
            user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            instagram_user_id text,
            username text,
            full_name text,
            avatar_url text,
            followers int NOT NULL DEFAULT 0,
            following_count int NOT NULL DEFAULT 0,
            media_count int NOT NULL DEFAULT 0,
            median_views int NOT NULL DEFAULT 0,
            engagement_rate numeric(8,5) NOT NULL DEFAULT 0,
            tier_label text DEFAULT 'Nano',
            tier text DEFAULT 'Nano',
            city_id int,
            status text NOT NULL DEFAULT 'pending',
            status_note text,
            available boolean NOT NULL DEFAULT true,
            risk_score int NOT NULL DEFAULT 0,
            risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
            access_token_enc text,
            token_expires_at timestamptz,
            metrics_updated_at timestamptz,
            india_audience_pct numeric(5,2) DEFAULT 0,
            completed_deals int NOT NULL DEFAULT 0,
            on_time_deals int NOT NULL DEFAULT 0,
            strikes int NOT NULL DEFAULT 0,
            updated_at timestamptz NOT NULL DEFAULT now(),
            created_at timestamptz NOT NULL DEFAULT now()
          );

          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS username text;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS instagram_user_id text;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS full_name text;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS followers int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS following_count int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS media_count int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS median_views int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS engagement_rate numeric(8,5) NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS tier_label text DEFAULT 'Nano';
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Nano';
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS city_id int;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS status_note text;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS risk_score int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS access_token_enc text;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS metrics_updated_at timestamptz;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS india_audience_pct numeric(5,2) DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS completed_deals int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS on_time_deals int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS strikes int NOT NULL DEFAULT 0;
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
          ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

          -- Backfill username from legacy columns if present and ensure linked creators are active
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'creator_profiles' AND column_name = 'instagram_username'
            ) THEN
              UPDATE creator_profiles SET username = instagram_username WHERE username IS NULL AND instagram_username IS NOT NULL;
            END IF;
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'creator_profiles' AND column_name = 'handle'
            ) THEN
              UPDATE creator_profiles SET username = handle WHERE username IS NULL AND handle IS NOT NULL;
            END IF;

            -- Any creator with a linked Instagram account has active status
            UPDATE creator_profiles SET status = 'active' WHERE (status IS NULL OR status = 'pending') AND username IS NOT NULL AND username != '';

            -- Any user with a linked creator profile has role creator (unless admin)
            UPDATE users SET role = 'creator' WHERE (role != 'admin' OR role IS NULL) AND id IN (SELECT user_id FROM creator_profiles WHERE username IS NOT NULL AND username != '');
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          -- 3. Ensure oauth_states table exists
          CREATE TABLE IF NOT EXISTS oauth_states (
            state text PRIMARY KEY,
            user_id bigint,
            browser_token_hash text NOT NULL DEFAULT '',
            return_to text NOT NULL DEFAULT '/profile',
            redirect_uri text NOT NULL DEFAULT '',
            expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
            created_at timestamptz NOT NULL DEFAULT now()
          );

          ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS user_id bigint;
          ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS browser_token_hash text DEFAULT '';
          ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS return_to text DEFAULT '/profile';
          ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS redirect_uri text DEFAULT '';
          ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '15 minutes');

          -- 4. Ensure instagram_identities table exists
          CREATE TABLE IF NOT EXISTS instagram_identities (
            instagram_user_id text PRIMARY KEY,
            current_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
            historical_user_ids bigint[] NOT NULL DEFAULT '{}'::bigint[],
            username text,
            connect_count int NOT NULL DEFAULT 1,
            first_bound_at timestamptz NOT NULL DEFAULT now(),
            last_bound_at timestamptz NOT NULL DEFAULT now(),
            first_linked_at timestamptz NOT NULL DEFAULT now(),
            linked_at timestamptz NOT NULL DEFAULT now(),
            unlinked_at timestamptz,
            last_followers_count int NOT NULL DEFAULT 0,
            last_media_count int NOT NULL DEFAULT 0,
            is_locked boolean NOT NULL DEFAULT false,
            lockout_until bigint,
            lockout_reason text,
            disconnect_count int NOT NULL DEFAULT 0,
            suspicious_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
            last_risk_score int NOT NULL DEFAULT 0,
            first_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
            cooldown_until timestamptz
          );

          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS current_user_id bigint;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS historical_user_ids bigint[] DEFAULT '{}'::bigint[];
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS username text;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS connect_count int DEFAULT 1;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS first_bound_at timestamptz DEFAULT now();
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_bound_at timestamptz DEFAULT now();
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS first_linked_at timestamptz DEFAULT now();
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS linked_at timestamptz DEFAULT now();
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS unlinked_at timestamptz;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_followers_count int DEFAULT 0;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_media_count int DEFAULT 0;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS lockout_until bigint;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS lockout_reason text;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS disconnect_count int DEFAULT 0;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS suspicious_flags jsonb DEFAULT '[]'::jsonb;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_risk_score int DEFAULT 0;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS first_user_id bigint;
          ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS cooldown_until timestamptz;

          -- 5. Ensure security_audit_logs table exists
          CREATE TABLE IF NOT EXISTS security_audit_logs (
            id bigserial PRIMARY KEY,
            event text NOT NULL DEFAULT 'LOG',
            action text NOT NULL DEFAULT 'LOG',
            user_id bigint,
            instagram_username text,
            risk_score int DEFAULT 0,
            flags text,
            decision text,
            ip text,
            details text,
            created_at timestamptz NOT NULL DEFAULT now()
          );

          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS event text DEFAULT 'LOG';
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS action text DEFAULT 'LOG';
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS user_id bigint;
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS instagram_username text;
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS risk_score int DEFAULT 0;
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS flags text;
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS decision text;
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS ip text;
          ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS details text;

          -- Relax any NOT NULL constraints on event or action in security_audit_logs
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_audit_logs' AND column_name = 'action') THEN
              ALTER TABLE security_audit_logs ALTER COLUMN action DROP NOT NULL;
              ALTER TABLE security_audit_logs ALTER COLUMN action SET DEFAULT 'LOG';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_audit_logs' AND column_name = 'event') THEN
              ALTER TABLE security_audit_logs ALTER COLUMN event DROP NOT NULL;
              ALTER TABLE security_audit_logs ALTER COLUMN event SET DEFAULT 'LOG';
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          -- 5b. Ensure rate_cards table exists and supports all 4 deliverables (reel, story, collab_post, bio_link_story)
          CREATE TABLE IF NOT EXISTS rate_cards (
            id bigserial PRIMARY KEY,
            user_id bigint REFERENCES users(id) ON DELETE CASCADE,
            creator_id bigint REFERENCES users(id) ON DELETE CASCADE,
            deliverable_type text NOT NULL,
            price numeric(12,2) NOT NULL DEFAULT 0,
            base_price numeric(12,2),
            min_price numeric(12,2),
            max_price numeric(12,2),
            active boolean NOT NULL DEFAULT true,
            updated_at timestamptz NOT NULL DEFAULT now()
          );

          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE CASCADE;
          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS creator_id bigint REFERENCES users(id) ON DELETE CASCADE;
          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS deliverable_type text;
          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS price numeric(12,2) DEFAULT 0;
          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS base_price numeric(12,2);
          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS min_price numeric(12,2);
          ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

          BEGIN
            ALTER TABLE rate_cards DROP CONSTRAINT IF EXISTS rate_cards_deliverable_type_check;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_cards' AND column_name = 'creator_id') THEN
              ALTER TABLE rate_cards ALTER COLUMN creator_id DROP NOT NULL;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_cards' AND column_name = 'base_price') THEN
              ALTER TABLE rate_cards ALTER COLUMN base_price DROP NOT NULL;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_cards' AND column_name = 'min_price') THEN
              ALTER TABLE rate_cards ALTER COLUMN min_price DROP NOT NULL;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_cards' AND column_name = 'user_id') THEN
              ALTER TABLE rate_cards ALTER COLUMN user_id DROP NOT NULL;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_cards' AND column_name = 'price') THEN
              ALTER TABLE rate_cards ALTER COLUMN price DROP NOT NULL;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          BEGIN
            UPDATE rate_cards SET user_id = creator_id WHERE user_id IS NULL AND creator_id IS NOT NULL;
            UPDATE rate_cards SET creator_id = user_id WHERE creator_id IS NULL AND user_id IS NOT NULL;
            UPDATE rate_cards SET price = base_price WHERE (price IS NULL OR price = 0) AND base_price IS NOT NULL;
            UPDATE rate_cards SET base_price = price WHERE base_price IS NULL AND price IS NOT NULL;
            DELETE FROM rate_cards a
            USING rate_cards b
            WHERE a.id < b.id
              AND a.user_id IS NOT NULL
              AND a.user_id = b.user_id
              AND a.deliverable_type = b.deliverable_type;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;

          -- 5c. Ensure wallets, ledger_entries, wallet_transactions, payment_orders, and upi_payments tables exist
          CREATE TABLE IF NOT EXISTS wallets (
            user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            balance numeric(12,2) NOT NULL DEFAULT 0.00,
            escrow_held numeric(12,2) NOT NULL DEFAULT 0.00,
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance numeric(12,2) NOT NULL DEFAULT 0.00;
          ALTER TABLE wallets ADD COLUMN IF NOT EXISTS escrow_held numeric(12,2) NOT NULL DEFAULT 0.00;
          ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

          CREATE TABLE IF NOT EXISTS ledger_entries (
            id bigserial PRIMARY KEY,
            user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type text NOT NULL,
            amount numeric(12,2) NOT NULL,
            balance_after numeric(12,2) NOT NULL,
            ref_type text,
            ref_id text,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS ref_type text;
          ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS ref_id text;
          ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

          CREATE TABLE IF NOT EXISTS wallet_transactions (
            id bigserial PRIMARY KEY,
            user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type text NOT NULL,
            amount numeric(12,2) NOT NULL,
            balance_after numeric(12,2) NOT NULL,
            escrow_after numeric(12,2) NOT NULL DEFAULT 0.00,
            reference_type text,
            reference_id text,
            description text,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS escrow_after numeric(12,2) NOT NULL DEFAULT 0.00;
          ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_type text;
          ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id text;
          ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS description text;
          ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

          CREATE TABLE IF NOT EXISTS payment_orders (
            id bigserial PRIMARY KEY,
            order_id text NOT NULL UNIQUE,
            user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount numeric(12,2) NOT NULL,
            purpose text NOT NULL,
            metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
            cashfree_payment_id text,
            status text NOT NULL DEFAULT 'pending',
            created_at timestamptz NOT NULL DEFAULT now(),
            paid_at timestamptz
          );

          CREATE TABLE IF NOT EXISTS upi_payments (
            id bigserial PRIMARY KEY,
            utr text NOT NULL UNIQUE,
            user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount numeric(12,2) NOT NULL,
            status text NOT NULL DEFAULT 'pending',
            created_at timestamptz NOT NULL DEFAULT now(),
            reviewed_at timestamptz
          );

          -- 6. Indices
          CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles (LOWER(username));
          CREATE INDEX IF NOT EXISTS idx_creator_profiles_ig_uid ON creator_profiles (instagram_user_id);
          CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON creator_profiles (status);
          CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states (expires_at);
          CREATE INDEX IF NOT EXISTS idx_instagram_identities_user ON instagram_identities (current_user_id);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_cards_user_deliverable ON rate_cards (user_id, deliverable_type);
          CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_created ON ledger_entries (user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions (user_id, created_at DESC);
        END $$;
      `);
      schemaEnsured = true;
      console.log("[DB SCHEMA] Successfully ensured creator_profiles schema & required columns");
    } catch (err: any) {
      console.warn("[DB SCHEMA ENSURE WARNING]", err?.message || err);
    } finally {
      await client.end().catch(() => {});
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}

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

export function runWithWorkerDbUrl<T>(newConnectionString: string, fn: () => T): T {
  reconfigureDatabase(newConnectionString, true);
  return fn();
}

async function runWorkerQuery(...args: any[]): Promise<any> {
  if (!currentDbUrl) {
    throw Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" });
  }
  if (!schemaEnsured) {
    await ensureDatabaseSchema().catch(() => {});
  }
  const client = new Client(getPgClientConfig(currentDbUrl));
  client.on("error", () => {});
  await client.connect();
  try {
    return await (client as any).query(...args);
  } finally {
    await client.end().catch(() => {});
  }
}

async function connectWorkerClient(): Promise<any> {
  if (!currentDbUrl) {
    throw Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" });
  }
  if (!schemaEnsured) {
    await ensureDatabaseSchema().catch(() => {});
  }
  const client = new Client(getPgClientConfig(currentDbUrl));
  client.on("error", () => {});
  await client.connect();
  (client as any).release = async () => {
    await client.end().catch(() => {});
  };
  return client;
}

// Proxied pool delegating to stateless Client in Cloudflare Workers or activePool in Node
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop: string | symbol) {
    if (prop === "query") {
      return async (...args: any[]) => {
        if (!isDatabaseConfigured) {
          throw Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" });
        }
        if (!schemaEnsured) {
          await ensureDatabaseSchema().catch(() => {});
        }
        if (isWorkerRuntime) {
          return runWorkerQuery(...args);
        }
        return (activePool as any).query(...args);
      };
    }
    if (prop === "connect") {
      return async () => {
        if (!isDatabaseConfigured) {
          throw Object.assign(new Error("Database not configured"), { code: "ECONNREFUSED" });
        }
        if (!schemaEnsured) {
          await ensureDatabaseSchema().catch(() => {});
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
