import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
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
    const initSql = `
      CREATE TABLE IF NOT EXISTS users (
        id bigserial PRIMARY KEY,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        name text NOT NULL DEFAULT '',
        role text NOT NULL CHECK (role IN ('creator', 'sponsor', 'admin')),
        email_verified boolean NOT NULL DEFAULT false,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
        company_name text,
        gstin text,
        pan text,
        billing_address text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

      INSERT INTO users (email, password_hash, name, role, email_verified, status)
      VALUES ('platform@mingree.internal', '!', 'Mingree Platform Treasury', 'admin', true, 'blocked')
      ON CONFLICT (email) DO NOTHING;

      CREATE TABLE IF NOT EXISTS creator_profiles (
        user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        instagram_user_id text UNIQUE,
        username text,
        followers int NOT NULL DEFAULT 0,
        media_count int NOT NULL DEFAULT 0,
        tier_label text DEFAULT 'Nano',
        median_views int NOT NULL DEFAULT 0,
        engagement_rate numeric(8,5) NOT NULL DEFAULT 0,
        india_audience_pct numeric(5,2),
        risk_score int NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'needs_review', 'blocked')),
        status_note text,
        access_token_enc text,
        encrypted_access_token text,
        token_expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id bigserial PRIMARY KEY,
        artist_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title text NOT NULL,
        song_url text NOT NULL,
        genre text,
        language text,
        description text,
        deliverable_type text NOT NULL DEFAULT 'reel',
        budget numeric(14,2) NOT NULL DEFAULT 0.00,
        budget_remaining numeric(14,2) NOT NULL DEFAULT 0.00,
        pricing_mode text NOT NULL DEFAULT 'fixed',
        fixed_price numeric(14,2),
        price_cap_per_1k numeric(14,2),
        total_spots int NOT NULL DEFAULT 10,
        spots_remaining int NOT NULL DEFAULT 10,
        filters jsonb NOT NULL DEFAULT '{}',
        required_tags text[] NOT NULL DEFAULT '{}',
        caption_note text,
        whitelist bigint[] NOT NULL DEFAULT '{}',
        blacklist bigint[] NOT NULL DEFAULT '{}',
        deadline timestamptz,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS deals (
        id bigserial PRIMARY KEY,
        campaign_id bigint REFERENCES campaigns(id),
        artist_id bigint REFERENCES users(id),
        creator_id bigint REFERENCES users(id),
        deliverable_type text DEFAULT 'reel',
        price numeric(14,2) NOT NULL DEFAULT 0,
        fee_artist numeric(14,2) NOT NULL DEFAULT 0,
        fee_creator numeric(14,2) NOT NULL DEFAULT 0,
        gst_artist numeric(14,2) NOT NULL DEFAULT 0,
        gst_creator numeric(14,2) NOT NULL DEFAULT 0,
        artist_cost numeric(14,2) NOT NULL DEFAULT 0,
        creator_net numeric(14,2) NOT NULL DEFAULT 0,
        released_artist numeric(14,2) NOT NULL DEFAULT 0,
        released_creator numeric(14,2) NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'accepted',
        deadline timestamptz,
        post_url text,
        post_media_id text,
        post_verified boolean NOT NULL DEFAULT false,
        audio_confirmed boolean NOT NULL DEFAULT false,
        submitted_at timestamptz,
        approved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS wallets (
        user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
        escrow_held numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (escrow_held >= 0),
        pending_withdrawal numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (pending_withdrawal >= 0)
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        type text NOT NULL,
        amount numeric(14,2) NOT NULL,
        balance_after numeric(14,2) NOT NULL,
        escrow_after numeric(14,2) NOT NULL DEFAULT 0.00,
        reference_type text,
        reference_id text,
        description text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS instagram_identities (
        instagram_user_id text PRIMARY KEY,
        current_user_id bigint,
        historical_user_ids bigint[] DEFAULT '{}',
        username text,
        connect_count int DEFAULT 1,
        linked_at timestamptz DEFAULT now(),
        unlinked_at timestamptz
      );

      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id bigserial PRIMARY KEY,
        event text NOT NULL,
        user_id bigint,
        instagram_username text,
        risk_score int,
        flags jsonb NOT NULL DEFAULT '[]',
        decision text,
        ip text,
        details text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS email_otps (
        id bigserial PRIMARY KEY,
        email text NOT NULL,
        purpose text NOT NULL DEFAULT 'signup',
        otp_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        link text,
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS admin_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        description text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;
    await localClient.query(initSql);
    schemaInitialized = true;
    console.log("[DB SCHEMA] Postgres schema initialized successfully.");
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

