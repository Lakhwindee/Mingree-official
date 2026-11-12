-- ============================================================================
-- MINGREE CANONICAL LAUNCH SCHEMA (0001_clean_launch_schema.sql)
-- Target: Neon PostgreSQL Free + Cloudflare Hyperdrive
-- Total Canonical Tables: 34
-- Zero seed users, zero fake wallets, zero destructive queries
-- Safe to run repeatedly (IF NOT EXISTS on all tables, indexes, constraints)
-- ============================================================================

-- MIGRATION TRACKING TABLE
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'creator',
  name TEXT NOT NULL DEFAULT '',
  handle TEXT,
  phone TEXT,
  company_name TEXT,
  gst_number TEXT,
  brand_category TEXT,
  bio TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  niche TEXT,
  gender TEXT,
  tier TEXT NOT NULL DEFAULT 'Unlinked',
  followers INTEGER NOT NULL DEFAULT 0,
  instagram_followers INTEGER NOT NULL DEFAULT 0,
  avatar TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  trust_score INTEGER NOT NULL DEFAULT 60,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  pro_expires_at TIMESTAMPTZ,
  suspended BOOLEAN NOT NULL DEFAULT false,
  suspend_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_city ON users (city);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- 2. EMAIL OTPS
CREATE TABLE IF NOT EXISTS email_otps (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'verify',
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_otps_email_purpose_unique UNIQUE (email, purpose)
);
CREATE INDEX IF NOT EXISTS idx_email_otps_email_expires ON email_otps (email, expires_at DESC);

