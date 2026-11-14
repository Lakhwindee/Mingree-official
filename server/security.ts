import crypto from "crypto";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import type { Store, IncrementResponse, Options, ClientRateLimitInfo } from "express-rate-limit";
import { Redis, type Requester } from "@upstash/redis";
import { pool, isDatabaseConfigured, ensureDatabaseSchema } from "./db";

// ============================================================================
// 1. HTML ESCAPING, SAFE REDIRECTS & URL VALIDATION
// ============================================================================

export function escapeHtml(input: unknown): string {
  const str = String(input ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

export function isSafeRelativeRedirect(rawPath: unknown, fallback = "/profile"): string {
  if (typeof rawPath !== "string") return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.length > 512) return fallback;
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) return fallback;
  // Disallow control characters, null bytes, or embedded scheme prefixes
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return fallback;
  try {
    const parsed = new URL(trimmed, "https://mingree.invalid");
    if (parsed.origin !== "https://mingree.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function isSafeAssetUrl(rawUrl: unknown, allowRasterDataUri = true): boolean {
  if (typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2_000_000) return false;
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return false;

  // Allow safe internal relative paths (/uploads/... or /assets/...)
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.includes("..")) return false;
    return true;
  }

  // Allow safe raster data URIs only (NEVER image/svg+xml or text/html)
  if (allowRasterDataUri && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") return true;
    if (
      process.env.NODE_ENV !== "production" &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getCanonicalAppUrl(req?: Request): string {
  const configured = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return parsed.origin;
      }
    } catch {}
  }
  if (process.env.NODE_ENV !== "production" && req) {
    const host = (req.get("host") || "").trim();
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
      return `${req.protocol === "https" ? "https" : "http"}://${host}`;
    }
  }
  return process.env.NODE_ENV === "production" ? "https://mingree.com" : "http://localhost:3000";
}

// ============================================================================
// 2. STRICT EXACT-ORIGIN CORS ALLOWLIST
// ============================================================================

const DEFAULT_ALLOWED_ORIGINS = [
  "https://mingree.com",
  "https://www.mingree.com",
  "https://app.mingree.com",
  "https://mingree.pages.dev",
  "https://shareinair.com",
  "https://www.shareinair.com",
];

function buildAllowedOriginSet(): Set<string> {
  const allowed = new Set<string>(DEFAULT_ALLOWED_ORIGINS);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
    allowed.add("http://localhost:5173");
    allowed.add("http://127.0.0.1:5173");
  }
  const envUrls = [
    process.env.APP_URL,
    process.env.SHARED_APP_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ];
  for (const candidate of envUrls) {
    const trimmed = (candidate || "").trim();
    if (!trimmed) continue;
    try {
      allowed.add(new URL(trimmed).origin);
    } catch {}
  }
  return allowed;
}

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Non-browser / same-origin server-to-server requests have no Origin header
  try {
    const parsedOrigin = new URL(origin).origin;
    const allowedSet = buildAllowedOriginSet();
    if (allowedSet.has(parsedOrigin)) return true;
    // Allow exact Google AI Studio preview origins configured via APP_URL/SHARED_APP_URL only;
    // do not blanket-allow arbitrary external origins or prefix matches like https://mingree.com.evil.com
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// 3. PROTOTYPE POLLUTION SANITIZATION MIDDLEWARE
// ============================================================================

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizePlainObject<T>(val: T, depth = 0): T {
  if (depth > 16 || val === null || val === undefined || typeof val !== "object") {
    return val;
  }
  if (Buffer.isBuffer(val) || val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      val[i] = sanitizePlainObject(val[i], depth + 1);
    }
    return val;
  }
  const obj = val as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete obj[key];
    } else {
      obj[key] = sanitizePlainObject(obj[key], depth + 1);
    }
  }
  return val;
}

