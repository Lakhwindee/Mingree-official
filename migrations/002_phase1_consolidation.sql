-- Mingree Phase 1: Security Remediation & PostgreSQL Data Consolidation Migration
-- Consolidates persistent state from local JSON files (wallets.json, ledger_entries.json,
-- campaign_workspaces_v2.json, data/users_store.json, settings.json, instagram_identities.json,
-- security_audit_logs.json, /tmp/mingree_otp_store.json) into PostgreSQL.

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

-- 5. Expand instagram_identities to persist full identity lifecycle state (replaces instagram_identities.json)
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

-- 6. Expand security_audit_logs to persist full audit metadata (replaces security_audit_logs.json)
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS instagram_user_id text;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'LOW';
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS followers int DEFAULT 0;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS media_count int DEFAULT 0;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- 7. Ensure email_otps supports general OTP storage with expiry (replaces /tmp/mingree_otp_store.json)
ALTER TABLE email_otps DROP CONSTRAINT IF EXISTS email_otps_purpose_check;
ALTER TABLE email_otps ALTER COLUMN purpose SET DEFAULT 'auth';

-- 8. Ensure kyc, withdrawals, payout_methods, promo_codes, promo_redemptions exist
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

-- 9. Idempotent Data Migration from Local JSON Files (users_store.json, wallets.json, ledger_entries.json, campaign_workspaces_v2.json)
INSERT INTO users (id, email, password_hash, name, role, email_verified, status, city, avatar, avatar_url)
VALUES
  (1, 'riyasen.creator@mingree.in', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Riya Sen', 'creator', true, 'active', 'Mumbai', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'),
  (2, 'aarohi.creator@mingree.in', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Aarohi Mehta', 'creator', true, 'active', 'Delhi', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300'),
  (3, 'tanvi.creator@mingree.in', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Tanvi Kapoor', 'creator', true, 'active', 'Bangalore', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300'),
  (4, 'simran.creator@mingree.in', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Simran Kaur', 'creator', true, 'active', 'Chandigarh', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300'),
  (5, 'kavya.creator@mingree.in', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Kavya Nair', 'creator', true, 'active', 'Kochi', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300'),
  (20, 'sponsor@mingree.in', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Brand Partner', 'sponsor', true, 'active', 'Mumbai', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150'),
  (99, 'admin@mingree.com', '$2b$10$f6e2M9zIebw3a7F5T.6.rORH1j1S1e.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Mingree Administrator', 'admin', true, 'active', NULL, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')
ON CONFLICT DO NOTHING;

INSERT INTO wallets (user_id, balance, escrow_held)
SELECT id,
  CASE id
    WHEN 1 THEN 101200.00
    WHEN 2 THEN 98710.00
    WHEN 3 THEN 100000.00
    WHEN 4 THEN 100000.00
    WHEN 99 THEN 250000.00
    ELSE 0.00
  END,
  CASE id
    WHEN 2 THEN 25000.00
    WHEN 4 THEN 30000.00
    ELSE 0.00
  END
FROM users
WHERE id IN (1, 2, 3, 4, 99)
ON CONFLICT (user_id) DO NOTHING;
