-- Mingree v6 Database Schema
-- All money columns use numeric(14,2) representing INR scale 2.
-- Strict foreign keys with ON DELETE CASCADE or RESTRICT, and indices on query paths.

-- 1. USERS
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
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- Internal Platform Account for collecting fees
INSERT INTO users (email, password_hash, name, role, email_verified, status)
VALUES ('platform@mingree.internal', '!', 'Mingree Platform Treasury', 'admin', true, 'blocked')
ON CONFLICT (email) DO NOTHING;

-- 2. CREATOR PROFILES
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
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON creator_profiles (status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_tier ON creator_profiles (tier_label, status);

-- 3. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id bigserial PRIMARY KEY,
  artist_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  song_url text NOT NULL,
  genre text,
  language text,
  description text,
  deliverable_type text NOT NULL DEFAULT 'reel' CHECK (deliverable_type IN ('reel', 'story', 'collab_post')),
  budget numeric(14,2) NOT NULL CHECK (budget > 0),
  budget_remaining numeric(14,2) NOT NULL CHECK (budget_remaining >= 0),
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('fixed', 'direct')),
  fixed_price numeric(14,2),
  price_cap_per_1k numeric(14,2),
  total_spots int NOT NULL DEFAULT 10,
  spots_remaining int NOT NULL DEFAULT 10,
  filters jsonb NOT NULL DEFAULT '{}',
  required_tags text[] NOT NULL DEFAULT '{}',
  caption_note text,
  whitelist bigint[] NOT NULL DEFAULT '{}',
  blacklist bigint[] NOT NULL DEFAULT '{}',
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_artist_status ON campaigns (artist_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created ON campaigns (status, created_at DESC);

-- 4. CAMPAIGN SLOTS
CREATE TABLE IF NOT EXISTS campaign_slots (
  id bigserial PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  price numeric(14,2) NOT NULL CHECK (price > 0),
  fee_artist numeric(14,2) NOT NULL DEFAULT 0.00,
  fee_creator numeric(14,2) NOT NULL DEFAULT 0.00,
  creator_net numeric(14,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'submitted', 'approved', 'released', 'disputed', 'cancelled')),
  deadline timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_slots_creator_status ON campaign_slots (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_slots_campaign_id ON campaign_slots (campaign_id);

-- 5. SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
  id bigserial PRIMARY KEY,
  slot_id bigint REFERENCES campaign_slots(id) ON DELETE CASCADE,
  campaign_id bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  post_url text NOT NULL,
  post_media_id text,
  audio_confirmed boolean NOT NULL DEFAULT false,
  views_count int NOT NULL DEFAULT 0,
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_requested', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_submissions_campaign ON submissions (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_creator ON submissions (creator_id, status);

-- 6. PAYOUTS
CREATE TABLE IF NOT EXISTS payouts (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  tds_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  net_amount numeric(14,2) NOT NULL,
  payout_method_id bigint,
  payout_details jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  transfer_ref text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by bigint REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payouts_user_status ON payouts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts (created_at DESC);

-- 7. WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('deposit', 'escrow_lock', 'escrow_release', 'payout', 'refund', 'adjustment')),
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  escrow_after numeric(14,2) NOT NULL DEFAULT 0.00,
  reference_type text,
  reference_id text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_ref ON wallet_transactions (reference_type, reference_id);

-- 8. PLATFORM EARNINGS
CREATE TABLE IF NOT EXISTS platform_earnings (
  id bigserial PRIMARY KEY,
  deal_id bigint,
  campaign_id bigint REFERENCES campaigns(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('artist_fee', 'creator_fee', 'subscription')),
  fee_amount numeric(14,2) NOT NULL CHECK (fee_amount >= 0),
  gst_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  total_earned numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_source ON platform_earnings (source, created_at DESC);

-- 9. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('upi', 'bank')),
  upi_id text,
  account_name text,
  account_number text,
  ifsc text,
  bank_name text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts (user_id);

-- 10. EMAIL OTPS
CREATE TABLE IF NOT EXISTS email_otps (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup', 'reset')),
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, purpose)
);
CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON email_otps (email, purpose);

-- 11. PASSWORD RESETS
CREATE TABLE IF NOT EXISTS password_resets (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (email);

-- 12. ADMIN SETTINGS
CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO admin_settings (key, value, description)
VALUES 
  ('benchmark_cpm', '{"min": 50, "max": 300}', 'Benchmark CPM Range in INR'),
  ('platform_fees', '{"artistPercent": 7.5, "creatorPercent": 7.5, "creatorProPercent": 4.0}', 'Platform commission fee structure')
ON CONFLICT (key) DO NOTHING;

-- WALLETS STATE SUMMARY TABLE
CREATE TABLE IF NOT EXISTS wallets (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  escrow_held numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (escrow_held >= 0),
  pending_withdrawal numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (pending_withdrawal >= 0)
);

-- LEGACY & COMPATIBILITY TABLES
CREATE TABLE IF NOT EXISTS deals (
  id bigserial PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES campaigns(id),
  artist_id bigint NOT NULL REFERENCES users(id),
  creator_id bigint NOT NULL REFERENCES users(id),
  deliverable_type text NOT NULL,
  price numeric(14,2) NOT NULL,
  fee_artist numeric(14,2) NOT NULL,
  fee_creator numeric(14,2) NOT NULL,
  gst_artist numeric(14,2) NOT NULL DEFAULT 0,
  gst_creator numeric(14,2) NOT NULL DEFAULT 0,
  artist_cost numeric(14,2) NOT NULL,
  creator_net numeric(14,2) NOT NULL,
  released_artist numeric(14,2) NOT NULL DEFAULT 0,
  released_creator numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'accepted',
  deadline timestamptz NOT NULL,
  post_url text,
  post_media_id text,
  post_verified boolean NOT NULL DEFAULT false,
  audio_confirmed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  expires_at timestamptz,
  expiry_reminded boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS payment_orders (
  order_id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  purpose text NOT NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS upi_payments (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  utr text NOT NULL UNIQUE,
  purpose text NOT NULL DEFAULT 'wallet_topup',
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason text,
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
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications (user_id, is_read, id DESC);

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