export function stripDangerousKeysMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    sanitizePlainObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    sanitizePlainObject(req.query);
  }
  if (req.params && typeof req.params === "object") {
    sanitizePlainObject(req.params);
  }
  next();
}

// ============================================================================
// 4. PHONE NORMALIZATION (E.164)
// ============================================================================

export function normalizePhoneE164(raw: string): string {
  const cleaned = String(raw || "").replace(/[^0-9+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}

// ============================================================================
// 5. SINGLE-USE JTI STORE, SESSION REVOCATION & TOKEN VERSIONING
// ============================================================================

const consumedJtiMap = new Map<string, number>(); // key -> expiresAtMs
const revokedSessionMap = new Map<string, number>(); // jti -> expiresAtMs
const userTokenVersionMap = new Map<number, number>(); // userId -> version
const otpFailedAttemptMap = new Map<string, { count: number; lockedUntil: number; firstAttemptAt: number }>();

function pruneBoundedMap(map: Map<string, number>, maxSize = 5000): void {
  const now = Date.now();
  for (const [k, exp] of map.entries()) {
    if (exp <= now) map.delete(k);
  }
  while (map.size > maxSize) {
    const firstKey = map.keys().next().value;
    if (!firstKey) break;
    map.delete(firstKey);
  }
}

function isStrictDbSecurityStoreRequired(): boolean {
  return process.env.REQUIRE_STRICT_DB_SECURITY_STORE === "true";
}

export async function consumeSingleUseJti(jti: string, namespace: string, ttlMs = 30 * 60 * 1000): Promise<boolean> {
  if (!jti || typeof jti !== "string") return false;
  const scopedKey = `${namespace}:${jti}`;

  if (isDatabaseConfigured || isStrictDbSecurityStoreRequired()) {
    if (!isDatabaseConfigured) {
      throw new SecurityStoreUnavailableError(
        "PostgreSQL database is required in production for single-use JTI enforcement."
      );
    }
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      let res;
      try {
        res = await pool.query(
          `INSERT INTO used_jti_tokens (jti_key, namespace, expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (jti_key) DO NOTHING
           RETURNING jti_key`,
          [scopedKey, namespace, expiresAt]
        );
      } catch (firstErr: any) {
        if (firstErr?.code === "42P01" || firstErr?.code === "42703") {
          await ensureDatabaseSchema(true).catch(() => {});
          res = await pool.query(
            `INSERT INTO used_jti_tokens (jti_key, namespace, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (jti_key) DO NOTHING
             RETURNING jti_key`,
            [scopedKey, namespace, expiresAt]
          );
        } else {
          throw firstErr;
        }
      }
      if (res.rows.length === 0) {
        consumedJtiMap.set(scopedKey, Date.now() + ttlMs);
        return false;
      }
      consumedJtiMap.set(scopedKey, Date.now() + ttlMs);
      return true;
    } catch (err: any) {
      if (err instanceof SecurityStoreUnavailableError) throw err;
      if (isStrictDbSecurityStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `PostgreSQL JTI store unavailable: ${err?.message || "Database query failed"}`
        );
      }
    }
  }

  pruneBoundedMap(consumedJtiMap);
  if (consumedJtiMap.has(scopedKey)) {
    return false;
  }
  consumedJtiMap.set(scopedKey, Date.now() + ttlMs);
  return true;
}

