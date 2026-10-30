import fs from "fs";
import path from "path";
import { pool } from "./db";

export interface InstagramIdentityRecord {
  instagramUserId: string;
  instagramUsername: string;
  boundMingreeUserId: number;
  firstBoundAt: string;
  lastBoundAt: string;
  lastFollowersCount: number;
  lastMediaCount: number;
  isLocked: boolean;
  lockoutUntil: number | null;
  lockoutReason: string | null;
  historicalMingreeUserIds: number[];
  linkCount: number;
  disconnectCount: number;
  lastDisconnectedAt: string | null;
  suspiciousFlags: string[];
  lastRiskScore: number;
}

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  event:
    | "LINK_APPROVED"
    | "LINK_REJECTED_DUPLICATE"
    | "LINK_REJECTED_UNAUTHORIZED_RECLAIM"
    | "LINK_REJECTED_BOT_RISK"
    | "LINK_REJECTED_RATE_LIMIT"
    | "LINK_REJECTED_COOLDOWN"
    | "LINK_REJECTED_MIN_FOLLOWERS"
    | "DISCONNECT_RECORDED"
    | "ADMIN_IDENTITY_UNLOCKED"
    | "ADMIN_IDENTITY_TRANSFERRED";
  mingreeUserId: number;
  instagramUsername: string;
  instagramUserId?: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFactors: string[];
  followers: number;
  mediaCount: number;
  ipAddress: string;
  userAgent: string;
  decision: "ALLOW" | "BLOCK" | "MONITOR";
  details: string;
}

interface RateLimitBucket {
  attempts: number[];
  failedAttempts: number[];
  lockoutUntil: number;
}

const IDENTITIES_FILE = path.join(process.cwd(), "instagram_identities.json");
const AUDIT_LOGS_FILE = path.join(process.cwd(), "security_audit_logs.json");

// In-memory rate limiting map (IP / UserId -> Bucket)
const rateLimitMap = new Map<string, RateLimitBucket>();

