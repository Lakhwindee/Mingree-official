import crypto from "crypto";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import { pool, isDatabaseConfigured } from "./db";

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
// 4. PHONE NORMALIZATION & FIREBASE ID TOKEN VERIFICATION
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

let cachedFirebaseCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function fetchFirebasePublicCerts(): Promise<Record<string, string>> {
  const testPubKey = (process.env.FIREBASE_TEST_PUBLIC_KEY || "").trim();
  const testKid = (process.env.FIREBASE_TEST_KID || "test-kid").trim();
  if (testPubKey && process.env.NODE_ENV !== "production") {
    return { [testKid]: testPubKey };
  }

  const now = Date.now();
  if (cachedFirebaseCerts && cachedFirebaseCerts.expiresAt > now) {
    return cachedFirebaseCerts.certs;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
      { signal: controller.signal }
    );
    if (!resp.ok) {
      throw new Error(`Failed to fetch Google Firebase certificates (${resp.status})`);
    }
    const cacheControl = resp.headers.get("cache-control") || "";
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeMs = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) * 1000 : 3600 * 1000;
    const certs = (await resp.json()) as Record<string, string>;
    if (!certs || typeof certs !== "object") {
      throw new Error("Invalid certificate payload from Google");
    }
    // Merge test key if non-production test harness injects one alongside certs
    if (testPubKey && process.env.NODE_ENV !== "production") {
      certs[testKid] = testPubKey;
    }
    cachedFirebaseCerts = { certs, expiresAt: now + maxAgeMs };
    return certs;
  } finally {
    clearTimeout(timeout);
  }
}

export interface VerifiedFirebaseToken {
  uid: string;
  phoneNumber: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

export async function verifyFirebasePhoneIdToken(
  idToken: string,
  expectedProjectId: string
): Promise<VerifiedFirebaseToken> {
  if (!idToken || typeof idToken !== "string" || idToken.length > 8192) {
    throw new Error("Missing or malformed Firebase ID token");
  }
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed Firebase ID token structure");
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid Firebase ID token encoding");
  }

  if (!header || header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new Error("Invalid Firebase ID token algorithm or key ID");
  }

  const certs = await fetchFirebasePublicCerts();
  let certPem = certs[header.kid];
  if (!certPem) {
    // Cache miss or key rotation — force refresh once
    cachedFirebaseCerts = null;
    const refreshed = await fetchFirebasePublicCerts();
    certPem = refreshed[header.kid];
  }
  if (!certPem) {
    throw new Error("Firebase ID token signed by unknown key");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signatureBuf = Buffer.from(signatureB64, "base64url");
  const isSignatureValid = verifier.verify(certPem, signatureBuf);
  if (!isSignatureValid) {
    throw new Error("Firebase ID token signature verification failed");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Firebase ID token has expired");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 30) {
    throw new Error("Firebase ID token issued-at timestamp is invalid");
  }
  if (typeof payload.auth_time === "number" && payload.auth_time > nowSec + 30) {
    throw new Error("Firebase ID token auth_time is in the future");
  }
  if (payload.aud !== expectedProjectId) {
    throw new Error("Firebase ID token audience mismatch");
  }
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error("Firebase ID token issuer mismatch");
  }
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128) {
    throw new Error("Firebase ID token subject is missing or invalid");
  }
  const phone = normalizePhoneE164(String(payload.phone_number || ""));
  if (!phone || phone.length < 8) {
    throw new Error("Firebase ID token does not contain a verified phone number");
  }

  return {
    uid: payload.sub,
    phoneNumber: phone,
    iss: payload.iss,
    aud: payload.aud,
    exp: payload.exp,
    iat: payload.iat,
  };
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