export async function revokeSessionJti(jti: string, expEpochSec?: number): Promise<void> {
  if (!jti || typeof jti !== "string") return;
  const expMs = expEpochSec && expEpochSec * 1000 > Date.now()
    ? expEpochSec * 1000
    : Date.now() + 7 * 24 * 60 * 60 * 1000;

  if (isDatabaseConfigured || isStrictDbSecurityStoreRequired()) {
    if (!isDatabaseConfigured) {
      throw new SecurityStoreUnavailableError(
        "PostgreSQL database is required in production for session revocation."
      );
    }
    try {
      try {
        await pool.query(
          `INSERT INTO revoked_tokens (jti, expires_at)
           VALUES ($1, $2)
           ON CONFLICT (jti) DO NOTHING`,
          [jti, new Date(expMs)]
        );
      } catch (firstErr: any) {
        if (firstErr?.code === "42P01" || firstErr?.code === "42703") {
          await ensureDatabaseSchema(true).catch(() => {});
          await pool.query(
            `INSERT INTO revoked_tokens (jti, expires_at)
             VALUES ($1, $2)
             ON CONFLICT (jti) DO NOTHING`,
            [jti, new Date(expMs)]
          );
        } else {
          throw firstErr;
        }
      }
      pruneBoundedMap(revokedSessionMap);
      revokedSessionMap.set(jti, expMs);
      return;
    } catch (err: any) {
      if (err instanceof SecurityStoreUnavailableError) throw err;
      if (isStrictDbSecurityStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `PostgreSQL session revocation store unavailable: ${err?.message || "Database query failed"}`
        );
      }
    }
  }

  pruneBoundedMap(revokedSessionMap);
  revokedSessionMap.set(jti, expMs);
}

export async function isSessionJtiRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const cachedExp = revokedSessionMap.get(jti);
  if (cachedExp && cachedExp > Date.now()) {
    return true;
  }

  if (isDatabaseConfigured || isStrictDbSecurityStoreRequired()) {
    if (!isDatabaseConfigured) {
      throw new SecurityStoreUnavailableError(
        "PostgreSQL database is required in production for session revocation checks."
      );
    }
    try {
      let res;
      try {
        res = await pool.query(
          `SELECT expires_at FROM revoked_tokens WHERE jti = $1 AND expires_at > now() LIMIT 1`,
          [jti]
        );
      } catch (firstErr: any) {
        if (firstErr?.code === "42P01" || firstErr?.code === "42703") {
          await ensureDatabaseSchema(true).catch(() => {});
          res = await pool.query(
            `SELECT expires_at FROM revoked_tokens WHERE jti = $1 AND expires_at > now() LIMIT 1`,
            [jti]
          );
        } else {
          throw firstErr;
        }
      }
      if (res.rows.length > 0) {
        revokedSessionMap.set(jti, new Date(res.rows[0].expires_at).getTime());
        return true;
      }
      return false;
    } catch (err: any) {
      if (err instanceof SecurityStoreUnavailableError) throw err;
      if (isStrictDbSecurityStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `PostgreSQL session revocation check failed: ${err?.message || "Database query failed"}`
        );
      }
      return false;
    }
  }

  return false;
}

export async function getUserTokenVersion(userId: number, memoryHint?: number): Promise<number> {
  if (isDatabaseConfigured || isStrictDbSecurityStoreRequired()) {
    if (!isDatabaseConfigured) {
      throw new SecurityStoreUnavailableError(
        "PostgreSQL database is required in production for token version verification."
      );
    }
    try {
      let res;
      try {
        res = await pool.query(`SELECT token_version FROM users WHERE id = $1`, [userId]);
      } catch (firstErr: any) {
        if (firstErr?.code === "42703" || firstErr?.code === "42P01") {
          await ensureDatabaseSchema(true).catch(() => {});
          res = await pool.query(`SELECT token_version FROM users WHERE id = $1`, [userId]);
        } else {
          throw firstErr;
        }
      }
      if (res.rows.length === 0) {
        return Number.MAX_SAFE_INTEGER;
      }
      const dbVersion = Math.max(1, Number(res.rows[0].token_version || 1));
      userTokenVersionMap.set(userId, dbVersion);
      return dbVersion;
    } catch (err: any) {
      if (err instanceof SecurityStoreUnavailableError) throw err;
      if (isStrictDbSecurityStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `PostgreSQL token version check failed: ${err?.message || "Database query failed"}`
        );
      }
    }
  }

  return Math.max(1, Number(userTokenVersionMap.get(userId) || memoryHint || 1));
}

