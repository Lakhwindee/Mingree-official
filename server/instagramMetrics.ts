import crypto from "crypto";

// Token Encryption Key (AES-256-GCM)
const TOKEN_ENC_RAW = process.env.TOKEN_ENC_KEY || process.env.JWT_SECRET || "mingree_token_encryption_default_key";
const ENCRYPTION_KEY = crypto.scryptSync(TOKEN_ENC_RAW, "mingree_salt_v1", 32);

// 1. Encrypt Access Token at rest (AES-256-GCM)
export function encryptAccessToken(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// 2. Decrypt Access Token
export function decryptAccessToken(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return "";
  const parts = encryptedText.split(":");
  if (parts.length !== 3) return "";
  const [ivHex, authTagHex, cipherHex] = parts;
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[CRYPTO ERROR] Failed to decrypt access token:", err);
    return "";
  }
}

// 3. Compute Median Views of Last 10-15 Reels (Median, not mean)
export function calculateMedianViews(views: number[]): number {
  if (!views || views.length === 0) return 0;
  const sorted = [...views].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

// 4. Compute Engagement Rate = (sum(likes + comments) / posts) / followers * 100
export function calculateEngagementRate(totalLikes: number, totalComments: number, postCount: number, followers: number): number {
  if (!followers || followers <= 0 || postCount <= 0) return 0;
  const avgEngagementPerPost = (totalLikes + totalComments) / postCount;
  const rate = (avgEngagementPerPost / followers) * 100;
  return parseFloat(rate.toFixed(2));
}

// 5. Tier Label Classification using half-open ranges [min, max) from brief
export function getTierLabelFromFollowers(followers: number): string {
  if (followers < 500) return "Ineligible (<500)";
  if (followers < 2000) return "Starter";
  if (followers < 10000) return "Nano";
  if (followers < 50000) return "Micro";
  if (followers < 250000) return "Mid";
  if (followers < 1000000) return "Macro";
  return "Mega";
}

// 6. Timing-Safe HMAC OAuth State Verification
export function verifySignedOAuthStateSecure(stateStr: string, appSecret: string): { userId: number; returnTo: string } | null {
  if (!stateStr || typeof stateStr !== "string") return null;
  const parts = stateStr.split(".");
  if (parts.length !== 3) return null;
  const [nonce, payload, signature] = parts;
  if (!appSecret) return null; // Never fall back to default secret

  const expectedSig = crypto.createHmac("sha256", appSecret).update(`${nonce}.${payload}`).digest("hex").slice(0, 16);

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (Date.now() - data.ts > 3600000) return null; // 1 hour expiration
    return {
      userId: Number(data.userId) || 1,
      returnTo: typeof data.returnTo === "string" ? data.returnTo : "/dashboard",
    };
  } catch {
    return null;
  }
}

// 7. Verify Meta signed_request for Deauthorize & Data-Deletion Webhooks
export function parseMetaSignedRequest(signedRequest: string, appSecret: string): any {
  if (!signedRequest || !signedRequest.includes(".") || !appSecret) return null;
  const [encodedSig, payload] = signedRequest.split(".");
  
  const sig = Buffer.from(encodedSig, "base64url");
  const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();

  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
    console.error("[META WEBHOOK] Invalid signed_request HMAC signature");
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return data;
  } catch (e) {
    console.error("[META WEBHOOK] Failed to parse signed_request payload:", e);
    return null;
  }
}