export async function consumeSingleUseJti(jti: string, namespace: string, ttlMs = 30 * 60 * 1000): Promise<boolean> {
  if (!jti || typeof jti !== "string") return false;
  const scopedKey = `${namespace}:${jti}`;
  pruneBoundedMap(consumedJtiMap);
  if (consumedJtiMap.has(scopedKey)) {
    return false;
  }

  if (isDatabaseConfigured) {
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      const res = await pool.query(
        `INSERT INTO used_jti_tokens (jti_key, namespace, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (jti_key) DO NOTHING
         RETURNING jti_key`,
        [scopedKey, namespace, expiresAt]
      );
      if (res.rows.length === 0) {
        consumedJtiMap.set(scopedKey, Date.now() + ttlMs);
        return false;
      }
    } catch {
      // Fall back safely to in-memory tracking if transient DB error occurs
    }
  }

  consumedJtiMap.set(scopedKey, Date.now() + ttlMs);
  return true;
}

export async function revokeSessionJti(jti: string, expEpochSec?: number): Promise<void> {
  if (!jti || typeof jti !== "string") return;
  pruneBoundedMap(revokedSessionMap);
  const expMs = expEpochSec && expEpochSec * 1000 > Date.now()
    ? expEpochSec * 1000
    : Date.now() + 7 * 24 * 60 * 60 * 1000;
  revokedSessionMap.set(jti, expMs);

  if (isDatabaseConfigured) {
    try {
      await pool.query(
        `INSERT INTO revoked_tokens (jti, expires_at)
         VALUES ($1, $2)
         ON CONFLICT (jti) DO NOTHING`,
        [jti, new Date(expMs)]
      );
    } catch {}
  }
}

export async function isSessionJtiRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const cachedExp = revokedSessionMap.get(jti);
  if (cachedExp && cachedExp > Date.now()) {
    return true;
  }
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(
        `SELECT expires_at FROM revoked_tokens WHERE jti = $1 AND expires_at > now() LIMIT 1`,
        [jti]
      );
      if (res.rows.length > 0) {
        revokedSessionMap.set(jti, new Date(res.rows[0].expires_at).getTime());
        return true;
      }
    } catch {}
  }
  return false;
}

export async function getUserTokenVersion(userId: number, memoryHint?: number): Promise<number> {
  let version = Math.max(1, Number(userTokenVersionMap.get(userId) || memoryHint || 1));
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(`SELECT token_version FROM users WHERE id = $1`, [userId]);
      if (res.rows.length > 0 && res.rows[0].token_version) {
        version = Math.max(version, Number(res.rows[0].token_version));
        userTokenVersionMap.set(userId, version);
      }
    } catch {}
  }
  return version;
}

export async function bumpUserTokenVersion(userId: number): Promise<number> {
  let nextVersion = (userTokenVersionMap.get(userId) || 1) + 1;
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(
        `UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1 RETURNING token_version`,
        [userId]
      );
      if (res.rows.length > 0 && res.rows[0].token_version) {
        nextVersion = Math.max(nextVersion, Number(res.rows[0].token_version));
      }
    } catch {}
  }
  userTokenVersionMap.set(userId, nextVersion);
  return nextVersion;
}

// ============================================================================
// 6. OTP BRUTE-FORCE & LOCKOUT TRACKING
// ============================================================================

export function checkOtpAttemptLock(key: string): { allowed: boolean; retryAfterSec: number } {
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
}

export function recordOtpFailedAttempt(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000): { locked: boolean; attemptsRemaining: number } {
  const now = Date.now();
  const existing = otpFailedAttemptMap.get(key);
  if (!existing || now - existing.firstAttemptAt > 15 * 60 * 1000) {
    otpFailedAttemptMap.set(key, { count: 1, lockedUntil: 0, firstAttemptAt: now });
    return { locked: false, attemptsRemaining: maxAttempts - 1 };
  }
  existing.count += 1;
  if (existing.count >= maxAttempts) {
    existing.lockedUntil = now + lockDurationMs;
    return { locked: true, attemptsRemaining: 0 };
  }
  return { locked: false, attemptsRemaining: maxAttempts - existing.count };
}

export function clearOtpAttempts(key: string): void {
  otpFailedAttemptMap.delete(key);
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