export async function bumpUserTokenVersion(userId: number): Promise<number> {
  if (isDatabaseConfigured || isStrictDbSecurityStoreRequired()) {
    if (!isDatabaseConfigured) {
      throw new SecurityStoreUnavailableError(
        "PostgreSQL database is required in production for token version rotation."
      );
    }
    try {
      let res;
      try {
        res = await pool.query(
          `UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1 RETURNING token_version`,
          [userId]
        );
      } catch (firstErr: any) {
        if (firstErr?.code === "42703" || firstErr?.code === "42P01") {
          await ensureDatabaseSchema(true).catch(() => {});
          res = await pool.query(
            `UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1 RETURNING token_version`,
            [userId]
          );
        } else {
          throw firstErr;
        }
      }
      if (res.rows.length === 0) {
        throw new Error(`User #${userId} not found in database during token version bump`);
      }
      const nextVersion = Math.max(2, Number(res.rows[0].token_version));
      userTokenVersionMap.set(userId, nextVersion);
      return nextVersion;
    } catch (err: any) {
      if (err instanceof SecurityStoreUnavailableError) throw err;
      if (isStrictDbSecurityStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `PostgreSQL token version rotation failed: ${err?.message || "Database query failed"}`
        );
      }
    }
  }

  const nextVersion = (userTokenVersionMap.get(userId) || 1) + 1;
  userTokenVersionMap.set(userId, nextVersion);
  return nextVersion;
}

// ============================================================================
// 6. DISTRIBUTED RATE LIMITING & OTP BRUTE-FORCE LOCKOUT (UPSTASH REDIS)
// ============================================================================

export class SecurityStoreUnavailableError extends Error {
  statusCode = 503;
  constructor(message = "Distributed security rate-limit store is unavailable. Request blocked for safety.") {
    super(message);
    this.name = "SecurityStoreUnavailableError";
  }
}

let cachedRedisConfigKey = "";
let cachedRedisClient: Redis | null = null;
let testRedisRequester: Requester | null = null;

export function setSecurityRedisRequesterForTest(requester: Requester | null): void {
  testRedisRequester = requester;
  cachedRedisClient = null;
  cachedRedisConfigKey = "";
}

function isDistributedStoreRequired(): boolean {
  return process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === "true";
}

function getUpstashRedisCredentials(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && (process.env.NODE_ENV === "production" || parsed.protocol !== "http:")) {
      return null;
    }
    return { url, token };
  } catch {
    return null;
  }
}

export function resolveSecurityRedisClient(): Redis | null {
  const creds = getUpstashRedisCredentials();
  if (!creds) {
    if (isDistributedStoreRequired()) {
      throw new SecurityStoreUnavailableError(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production for shared rate limiting and OTP lockout."
      );
    }
    return null;
  }
  if (testRedisRequester) {
    return new Redis(testRedisRequester);
  }
  const cacheKey = `${creds.url}::${creds.token}`;
  if (!cachedRedisClient || cachedRedisConfigKey !== cacheKey) {
    cachedRedisConfigKey = cacheKey;
    cachedRedisClient = new Redis({
      url: creds.url,
      token: creds.token,
      retry: { retries: 0 },
    });
  }
  return cachedRedisClient;
}

const RATE_LIMIT_INCR_LUA = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if tonumber(current) == 1 or tonumber(ttl) < 0 then
  redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

export class DistributedRateLimitStore implements Store {
  windowMs = 60_000;
  localKeys = false;
  prefix: string;
  private localFallback = new Map<string, { totalHits: number; resetTimeMs: number }>();

