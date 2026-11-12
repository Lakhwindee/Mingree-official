-- Mingree Phase 1: Security Remediation & PostgreSQL Data Consolidation Migration
-- Consolidates persistent state from local JSON files (wallets.json, ledger_entries.json,
-- campaign_workspaces_v2.json, data/users_store.json, settings.json, instagram_identities.json,
-- security_audit_logs.json, /tmp/mingree_otp_store.json) into PostgreSQL.
-- Strictly schema-only: never inserts dummy users, fake wallets, or default credentials,
-- and never deletes existing records.

-- 1. Ensure ledger_entries table exists and aligns with Drizzle schema
CREATE TABLE IF NOT EXISTS ledger_entries (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type text NOT NULL,
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  ref_type text,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries (user_id, created_at DESC);

-- 2. Relax wallet_transactions type constraint so all operational ledger types succeed
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- 3. Ensure payment_orders supports both 'pending' and 'created' statuses
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_status_check
  CHECK (status IN ('pending', 'created', 'paid', 'failed'));

-- 4. Ensure app_config table exists for non-secret application settings (replaces settings.json)
CREATE TABLE IF NOT EXISTS app_config (
  id bigserial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Expand users & creator_profiles columns idempotently
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- 6. Expand instagram_identities to persist full identity lifecycle state (replaces instagram_identities.json)
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS first_bound_at timestamptz DEFAULT now();
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_bound_at timestamptz DEFAULT now();
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_followers_count int NOT NULL DEFAULT 0;
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_media_count int NOT NULL DEFAULT 0;
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS lockout_until bigint;
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS lockout_reason text;
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS disconnect_count int NOT NULL DEFAULT 0;
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS suspicious_flags jsonb NOT NULL DEFAULT '[]';
ALTER TABLE instagram_identities ADD COLUMN IF NOT EXISTS last_risk_score int NOT NULL DEFAULT 0;

-- 7. Expand security_audit_logs to persist full audit metadata (replaces security_audit_logs.json)
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS instagram_user_id text;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'LOW';
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS followers int DEFAULT 0;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS media_count int DEFAULT 0;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- 8. Ensure email_otps supports general OTP storage with expiry (replaces /tmp/mingree_otp_store.json)
ALTER TABLE email_otps DROP CONSTRAINT IF EXISTS email_otps_purpose_check;
ALTER TABLE email_otps ALTER COLUMN purpose SET DEFAULT 'auth';

-- 9. Ensure kyc, withdrawals, payout_methods, promo_codes, promo_redemptions, category_subscriptions exist
CREATE TABLE IF NOT EXISTS kyc (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  pan_encrypted text,
  name text,
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS payout_methods (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  account_details jsonb NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  tds_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  payout_method_id bigint,
  status text NOT NULL DEFAULT 'pending',
  utr_ref text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
  discount_value numeric(12,2) NOT NULL,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_code_id bigint NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code_id)
);

CREATE TABLE IF NOT EXISTS category_subscriptions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  tier text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, tier)
);
CREATE INDEX IF NOT EXISTS idx_category_subscriptions_user ON category_subscriptions (user_id);