-- 3. OAUTH STATES (Single-Use & Browser-Session Bound CSRF Protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  browser_token_hash TEXT NOT NULL,
  return_to TEXT NOT NULL DEFAULT '/profile',
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states (expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states (user_id);

-- 4. CREATOR PROFILES
CREATE TABLE IF NOT EXISTS creator_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  instagram_user_id TEXT UNIQUE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  followers INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  media_count INTEGER NOT NULL DEFAULT 0,
  median_views INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  tier TEXT NOT NULL DEFAULT 'Unlinked',
  status TEXT NOT NULL DEFAULT 'pending',
  available BOOLEAN NOT NULL DEFAULT true,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  access_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  metrics_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_creator_profiles_followers ON creator_profiles (followers DESC);

-- 5. INSTAGRAM IDENTITIES (Anti-Farming & Cooldown Enforcement)
CREATE TABLE IF NOT EXISTS instagram_identities (
  id BIGSERIAL PRIMARY KEY,
  instagram_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  current_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  historical_user_ids BIGINT[] NOT NULL DEFAULT '{}'::bigint[],
  connect_count INTEGER NOT NULL DEFAULT 1,
  first_linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_instagram_identities_current_user ON instagram_identities (current_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_identities_username ON instagram_identities (LOWER(username));

-- 6. RATE CARDS
CREATE TABLE IF NOT EXISTS rate_cards (
  id BIGSERIAL PRIMARY KEY,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  base_price NUMERIC(12,2) NOT NULL,
  min_price NUMERIC(12,2) NOT NULL,
  max_price NUMERIC(12,2),
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rate_cards_creator_deliverable_unique UNIQUE (creator_id, deliverable_type)
);

-- 7. CATEGORY SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS category_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  category_slug TEXT,
  tier TEXT NOT NULL DEFAULT 'Nano',
  rate NUMERIC(12,2) NOT NULL DEFAULT 500.00,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT category_subscriptions_user_cat_tier_unique UNIQUE (user_id, category, tier)
);
CREATE INDEX IF NOT EXISTS idx_category_subscriptions_user ON category_subscriptions (user_id);

-- 8. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  artist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brand TEXT,
  brand_logo TEXT,
  category TEXT NOT NULL DEFAULT 'music_reels',
  song_url TEXT,
  audio_url TEXT,
  reference_video_url TEXT,
  product_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  genre TEXT,
  language TEXT,
  description TEXT,
  deliverable_type TEXT NOT NULL DEFAULT 'reel',
  content_types TEXT[] NOT NULL DEFAULT ARRAY['Reel']::text[],
  promotion_style TEXT,
  budget NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  budget_remaining NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  escrow_held NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  committed_payouts NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  released_payouts NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pricing_mode TEXT NOT NULL DEFAULT 'fixed',
  booking_model TEXT NOT NULL DEFAULT 'instant',
  fixed_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_spots INTEGER NOT NULL DEFAULT 1,
  spots_remaining INTEGER NOT NULL DEFAULT 1,
  reserved_slots INTEGER NOT NULL DEFAULT 0,
  min_followers INTEGER NOT NULL DEFAULT 1000,
  min_median_views INTEGER NOT NULL DEFAULT 500,
  min_duration_secs INTEGER NOT NULL DEFAULT 15,
  tier TEXT,
  target_tiers TEXT[] NOT NULL DEFAULT '{}'::text[],
  target_cities TEXT[] NOT NULL DEFAULT '{}'::text[],
  target_countries TEXT[] NOT NULL DEFAULT ARRAY['India']::text[],
  required_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  required_mentions TEXT[] NOT NULL DEFAULT '{}'::text[],
  caption_note TEXT,
  required_caption_note TEXT,
  disclosure_instructions TEXT NOT NULL DEFAULT '#ad | Paid Partnership',
  deal_window_hours INTEGER NOT NULL DEFAULT 48,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_artist_id ON campaigns (artist_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at DESC);

-- 9. CAMPAIGN OFFERS
CREATE TABLE IF NOT EXISTS campaign_offers (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL DEFAULT 'reel',
  creator_quote NUMERIC(12,2),
  artist_counter NUMERIC(12,2),
  agreed_price NUMERIC(12,2),
  round INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'invited',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaign_offers_campaign_creator_unique UNIQUE (campaign_id, creator_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_offers_creator_status ON campaign_offers (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_offers_campaign_id ON campaign_offers (campaign_id);

-- 10. DEALS
CREATE TABLE IF NOT EXISTS deals (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT REFERENCES campaign_offers(id) ON DELETE SET NULL,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  artist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL DEFAULT 'reel',
  price NUMERIC(12,2) NOT NULL,
  artist_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  fee_artist NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  fee_creator NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  creator_net NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'accepted',
  post_url TEXT,
  post_media_id TEXT,
  audio_confirmed BOOLEAN NOT NULL DEFAULT false,
  resubmit_count INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  first_release_at TIMESTAMPTZ,
  final_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_campaign_id ON deals (campaign_id);
CREATE INDEX IF NOT EXISTS idx_deals_artist_id ON deals (artist_id);
CREATE INDEX IF NOT EXISTS idx_deals_creator_status ON deals (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_status_deadline ON deals (status, deadline);

-- 11. WORKSPACE PARTICIPANTS (Canonical Campaign Slots, Applications, Drafts & Negotiations)
CREATE TABLE IF NOT EXISTS workspace_participants (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  creator_handle TEXT NOT NULL,
  creator_avatar TEXT,
  creator_followers INTEGER NOT NULL DEFAULT 0,
  creator_median_views INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  base_rate NUMERIC(12,2),
  brief_acknowledged_version INTEGER NOT NULL DEFAULT 1,
  draft_submission JSONB,
  draft_status TEXT NOT NULL DEFAULT 'none',
  draft_feedback_notes TEXT,
  submission JSONB,
  revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  negotiation_status TEXT NOT NULL DEFAULT 'initial',
  last_offered_price NUMERIC(12,2),
  last_offer_by TEXT,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_participants_campaign_creator_unique UNIQUE (campaign_id, creator_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_participants_campaign ON workspace_participants (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_participants_creator ON workspace_participants (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_participants_expires ON workspace_participants (status, expires_at) WHERE expires_at IS NOT NULL;

-- 12. SUBMISSIONS (Synchronized 1-to-1 with workspace_participants for Analytics & Reporting)
CREATE TABLE IF NOT EXISTS submissions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT UNIQUE REFERENCES workspace_participants(id) ON DELETE SET NULL,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  post_media_id TEXT,
  audio_confirmed BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_submissions_creator_status ON submissions (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions (campaign_id);

-- 13. WORKSPACE MESSAGES
CREATE TABLE IF NOT EXISTS workspace_messages (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL DEFAULT 0,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  sender_avatar TEXT,
  recipient_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  is_brief_change BOOLEAN NOT NULL DEFAULT false,
  brief_version INTEGER,
  negotiation_offer JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_campaign_created ON workspace_messages (campaign_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_recipient ON workspace_messages (campaign_id, recipient_id);

-- 14. WORKSPACE MESSAGE READS (Normalized Lock-Free Read Receipts)
CREATE TABLE IF NOT EXISTS workspace_message_reads (
  message_id BIGINT NOT NULL REFERENCES workspace_messages(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_message_reads_user ON workspace_message_reads (user_id, message_id);

-- 15. CAMPAIGN BRIEF VERSIONS
CREATE TABLE IF NOT EXISTS campaign_brief_versions (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  changes_summary TEXT NOT NULL,
  diffs JSONB NOT NULL DEFAULT '[]'::jsonb,
  brief_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaign_brief_versions_campaign_version_unique UNIQUE (campaign_id, version)
);
CREATE INDEX IF NOT EXISTS idx_campaign_brief_versions_campaign ON campaign_brief_versions (campaign_id, version DESC);

-- 16. METRIC SNAPSHOTS
CREATE TABLE IF NOT EXISTS metric_snapshots (
  id BIGSERIAL PRIMARY KEY,
  deal_id BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  still_live BOOLEAN NOT NULL DEFAULT true,
  checkpoint TEXT NOT NULL DEFAULT 'auto',
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_deal_id ON metric_snapshots (deal_id);

-- 17. DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
  id BIGSERIAL PRIMARY KEY,
  deal_id BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  raised_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by_admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_disputes_deal_id ON disputes (deal_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);

-- 18. WALLETS
CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  escrow_held NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (escrow_held >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. LEDGER ENTRIES (Append-Only Financial Audit Ledger)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_created ON ledger_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries (type);
-- Prevent duplicate payment_order or upi_payment credits (canonical ref_id = orderId or String(upi_payments.id))
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_payment_idempotent
  ON ledger_entries (ref_type, ref_id)
  WHERE ref_type IN ('payment_order', 'upi_payment') AND ref_id IS NOT NULL;
-- Prevent duplicate escrow releases, refunds, or withdrawal settlements for the same deal/withdrawal
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_release_idempotent
  ON ledger_entries (type, ref_type, ref_id)
  WHERE ref_type IN (
    'deal_first_release',
    'deal_auto_approved_release',
    'deal_final_release',
    'campaign_payout',
    'campaign_reel_approved',
    'deal_expired_refund',
    'deal_deadline_expired_refund',
    'withdrawal_request',
    'withdrawal_approved'
  ) AND ref_id IS NOT NULL;

-- 20. WALLET TRANSACTIONS (Detailed User & Admin Transaction History)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  escrow_after NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_txns_payment_idempotent
  ON wallet_transactions (reference_type, reference_id)
  WHERE reference_type IN ('payment_order', 'upi_payment') AND reference_id IS NOT NULL;

-- 21. PAYMENT ORDERS (Cashfree Orders)
CREATE TABLE IF NOT EXISTS payment_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  purpose TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  cashfree_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);

-- 22. UPI PAYMENTS (Manual UTR Top-Ups; Canonical Ledger ref_id = String(upi_payments.id))
CREATE TABLE IF NOT EXISTS upi_payments (
  id BIGSERIAL PRIMARY KEY,
  utr TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_upi_payments_status ON upi_payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upi_payments_user_id ON upi_payments (user_id);

-- 23. KYC (Encrypted PAN & Tax Verification)
CREATE TABLE IF NOT EXISTS kyc (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pan_encrypted TEXT NOT NULL,
  pan_masked TEXT NOT NULL,
  full_name_on_pan TEXT NOT NULL DEFAULT '',
  name TEXT,
  dob DATE NOT NULL DEFAULT '2000-01-01',
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc (status);

-- 24. PAYOUT METHODS (Encrypted Bank / UPI Details + Masked Display Fields)
CREATE TABLE IF NOT EXISTS payout_methods (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  account_details_encrypted TEXT NOT NULL DEFAULT '',
  masked_account TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payout_methods_user_id ON payout_methods (user_id);

-- 25. WITHDRAWALS
CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  tds_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payout_method_id BIGINT REFERENCES payout_methods(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  utr TEXT,
  utr_ref TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status, requested_at DESC);

-- 26. PROMO CODES
CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  value NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  discount_value NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 27. PROMO REDEMPTIONS
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id BIGSERIAL PRIMARY KEY,
  promo_code_id BIGINT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_redemptions_code_user_unique UNIQUE (promo_code_id, user_id)
);

-- 28. SUBSCRIPTIONS (Creator Pro)
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'pro_monthly',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  promo_code_id BIGINT REFERENCES promo_codes(id) ON DELETE SET NULL,
  payment_order_id TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires ON subscriptions (status, expires_at);

-- 29. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);

-- 30. SECURITY AUDIT LOGS
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  mingree_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  instagram_username TEXT,
  instagram_user_id TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  followers INTEGER NOT NULL DEFAULT 0,
  media_count INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  ip TEXT,
  user_agent TEXT,
  decision TEXT NOT NULL DEFAULT 'ALLOW',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event ON security_audit_logs (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user ON security_audit_logs (mingree_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_idempotency ON security_audit_logs ((details->>'idempotencyKey')) WHERE details->>'idempotencyKey' IS NOT NULL;

-- 31. CITIES
CREATE TABLE IF NOT EXISTS cities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 32. CITY CHANGE REQUESTS
CREATE TABLE IF NOT EXISTS city_change_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_city TEXT,
  to_city TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_city_change_requests_status ON city_change_requests (status, created_at DESC);

-- 33. ADMIN SETTINGS
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 34. APP CONFIG
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