  constructor(prefix = "mingree:rl:") {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private getScopedKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private pruneLocalFallback(): void {
    const now = Date.now();
    for (const [k, v] of this.localFallback.entries()) {
      if (v.resetTimeMs <= now) this.localFallback.delete(k);
    }
    while (this.localFallback.size > 10_000) {
      const oldest = this.localFallback.keys().next().value;
      if (!oldest) break;
      this.localFallback.delete(oldest);
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const redis = resolveSecurityRedisClient();
    const fullKey = this.getScopedKey(key);
    if (!redis) {
      const entry = this.localFallback.get(fullKey);
      if (!entry || entry.resetTimeMs <= Date.now()) return undefined;
      return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTimeMs) };
    }
    try {
      const [hitsRaw, ttlRaw] = await Promise.all([
        redis.get<number>(fullKey),
        redis.pttl(fullKey),
      ]);
      if (hitsRaw === null || hitsRaw === undefined) return undefined;
      const ttlMs = typeof ttlRaw === "number" && ttlRaw > 0 ? ttlRaw : this.windowMs;
      return {
        totalHits: Number(hitsRaw) || 0,
        resetTime: new Date(Date.now() + ttlMs),
      };
    } catch (err: any) {
      if (isDistributedStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `Shared rate-limit store error: ${err?.message || "Redis unreachable"}`
        );
      }
      const entry = this.localFallback.get(fullKey);
      if (!entry || entry.resetTimeMs <= Date.now()) return undefined;
      return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTimeMs) };
    }
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redis = resolveSecurityRedisClient();
    const fullKey = this.getScopedKey(key);
    const incrementLocal = (): IncrementResponse => {
      this.pruneLocalFallback();
      const now = Date.now();
      const existing = this.localFallback.get(fullKey);
      if (!existing || existing.resetTimeMs <= now) {
        const next = { totalHits: 1, resetTimeMs: now + this.windowMs };
        this.localFallback.set(fullKey, next);
        return { totalHits: next.totalHits, resetTime: new Date(next.resetTimeMs) };
      }
      existing.totalHits += 1;
      return { totalHits: existing.totalHits, resetTime: new Date(existing.resetTimeMs) };
    };

    if (!redis) {
      return incrementLocal();
    }

    try {
      const res = (await redis.eval(RATE_LIMIT_INCR_LUA, [fullKey], [this.windowMs])) as [number, number] | number[];
      const totalHits = Array.isArray(res) ? Number(res[0]) || 1 : 1;
      const ttlMs = Array.isArray(res) && Number(res[1]) > 0 ? Number(res[1]) : this.windowMs;
      return {
        totalHits,
        resetTime: new Date(Date.now() + ttlMs),
      };
    } catch (err: any) {
      if (isDistributedStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `Shared rate-limit store unavailable: ${err?.message || "Redis request failed"}`
        );
      }
      return incrementLocal();
    }
  }

  async decrement(key: string): Promise<void> {
    const redis = resolveSecurityRedisClient();
    const fullKey = this.getScopedKey(key);
    if (!redis) {
      const existing = this.localFallback.get(fullKey);
      if (existing && existing.totalHits > 0) existing.totalHits -= 1;
      return;
    }
    try {
      const next = await redis.decr(fullKey);
      if (next <= 0) {
        await redis.del(fullKey);
      }
    } catch (err: any) {
      if (isDistributedStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `Shared rate-limit store error during decrement: ${err?.message || "Redis error"}`
        );
      }
      const existing = this.localFallback.get(fullKey);
      if (existing && existing.totalHits > 0) existing.totalHits -= 1;
    }
  }

  async resetKey(key: string): Promise<void> {
    const redis = resolveSecurityRedisClient();
    const fullKey = this.getScopedKey(key);
    if (!redis) {
      this.localFallback.delete(fullKey);
      return;
    }
    try {
      await redis.del(fullKey);
    } catch (err: any) {
      if (isDistributedStoreRequired()) {
        throw new SecurityStoreUnavailableError(
          `Shared rate-limit store error during resetKey: ${err?.message || "Redis error"}`
        );
      }
      this.localFallback.delete(fullKey);
    }
  }
}

