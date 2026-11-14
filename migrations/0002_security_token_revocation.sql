-- ============================================================================
-- MINGREE SECURITY TOKEN REVOCATION MIGRATION (0002_security_token_revocation.sql)
-- Additive, idempotent migration compatible with existing production data
-- Safe to run repeatedly; no destructive DROP/DELETE/TRUNCATE statements
-- ============================================================================

-- 1. Session invalidation version counter on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

-- 2. Revoked JWT session JTI blocklist
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
  ON revoked_tokens (expires_at);

-- 3. Single-use JTI replay prevention ledger (OTP tokens, reset tokens, signed bills)
CREATE TABLE IF NOT EXISTS used_jti_tokens (
  jti_key TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'general',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_used_jti_expires
  ON used_jti_tokens (expires_at);