// Helper to load identities
function loadIdentities(): Record<string, InstagramIdentityRecord> {
  try {
    if (fs.existsSync(IDENTITIES_FILE)) {
      return JSON.parse(fs.readFileSync(IDENTITIES_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[SECURITY] Failed to read identities file:", err);
  }
  return {};
}

// Helper to save identities
function saveIdentities(identities: Record<string, InstagramIdentityRecord>) {
  try {
    fs.writeFileSync(IDENTITIES_FILE, JSON.stringify(identities, null, 2), "utf-8");
  } catch (err: any) {
    // On read-only filesystems (e.g., Vercel Serverless), ignore filesystem write errors
    if (err?.code !== "EROFS") {
      console.warn("[SECURITY] Ignored file write error in serverless environment:", err?.message || err);
    }
  }
}

// Helper to load audit logs
function loadAuditLogs(): SecurityAuditEvent[] {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[SECURITY] Failed to read audit logs file:", err);
  }
  return [];
}

// Helper to save audit logs
function saveAuditLogs(logs: SecurityAuditEvent[]) {
  try {
    // Keep last 1000 logs
    const trimmed = logs.slice(0, 1000);
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (err: any) {
    // On read-only filesystems (e.g., Vercel Serverless), ignore filesystem write errors
    if (err?.code !== "EROFS") {
      console.warn("[SECURITY] Ignored file write error in serverless environment:", err?.message || err);
    }
  }
}

// 1. Rate Limiting & Account Farming Protection
export function checkRateLimitAndFarming(
  ip: string,
  userId: number
): { allowed: boolean; reason?: string; retryAfterSeconds?: number } {
  const now = Date.now();
  const keys = [`ip:${ip || "unknown"}`, `user:${userId}`];

  for (const key of keys) {
    let bucket = rateLimitMap.get(key);
    if (!bucket) {
      bucket = { attempts: [], failedAttempts: [], lockoutUntil: 0 };
      rateLimitMap.set(key, bucket);
    }

    // Check if active lockout exists
    if (bucket.lockoutUntil > now) {
      const remainingSecs = Math.ceil((bucket.lockoutUntil - now) / 1000);
      return {
        allowed: false,
        reason: `Too many connection attempts or suspicious activity detected. Temporary lockout in effect. Please try again in ${remainingSecs} seconds.`,
        retryAfterSeconds: remainingSecs,
      };
    }

    // Filter attempts to last 15 minutes (900,000 ms)
    const windowMs = 15 * 60 * 1000;
    bucket.attempts = bucket.attempts.filter((t) => now - t < windowMs);
    bucket.failedAttempts = bucket.failedAttempts.filter((t) => now - t < windowMs);

    // Rate Limit: Max 6 connect attempts per 15 minutes
    if (bucket.attempts.length >= 6) {
      bucket.lockoutUntil = now + 15 * 60 * 1000; // 15 min penalty lockout
      return {
        allowed: false,
        reason: "Instagram connection rate limit exceeded (max 6 attempts per 15 minutes). Anti-farming lockout triggered for 15 minutes.",
        retryAfterSeconds: 900,
      };
    }

    // Record this attempt
    bucket.attempts.push(now);
  }

  return { allowed: true };
}

// Record a failed attempt to penalize automated brute force / farming
export function recordFailedAttempt(ip: string, userId: number) {
  const now = Date.now();
  const keys = [`ip:${ip || "unknown"}`, `user:${userId}`];

  for (const key of keys) {
    let bucket = rateLimitMap.get(key);
    if (!bucket) {
      bucket = { attempts: [now], failedAttempts: [now], lockoutUntil: 0 };
      rateLimitMap.set(key, bucket);
    } else {
      bucket.failedAttempts.push(now);
      // If 3 consecutive failures occur, apply 10 minute lockout
      if (bucket.failedAttempts.length >= 3) {
        bucket.lockoutUntil = now + 10 * 60 * 1000;
      }
    }
  }
}

// 2. One-to-One Binding & Reclaim Protection
export async function checkIdentityBindingDb(
  client: any,
  instagramUserId: string,
  instagramUsername: string,
  mingreeUserId: number
): Promise<{ allowed: boolean; reason?: string; isDuplicate?: boolean; isCooldown?: boolean; remainingSecs?: number }> {
  // 1. Check if instagram_user_id is currently linked to an ACTIVE creator_profile of another user
  const dupCp = await client.query(
    `SELECT cp.user_id, cp.username, cp.status, u.email 
     FROM creator_profiles cp
     LEFT JOIN users u ON u.id = cp.user_id
     WHERE cp.instagram_user_id = $1 AND cp.user_id != $2 AND cp.status = 'active' AND cp.access_token_enc IS NOT NULL`,
    [instagramUserId, mingreeUserId]
  );

  if (dupCp.rows.length > 0) {
    // Check if the old user ID shares the same email address as the authenticating user (e.g. account recreated or reset)
    const currentUserRes = await client.query(`SELECT email FROM users WHERE id = $1`, [mingreeUserId]);
    const currentEmail = currentUserRes.rows[0]?.email?.toLowerCase()?.trim();
    const oldEmail = dupCp.rows[0]?.email?.toLowerCase()?.trim();

    if (currentEmail && oldEmail && currentEmail === oldEmail) {
      // Same owner! Unbind from old user ID so new user ID can take over seamlessly
      const oldUserId = dupCp.rows[0].user_id;
      console.log(`[SECURITY] Auto-rebinding Instagram @${instagramUsername} from old User #${oldUserId} to new User #${mingreeUserId} (same email: ${currentEmail})`);
      await client.query(
        `UPDATE creator_profiles SET instagram_user_id = NULL, access_token_enc = NULL, status = 'pending' WHERE user_id = $1`,
        [oldUserId]
      );
      await client.query(
        `UPDATE instagram_identities SET current_user_id = NULL WHERE instagram_user_id = $1`,
        [instagramUserId]
      );
    } else {
      return {
        allowed: false,
        isDuplicate: true,
        reason: "This Instagram account is already linked to another active Mingree account.",
      };
    }
  }

  // 2. Check instagram_identities table for current user binding and cooldown
  const identityRes = await client.query(
    `SELECT current_user_id, username, unlinked_at, EXTRACT(EPOCH FROM (now() - unlinked_at)) AS elapsed_seconds
     FROM instagram_identities
     WHERE instagram_user_id = $1`,
    [instagramUserId]
  );

  if (identityRes.rows.length > 0) {
    const row = identityRes.rows[0];
    if (row.current_user_id && Number(row.current_user_id) !== mingreeUserId) {
      const activeCheck = await client.query(
        `SELECT u.email, cp.status, cp.access_token_enc
         FROM users u
         LEFT JOIN creator_profiles cp ON cp.user_id = u.id
         WHERE u.id = $1`,
        [row.current_user_id]
      );
      if (activeCheck.rows.length > 0) {
        const currentUserEmail = activeCheck.rows[0].email?.toLowerCase()?.trim();
        const newUserRes = await client.query(`SELECT email FROM users WHERE id = $1`, [mingreeUserId]);
        const newUserEmail = newUserRes.rows[0]?.email?.toLowerCase()?.trim();

        if (currentUserEmail && newUserEmail && currentUserEmail === newUserEmail) {
          // Same email owner - unbind old user ID
          await client.query(`UPDATE instagram_identities SET current_user_id = NULL WHERE instagram_user_id = $1`, [instagramUserId]);
        } else if (activeCheck.rows[0].status === 'active' && activeCheck.rows[0].access_token_enc) {
          return {
            allowed: false,
            isDuplicate: true,
            reason: "This Instagram account is already linked to another active Mingree account.",
          };
        } else {
          // Old user is unlinked/inactive - clear current_user_id
          await client.query(`UPDATE instagram_identities SET current_user_id = NULL WHERE instagram_user_id = $1`, [instagramUserId]);
        }
      }
    }

    if (row.unlinked_at && row.elapsed_seconds !== null) {
      const elapsed = Number(row.elapsed_seconds);
      const cooldownSeconds = 10; // 10 seconds anti-spam threshold
      if (elapsed < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - elapsed);
        return {
          allowed: false,
          isCooldown: true,
          remainingSecs: remaining,
          reason: `Please wait ${remaining} seconds before re-linking this Instagram account.`,
        };
      }
    }
  }

  return { allowed: true };
}

export function checkIdentityBinding(
  instagramUserId: string,
  instagramUsername: string,
  mingreeUserId: number
): { allowed: boolean; reason?: string; isReclaimAttempt?: boolean } {
  const identities = loadIdentities();
  const cleanUsername = instagramUsername.toLowerCase().trim();
  const identity = identities[instagramUserId] || Object.values(identities).find(
    (id) => id.instagramUsername.toLowerCase() === cleanUsername
  );

  if (identity) {
    if (identity.isLocked) {
      return {
        allowed: false,
        reason: `This Instagram account (@${identity.instagramUsername}) has been restricted by platform administration. Reason: ${identity.lockoutReason || "Security review required"}.`,
      };
    }

    if (identity.boundMingreeUserId && identity.boundMingreeUserId !== mingreeUserId) {
      // Check if bound user shares the same email
      const boundUser = (global as any).registeredUsers?.find((u: any) => u.id === identity.boundMingreeUserId);
      const currentUser = (global as any).registeredUsers?.find((u: any) => u.id === mingreeUserId);

      if (boundUser && currentUser && boundUser.email?.toLowerCase()?.trim() === currentUser.email?.toLowerCase()?.trim()) {
        console.log(`[SECURITY] Same email owner in memory. Rebinding Instagram @${instagramUsername} to User #${mingreeUserId}`);
        identity.boundMingreeUserId = mingreeUserId;
      } else if (boundUser && boundUser.isInstagramVerified && boundUser.instagramUsername) {
        return {
          allowed: false,
          reason: "This Instagram account is already linked to another active Mingree account.",
          isReclaimAttempt: true,
        };
      } else {
        // Old user is unlinked - allow rebinding
        identity.boundMingreeUserId = mingreeUserId;
      }
    }

    if (identity.lastDisconnectedAt) {
      const elapsed = Date.now() - new Date(identity.lastDisconnectedAt).getTime();
      const cooldownMs = 10 * 1000; // 10s cooldown
      if (elapsed < cooldownMs) {
        const waitSecs = Math.ceil((cooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          reason: `Please wait ${waitSecs} seconds before re-linking this Instagram account.`,
        };
      }
    }
  }

  return { allowed: true };
}

// 3. Bot & Suspicious Account Detection using available Instagram Data & Risk Scoring
export interface RiskEvaluationResult {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFactors: string[];
  isBlocked: boolean;
  blockReason?: string;
  metrics: {
    followers: number;
    mediaCount: number;
    accountType?: string;
    followerToMediaRatio: number;
  };
}

export function evaluateBotAndRiskScore(data: {
  instagramUserId: string;
  instagramUsername: string;
  followers: number;
  mediaCount: number;
  accountType?: string;
  mingreeUserId: number;
}): RiskEvaluationResult {
  const { instagramUserId, instagramUsername, followers, mediaCount, accountType } = data;
  const identities = loadIdentities();
  const existing = identities[instagramUserId];

  const factors: string[] = [];
  let score = 0;

  const followerToMediaRatio = mediaCount > 0 ? followers / mediaCount : followers;

  // RULE A: Zero Media with High Followers (Classic bought followers / empty shell bot account)
  // Genuine low follower accounts (e.g. 500-1500) with 0-1 media receive minimal risk (10 pts)
  if (mediaCount === 0) {
    if (followers >= 5000) {
      score += 45;
      factors.push("Zero media posts with high follower count (shell/bot profile anomaly)");
    } else if (followers >= 2000) {
      score += 30;
      factors.push("Zero media posts with >2,000 followers");
    } else {
      score += 10;
      factors.push("Zero public media posts detected");
    }
  } else if (mediaCount < 3 && followers >= 10000) {
    score += 35;
    factors.push("Extremely high follower-to-media imbalance (<3 posts with >10k followers)");
  }

  // RULE B: Suspicious Username Pattern (Bot / auto-generated naming conventions)
  // e.g., high trailing numbers like user_92837492, random string hex hashes
  const randomTrailingDigits = /^[a-zA-Z_]{2,8}[0-9]{5,}$/;
  const gibberishHex = /^[0-9a-f]{12,}$/i;
  const botPrefix = /^(bot_|fake_|test_account_|promo_blast)/i;

  if (randomTrailingDigits.test(instagramUsername)) {
    score += 25;
    factors.push("Suspicious automated username pattern with high-entropy trailing digits");
  }
  if (gibberishHex.test(instagramUsername)) {
    score += 35;
    factors.push("Random alphanumeric hash username structure");
  }
  if (botPrefix.test(instagramUsername)) {
    score += 40;
    factors.push("Known test/bot prefix detected in username");
  }

  // RULE C: Rapid Activity / Sudden Follower Spike Anomaly (Bursts)
  if (existing && existing.lastFollowersCount > 0) {
    const followerDelta = followers - existing.lastFollowersCount;
    const timeElapsedHours = Math.max(0.1, (Date.now() - new Date(existing.lastBoundAt).getTime()) / (1000 * 60 * 60));
    const hourlyGain = followerDelta / timeElapsedHours;

    // Follower surge of > 15,000 followers in under 6 hours is an unnatural burst signal
    if (followerDelta > 15000 && hourlyGain > 2500) {
      score += 35;
      factors.push(`Unnatural follower surge detected (+${followerDelta.toLocaleString()} followers in ${timeElapsedHours.toFixed(1)} hrs)`);
    }

    // Disconnect/Reconnect Churn (> 3 unlinks in history)
    if (existing.disconnectCount >= 4) {
      score += 20;
      factors.push(`Frequent disconnect churn history (${existing.disconnectCount} unlinks recorded)`);
    }
  }

  // RULE D: Account Type Verification
  // Business/Creator accounts are standard; abnormal personal profile tokens get a minor check
  if (accountType && !["BUSINESS", "MEDIA_CREATOR", "CREATOR", "BUSINESS_ACCOUNT"].includes(accountType.toUpperCase())) {
    score += 5;
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (finalScore >= 70) {
    riskLevel = "HIGH";
  } else if (finalScore >= 40) {
    riskLevel = "MEDIUM";
  }

  // Decide if blocked: Only HIGH risk (>= 70) is blocked.
  // Genuine creators with modest follower counts (500-5000) and low/medium scores are NEVER blocked solely for follower count.
  const isBlocked = finalScore >= 70;
  let blockReason: string | undefined;

  if (isBlocked) {
    blockReason = `Instagram connection blocked due to high-risk automated activity signals (Risk Score: ${finalScore}/100). Flags: ${factors.join(", ")}. Please contact Mingree Support if you believe this is a false positive.`;
  }

  return {
    riskScore: finalScore,
    riskLevel,
    riskFactors: factors,
    isBlocked,
    blockReason,
    metrics: {
      followers,
      mediaCount,
      accountType,
      followerToMediaRatio,
    },
  };
}

// 4. Identity Lifecycle Management (Bind, Unbind, Unlock, Transfer)

export function bindIdentityToUser(params: {
  instagramUserId: string;
  instagramUsername: string;
  mingreeUserId: number;
  followers: number;
  mediaCount: number;
  riskScore: number;
  riskFactors: string[];
}) {
  const identities = loadIdentities();
  const now = new Date().toISOString();
  const existing = identities[params.instagramUserId];

  const historicalIds = existing
    ? Array.from(new Set([...existing.historicalMingreeUserIds, params.mingreeUserId]))
    : [params.mingreeUserId];

  identities[params.instagramUserId] = {
    instagramUserId: params.instagramUserId,
    instagramUsername: params.instagramUsername,
    boundMingreeUserId: params.mingreeUserId,
    firstBoundAt: existing?.firstBoundAt || now,
    lastBoundAt: now,
    lastFollowersCount: params.followers,
    lastMediaCount: params.mediaCount,
    isLocked: false,
    lockoutUntil: null,
    lockoutReason: null,
    historicalMingreeUserIds: historicalIds,
    linkCount: (existing?.linkCount || 0) + 1,
    disconnectCount: existing?.disconnectCount || 0,
    lastDisconnectedAt: null,
    suspiciousFlags: Array.from(new Set([...(existing?.suspiciousFlags || []), ...params.riskFactors])),
    lastRiskScore: params.riskScore,
  };

  saveIdentities(identities);

  // Persist to PostgreSQL instagram_identities
  try {
    pool.query(
      `INSERT INTO instagram_identities (instagram_user_id, current_user_id, historical_user_ids, username, connect_count, linked_at)
       VALUES ($1, $2, ARRAY[$2::bigint], $3, 1, now())
       ON CONFLICT (instagram_user_id) DO UPDATE SET
         current_user_id = EXCLUDED.current_user_id,
         historical_user_ids = array_append(instagram_identities.historical_user_ids, EXCLUDED.current_user_id),
         username = EXCLUDED.username,
         connect_count = instagram_identities.connect_count + 1,
         linked_at = now(),
         unlinked_at = NULL`,
      [params.instagramUserId, params.mingreeUserId, params.instagramUsername]
    ).catch((err: any) => console.error("[PG BIND ERROR]", err.message));
  } catch (err: any) {
    console.error("[PG BIND ERROR]", err.message);
  }

  console.log(`[SECURITY] Successfully bound Instagram @${params.instagramUsername} (${params.instagramUserId}) to Mingree User #${params.mingreeUserId}`);
}

export function unbindIdentityFromUser(instagramUserId: string, mingreeUserId: number) {
  const identities = loadIdentities();
  const identity = identities[instagramUserId];

  if (identity && identity.boundMingreeUserId === mingreeUserId) {
    identity.boundMingreeUserId = 0; // unlinked but identity record preserved for reclaim protection
    identity.disconnectCount += 1;
    identity.lastDisconnectedAt = new Date().toISOString();
    saveIdentities(identities);

    // Persist unbind to PostgreSQL
    try {
      pool.query(
        `UPDATE instagram_identities
         SET current_user_id = NULL, unlinked_at = now()
         WHERE instagram_user_id = $1`,
        [instagramUserId]
      ).catch((err: any) => console.error("[PG UNBIND ERROR]", err.message));
    } catch (err: any) {
      console.error("[PG UNBIND ERROR]", err.message);
    }

    console.log(`[SECURITY] Preserved unbind history for Instagram @${identity.instagramUsername} (${instagramUserId}) from Mingree User #${mingreeUserId}`);
  }
}

export function unlockOrTransferIdentity(
  instagramUserId: string,
  newMingreeUserId?: number
): { success: boolean; message: string } {
  const identities = loadIdentities();
  const identity = identities[instagramUserId];

  if (!identity) {
    return { success: false, message: "Instagram identity not found in registry." };
  }

  identity.isLocked = false;
  identity.lockoutUntil = null;
  identity.lockoutReason = null;

  if (typeof newMingreeUserId === "number" && newMingreeUserId > 0) {
    identity.boundMingreeUserId = newMingreeUserId;
    if (!identity.historicalMingreeUserIds.includes(newMingreeUserId)) {
      identity.historicalMingreeUserIds.push(newMingreeUserId);
    }

    try {
      pool.query(
        `UPDATE instagram_identities
         SET current_user_id = $2, unlinked_at = NULL
         WHERE instagram_user_id = $1`,
        [instagramUserId, newMingreeUserId]
      ).catch((err: any) => console.error("[PG TRANSFER ERROR]", err.message));
    } catch {}
  }

  saveIdentities(identities);
  return {
    success: true,
    message: `Identity @${identity.instagramUsername} updated successfully. Bound to User #${identity.boundMingreeUserId}.`,
  };
}

// 5. Security Audit Logging

export function recordSecurityEvent(event: Omit<SecurityAuditEvent, "id" | "timestamp">) {
  const logs = loadAuditLogs();
  const entry: SecurityAuditEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  logs.unshift(entry);
  saveAuditLogs(logs);

  // Persist to PostgreSQL security_audit_logs
  try {
    pool.query(
      `INSERT INTO security_audit_logs (event, user_id, instagram_username, risk_score, flags, decision, ip, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.event,
        entry.mingreeUserId,
        entry.instagramUsername,
        entry.riskScore,
        JSON.stringify(entry.riskFactors),
        entry.decision,
        entry.ipAddress,
        entry.details,
      ]
    ).catch((err: any) => console.error("[PG AUDIT LOG ERROR]", err.message));
  } catch (err: any) {
    console.error("[PG AUDIT LOG ERROR]", err.message);
  }

  console.log(
    `[SECURITY AUDIT] [${entry.decision}] [${entry.event}] User #${entry.mingreeUserId} | @${entry.instagramUsername} | Score: ${entry.riskScore}/100 (${entry.riskLevel}) | ${entry.details}`
  );
}

export function getSecurityAuditLogs(limit = 100): SecurityAuditEvent[] {
  const logs = loadAuditLogs();
  return logs.slice(0, limit);
}

export function getAllIdentities(): InstagramIdentityRecord[] {
  const identities = loadIdentities();
  return Object.values(identities);
}