const OTP_FAIL_RECORD_LUA = `
local count = tonumber(redis.call("INCR", KEYS[1]))
local ttl = tonumber(redis.call("PTTL", KEYS[1]))
if count == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[2]))
end
if count >= tonumber(ARGV[1]) then
  redis.call("SET", KEYS[2], "1", "PX", tonumber(ARGV[2]))
  return {1, 0, count}
end
return {0, tonumber(ARGV[1]) - count, count}
`;

export async function checkOtpAttemptLock(key: string): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const checkLocal = (): { allowed: boolean; retryAfterSec: number } => {
    const now = Date.now();
    const entry = otpFailedAttemptMap.get(key);
    if (!entry) return { allowed: true, retryAfterSec: 0 };
    if (entry.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    if (now - entry.firstAttemptAt > 15 * 60 * 1000) {
      otpFailedAttemptMap.delete(key);
    }
    return { allowed: true, retryAfterSec: 0 };
  };

  const redis = resolveSecurityRedisClient();
  if (!redis) {
    return checkLocal();
  }

  try {
    const lockKey = `mingree:otp:lock:${key}`;
    const ttlMs = await redis.pttl(lockKey);
    if (typeof ttlMs === "number" && ttlMs > 0) {
      return { allowed: false, retryAfterSec: Math.ceil(ttlMs / 1000) };
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch (err: any) {
    if (isDistributedStoreRequired()) {
      throw new SecurityStoreUnavailableError(
        `Shared OTP lockout store error: ${err?.message || "Redis unreachable"}`
      );
    }
    return checkLocal();
  }
}

export async function recordOtpFailedAttempt(
  key: string,
  maxAttempts = 5,
  lockDurationMs = 15 * 60 * 1000
): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const recordLocal = (): { locked: boolean; attemptsRemaining: number } => {
    const now = Date.now();
    const existing = otpFailedAttemptMap.get(key);
    if (!existing || now - existing.firstAttemptAt > 15 * 60 * 1000) {
      const lockedImmediately = maxAttempts <= 1;
      otpFailedAttemptMap.set(key, {
        count: 1,
        lockedUntil: lockedImmediately ? now + lockDurationMs : 0,
        firstAttemptAt: now,
      });
      return { locked: lockedImmediately, attemptsRemaining: Math.max(0, maxAttempts - 1) };
    }
    existing.count += 1;
    if (existing.count >= maxAttempts) {
      existing.lockedUntil = now + lockDurationMs;
      return { locked: true, attemptsRemaining: 0 };
    }
    return { locked: false, attemptsRemaining: maxAttempts - existing.count };
  };

  const redis = resolveSecurityRedisClient();
  if (!redis) {
    return recordLocal();
  }

  try {
    const failKey = `mingree:otp:fail:${key}`;
    const lockKey = `mingree:otp:lock:${key}`;
    const res = (await redis.eval(
      OTP_FAIL_RECORD_LUA,
      [failKey, lockKey],
      [maxAttempts, lockDurationMs]
    )) as [number, number, number] | number[];
    const locked = Number(res?.[0]) === 1;
    const remaining = Math.max(0, Number(res?.[1] ?? 0));
    return { locked, attemptsRemaining: remaining };
  } catch (err: any) {
    if (isDistributedStoreRequired()) {
      throw new SecurityStoreUnavailableError(
        `Shared OTP lockout store error: ${err?.message || "Redis unreachable"}`
      );
    }
    return recordLocal();
  }
}

export async function clearOtpAttempts(key: string): Promise<void> {
  const redis = resolveSecurityRedisClient();
  if (!redis) {
    otpFailedAttemptMap.delete(key);
    return;
  }
  try {
    await redis.del(`mingree:otp:fail:${key}`, `mingree:otp:lock:${key}`);
  } catch (err: any) {
    if (isDistributedStoreRequired()) {
      throw new SecurityStoreUnavailableError(
        `Shared OTP lockout store error during clear: ${err?.message || "Redis unreachable"}`
      );
    }
    otpFailedAttemptMap.delete(key);
  }
}

// ============================================================================
// 7. SIGNED CREATOR BILL TOKENS (HMAC + SINGLE-USE + SPONSOR BINDING)
// ============================================================================

export interface SignedBillPayload {
  jti: string;
  sponsorId: number;
  selectedCreatorIds: number[];
  deliverablesByCreator?: Record<string, string[]>;
  deliverable?: string;
  creatorDeliverables?: Record<string, string> | null;
  customRates?: Record<string, number> | null;
  subtotal: number;
  platformFee: number;
  gstAmount: number;
  total: number;
  exp: number;
}

export function createSignedBillToken(
  payload: Omit<SignedBillPayload, "jti" | "exp">,
  hmacSecret: string
): string {
  const fullPayload: SignedBillPayload = {
    ...payload,
    jti: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + 30 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = crypto.createHmac("sha256", hmacSecret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function verifyAndConsumeBillToken(
  billId: string,
  expectedSponsorId: number,
  hmacSecret: string
): Promise<SignedBillPayload> {
  if (!billId || typeof billId !== "string" || !billId.includes(".")) {
    throw new Error("Invalid or unsigned billing token");
  }
  const parts = billId.split(".");
  if (parts.length !== 2) {
    throw new Error("Malformed billing token");
  }
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", hmacSecret).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid billing token signature");
  }
  let parsed: SignedBillPayload;
  try {
    parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    throw new Error("Corrupted billing token payload");
  }
  if (!parsed || typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    throw new Error("Billing summary expired. Please generate a fresh quote.");
  }
  if (Number(parsed.sponsorId) !== Number(expectedSponsorId)) {
    throw new Error("Billing summary does not belong to the authenticated brand account");
  }
  if (!parsed.jti || !(await consumeSingleUseJti(parsed.jti, "bill_token", 35 * 60 * 1000))) {
    throw new Error("Billing summary has already been used");
  }
  return parsed;
}

export function verifyMetaSignedRequest(signedRequest: string, appSecret: string): Record<string, any> | null {
  if (!signedRequest || !appSecret || typeof signedRequest !== "string") return null;
  const parts = signedRequest.split(".", 2);
  if (parts.length !== 2) return null;
  const [encodedSig, payload] = parts;
  try {
    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
      return null;
    }
    const jsonStr = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const parsed = JSON.parse(jsonStr);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// ============================================================================
// 8. FILE UPLOAD MAGIC-BYTE VALIDATION & PATH SAFETY
// ============================================================================

export interface MagicByteValidationResult {
  valid: boolean;
  detectedMime: string;
  safeExtension: string;
  safeFilename: string;
  reason?: string;
}

function hasPrefix(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function hasAscii(buf: Buffer, text: string, offset = 0): boolean {
  if (buf.length < offset + text.length) return false;
  return buf.subarray(offset, offset + text.length).toString("ascii") === text;
}

export function validateUploadedFileMagicBytes(
  buffer: Buffer,
  declaredMime: string,
  originalName: string
): MagicByteValidationResult {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { valid: false, detectedMime: "", safeExtension: "", safeFilename: "", reason: "Empty file buffer" };
  }

  // Reject dangerous script/markup signatures anywhere in the leading header chunk
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").trimStart().toLowerCase();
  if (
    headerSlice.startsWith("<!doctype") ||
    headerSlice.startsWith("<html") ||
    headerSlice.startsWith("<svg") ||
    headerSlice.startsWith("<script") ||
    headerSlice.startsWith("<?xml") ||
    headerSlice.startsWith("<?php") ||
    headerSlice.startsWith("#!")
  ) {
    return { valid: false, detectedMime: "", safeExtension: "", safeFilename: "", reason: "Executable, SVG, or HTML markup files are strictly prohibited" };
  }
  // Reject PE (MZ) or ELF binaries
  if (hasPrefix(buffer, [0x4d, 0x5a]) || hasPrefix(buffer, [0x7f, 0x45, 0x4c, 0x46])) {
    return { valid: false, detectedMime: "", safeExtension: "", safeFilename: "", reason: "Executable binary files are prohibited" };
  }

  const baseName = path.basename(String(originalName || "file")).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "upload";
  const cleanStem = path.basename(baseName, path.extname(baseName)).replace(/[^a-zA-Z0-9_-]/g, "_") || "file";

  // Detect magic bytes strictly
  // JPEG: FF D8 FF
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) {
    return { valid: true, detectedMime: "image/jpeg", safeExtension: ".jpg", safeFilename: `${cleanStem}.jpg` };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { valid: true, detectedMime: "image/png", safeExtension: ".png", safeFilename: `${cleanStem}.png` };
  }
  // GIF: GIF87a or GIF89a
  if (hasAscii(buffer, "GIF87a") || hasAscii(buffer, "GIF89a")) {
    return { valid: true, detectedMime: "image/gif", safeExtension: ".gif", safeFilename: `${cleanStem}.gif` };
  }
  // WEBP: RIFF....WEBP
  if (hasAscii(buffer, "RIFF", 0) && hasAscii(buffer, "WEBP", 8)) {
    return { valid: true, detectedMime: "image/webp", safeExtension: ".webp", safeFilename: `${cleanStem}.webp` };
  }
  // PDF: %PDF-
  if (hasAscii(buffer, "%PDF-", 0)) {
    return { valid: true, detectedMime: "application/pdf", safeExtension: ".pdf", safeFilename: `${cleanStem}.pdf` };
  }
  // WAV: RIFF....WAVE
  if (hasAscii(buffer, "RIFF", 0) && hasAscii(buffer, "WAVE", 8)) {
    return { valid: true, detectedMime: "audio/wav", safeExtension: ".wav", safeFilename: `${cleanStem}.wav` };
  }
  // WEBM / Matroska: 1A 45 DF A3
  if (hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    const isAudio = String(declaredMime || "").toLowerCase().startsWith("audio/");
    return {
      valid: true,
      detectedMime: isAudio ? "audio/webm" : "video/webm",
      safeExtension: ".webm",
      safeFilename: `${cleanStem}.webm`,
    };
  }
  // ISO BMFF (MP4 / MOV / M4A): ....ftyp
  if (buffer.length >= 12 && hasAscii(buffer, "ftyp", 4)) {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "M4A " || String(declaredMime || "").toLowerCase().startsWith("audio/")) {
      return { valid: true, detectedMime: "audio/mp4", safeExtension: ".m4a", safeFilename: `${cleanStem}.m4a` };
    }
    if (brand === "qt  ") {
      return { valid: true, detectedMime: "video/quicktime", safeExtension: ".mov", safeFilename: `${cleanStem}.mov` };
    }
    return { valid: true, detectedMime: "video/mp4", safeExtension: ".mp4", safeFilename: `${cleanStem}.mp4` };
  }
  // MP3: ID3 tag or MPEG frame sync FF FB / FF F3 / FF F2
  if (
    hasAscii(buffer, "ID3", 0) ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3 || buffer[1] === 0xf2))
  ) {
    return { valid: true, detectedMime: "audio/mpeg", safeExtension: ".mp3", safeFilename: `${cleanStem}.mp3` };
  }

  return {
    valid: false,
    detectedMime: "",
    safeExtension: "",
    safeFilename: "",
    reason: "Unsupported or unrecognized file signature. Allowed formats: JPG, PNG, GIF, WEBP, MP4, MOV, WEBM, MP3, WAV, M4A, PDF.",
  };
}
