-- Mingree v2 schema. Money columns are numeric(14,2) in INR.

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('creator','sponsor','admin')),
  email_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  company_name text,
  gstin text,
  pan text,
  billing_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Internal account that receives platform fees. Cannot log in (status blocked, unusable hash).
INSERT INTO users (email, password_hash, name, role, email_verified, status)
VALUES ('platform@mingree.internal', '!', 'Mingree Platform', 'admin', true, 'blocked');

CREATE TABLE email_otps (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup','reset')),
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, purpose)
);

CREATE TABLE wallets (
  user_id bigint PRIMARY KEY REFERENCES users(id),
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  escrow_held numeric(14,2) NOT NULL DEFAULT 0 CHECK (escrow_held >= 0),
  pending_withdrawal numeric(14,2) NOT NULL DEFAULT 0 CHECK (pending_withdrawal >= 0)
);

CREATE TABLE ledger_entries (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  kind text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,          -- change in balance
  escrow_delta numeric(14,2) NOT NULL DEFAULT 0,    -- change in escrow_held
  pending_delta numeric(14,2) NOT NULL DEFAULT 0,   -- change in pending_withdrawal
  balance_after numeric(14,2) NOT NULL,
  escrow_after numeric(14,2) NOT NULL,
  ref_type text,
  ref_id text,
  idem_key text UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_user_idx ON ledger_entries (user_id, id DESC);

CREATE TABLE cities (
  id serial PRIMARY KEY,
  name text NOT NULL,
  state text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (name, state)
);

CREATE TABLE creator_profiles (
  user_id bigint PRIMARY KEY REFERENCES users(id),
  instagram_user_id text UNIQUE,
  username text,
  followers int NOT NULL DEFAULT 0,
  media_count int NOT NULL DEFAULT 0,
  tier_label text,
  city_id int REFERENCES cities(id),   -- chosen at signup, locked; only admin can change
  median_views int NOT NULL DEFAULT 0,
  engagement_rate numeric(8,5) NOT NULL DEFAULT 0,
  india_audience_pct numeric(5,2),
  risk_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','needs_review','blocked')),
  status_note text,
  access_token_enc text,
  token_expires_at timestamptz,
  genres text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  available boolean NOT NULL DEFAULT true,
  completed_deals int NOT NULL DEFAULT 0,
  on_time_deals int NOT NULL DEFAULT 0,
  strikes int NOT NULL DEFAULT 0,
  metrics_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE instagram_identities (
  instagram_user_id text PRIMARY KEY,
  current_user_id bigint REFERENCES users(id),
  historical_user_ids bigint[] NOT NULL DEFAULT '{}',
  username text,
  connect_count int NOT NULL DEFAULT 1,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz
);

CREATE TABLE instagram_follower_history (
  id bigserial PRIMARY KEY,
  instagram_user_id text NOT NULL,
  followers int NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ig_hist_idx ON instagram_follower_history (instagram_user_id, taken_at DESC);

CREATE TABLE security_audit_logs (
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
CREATE INDEX sec_log_idx ON security_audit_logs (event, created_at DESC);

CREATE TABLE rate_cards (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  deliverable_type text NOT NULL CHECK (deliverable_type IN ('reel','story','collab_post')),
  price numeric(14,2) NOT NULL CHECK (price > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deliverable_type)
);

CREATE TABLE campaigns (
  id bigserial PRIMARY KEY,
  artist_id bigint NOT NULL REFERENCES users(id),
  title text NOT NULL,
  song_url text NOT NULL,
  genre text,
  language text,
  description text,
  deliverable_type text NOT NULL DEFAULT 'reel' CHECK (deliverable_type IN ('reel','story','collab_post')),
  budget numeric(14,2) NOT NULL CHECK (budget > 0),
  budget_remaining numeric(14,2) NOT NULL CHECK (budget_remaining >= 0),
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('fixed','direct')),
  fixed_price numeric(14,2),
  price_cap_per_1k numeric(14,2),
  total_spots int,
  spots_remaining int,
  filters jsonb NOT NULL DEFAULT '{}',
  required_tags text[] NOT NULL DEFAULT '{}',
  caption_note text,
  whitelist bigint[] NOT NULL DEFAULT '{}',
  blacklist bigint[] NOT NULL DEFAULT '{}',
  deadline timestamptz NOT NULL,
  deal_window_hours int NOT NULL DEFAULT 48,
  autopilot_run_after timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_artist_idx ON campaigns (artist_id, status);

CREATE TABLE campaign_offers (
  id bigserial PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES campaigns(id),
  creator_id bigint NOT NULL REFERENCES users(id),
  quoted_price numeric(14,2),
  proposed_price numeric(14,2),
  counter_price numeric(14,2),
  counter_used boolean NOT NULL DEFAULT false,
  reserved_amount numeric(14,2) NOT NULL DEFAULT 0,   -- artist_cost held in escrow for this pending offer
  price_snapshot numeric(14,2),                        -- creator's rate at the moment the artist submitted
  status text NOT NULL DEFAULT 'invited' CHECK (status IN
    ('invited','quoted','shortlisted','auto_accepted','accepted','countered','declined','missed','withdrawn')),
  source text NOT NULL DEFAULT 'autopilot' CHECK (source IN ('autopilot','direct')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
CREATE INDEX offers_creator_idx ON campaign_offers (creator_id, status);

CREATE TABLE deals (
  id bigserial PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES campaigns(id),
  offer_id bigint REFERENCES campaign_offers(id),
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
  released_artist numeric(14,2) NOT NULL DEFAULT 0,   -- portion of artist_cost already released/refunded
  released_creator numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN
    ('accepted','posted','approved','completed','disputed','expired','refunded')),
  deadline timestamptz NOT NULL,
  post_url text,
  post_media_id text,
  post_verified boolean NOT NULL DEFAULT false,
  audio_confirmed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  review_due_at timestamptz,
  approved_at timestamptz,
  live_check_due_at timestamptz,
  reject_reason text,
  rejections int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
CREATE INDEX deals_creator_idx ON deals (creator_id, status);
CREATE INDEX deals_artist_idx ON deals (artist_id, status);

CREATE TABLE metric_snapshots (
  id bigserial PRIMARY KEY,
  deal_id bigint NOT NULL REFERENCES deals(id),
  label text NOT NULL CHECK (label IN ('48h','7d')),
  views int,
  likes int,
  comments int,
  still_live boolean,
  taken_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, label)
);

CREATE TABLE disputes (
  id bigserial PRIMARY KEY,
  deal_id bigint NOT NULL REFERENCES deals(id),
  opened_by bigint NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolution text,
  resolved_by bigint REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE payment_orders (
  order_id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK (purpose IN ('wallet_topup','creator_pro')),
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE upi_payments (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  utr text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('wallet_topup','creator_pro')),
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by bigint REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE promo_codes (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_percent int NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  valid_until date,
  max_usage int,
  usage_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE promo_redemptions (
  promo_id bigint NOT NULL REFERENCES promo_codes(id),
  user_id bigint NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promo_id, user_id)
);

CREATE TABLE subscriptions (
  user_id bigint PRIMARY KEY REFERENCES users(id),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  expires_at timestamptz,
  expiry_reminded boolean NOT NULL DEFAULT false
);

CREATE TABLE payout_methods (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('upi','bank')),
  upi_id text,
  account_name text,
  account_number text,
  ifsc text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kyc (
  user_id bigint PRIMARY KEY REFERENCES users(id),
  pan_enc text NOT NULL,
  pan_last4 text NOT NULL,
  name_on_pan text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE withdrawals (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payout_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  tds_amount numeric(14,2) NOT NULL DEFAULT 0,
  transfer_ref text,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by bigint REFERENCES users(id)
);

CREATE TABLE notifications (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON notifications (user_id, is_read, id DESC);

CREATE TABLE app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
INSERT INTO app_config (key, value) VALUES ('benchmark_cpm', '{"min": null, "max": null}');

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_id bigint,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX creator_city_idx ON creator_profiles (city_id, tier_label, status);

CREATE TABLE city_change_requests (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  from_city_id int REFERENCES cities(id),
  to_city_id int NOT NULL REFERENCES cities(id),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by bigint REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
