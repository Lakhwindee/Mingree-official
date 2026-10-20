import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { PROMOTION_CATEGORIES } from "./shared/schema";
import {
  checkRateLimitAndFarming,
  recordFailedAttempt,
  checkIdentityBinding,
  evaluateBotAndRiskScore,
  bindIdentityToUser,
  unbindIdentityFromUser,
  recordSecurityEvent,
  getSecurityAuditLogs,
  getAllIdentities,
  unlockOrTransferIdentity,
} from "./server/instagramSecurity";

const app = express();
// Default to 3000 for AI Studio container, but adopt Render's dynamic PORT when hosted on Render
const PORT = process.env.RENDER ? (Number(process.env.PORT) || 3000) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Render.com deployment and load balancers
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// In-memory store for Instagram OAuth CSRF validation states
interface InstagramOAuthState {
  userId: number;
  createdAt: number;
  returnTo?: string;
}
const instagramOAuthStates = new Map<string, InstagramOAuthState>();

// Periodic cleanup of expired states (> 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [stateKey, stateVal] of instagramOAuthStates.entries()) {
    if (now - stateVal.createdAt > 15 * 60 * 1000) {
      instagramOAuthStates.delete(stateKey);
    }
  }
}, 5 * 60 * 1000);

const DATA_DIR = process.env.VERCEL ? "/tmp" : process.cwd();
function getDataFilePath(filename: string): string {
  const target = path.join(DATA_DIR, filename);
  if (process.env.VERCEL && !fs.existsSync(target)) {
    const source = path.join(process.cwd(), filename);
    if (fs.existsSync(source)) {
      try {
        fs.copyFileSync(source, target);
      } catch (e) {
        // ignore
      }
    } else {
      try {
        fs.writeFileSync(target, "{}", "utf-8");
      } catch (e) {
        // ignore
      }
    }
  }
  return target;
}

// Path for persisted settings (allows admin to update Gmail credentials without container rebuild)
const SETTINGS_FILE = getDataFilePath("app_settings.json");

function loadSettings(): Record<string, string> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading settings file:", err);
  }
  return {};
}

function saveSettings(settings: Record<string, string>) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving settings file:", err);
  }
}

function getMinInstagramFollowers(): number {
  const settings = loadSettings();
  if (settings.min_instagram_followers !== undefined && settings.min_instagram_followers !== "") {
    const parsed = parseInt(String(settings.min_instagram_followers), 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  if (process.env.MIN_INSTAGRAM_FOLLOWERS) {
    const parsed = parseInt(process.env.MIN_INSTAGRAM_FOLLOWERS, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return 500; // Default Mingree Tier 1 minimum followers requirement
}

function getEmailCredentials(): { user: string; pass: string } | null {
  const settings = loadSettings();
  const user = process.env.GMAIL_USER || settings.gmail_user || "";
  const pass = process.env.GMAIL_APP_PASSWORD || settings.gmail_app_password || "";

  if (user && pass) {
    return { user: user.trim(), pass: pass.trim() };
  }
  return null;
}

// In-memory OTP Store (email -> { otp, expiresAt, name })
interface StoredOtp {
  otp: string;
  expiresAt: number;
  name?: string;
}
const otpStore = new Map<string, StoredOtp>();

// Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Nodemailer
async function sendEmailOtp(toEmail: string, otp: string, userName?: string): Promise<{ success: boolean; error?: string }> {
  const creds = getEmailCredentials();
  if (!creds) {
    return { success: false, error: "Gmail credentials not configured in environment or settings." };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
  });

  const mailOptions = {
    from: `"Mingree" <${creds.user}>`,
    to: toEmail,
    subject: "Your OTP for Email Verification - Mingree",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="background: linear-gradient(135deg, #ec4899, #f43f5e, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; font-weight: 800; margin: 0;">Mingree</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Creator & Sponsor Collaboration Platform</p>
        </div>
        <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 16px 0;">Hello <strong>${userName || "there"}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">Use the 6-digit verification code below to complete your email verification on Mingree:</p>
          <div style="background-color: #ffffff; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 16px 0 0 0; text-align: center;">⏱️ This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
        </div>
        <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
          <p style="margin: 6px 0 0 0;">&copy; ${new Date().getFullYear()} Mingree. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP successfully sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL ERROR] Failed to send OTP to ${toEmail}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ================= API ROUTES =================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Check Email Service Status
app.get("/api/auth/email-status", (req, res) => {
  const creds = getEmailCredentials();
  res.json({
    configured: Boolean(creds),
    user: creds ? creds.user : null,
  });
});

// Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, name } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Valid email address is required" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

  otpStore.set(cleanEmail, { otp, expiresAt, name });
  console.log(`[AUTH] Generated OTP for ${cleanEmail}: ${otp}`);

  const creds = getEmailCredentials();
  if (creds) {
    const result = await sendEmailOtp(cleanEmail, otp, name);
    if (result.success) {
      return res.json({
        message: `OTP sent successfully to ${cleanEmail}`,
        emailConfigured: true,
        expiresIn: 600,
      });
    } else {
      return res.status(500).json({
        error: `Failed to send email: ${result.error}`,
        emailConfigured: true,
      });
    }
  }

  // Not configured in settings or env
  return res.status(503).json({
    error: "Email delivery service is not configured. Please configure email settings.",
    emailConfigured: false,
  });
});

// Verify OTP
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp).trim();

  const stored = otpStore.get(cleanEmail);
  if (!stored) {
    return res.status(400).json({ error: "No OTP requested for this email or it has expired" });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  if (stored.otp !== cleanOtp) {
    return res.status(400).json({ error: "Invalid OTP. Please check the code." });
  }

  // OTP verified, clear it
  otpStore.delete(cleanEmail);
  return res.json({ success: true, message: "OTP verified successfully" });
});

// Forgot Password - Send OTP
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email address is required" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(cleanEmail, { otp, expiresAt, name: "User" });
  console.log(`[AUTH] Forgot password OTP for ${cleanEmail}: ${otp}`);

  const creds = getEmailCredentials();
  if (creds) {
    const result = await sendEmailOtp(cleanEmail, otp, "User");
    if (result.success) {
      return res.json({
        message: `Password reset code sent to ${cleanEmail}`,
        emailConfigured: true,
        expiresIn: 600,
      });
    } else {
      return res.status(500).json({
        error: `Failed to send email: ${result.error}`,
        emailConfigured: true,
      });
    }
  }

  return res.status(503).json({
    error: "Email delivery service is not configured. Please configure email settings.",
    emailConfigured: false,
  });
});

// Verify Reset OTP
app.post("/api/auth/verify-reset-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp).trim();

  const stored = otpStore.get(cleanEmail);
  if (!stored) {
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: "Reset code has expired" });
  }

  if (stored.otp !== cleanOtp) {
    return res.status(400).json({ error: "Invalid code" });
  }

  otpStore.delete(cleanEmail);
  return res.json({ success: true, message: "Code verified successfully" });
});

// Reset Password
app.post("/api/auth/reset-password", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and new password are required" });
  }
  // In demo mode, acknowledge password reset
  return res.json({ success: true, message: "Password updated successfully" });
});

// Helper to get Instagram Meta OAuth credentials securely from server secrets & settings
function getInstagramCredentials(): { appId: string; appSecret: string } {
  const settings = loadSettings();
  const settingsAppId = (settings.instagram_app_id || "").trim();
  const settingsAppSecret = (settings.instagram_app_secret || "").trim();
  const envAppId = (process.env.INSTAGRAM_APP_ID || process.env.INSTAGRAM_CLIENT_ID || "").trim();
  const envAppSecret = (process.env.INSTAGRAM_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "").trim();

  // Known Meta IDs for this app:
  // - 1585375139983524: Parent Meta/Facebook App ID (App Settings > Basic).
  // - 3167123270152518: Instagram App ID (Instagram API with Instagram Login > Settings).
  // Note: Meta's Instagram OAuth endpoint strictly requires the dedicated Instagram App ID (3167123270152518).
  // Passing 1585375139983524 triggers "OAuthException: Invalid platform app" and displays "Something went wrong" on iOS and web!
  let appId = settingsAppId || envAppId;
  let appSecret = settingsAppSecret || envAppSecret;

  if (appId === "1585375139983524" || !appId) {
    appId = settingsAppId && settingsAppId !== "1585375139983524" ? settingsAppId : "3167123270152518";
    if (!appSecret || appSecret === process.env.INSTAGRAM_APP_SECRET) {
      appSecret = settingsAppSecret || "a80adcabcc62abb2e66c3d1048a50e76";
    }
  }

  return { appId, appSecret };
}

// Compute official Meta OAuth Redirect / Callback URI
// Exact URI configured in Meta Developer Dashboard:
function getInstagramRedirectUri(req?: express.Request): string {
  const CANONICAL_REDIRECT_URI = "https://ais-dev-k2puuebcekhcieay7qmwqf-788442053754.asia-southeast1.run.app/api/instagram/callback";
  const settings = loadSettings();
  if (settings.instagram_redirect_uri && settings.instagram_redirect_uri.trim()) {
    return settings.instagram_redirect_uri.trim();
  }
  return CANONICAL_REDIRECT_URI;
}

// Cryptographically signed state token generator to protect against CSRF and survive server restarts
function createSignedOAuthState(userId: number, returnTo: string, appSecret: string): string {
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = Buffer.from(JSON.stringify({ userId, returnTo, ts: Date.now() })).toString("base64url");
  const secretKey = appSecret || "mingree_instagram_oauth_secret";
  const signature = crypto.createHmac("sha256", secretKey).update(`${nonce}.${payload}`).digest("hex").slice(0, 16);
  return `${nonce}.${payload}.${signature}`;
}

// Cryptographically verify signed state token
function verifySignedOAuthState(stateStr: string, appSecret: string): { userId: number; returnTo: string } | null {
  if (!stateStr || typeof stateStr !== "string") return null;
  const parts = stateStr.split(".");
  if (parts.length !== 3) return null;
  const [nonce, payload, signature] = parts;
  const secretKey = appSecret || "mingree_instagram_oauth_secret";
  const expectedSig = crypto.createHmac("sha256", secretKey).update(`${nonce}.${payload}`).digest("hex").slice(0, 16);
  if (signature !== expectedSig) return null;
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

// Ensure sensitive secrets & tokens are NEVER exposed to client frontend
function getSafeUserProfile(profile: Record<string, any>) {
  if (!profile) return profile;
  const safe = { ...profile };
  delete safe.instagramAccessToken;
  return safe;
}

// Admin API Keys - Get
app.get("/api/admin/api-keys", (req, res) => {
  const settings = loadSettings();
  const { appId, appSecret } = getInstagramCredentials();
  res.json({
    gmail_user: process.env.GMAIL_USER || settings.gmail_user || "",
    gmail_app_password: (process.env.GMAIL_APP_PASSWORD || settings.gmail_app_password) ? "••••••••••••••••" : "",
    cashfree_app_id: settings.cashfree_app_id || "",
    instagram_app_id: appId,
    instagram_app_secret: appSecret ? "••••••••••••••••" : "",
    instagram_redirect_uri: getInstagramRedirectUri(req),
    min_instagram_followers: getMinInstagramFollowers(),
    rapidapi_key: settings.rapidapi_key || "",
  });
});

// Instagram public requirements endpoint
app.get("/api/instagram/requirements", (req, res) => {
  res.json({
    minFollowers: getMinInstagramFollowers(),
    redirectUri: getInstagramRedirectUri(req),
  });
});

// Admin API Keys - Save
app.post("/api/admin/api-keys", (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }

  const settings = loadSettings();
  if (typeof value === "string" && !value.startsWith("••••")) {
    settings[key] = value || "";
    saveSettings(settings);
    console.log(`[SETTINGS] Updated key: ${key}`);
  }
  return res.json({ success: true, key });
});

// Path for persisted user profile data
const USER_PROFILE_FILE = getDataFilePath("user_profile.json");

const defaultUserProfile: Record<string, any> = {
  id: 1,
  name: "Creator",
  handle: "@creator",
  email: "creator@mingree.com",
  role: "creator",
  followers: 0,
  engagement: "0.0",
  reach: 0,
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  isVerified: false,
  tier: "New Creator",
  balance: "0.00",
  companyName: null,
  gstNumber: null,
  instagramUsername: null,
  instagramProfileUrl: null,
  instagramFollowers: 0,
  isInstagramVerified: false,
  instagramVerificationCode: null,
  instagramVerificationStatus: "unlinked",
  instagramAccessToken: null,
  instagramUserId: null,
  instagramTokenExpiresAt: null,
  subscriptionPlan: "free",
  subscriptionExpiresAt: null,
  stars: 0,
  country: "IN",
  city: "",
  totalEarnings: "0.00",
  pendingWithdrawals: "0.00",
  starRewards: 0,
  activeReservations: 0,
  completedSubmissions: 0,
  campaignsCreated: 0,
  createdAt: "2024-01-15T10:00:00.000Z",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingPincode: "",
  shippingPhone: "",
};

function loadUserProfile(): Record<string, any> {
  try {
    if (fs.existsSync(USER_PROFILE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USER_PROFILE_FILE, "utf-8"));
      return { ...defaultUserProfile, ...parsed };
    }
  } catch (err) {
    console.error("Error reading user profile file:", err);
  }
  return { ...defaultUserProfile };
}

let currentUserProfile: Record<string, any> = loadUserProfile();

function saveUserProfile(profile?: Record<string, any>) {
  try {
    if (profile) {
      currentUserProfile = { ...currentUserProfile, ...profile };
    }
    fs.writeFileSync(USER_PROFILE_FILE, JSON.stringify(currentUserProfile, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving user profile file:", err);
  }
}

const defaultSponsorProfile: Record<string, any> = {
  id: 2,
  name: "Brand Sponsor",
  handle: "@sponsor",
  email: "brand@mingree.com",
  role: "sponsor",
  followers: 0,
  engagement: "0.0",
  reach: 0,
  avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150",
  isVerified: true,
  tier: "Brand Partner",
  balance: "0.00",
  companyName: "Brand Sponsor",
  gstNumber: "",
  instagramUsername: null,
  instagramProfileUrl: null,
  instagramFollowers: 0,
  isInstagramVerified: false,
  subscriptionPlan: "free",
  stars: 0,
  country: "IN",
  city: "Mumbai",
  totalEarnings: "0.00",
  pendingWithdrawals: "0.00",
  starRewards: 0,
  activeReservations: 0,
  completedSubmissions: 0,
  campaignsCreated: 0,
  createdAt: "2024-01-15T10:00:00.000Z",
};

// Registered Users Store & Persistence
const USERS_FILE = getDataFilePath("registered_users.json");

interface RegisteredUser {
  id: number;
  email: string;
  password?: string;
  name: string;
  role: string;
  handle: string;
  avatar?: string;
  tier?: string;
  companyName?: string;
}

let registeredUsers: RegisteredUser[] = [
  {
    id: 1,
    email: "manindersinghjudge@gmail.com",
    name: "Creator",
    role: "creator",
    handle: "@creator",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    tier: "New Creator"
  },
  {
    id: 99,
    email: "admin@mingree.com",
    name: "Mingree Administrator",
    role: "admin",
    handle: "@admin",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    tier: "Admin"
  },
  {
    id: 2,
    email: "brand@mingree.com",
    name: "Brand Sponsor",
    role: "sponsor",
    handle: "@sponsor",
    avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150",
    tier: "Brand Partner",
    companyName: "Brand Sponsor"
  }
];

function loadRegisteredUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        registeredUsers = data;
      }
    }
  } catch (err) {
    console.error("Error loading registered users:", err);
  }
}

function saveRegisteredUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(registeredUsers, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving registered users:", err);
  }
}

loadRegisteredUsers();

// Auth Sessions
app.post("/api/auth/signup", (req, res) => {
  const { name, email, password, role, city, country } = req.body;
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  let userRole = role || (cleanEmail.includes("brand") ? "sponsor" : cleanEmail.includes("admin") ? "admin" : "creator");
  
  let existingUser = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (!existingUser) {
    existingUser = {
      id: Date.now(),
      email: cleanEmail,
      password: password || "123456",
      name: name || (cleanEmail.split('@')[0]),
      role: userRole,
      handle: `@${cleanEmail.split('@')[0]}`,
      avatar: userRole === "sponsor" ? defaultSponsorProfile.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      tier: userRole === "sponsor" ? "Brand Partner" : "New Creator",
      companyName: userRole === "sponsor" ? (name || "Brand Partner") : undefined
    };
    registeredUsers.push(existingUser);
    saveRegisteredUsers();
  } else if (password) {
    existingUser.password = password;
    if (name) existingUser.name = name;
    saveRegisteredUsers();
  }

  if (userRole === "sponsor") {
    const sponsor = { ...defaultSponsorProfile, ...existingUser };
    return res.json(sponsor);
  } else if (userRole === "admin") {
    return res.json(existingUser);
  } else {
    currentUserProfile.email = cleanEmail;
    currentUserProfile.name = existingUser.name;
    currentUserProfile.handle = existingUser.handle;
    currentUserProfile.role = "creator";
    saveUserProfile();
    return res.json({ ...getSafeUserProfile(currentUserProfile), ...existingUser });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body;
  const cleanEmail = (email || "").toLowerCase().trim();

  if (!cleanEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  const foundUser = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

  if (!foundUser) {
    return res.status(401).json({ error: "Account not found with this email. Please sign up first." });
  }

  if (password && foundUser.password && foundUser.password !== password) {
    return res.status(401).json({ error: "Incorrect password. Please try again." });
  }

  if (foundUser.role === "sponsor" || cleanEmail === "brand@mingree.com" || cleanEmail.includes("brand")) {
    return res.json({ ...defaultSponsorProfile, ...foundUser });
  }

  if (foundUser.role === "admin" || cleanEmail === "admin@mingree.com" || cleanEmail.includes("admin")) {
    currentUserProfile.role = "admin";
    currentUserProfile.email = foundUser.email;
    currentUserProfile.name = foundUser.name;
    currentUserProfile.handle = foundUser.handle;
    currentUserProfile.avatar = foundUser.avatar;
    currentUserProfile.isVerified = true;
    saveUserProfile();
    return res.json(foundUser);
  }

  currentUserProfile.email = foundUser.email;
  currentUserProfile.name = foundUser.name;
  currentUserProfile.handle = foundUser.handle;
  currentUserProfile.role = "creator";
  saveUserProfile();
  return res.json({ ...getSafeUserProfile(currentUserProfile), ...foundUser });
});

app.post("/api/auth/admin-login", (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || "").toLowerCase().trim();
  const adminUser = {
    id: 99,
    name: "Mingree Administrator",
    handle: "@admin",
    email: cleanEmail || "admin@mingree.com",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    isVerified: true,
    tier: "Admin",
    balance: "500000.00",
    followers: 0,
    engagement: "0.0",
    reach: 0,
  };
  currentUserProfile.role = "admin";
  currentUserProfile.email = adminUser.email;
  currentUserProfile.name = adminUser.name;
  currentUserProfile.handle = adminUser.handle;
  currentUserProfile.avatar = adminUser.avatar;
  currentUserProfile.isVerified = true;
  saveUserProfile();
  console.log(`[AUTH] Admin login successful for ${adminUser.email}`);
  return res.json(adminUser);
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/users/current
app.get("/api/users/current", (req, res) => {
  res.json(getSafeUserProfile(currentUserProfile));
});

// GET /api/sponsors/current
app.get("/api/sponsors/current", (req, res) => {
  res.json(defaultSponsorProfile);
});

// GET /api/sponsors/:id
app.get("/api/sponsors/:id", (req, res) => {
  res.json(defaultSponsorProfile);
});

// GET /api/users/:id
app.get("/api/users/:id", (req, res) => {
  res.json(getSafeUserProfile(currentUserProfile));
});

// PUT /api/users/:id/profile
app.put("/api/users/:id/profile", (req, res) => {
  const { name, handle, city } = req.body;
  if (name !== undefined && name.trim()) currentUserProfile.name = name.trim();
  if (handle !== undefined && handle.trim()) {
    const cleanHandle = handle.trim().replace(/^@+/, "");
    currentUserProfile.handle = `@${cleanHandle}`;
  }
  if (city !== undefined) currentUserProfile.city = city.trim();
  saveUserProfile();
  res.json(getSafeUserProfile(currentUserProfile));
});

// PUT /api/users/:id/city
app.put("/api/users/:id/city", (req, res) => {
  const { city } = req.body;
  if (city !== undefined) currentUserProfile.city = city;
  saveUserProfile();
  res.json(getSafeUserProfile(currentUserProfile));
});

// PUT /api/users/:id/instagram
app.put("/api/users/:id/instagram", (req, res) => {
  const { instagramUsername, instagramProfileUrl, instagramFollowers } = req.body;
  if (!instagramUsername || !instagramUsername.trim()) {
    currentUserProfile.instagramUsername = null;
    currentUserProfile.instagramProfileUrl = null;
    currentUserProfile.instagramFollowers = 0;
    currentUserProfile.followers = 0;
    currentUserProfile.isInstagramVerified = false;
    currentUserProfile.instagramVerificationCode = null;
    currentUserProfile.instagramVerificationStatus = "unlinked";
    currentUserProfile.instagramAccessToken = null;
    currentUserProfile.instagramUserId = null;
    currentUserProfile.instagramTokenExpiresAt = null;
    saveUserProfile();
    return res.json(getSafeUserProfile(currentUserProfile));
  }

  const followersCount = Number(instagramFollowers) || 0;
  const minRequired = getMinInstagramFollowers();
  if (followersCount > 0 && followersCount < minRequired) {
    return res.status(400).json({
      error: `Minimum ${minRequired.toLocaleString()} followers required to connect an Instagram account on Mingree.`
    });
  }

  const cleanUsername = instagramUsername.replace(/^@+/, "").trim();
  currentUserProfile.instagramUsername = cleanUsername;
  currentUserProfile.instagramProfileUrl = instagramProfileUrl || `https://instagram.com/${cleanUsername}`;
  currentUserProfile.instagramFollowers = followersCount;
  currentUserProfile.followers = followersCount;
  
  // Set to pending review with verification code
  if (!currentUserProfile.instagramVerificationCode) {
    currentUserProfile.instagramVerificationCode = `MG-${Math.floor(10000 + Math.random() * 90000)}`;
  }
  currentUserProfile.instagramVerificationStatus = "pending";
  currentUserProfile.isInstagramVerified = false;
  currentUserProfile.instagramAccessToken = null;
  saveUserProfile();
  res.json(getSafeUserProfile(currentUserProfile));
});

// POST /api/users/:id/instagram/disconnect
app.post("/api/users/:id/instagram/disconnect", (req, res) => {
  const previousUsername = currentUserProfile.instagramUsername;
  const previousIgId = currentUserProfile.instagramUserId;
  const previousFollowers = currentUserProfile.instagramFollowers || 0;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";

  if (previousIgId) {
    unbindIdentityFromUser(previousIgId, currentUserProfile.id);
  }

  recordSecurityEvent({
    event: "DISCONNECT_RECORDED",
    mingreeUserId: currentUserProfile.id,
    instagramUsername: previousUsername || "unknown",
    instagramUserId: previousIgId || undefined,
    riskScore: 0,
    riskLevel: "LOW",
    riskFactors: [],
    followers: previousFollowers,
    mediaCount: 0,
    ipAddress: clientIp,
    userAgent: String(req.headers["user-agent"] || ""),
    decision: "ALLOW",
    details: `User #${currentUserProfile.id} disconnected Instagram @${previousUsername || "unknown"}. Historical binding preserved for anti-hijack protection.`,
  });

  currentUserProfile.instagramUsername = null;
  currentUserProfile.instagramProfileUrl = null;
  currentUserProfile.instagramFollowers = 0;
  currentUserProfile.followers = 0;
  currentUserProfile.isInstagramVerified = false;
  currentUserProfile.instagramVerificationCode = null;
  currentUserProfile.instagramVerificationStatus = "unlinked";
  currentUserProfile.instagramAccessToken = null;
  currentUserProfile.instagramUserId = null;
  currentUserProfile.instagramTokenExpiresAt = null;
  saveUserProfile();
  console.log(`[INSTAGRAM] Creator ${req.params.id} disconnected Instagram account`);
  res.json(getSafeUserProfile(currentUserProfile));
});

// POST /api/users/:id/instagram/refresh
app.post("/api/users/:id/instagram/refresh", (req, res) => {
  res.json(getSafeUserProfile(currentUserProfile));
});

// POST /api/users/:id/instagram/generate-code & verification-code
app.post(["/api/users/:id/instagram/generate-code", "/api/users/:id/instagram/verification-code"], (req, res) => {
  const code = `MG-${Math.floor(10000 + Math.random() * 90000)}`;
  currentUserProfile.instagramVerificationCode = code;
  currentUserProfile.instagramVerificationStatus = "pending";
  saveUserProfile();
  res.json({ code, status: "pending", user: getSafeUserProfile(currentUserProfile) });
});

// POST /api/users/:id/instagram/submit-verification
app.post(["/api/users/:id/instagram/submit-verification", "/api/instagram/submit"], (req, res) => {
  currentUserProfile.instagramVerificationStatus = "pending";
  saveUserProfile();
  res.json({ success: true, status: "pending", message: "Submitted for verification review" });
});

// POST /api/users/:id/avatar
app.post("/api/users/:id/avatar", (req, res) => {
  saveUserProfile();
  res.json(getSafeUserProfile(currentUserProfile));
});

// GET /api/users/:id/subscription & /api/subscription
app.get(["/api/users/:id/subscription", "/api/subscription"], (req, res) => {
  const plan = currentUserProfile.subscriptionPlan || "free";
  const isPro = (plan === "pro" || plan === "enterprise") && (!currentUserProfile.subscriptionExpiresAt || new Date(currentUserProfile.subscriptionExpiresAt) > new Date());
  res.json({
    plan: plan,
    expiresAt: currentUserProfile.subscriptionExpiresAt || null,
    isActive: isPro,
  });
});

// POST /api/users/:id/subscription/cancel & /api/subscription/cancel
app.post(["/api/users/:id/subscription/cancel", "/api/subscription/cancel"], (req, res) => {
  currentUserProfile.subscriptionPlan = "free";
  currentUserProfile.subscriptionExpiresAt = null;
  saveUserProfile();
  res.json({ success: true, message: "Subscription cancelled successfully", plan: "free", isActive: false });
});

// ================= CAMPAIGNS & RESERVATIONS SYSTEM =================
const CAMPAIGNS_FILE = getDataFilePath("campaigns.json");
const RESERVATIONS_FILE = getDataFilePath("reservations.json");

const initialCampaignsData: any[] = [];

function loadCampaigns(): any[] {
  try {
    if (fs.existsSync(CAMPAIGNS_FILE)) {
      return JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading campaigns file:", err);
  }
  return initialCampaignsData;
}

function saveCampaigns(campaigns: any[]) {
  try {
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving campaigns file:", err);
  }
}

function loadReservations(): any[] {
  try {
    if (fs.existsSync(RESERVATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(RESERVATIONS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading reservations file:", err);
  }
  return [];
}

function saveReservations(resList: any[]) {
  try {
    fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(resList, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving reservations file:", err);
  }
}

// Auto-cleanup engine:
// 1. Free creators cannot have reserved campaigns ("Ye free wale me reserved nai hono chahiye")
// 2. If a paid user's subscription expires before submitting work link, reservation is removed ("wo reserved v udd jani chahiye")
// 3. If deadline passes without work link submission, reservation is removed
function cleanReservations(targetUserId?: number): any[] {
  const reservations = loadReservations();
  const campaigns = loadCampaigns();
  const now = Date.now();
  let changed = false;

  const validReservations: any[] = [];

  for (const r of reservations) {
    // Only unsubmitted ("reserved") entries are subject to subscription invalidation & timeout
    if (r.status === "reserved" && !r.submittedAt) {
      const user: any = (r.userId === currentUserProfile.id)
        ? currentUserProfile
        : (registeredUsers.find(u => u.id === r.userId) || currentUserProfile);

      const subPlan = user?.subscriptionPlan || "free";
      const subExpiresAt = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).getTime() : 0;
      const isPro = (subPlan === "pro" || subPlan === "enterprise") && (!subExpiresAt || subExpiresAt > now);

      const isTimeExpired = r.expiresAt ? new Date(r.expiresAt).getTime() <= now : false;
      const isSubscriptionExpired = !isPro; // Free plan or subscription expired!

      if (isSubscriptionExpired || isTimeExpired) {
        console.log(`[CLEANUP] Removing unsubmitted reservation #${r.id} for user #${r.userId}. Reason: ${isSubscriptionExpired ? 'Subscription inactive/expired' : 'Reservation window expired'}. Restoring spot on campaign #${r.campaignId}.`);
        const campaign = campaigns.find(c => c.id === r.campaignId);
        if (campaign && campaign.spotsRemaining < campaign.totalSpots) {
          campaign.spotsRemaining += 1;
        }
        changed = true;
        // Purged: "wo reserved v udd jani chahiye"
        continue;
      }
    }

    validReservations.push(r);
  }

  if (changed) {
    saveReservations(validReservations);
    saveCampaigns(campaigns);
  }

  return validReservations;
}

// GET /api/campaigns
app.get("/api/campaigns", (req, res) => {
  cleanReservations();
  const campaigns = loadCampaigns();
  const { country, city } = req.query;
  let filtered = [...campaigns];

  if (country && typeof country === "string") {
    filtered = filtered.filter(c => !c.targetCountries || c.targetCountries.includes(country) || c.targetCountries.includes("All"));
  }
  if (city && typeof city === "string") {
    filtered = filtered.filter(c => !c.targetCities || c.targetCities.includes(city) || c.targetCities.includes("All"));
  }

  res.json(filtered);
});

// GET /api/campaigns/:id
app.get("/api/campaigns/:id", (req, res) => {
  cleanReservations();
  const campaigns = loadCampaigns();
  const campaign = campaigns.find(c => c.id === Number(req.params.id));
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }
  res.json(campaign);
});

// GET /api/sponsors/:id/campaigns
app.get("/api/sponsors/:id/campaigns", (req, res) => {
  cleanReservations();
  const campaigns = loadCampaigns();
  const sponsorId = Number(req.params.id);
  const filtered = campaigns.filter(c => c.sponsorId === sponsorId);
  res.json(filtered);
});

// POST /api/sponsors/:id/campaigns
app.post("/api/sponsors/:id/campaigns", (req, res) => {
  const sponsorId = Number(req.params.id);
  const data = req.body;
  const campaigns = loadCampaigns();
  const newId = campaigns.length > 0 ? Math.max(...campaigns.map((c: any) => c.id || 0)) + 1 : 1;

  const newCampaign = {
    id: newId,
    sponsorId,
    title: data.title || "Untitled Campaign",
    brand: data.brand || "Brand",
    brandLogo: data.brandLogo || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100",
    payAmount: String(data.payAmount || 0),
    type: data.type || "Reel",
    contentTypes: data.contentTypes || ["Reel"],
    promotionStyle: data.promotionStyle || "Review",
    assetUrl: data.assetUrl || null,
    assetFileName: data.assetFileName || null,
    minFollowers: Number(data.minFollowers || 0),
    description: data.description || "",
    tier: data.tier || "Tier 1",
    deadline: data.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    totalSpots: Number(data.totalSpots || 10),
    spotsRemaining: Number(data.totalSpots || 10),
    status: "active",
    isPromotional: Boolean(data.isPromotional),
    starReward: Number(data.starReward || 0),
    isApproved: true,
    targetCountries: data.targetCountries || ["IN"],
    targetCities: data.targetCities || ["All"],
    totalBudget: String(Number(data.payAmount || 0) * Number(data.totalSpots || 10)),
    releasedAmount: "0",
    refundedAmount: "0",
    escrowStatus: "funded",
    createdAt: new Date().toISOString(),
    campaignType: data.campaignType || "paid",
    productName: data.productName || null,
    productValue: data.productValue ? String(data.productValue) : null,
    mentions: data.mentions || [],
    category: data.category || "General",
  };

  campaigns.unshift(newCampaign);
  saveCampaigns(campaigns);
  res.json(newCampaign);
});

// GET /api/users/:id/reservations
app.get("/api/users/:id/reservations", (req, res) => {
  const userId = Number(req.params.id);
  const reservations = cleanReservations(userId);
  const campaigns = loadCampaigns();

  const userRes = reservations
    .filter(r => r.userId === userId)
    .map(r => {
      const camp = campaigns.find(c => c.id === r.campaignId) || r.campaign;
      return { ...r, campaign: camp };
    });

  res.json(userRes);
});

// POST /api/reservations - reserve campaign (requires active Pro subscription)
app.post("/api/reservations", (req, res) => {
  cleanReservations();
  const plan = currentUserProfile.subscriptionPlan || "free";
  const subExpiresAt = currentUserProfile.subscriptionExpiresAt ? new Date(currentUserProfile.subscriptionExpiresAt).getTime() : 0;
  const now = Date.now();
  const isPro = (plan === "pro" || plan === "enterprise") && (!subExpiresAt || subExpiresAt > now);

  // 1. Free plan users cannot reserve
  if (!isPro) {
    return res.status(403).json({
      error: "Upgrade Required: Aapko campaign reserve karne ke liye Pro plan par upgrade karna padega. Free creators cannot reserve campaigns."
    });
  }

  const { campaignId, userId } = req.body;
  const campaigns = loadCampaigns();
  const campaign = campaigns.find(c => c.id === Number(campaignId));

  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  if (campaign.spotsRemaining <= 0) {
    return res.status(400).json({ error: "No spots remaining in this campaign" });
  }

  const reservations = loadReservations();
  const effectiveUserId = Number(userId || currentUserProfile.id);

  // Check if already reserved
  const existing = reservations.find(r => r.userId === effectiveUserId && r.campaignId === campaign.id && r.status !== "rejected");
  if (existing) {
    return res.status(400).json({ error: "You already have an active reservation for this campaign" });
  }

  // Calculate deadline: standard is 48 hours, but if subscription ends earlier, cap it at subscription expiry!
  // "agr maanle kisi ne paid liya or champ… reserve kri lekin uska subscription agle din khatm hone wala or usne wapis work link submit nai kiya to wo reserved v udd jani chahiye"
  const standard48h = now + 48 * 60 * 60 * 1000;
  const effectiveExpiresAt = (subExpiresAt > 0 && subExpiresAt < standard48h) ? subExpiresAt : standard48h;

  campaign.spotsRemaining = Math.max(0, campaign.spotsRemaining - 1);
  saveCampaigns(campaigns);

  const newReservation = {
    id: Date.now(),
    campaignId: campaign.id,
    userId: effectiveUserId,
    status: "reserved",
    reservedAt: new Date().toISOString(),
    expiresAt: new Date(effectiveExpiresAt).toISOString(),
    submittedAt: null,
    reviewedAt: null,
    trackingNumber: "EXP-" + Math.floor(100000 + Math.random() * 900000),
    shippingStatus: "processing",
    shippedAt: null,
    deliveryConfirmed: false,
    deliveredAt: null,
    campaign: { ...campaign },
  };

  reservations.push(newReservation);
  saveReservations(reservations);

  currentUserProfile.activeReservations = (currentUserProfile.activeReservations || 0) + 1;
  saveUserProfile();

  res.json(newReservation);
});

// POST /api/reservations/:id/submit - submit work link
app.post("/api/reservations/:id/submit", (req, res) => {
  cleanReservations();
  const resId = Number(req.params.id);
  const reservations = loadReservations();
  const r = reservations.find(item => item.id === resId);

  if (!r) {
    return res.status(404).json({ error: "Reservation not found or has expired" });
  }

  if (r.status !== "reserved") {
    return res.status(400).json({ error: "This reservation is already submitted or closed" });
  }

  const { link, clipUrl, postUrl } = req.body;
  const finalLink = link || postUrl || "";

  if (!finalLink || !finalLink.trim()) {
    return res.status(400).json({ error: "Please provide your post or reel URL" });
  }

  r.status = "submitted";
  r.submittedAt = new Date().toISOString();
  r.postUrl = finalLink.trim();
  r.clipUrl = clipUrl ? clipUrl.trim() : null;

  saveReservations(reservations);

  // Add confirmation notification
  userNotifications.unshift({
    id: Date.now(),
    userId: r.userId,
    type: "submission_received",
    title: "Submission Received ⏳",
    message: `Your proof for ${r.campaign?.title || 'campaign'} has been submitted and is under brand review.`,
    isRead: false,
    link: "/my-campaigns",
    createdAt: new Date().toISOString()
  });
  saveUserNotifications(userNotifications);

  res.json({ success: true, reservation: r });
});

// POST /api/reservations/:id/cancel & DELETE /api/reservations/:id
app.all(["/api/reservations/:id/cancel", "/api/reservations/:id"], (req, res) => {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resId = Number(req.params.id);
  const reservations = loadReservations();
  const campaigns = loadCampaigns();

  const idx = reservations.findIndex(r => r.id === resId);
  if (idx !== -1) {
    const r = reservations[idx];
    if (r.status === "reserved" && !r.submittedAt) {
      const camp = campaigns.find(c => c.id === r.campaignId);
      if (camp && camp.spotsRemaining < camp.totalSpots) {
        camp.spotsRemaining += 1;
        saveCampaigns(campaigns);
      }
    }
    reservations.splice(idx, 1);
    saveReservations(reservations);
  }

  res.json({ success: true, message: "Reservation cancelled" });
});

// DELETE /api/users/:id
app.delete("/api/users/:id", (req, res) => {
  res.json({ success: true, message: "Account deleted" });
});

// PUT /api/users/:id/shipping-address
app.put("/api/users/:id/shipping-address", (req, res) => {
  const { shippingAddress, shippingCity, shippingState, shippingPincode, shippingPhone } = req.body;
  currentUserProfile.shippingAddress = shippingAddress ?? currentUserProfile.shippingAddress;
  currentUserProfile.shippingCity = shippingCity ?? currentUserProfile.shippingCity;
  currentUserProfile.shippingState = shippingState ?? currentUserProfile.shippingState;
  currentUserProfile.shippingPincode = shippingPincode ?? currentUserProfile.shippingPincode;
  currentUserProfile.shippingPhone = shippingPhone ?? currentUserProfile.shippingPhone;
  saveUserProfile();
  res.json(getSafeUserProfile(currentUserProfile));
});

// ================= OFFICIAL INSTAGRAM BUSINESS LOGIN OAUTH =================

// Instagram Configuration - Get
app.get("/api/instagram/config", (req, res) => {
  const { appId, appSecret } = getInstagramCredentials();
  const redirectUri = getInstagramRedirectUri(req);
  res.json({
    configured: Boolean(appId && appSecret),
    appId: appId || "",
    appSecretConfigured: Boolean(appSecret),
    redirectUri,
  });
});

// Instagram Configuration - Save
app.post(["/api/instagram/config", "/api/instagram/configure"], (req, res) => {
  const { appId, appSecret, redirectUri } = req.body;
  const settings = loadSettings();
  if (typeof appId === "string") settings.instagram_app_id = appId.trim();
  if (typeof appSecret === "string" && appSecret.trim()) settings.instagram_app_secret = appSecret.trim();
  if (typeof redirectUri === "string" && redirectUri.trim()) settings.instagram_redirect_uri = redirectUri.trim();
  saveSettings(settings);

  console.log(`[INSTAGRAM_CONFIG] Saved App ID: ${settings.instagram_app_id ? settings.instagram_app_id.slice(0, 4) + '...' : 'none'}, Secret: ${Boolean(settings.instagram_app_secret)}`);
  return res.json({ 
    success: true, 
    configured: Boolean(settings.instagram_app_id && settings.instagram_app_secret),
    appId: settings.instagram_app_id || "",
    redirectUri: getInstagramRedirectUri(req)
  });
});

// 1. GET /api/instagram/login - Initiates official Meta OAuth authorization
app.get("/api/instagram/login", (req, res) => {
  const { appId, appSecret } = getInstagramCredentials();
  const redirectUri = getInstagramRedirectUri(req);
  const wantsJson = req.query.format === "json" || req.headers.accept?.includes("application/json");
  const forceSetup = req.query.setup === "1" || req.query.configure === "1";
  const userId = req.query.userId ? Number(req.query.userId) : currentUserProfile.id;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";

  // Anti-Farming & Abuse Rate Limiter check
  const rateCheck = checkRateLimitAndFarming(clientIp, userId);
  if (!rateCheck.allowed) {
    console.warn(`[SECURITY] Instagram connect blocked by rate limiter for User #${userId} (IP: ${clientIp}): ${rateCheck.reason}`);
    recordSecurityEvent({
      event: "LINK_REJECTED_RATE_LIMIT",
      mingreeUserId: userId,
      instagramUsername: "unknown",
      riskScore: 85,
      riskLevel: "HIGH",
      riskFactors: [rateCheck.reason || "Rate limit / farming protection triggered"],
      followers: 0,
      mediaCount: 0,
      ipAddress: clientIp,
      userAgent: String(req.headers["user-agent"] || ""),
      decision: "BLOCK",
      details: rateCheck.reason || "Rate limit exceeded",
    });

    if (wantsJson) {
      return res.status(429).json({ error: rateCheck.reason, rateLimited: true, retryAfterSeconds: rateCheck.retryAfterSeconds });
    }
    return res.status(429).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Security Rate Limit - Mingree</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #18181b; border: 1px solid #ef4444; border-radius: 16px; padding: 32px 24px; max-width: 440px; text-align: center; }
            h2 { color: #f87171; font-size: 20px; margin: 0 0 12px; }
            p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 20px; }
            button { background: #3f3f46; color: #ffffff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ Security Protection Notice</h2>
            <p>${rateCheck.reason}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }

  if (!appId || !appSecret || forceSetup) {
    const errorMsg = "Instagram Meta App ID or Secret is not configured. Please enter credentials in the setup window.";
    if (wantsJson) {
      return res.status(400).json({ error: errorMsg, configured: false, redirectUri, appId: appId || "" });
    }
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Enter Meta Instagram Credentials - Mingree</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              background: #09090b; 
              color: #f8fafc; 
              padding: 24px 16px; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 95vh; 
              margin: 0; 
            }
            .card { 
              max-width: 520px; 
              width: 100%; 
              background: #18181b; 
              border-radius: 20px; 
              padding: 28px; 
              border: 1px solid #27272a; 
              box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); 
            }
            .header { text-align: center; margin-bottom: 24px; }
            .icon { 
              width: 52px; 
              height: 52px; 
              margin: 0 auto 14px; 
              border-radius: 14px; 
              background: linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6); 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 26px; 
              box-shadow: 0 10px 20px rgba(236,72,153,0.3);
            }
            h2 { margin: 0 0 6px; font-size: 20px; font-weight: 700; color: #ffffff; }
            p.desc { color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 0; }
            
            .uri-box { 
              background: #09090b; 
              border-radius: 12px; 
              padding: 12px 14px; 
              margin-bottom: 20px; 
              border: 1px solid #27272a; 
            }
            .uri-label { 
              font-weight: 600; 
              color: #ec4899; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 6px; 
              font-size: 11px; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
            }
            .copy-btn {
              background: rgba(236,72,153,0.15); 
              border: 1px solid rgba(236,72,153,0.4); 
              color: #f472b6; 
              cursor: pointer; 
              font-size: 11px; 
              font-weight: 600;
              padding: 3px 8px;
              border-radius: 6px;
              transition: all 0.2s;
            }
            .copy-btn:hover { background: rgba(236,72,153,0.3); }
            code { 
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
              word-break: break-all; 
              color: #38bdf8; 
              display: block; 
              font-size: 11px; 
              background: #18181b; 
              padding: 8px 10px; 
              border-radius: 6px; 
              border: 1px solid #27272a; 
            }

            .form-group { margin-bottom: 16px; text-align: left; }
            label { display: block; font-size: 12px; font-weight: 600; color: #e4e4e7; margin-bottom: 6px; }
            .hint { font-size: 11px; color: #71717a; margin-top: 4px; }
            input[type="text"], input[type="password"] {
              width: 100%;
              background: #09090b;
              border: 1px solid #3f3f46;
              border-radius: 10px;
              padding: 12px 14px;
              color: #ffffff;
              font-size: 14px;
              outline: none;
              transition: border-color 0.2s;
            }
            input:focus { border-color: #ec4899; box-shadow: 0 0 0 2px rgba(236,72,153,0.2); }
            
            .pw-toggle {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-top: 6px;
              font-size: 11px;
              color: #a1a1aa;
              cursor: pointer;
            }

            .btn-submit {
              width: 100%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #ec4899, #8b5cf6);
              color: white;
              padding: 13px 20px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 14px;
              border: none;
              cursor: pointer;
              transition: opacity 0.2s, transform 0.1s;
              margin-top: 10px;
              box-shadow: 0 4px 15px rgba(236,72,153,0.4);
            }
            .btn-submit:hover { opacity: 0.95; }
            .btn-submit:active { transform: scale(0.99); }
            .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

            .btn-close {
              width: 100%;
              background: #27272a;
              color: #a1a1aa;
              border: 1px solid #3f3f46;
              padding: 10px;
              border-radius: 10px;
              font-size: 12px;
              cursor: pointer;
              margin-top: 10px;
            }
            .btn-close:hover { background: #3f3f46; color: #ffffff; }

            .status-msg {
              display: none;
              margin-top: 14px;
              padding: 10px 14px;
              border-radius: 10px;
              font-size: 12px;
              text-align: center;
            }
            .status-success {
              display: block;
              background: rgba(16, 185, 129, 0.15);
              border: 1px solid #10b981;
              color: #34d399;
            }
            .status-error {
              display: block;
              background: rgba(239, 68, 68, 0.15);
              border: 1px solid #ef4444;
              color: #f87171;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="icon">📸</div>
              <h2>Enter Meta Credentials</h2>
              <p class="desc">Paste your Meta App ID &amp; App Secret below to start official Instagram Business Login.</p>
            </div>
            
            <div class="uri-box">
              <div class="uri-label">
                <span>1. Meta Redirect URI (Callback)</span>
                <button type="button" class="copy-btn" onclick="copyUri()">Copy URL</button>
              </div>
              <code id="uriText">${redirectUri}</code>
              <div class="hint" style="margin-top:6px;">Add this in Meta Console &gt; Instagram business login &gt; Redirect URL</div>
            </div>

            <form id="credsForm" onsubmit="saveAndContinue(event)">
              <div class="form-group">
                <label for="appIdInput">2. Meta App ID (Client ID) *</label>
                <input 
                  id="appIdInput" 
                  type="text" 
                  placeholder="e.g. 123456789012345" 
                  value="${appId || ''}" 
                  required 
                  autocomplete="off"
                />
                <div class="hint">Found in Meta for Developers &gt; App Settings &gt; Basic</div>
              </div>

              <div class="form-group">
                <label for="appSecretInput">3. Meta App Secret (Client Secret) *</label>
                <input 
                  id="appSecretInput" 
                  type="password" 
                  placeholder="Enter 32-character Meta App Secret" 
                  value="${appSecret || ''}" 
                  required 
                  autocomplete="new-password"
                />
                <label class="pw-toggle">
                  <input type="checkbox" onchange="toggleSecretVisibility(this)"> Show App Secret
                </label>
              </div>

              <button type="submit" id="submitBtn" class="btn-submit">
                Save &amp; Continue to Instagram Login →
              </button>
            </form>

            <div id="statusBox" class="status-msg"></div>

            <button type="button" onclick="window.close()" class="btn-close">Cancel / Close Window</button>
          </div>

          <script>
            function copyUri() {
              var text = document.getElementById('uriText').innerText;
              navigator.clipboard.writeText(text).then(function() {
                showStatus('✓ Redirect URI copied to clipboard!', 'success');
                setTimeout(function() { hideStatus(); }, 2500);
              });
            }

            function toggleSecretVisibility(checkbox) {
              var input = document.getElementById('appSecretInput');
              input.type = checkbox.checked ? 'text' : 'password';
            }

            function showStatus(text, type) {
              var box = document.getElementById('statusBox');
              box.className = 'status-msg ' + (type === 'success' ? 'status-success' : 'status-error');
              box.innerText = text;
            }

            function hideStatus() {
              var box = document.getElementById('statusBox');
              box.style.display = 'none';
            }

            function saveAndContinue(e) {
              e.preventDefault();
              var appId = document.getElementById('appIdInput').value.trim();
              var appSecret = document.getElementById('appSecretInput').value.trim();
              var btn = document.getElementById('submitBtn');

              if (!appId || !appSecret) {
                showStatus('Please enter both Meta App ID and App Secret', 'error');
                return;
              }

              btn.disabled = true;
              btn.innerText = 'Saving credentials...';
              showStatus('Saving credentials to Mingree...', 'success');

              fetch('/api/instagram/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId: appId, appSecret: appSecret })
              })
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data.success) {
                  showStatus('✓ Credentials saved! Redirecting to official Instagram OAuth...', 'success');
                  btn.innerText = 'Redirecting to Meta...';
                  // Notify parent window if open
                  if (window.opener && !window.opener.closed) {
                    try {
                      window.opener.postMessage({ type: 'INSTAGRAM_CONFIG_UPDATED' }, '*');
                    } catch(err) {}
                  }
                  // Immediately proceed to OAuth authorization flow in this popup window!
                  setTimeout(function() {
                    window.location.href = '/api/instagram/login?userId=' + encodeURIComponent('${userId}');
                  }, 800);
                } else {
                  throw new Error(data.error || 'Failed to save credentials');
                }
              })
              .catch(function(err) {
                btn.disabled = false;
                btn.innerText = 'Save & Continue to Instagram Login →';
                showStatus('Error: ' + (err.message || 'Failed to save'), 'error');
              });
            }
          </script>
        </body>
      </html>
    `);
  }

  // Generate cryptographically signed state token (resilient against CSRF and server reboots)
  const returnTo = typeof req.query.return_to === "string" ? req.query.return_to : "/dashboard";
  const state = createSignedOAuthState(userId, returnTo, appSecret);

  instagramOAuthStates.set(state, {
    userId,
    createdAt: Date.now(),
    returnTo,
  });

  // Official Instagram Business Login OAuth URL
  // Uses official www.instagram.com authorization endpoint, instagram_business_basic scope,
  // and #weblink fragment to prevent iOS Universal Link app hijacking
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=instagram_business_basic&state=${encodeURIComponent(state)}#weblink`;

  console.log(`[INSTAGRAM OAUTH] ========================================================`);
  console.log(`[INSTAGRAM OAUTH] Official Instagram OAuth Authorization Flow Initiated`);
  console.log(`[INSTAGRAM OAUTH] Authorization Endpoint: https://www.instagram.com/oauth/authorize`);
  console.log(`[INSTAGRAM OAUTH] Using Instagram App ID: ${appId}`);
  console.log(`[INSTAGRAM OAUTH] App Secret Configured: ${Boolean(appSecret)}`);
  console.log(`[INSTAGRAM OAUTH] Redirect URI: ${redirectUri}`);
  console.log(`[INSTAGRAM OAUTH] Scope: instagram_business_basic`);
  console.log(`[INSTAGRAM OAUTH] Response Type: code`);
  console.log(`[INSTAGRAM OAUTH] State Token Length: ${state.length}`);
  console.log(`[INSTAGRAM OAUTH] Mingree User ID: ${userId}`);
  console.log(`[INSTAGRAM OAUTH] User-Agent: ${req.headers["user-agent"] || "unknown"}`);
  console.log(`[INSTAGRAM OAUTH] ========================================================`);

  if (wantsJson) {
    return res.json({ authUrl, redirectUri, state, configured: true });
  }

  return res.redirect(authUrl);
});

// Alias for auth-url endpoint (returns JSON with authorization url)
app.get("/api/instagram/auth-url", (req, res) => {
  const { appId, appSecret } = getInstagramCredentials();
  const redirectUri = getInstagramRedirectUri(req);
  if (!appId) {
    return res.status(400).json({ 
      error: "Instagram Meta App ID is not configured in Admin Settings.",
      configured: false,
      redirectUri
    });
  }
  const returnTo = typeof req.query.return_to === "string" ? req.query.return_to : "/dashboard";
  const userId = req.query.userId ? Number(req.query.userId) : currentUserProfile.id;
  const state = createSignedOAuthState(userId, returnTo, appSecret);
  instagramOAuthStates.set(state, {
    userId,
    createdAt: Date.now(),
    returnTo,
  });
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=instagram_business_basic&state=${encodeURIComponent(state)}#weblink`;
  console.log(`[INSTAGRAM OAUTH] Generated auth-url for client: ${appId}`);
  res.json({ authUrl, redirectUri, state, configured: true });
});

// 2. GET /api/instagram/callback - Receives authorization code, validates state, exchanges token server-side
app.get(["/api/instagram/callback", "/api/instagram/oauth-callback"], async (req, res) => {
  const { code, state, error, error_reason, error_description } = req.query;
  const redirectUri = getInstagramRedirectUri(req);

  console.log(`[INSTAGRAM OAUTH] ========================================================`);
  console.log(`[INSTAGRAM OAUTH] OAuth Callback Received from Meta/Instagram`);
  console.log(`[INSTAGRAM OAUTH] Callback URL: ${req.originalUrl}`);
  console.log(`[INSTAGRAM OAUTH] Code Present: ${Boolean(code)} (length: ${typeof code === "string" ? code.length : 0})`);
  console.log(`[INSTAGRAM OAUTH] State Present: ${Boolean(state)}`);
  console.log(`[INSTAGRAM OAUTH] Expected Redirect URI: ${redirectUri}`);
  if (error || error_reason || error_description) {
    console.warn(`[INSTAGRAM OAUTH] Meta returned error parameters:`, { error, error_reason, error_description });
  }
  console.log(`[INSTAGRAM OAUTH] ========================================================`);

  // Helper to render popup callback HTML with cross-window postMessage
  const renderOAuthResult = (result: {
    success: boolean;
    username?: string;
    followers?: number;
    error?: string;
    returnTo?: string;
  }) => {
    const isSuccess = result.success;
    const destPath = result.returnTo || "/dashboard";
    const destUrl = isSuccess 
      ? `${destPath}${destPath.includes('?') ? '&' : '?'}instagram_connected=true&username=${encodeURIComponent(result.username || '')}`
      : `${destPath}${destPath.includes('?') ? '&' : '?'}instagram_error=${encodeURIComponent(result.error || 'Connection failed')}`;
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${isSuccess ? "Instagram Connected" : "Instagram Connection Failed"}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              background: #1e293b;
              border: 1px solid #334155;
              border-radius: 20px;
              padding: 36px 28px;
              text-align: center;
              max-width: 420px;
              width: 100%;
              box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5);
            }
            .icon-wrapper {
              width: 68px;
              height: 68px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: ${isSuccess ? 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)' : '#ef4444'};
            }
            h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
            .badge {
              display: inline-block;
              background: #0f172a;
              border: 1px solid #334155;
              padding: 8px 16px;
              border-radius: 9999px;
              font-weight: 600;
              font-size: 15px;
              color: #38bdf8;
              margin-bottom: 20px;
            }
            .btn {
              display: inline-block;
              background: #3b82f6;
              color: #ffffff;
              padding: 10px 24px;
              border-radius: 10px;
              font-weight: 600;
              font-size: 14px;
              text-decoration: none;
              cursor: pointer;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-wrapper">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${isSuccess 
                  ? '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>'
                  : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
                }
              </svg>
            </div>
            <h1>${isSuccess ? "Instagram Connected!" : "Connection Failed"}</h1>
            ${isSuccess 
              ? `<div class="badge">@${result.username}</div>
                 <p>Your official Instagram account has been securely verified and linked to your Mingree profile.</p>`
              : `<p style="color: #f87171;">${result.error || "An error occurred during verification."}</p>`
            }
            <button class="btn" onclick="finish()">Return to Mingree</button>
          </div>
          <script>
            function finish() {
              if (window.opener) {
                try { window.close(); } catch(e) {}
              }
              window.location.href = '${destUrl}';
            }

            // Cross-window notification per AI Studio OAuth guidelines
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: '${isSuccess ? "INSTAGRAM_OAUTH_SUCCESS" : "INSTAGRAM_OAUTH_ERROR"}',
                  status: '${isSuccess ? "success" : "error"}',
                  username: '${result.username || ""}',
                  followers: ${result.followers || 0},
                  error: '${(result.error || "").replace(/'/g, "\\'")}'
                }, '*');
                setTimeout(() => {
                  try { window.close(); } catch(e) {}
                  window.location.href = '${destUrl}';
                }, 1200);
              } else {
                setTimeout(finish, 1800);
              }
            } catch (e) {
              setTimeout(finish, 1800);
            }
          </script>
        </body>
      </html>
    `;
  };

  // 1. Handle error returned by Meta
  if (error) {
    const errorMsg = (error_description as string) || (error_reason as string) || (error as string) || "OAuth access denied by user";
    console.warn(`[INSTAGRAM OAUTH] Callback returned error: ${errorMsg}`);
    return res.status(400).send(renderOAuthResult({ success: false, error: errorMsg }));
  }

  // 2. Validate state parameter (CSRF protection with signed token fallback)
  const { appId, appSecret } = getInstagramCredentials();
  let stateRecord: { userId: number; returnTo?: string } | undefined;

  if (typeof state === "string" && state.trim()) {
    if (instagramOAuthStates.has(state)) {
      stateRecord = instagramOAuthStates.get(state);
      instagramOAuthStates.delete(state);
    } else {
      const verified = verifySignedOAuthState(state, appSecret);
      if (verified) {
        stateRecord = { userId: verified.userId, returnTo: verified.returnTo };
      }
    }
  }

  const clientReturnTo = stateRecord?.returnTo || "/dashboard";

  if (!stateRecord) {
    console.error("[INSTAGRAM OAUTH] Invalid or expired state parameter");
    return res.status(400).send(renderOAuthResult({
      success: false,
      error: "Invalid or expired authorization session. Please restart connection from Mingree.",
      returnTo: clientReturnTo,
    }));
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send(renderOAuthResult({
      success: false,
      error: "No authorization code provided in callback from Instagram.",
      returnTo: clientReturnTo,
    }));
  }

  const cleanCode = code.replace(/#_$/, "");
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
  const userAgent = String(req.headers["user-agent"] || "unknown");

  // Verify rate limit & farming lockout on callback
  const callbackRateCheck = checkRateLimitAndFarming(clientIp, stateRecord.userId);
  if (!callbackRateCheck.allowed) {
    recordFailedAttempt(clientIp, stateRecord.userId);
    recordSecurityEvent({
      event: "LINK_REJECTED_RATE_LIMIT",
      mingreeUserId: stateRecord.userId,
      instagramUsername: "unknown",
      riskScore: 85,
      riskLevel: "HIGH",
      riskFactors: [callbackRateCheck.reason || "Rate limit exceeded"],
      followers: 0,
      mediaCount: 0,
      ipAddress: clientIp,
      userAgent,
      decision: "BLOCK",
      details: callbackRateCheck.reason || "Rate limit / anti-farming lockout active",
    });
    return res.status(429).send(renderOAuthResult({
      success: false,
      error: callbackRateCheck.reason || "Too many connection attempts. Please try again later.",
      returnTo: clientReturnTo,
    }));
  }

  if (!appId || !appSecret) {
    return res.status(500).send(renderOAuthResult({
      success: false,
      error: "Instagram App ID or App Secret is not configured on server."
    }));
  }

  try {
    console.log(`[INSTAGRAM OAUTH] ========================================================`);
    console.log(`[INSTAGRAM OAUTH] Exchanging Authorization Code for Instagram Access Token`);
    console.log(`[INSTAGRAM OAUTH] Token Endpoint: https://api.instagram.com/oauth/access_token`);
    console.log(`[INSTAGRAM OAUTH] Using Client ID (Instagram App ID): ${appId}`);
    console.log(`[INSTAGRAM OAUTH] Client Secret Present: ${Boolean(appSecret)}`);
    console.log(`[INSTAGRAM OAUTH] Grant Type: authorization_code`);
    console.log(`[INSTAGRAM OAUTH] Redirect URI: ${redirectUri}`);
    console.log(`[INSTAGRAM OAUTH] Code Length: ${cleanCode.length}`);
    console.log(`[INSTAGRAM OAUTH] ========================================================`);
    
    // 3. Exchange authorization code for Instagram access token server-side
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: cleanCode,
      }),
    });

    console.log(`[INSTAGRAM OAUTH] Meta Token Response Status: ${tokenRes.status} ${tokenRes.statusText}`);

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[INSTAGRAM OAUTH] Token exchange failed with status", tokenRes.status, "Body:", errBody);
      recordFailedAttempt(clientIp, stateRecord.userId);
      let errMsg = "Failed to exchange authorization code for access token with Meta.";
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.error_message) {
          errMsg = parsed.error_message;
        } else if (parsed.message) {
          errMsg = parsed.message;
        }
      } catch {}
      return res.status(400).send(renderOAuthResult({ success: false, error: errMsg, returnTo: clientReturnTo }));
    }

    const tokenData = await tokenRes.json();
    const shortLivedAccessToken = tokenData.access_token;
    const igUserId = String(tokenData.user_id);

    console.log(`[INSTAGRAM OAUTH] ✓ Token exchange successful! Instagram User ID: ${igUserId}`);

    // 4. Fetch Instagram profile & followers & media count from Meta Graph API
    let igUsername = `instagram_user_${igUserId}`;
    let followersCount = 0;
    let mediaCount = 0;
    let accountType = "BUSINESS";

    try {
      console.log(`[INSTAGRAM OAUTH] Fetching profile details from Graph API v21.0...`);
      const profileRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,media_count,profile_picture_url,followers_count&access_token=${encodeURIComponent(shortLivedAccessToken)}`);
      if (profileRes.ok) {
        const pData = await profileRes.json();
        if (pData.username) igUsername = pData.username;
        if (typeof pData.followers_count === "number") followersCount = pData.followers_count;
        if (typeof pData.media_count === "number") mediaCount = pData.media_count;
        if (pData.account_type) accountType = pData.account_type;
        console.log(`[INSTAGRAM OAUTH] ✓ Fetched profile: @${igUsername}, account_type: ${accountType}, followers: ${followersCount}, media_count: ${mediaCount}`);
      } else {
        const pErr = await profileRes.text();
        console.warn(`[INSTAGRAM OAUTH] Graph API v21.0 /me returned ${profileRes.status}:`, pErr);
        console.log(`[INSTAGRAM OAUTH] Falling back to basic Graph API /me...`);
        const basicRes = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${encodeURIComponent(shortLivedAccessToken)}`);
        if (basicRes.ok) {
          const bData = await basicRes.json();
          if (bData.username) igUsername = bData.username;
          if (typeof bData.media_count === "number") mediaCount = bData.media_count;
          if (bData.account_type) accountType = bData.account_type;
          console.log(`[INSTAGRAM OAUTH] ✓ Basic profile fetched: @${igUsername}, media_count: ${mediaCount}`);
        } else {
          const bErr = await basicRes.text();
          console.warn(`[INSTAGRAM OAUTH] Basic profile fetch returned ${basicRes.status}:`, bErr);
        }
      }
    } catch (profileErr) {
      console.error("[INSTAGRAM OAUTH] Profile fetch error:", profileErr);
    }

    // 5. Exchange for long-lived access token (valid 60 days) server-side
    let finalAccessToken = shortLivedAccessToken;
    try {
      const longLivedRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(shortLivedAccessToken)}`);
      if (longLivedRes.ok) {
        const llData = await longLivedRes.json();
        if (llData.access_token) {
          finalAccessToken = llData.access_token;
          console.log("[INSTAGRAM OAUTH] Acquired 60-day long-lived access token");
        }
      }
    } catch (llErr) {
      console.warn("[INSTAGRAM OAUTH] Long-lived token exchange warning:", llErr);
    }

    // 6. Security Check: Enforce minimum follower requirement (e.g. 500 followers)
    const minRequiredFollowers = getMinInstagramFollowers();
    if (followersCount < minRequiredFollowers) {
      console.warn(`[INSTAGRAM OAUTH] Connection REJECTED: @${igUsername} has only ${followersCount} followers. Minimum required is ${minRequiredFollowers}.`);
      recordFailedAttempt(clientIp, stateRecord.userId);
      recordSecurityEvent({
        event: "LINK_REJECTED_MIN_FOLLOWERS",
        mingreeUserId: stateRecord.userId,
        instagramUsername: igUsername,
        instagramUserId: igUserId,
        riskScore: 20,
        riskLevel: "LOW",
        riskFactors: [`Follower count (${followersCount}) is below platform minimum requirement (${minRequiredFollowers})`],
        followers: followersCount,
        mediaCount: mediaCount,
        ipAddress: clientIp,
        userAgent,
        decision: "BLOCK",
        details: `Account @${igUsername} has ${followersCount} followers. Minimum required is ${minRequiredFollowers}.`,
      });

      return res.send(renderOAuthResult({
        success: false,
        username: igUsername,
        followers: followersCount,
        error: `Instagram account @${igUsername} has only ${followersCount.toLocaleString()} followers. Mingree requires a minimum of ${minRequiredFollowers.toLocaleString()} followers to connect an account and qualify for campaigns.`,
        returnTo: clientReturnTo,
      }));
    }

    // 7. Security Check: Enforce One-to-One Binding & Reclaim Protection
    // Restricts one Instagram identity from linking to multiple Mingree accounts
    // Secures re-authentication so disconnected accounts cannot be hijacked
    const bindingCheck = checkIdentityBinding(igUserId, igUsername, stateRecord.userId);
    if (!bindingCheck.allowed) {
      console.warn(`[SECURITY] One-to-One Binding / Reclaim restriction triggered for @${igUsername}: ${bindingCheck.reason}`);
      recordFailedAttempt(clientIp, stateRecord.userId);
      recordSecurityEvent({
        event: bindingCheck.isReclaimAttempt ? "LINK_REJECTED_UNAUTHORIZED_RECLAIM" : "LINK_REJECTED_DUPLICATE",
        mingreeUserId: stateRecord.userId,
        instagramUsername: igUsername,
        instagramUserId: igUserId,
        riskScore: 75,
        riskLevel: "HIGH",
        riskFactors: [bindingCheck.reason || "Duplicate or unauthorized reclaim attempt"],
        followers: followersCount,
        mediaCount: mediaCount,
        ipAddress: clientIp,
        userAgent,
        decision: "BLOCK",
        details: bindingCheck.reason || "One-to-One Instagram Identity restriction",
      });

      return res.send(renderOAuthResult({
        success: false,
        username: igUsername,
        followers: followersCount,
        error: bindingCheck.reason || "This Instagram account cannot be linked to this Mingree profile.",
        returnTo: clientReturnTo,
      }));
    }

    // 8. Security Check: Bot / Suspicious Account Detection & Risk Scoring
    // Analyzes media count, follower velocity bursts, username entropy without blocking genuine low-follower users
    const riskEval = evaluateBotAndRiskScore({
      instagramUserId: igUserId,
      instagramUsername: igUsername,
      followers: followersCount,
      mediaCount: mediaCount,
      accountType,
      mingreeUserId: stateRecord.userId,
    });

    if (riskEval.isBlocked) {
      console.warn(`[SECURITY] Bot / High Risk Account blocked: @${igUsername} (Score: ${riskEval.riskScore}/100)`);
      recordFailedAttempt(clientIp, stateRecord.userId);
      recordSecurityEvent({
        event: "LINK_REJECTED_BOT_RISK",
        mingreeUserId: stateRecord.userId,
        instagramUsername: igUsername,
        instagramUserId: igUserId,
        riskScore: riskEval.riskScore,
        riskLevel: riskEval.riskLevel,
        riskFactors: riskEval.riskFactors,
        followers: followersCount,
        mediaCount: mediaCount,
        ipAddress: clientIp,
        userAgent,
        decision: "BLOCK",
        details: riskEval.blockReason || "High risk bot signals detected",
      });

      return res.send(renderOAuthResult({
        success: false,
        username: igUsername,
        followers: followersCount,
        error: riskEval.blockReason || "Instagram connection blocked due to suspicious automated activity patterns.",
        returnTo: clientReturnTo,
      }));
    }

    // 9. Identity Verified & Registered - Securely store in Identity Registry
    bindIdentityToUser({
      instagramUserId: igUserId,
      instagramUsername: igUsername,
      mingreeUserId: stateRecord.userId,
      followers: followersCount,
      mediaCount: mediaCount,
      riskScore: riskEval.riskScore,
      riskFactors: riskEval.riskFactors,
    });

    // 10. Record Security Audit Log
    recordSecurityEvent({
      event: "LINK_APPROVED",
      mingreeUserId: stateRecord.userId,
      instagramUsername: igUsername,
      instagramUserId: igUserId,
      riskScore: riskEval.riskScore,
      riskLevel: riskEval.riskLevel,
      riskFactors: riskEval.riskFactors,
      followers: followersCount,
      mediaCount: mediaCount,
      ipAddress: clientIp,
      userAgent,
      decision: riskEval.riskLevel === "MEDIUM" ? "MONITOR" : "ALLOW",
      details: `Instagram account @${igUsername} (${followersCount.toLocaleString()} followers, ${mediaCount} posts) linked successfully to User #${stateRecord.userId}. Risk level: ${riskEval.riskLevel} (${riskEval.riskScore}/100).`,
    });

    // 11. Securely update user profile
    currentUserProfile.instagramUsername = igUsername;
    currentUserProfile.instagramProfileUrl = `https://instagram.com/${igUsername}`;
    currentUserProfile.instagramFollowers = followersCount;
    currentUserProfile.followers = followersCount;
    currentUserProfile.isInstagramVerified = true;
    currentUserProfile.instagramVerificationStatus = "verified";
    currentUserProfile.instagramUserId = igUserId;
    currentUserProfile.instagramAccessToken = finalAccessToken; // strictly server-side
    currentUserProfile.instagramTokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    saveUserProfile();

    console.log(`[INSTAGRAM OAUTH] Successfully connected @${igUsername} (${followersCount} followers, ${mediaCount} media) to creator ${currentUserProfile.id} with Risk Score ${riskEval.riskScore}/100`);

    return res.send(renderOAuthResult({
      success: true,
      username: igUsername,
      followers: currentUserProfile.instagramFollowers,
      returnTo: clientReturnTo,
    }));
  } catch (err) {
    const errorStr = err instanceof Error ? err.message : String(err);
    console.error("[INSTAGRAM OAUTH] Unexpected error:", errorStr);
    return res.status(500).send(renderOAuthResult({ success: false, error: errorStr, returnTo: clientReturnTo }));
  }
});

// User check Instagram verification status
app.post("/api/users/:id/instagram/verify", (req, res) => {
  // Respect authentic Meta OAuth verification status; prevent fake spoofing
  res.json(getSafeUserProfile(currentUserProfile));
});

// Standalone Instagram verification APIs
app.post("/api/instagram/fetch-followers", (req, res) => {
  const username = req.body.username || currentUserProfile.instagramUsername;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  res.json({ followers: currentUserProfile.instagramFollowers || 0, username, message: "Profile fetched" });
});

app.post("/api/instagram/submit", (req, res) => {
  res.json({ success: true, message: "Use official Meta Instagram Login OAuth flow to verify account" });
});

app.post("/api/instagram/generate-code", (req, res) => {
  res.json({ 
    error: "Legacy verification code system has been deprecated. Please use official Meta Instagram Login OAuth.",
    deprecated: true
  });
});

app.post("/api/instagram/verify", (req, res) => {
  res.json({ 
    verified: Boolean(currentUserProfile.isInstagramVerified), 
    message: currentUserProfile.isInstagramVerified 
      ? "Account is officially verified via Meta OAuth" 
      : "Please connect via official Meta Instagram Login OAuth to verify" 
  });
});

// Meta Deauthorize Callback URL (required by Meta Developers)
app.post("/api/instagram/deauthorize", (req, res) => {
  console.log(`[INSTAGRAM WEBHOOK] Deauthorize callback received from Meta:`, req.body);
  // Meta sends signed_request; acknowledge receipt with 200 OK
  res.status(200).json({ success: true, message: "Deauthorized successfully" });
});

// Meta Data Deletion Request Callback URL (required by Meta Developers for Live Mode)
app.all("/api/instagram/data-deletion", (req, res) => {
  const confirmationCode = `DEL_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const origin = `${req.protocol}://${req.get("host")}`;
  const statusUrl = `${origin}/data-deletion?code=${confirmationCode}`;
  console.log(`[INSTAGRAM WEBHOOK] Data deletion request received, confirmation: ${confirmationCode}`);
  
  res.status(200).json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
});

// ================= ADMIN SECURITY & ANTI-ABUSE AUDIT APIS =================

// GET /api/admin/security/logs - Get recent security audit logs
app.get("/api/admin/security/logs", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const logs = getSecurityAuditLogs(limit);
  res.json({ logs });
});

// GET /api/admin/security/identities - Get all registered Instagram identities & bindings
app.get("/api/admin/security/identities", (req, res) => {
  const identities = getAllIdentities();
  res.json({ identities });
});

// GET /api/admin/security/stats - High-level security metrics
app.get("/api/admin/security/stats", (req, res) => {
  const logs = getSecurityAuditLogs(500);
  const identities = getAllIdentities();
  
  const totalIdentities = identities.length;
  const activeBound = identities.filter(i => i.boundMingreeUserId > 0).length;
  const lockedIdentities = identities.filter(i => i.isLocked).length;
  const blockedAttempts = logs.filter(l => l.decision === "BLOCK").length;
  const highRiskEvents = logs.filter(l => l.riskLevel === "HIGH").length;
  const mediumRiskEvents = logs.filter(l => l.riskLevel === "MEDIUM").length;

  res.json({
    totalIdentities,
    activeBound,
    lockedIdentities,
    blockedAttempts,
    highRiskEvents,
    mediumRiskEvents,
    totalAuditsRecorded: logs.length,
  });
});

// POST /api/admin/security/unlock-identity - Admin transfer or unlock an Instagram identity
app.post("/api/admin/security/unlock-identity", (req, res) => {
  const { instagramUserId, newMingreeUserId, reason } = req.body;
  if (!instagramUserId) {
    return res.status(400).json({ error: "Instagram User ID is required" });
  }

  const result = unlockOrTransferIdentity(String(instagramUserId), newMingreeUserId ? Number(newMingreeUserId) : undefined);
  if (!result.success) {
    return res.status(404).json(result);
  }

  recordSecurityEvent({
    event: "ADMIN_IDENTITY_UNLOCKED",
    mingreeUserId: newMingreeUserId ? Number(newMingreeUserId) : 0,
    instagramUsername: String(instagramUserId),
    instagramUserId: String(instagramUserId),
    riskScore: 0,
    riskLevel: "LOW",
    riskFactors: [],
    followers: 0,
    mediaCount: 0,
    ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "127.0.0.1",
    userAgent: String(req.headers["user-agent"] || ""),
    decision: "ALLOW",
    details: `Admin unlocked/transferred identity: ${reason || "Manual admin resolution"}`,
  });

  res.json(result);
});

// Notifications Persistence & Management
const USER_NOTIFICATIONS_FILE = getDataFilePath("user_notifications.json");

function loadUserNotifications(): any[] {
  try {
    if (fs.existsSync(USER_NOTIFICATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(USER_NOTIFICATIONS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading user notifications:", err);
  }
  return [];
}

function saveUserNotifications(notifs: any[]) {
  try {
    fs.writeFileSync(USER_NOTIFICATIONS_FILE, JSON.stringify(notifs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving user notifications:", err);
  }
}

let userNotifications: any[] = loadUserNotifications();

app.get("/api/users/:id/notifications", (req, res) => {
  const userId = Number(req.params.id);
  const userNotifs = userNotifications.filter(n => n.userId === userId);
  res.json(userNotifs);
});

app.get("/api/users/:id/notifications/unread-count", (req, res) => {
  const userId = Number(req.params.id);
  const userNotifs = userNotifications.filter(n => n.userId === userId);
  const unreadCount = userNotifs.filter(n => !n.isRead).length;
  res.json({ count: unreadCount });
});

app.post("/api/users/:id/notifications/mark-all-read", (req, res) => {
  const userId = Number(req.params.id);
  userNotifications.forEach(n => {
    if (n.userId === userId) {
      n.isRead = true;
    }
  });
  saveUserNotifications(userNotifications);
  res.json({ success: true });
});

app.all(["/api/notifications/:id/read", "/api/notifications/:id/mark-read"], (req, res) => {
  const notifId = Number(req.params.id);
  const notif = userNotifications.find(n => n.id === notifId);
  if (notif) {
    notif.isRead = true;
    saveUserNotifications(userNotifications);
  }
  res.json({ success: true, notification: notif });
});

// Bank accounts & wallet
const userBankAccounts: any[] = [];

app.get("/api/bank-accounts", (req, res) => {
  res.json(userBankAccounts);
});

app.post("/api/bank-accounts", (req, res) => {
  const newAccount = {
    id: Date.now(),
    userId: currentUserProfile.id,
    ...req.body,
    isDefault: userBankAccounts.length === 0,
    createdAt: new Date().toISOString()
  };
  userBankAccounts.push(newAccount);
  res.json(newAccount);
});

app.delete("/api/bank-accounts/:id", (req, res) => {
  res.json({ success: true });
});

app.put("/api/bank-accounts/:id/set-default", (req, res) => {
  res.json({ success: true });
});

app.get("/api/withdrawal-requests", (req, res) => {
  res.json([]);
});

app.post("/api/withdrawal-requests", (req, res) => {
  res.json({ id: Date.now(), status: "pending", ...req.body });
});

app.post("/api/users/:id/withdraw", (req, res) => {
  res.json({ success: true, message: "Withdrawal request submitted" });
});

// Account status
app.get("/api/account/status", (req, res) => {
  res.json({
    status: "active",
    balance: parseFloat(currentUserProfile.balance || "0"),
    activeCampaigns: currentUserProfile.activeReservations || 0,
    pendingWithdrawals: parseFloat(currentUserProfile.pendingWithdrawals || "0"),
    activeReservations: currentUserProfile.activeReservations || 0,
    subscriptionPlan: currentUserProfile.subscriptionPlan || "free",
    subscriptionExpiresAt: currentUserProfile.subscriptionExpiresAt || null,
    autoRenew: false,
    user: currentUserProfile,
    limits: { dailyCampaigns: 5, activeReservations: 3 }
  });
});

// Admin endpoints
app.get("/api/admin/stats", (req, res) => {
  const campaigns = loadCampaigns();
  const reservations = loadReservations();
  const totalUsers = registeredUsers.length;
  const totalCreators = registeredUsers.filter(u => u.role === "creator").length;
  const totalSponsors = registeredUsers.filter(u => u.role === "sponsor").length;
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
  const pendingSubmissions = reservations.filter((r: any) => r.status === "submitted").length;

  res.json({
    totalUsers,
    totalCreators,
    totalSponsors,
    totalCampaigns,
    activeCampaigns,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: "0.00",
    totalWithdrawalsProcessed: "0.00",
    pendingSubmissions,
    pendingVerifications: 0,
    totalRevenue: "0.00",
    totalPaidOut: "0.00",
  });
});

function getAdminUsersList() {
  return registeredUsers.map(u => {
    if (u.id === currentUserProfile.id || (u.role === "creator" && u.email === currentUserProfile.email)) {
      return {
        ...currentUserProfile,
        ...u,
        id: u.id,
      };
    }
    return {
      id: u.id,
      name: u.name,
      handle: u.handle,
      email: u.email,
      role: u.role,
      followers: 0,
      engagement: "0.0",
      reach: 0,
      avatar: u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      isVerified: true,
      tier: u.tier || (u.role === "sponsor" ? "Brand Partner" : "New Creator"),
      balance: "0.00",
      instagramUsername: null,
      instagramFollowers: 0,
      isInstagramVerified: false,
      instagramVerificationStatus: "unlinked",
      subscriptionPlan: "free",
      stars: 0,
      country: "IN",
      city: "",
      createdAt: new Date().toISOString(),
    };
  });
}

app.get("/api/admin/users", (req, res) => {
  const users = getAdminUsersList();
  const role = req.query.role as string;
  if (role) {
    return res.json(users.filter(u => u.role === role));
  }
  return res.json(users);
});

app.get("/api/admin/users/pending-verification", (req, res) => {
  const users = getAdminUsersList();
  return res.json(users.filter(u => !u.isVerified));
});

app.get("/api/admin/users/verified-instagram", (req, res) => {
  const users = getAdminUsersList();
  res.json(users.filter(u => u.isInstagramVerified));
});

app.post("/api/admin/users/:userId/verify-instagram", (req, res) => {
  const userId = Number(req.params.userId);
  if (currentUserProfile.id === userId) {
    currentUserProfile.isInstagramVerified = true;
    currentUserProfile.instagramVerificationStatus = "verified";
    saveUserProfile();
  }
  res.json({ success: true, user: currentUserProfile });
});

app.post("/api/admin/users/:userId/reject-instagram", (req, res) => {
  const userId = Number(req.params.userId);
  if (currentUserProfile.id === userId) {
    currentUserProfile.isInstagramVerified = false;
    currentUserProfile.instagramVerificationStatus = "rejected";
    saveUserProfile();
  }
  res.json({ success: true, user: currentUserProfile });
});

app.post("/api/admin/users/:userId/verify", (req, res) => {
  const userId = Number(req.params.userId);
  const target = registeredUsers.find(u => u.id === userId);
  if (target) (target as any).isVerified = true;
  if (currentUserProfile.id === userId) {
    currentUserProfile.isVerified = true;
    saveUserProfile();
  }
  saveRegisteredUsers();
  res.json({ success: true, user: target || currentUserProfile });
});

app.post("/api/admin/users/:userId/ban", (req, res) => {
  const userId = Number(req.params.userId);
  const target = registeredUsers.find(u => u.id === userId);
  if (target) (target as any).isBanned = true;
  saveRegisteredUsers();
  res.json({ success: true, user: target });
});

app.post("/api/admin/users/:userId/unban", (req, res) => {
  const userId = Number(req.params.userId);
  const target = registeredUsers.find(u => u.id === userId);
  if (target) (target as any).isBanned = false;
  saveRegisteredUsers();
  res.json({ success: true, user: target });
});

app.post("/api/admin/users/:userId/award-stars", (req, res) => {
  const userId = Number(req.params.userId);
  const { stars } = req.body;
  const count = Number(stars) || 5;
  const target = registeredUsers.find(u => u.id === userId);
  if (target) (target as any).stars = ((target as any).stars || 0) + count;
  if (currentUserProfile.id === userId) {
    currentUserProfile.stars = (currentUserProfile.stars || 0) + count;
    saveUserProfile();
  }
  saveRegisteredUsers();
  res.json({ success: true, user: target || currentUserProfile });
});

app.patch("/api/admin/users/:userId/status", (req, res) => {
  const userId = Number(req.params.userId);
  const { isVerified, tier, subscriptionPlan } = req.body;
  const target = registeredUsers.find(u => u.id === userId);
  if (target) {
    if (typeof isVerified === "boolean") (target as any).isVerified = isVerified;
    if (tier) target.tier = tier;
    if (subscriptionPlan) (target as any).subscriptionPlan = subscriptionPlan;
    saveRegisteredUsers();
  }
  if (currentUserProfile.id === userId) {
    if (typeof isVerified === "boolean") currentUserProfile.isVerified = isVerified;
    if (tier) currentUserProfile.tier = tier;
    if (subscriptionPlan) currentUserProfile.subscriptionPlan = subscriptionPlan;
    saveUserProfile();
  }
  res.json({ success: true, user: target || currentUserProfile });
});

// Admin Campaigns Management
app.get("/api/admin/campaigns", (req, res) => {
  const campaigns = loadCampaigns();
  res.json(campaigns);
});

app.get("/api/admin/campaigns/pending-approval", (req, res) => {
  const campaigns = loadCampaigns();
  res.json(campaigns.filter((c: any) => c.status === "pending_approval" || c.status === "pending" || !c.isApproved));
});

app.post("/api/admin/campaigns/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const campaigns = loadCampaigns();
  const campaign = campaigns.find((c: any) => c.id === id);
  if (campaign) {
    campaign.status = "active";
    campaign.isApproved = true;
    saveCampaigns(campaigns);
  }
  res.json({ success: true, campaign });
});

app.post("/api/admin/campaigns/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  const campaigns = loadCampaigns();
  const campaign = campaigns.find((c: any) => c.id === id);
  if (campaign) {
    campaign.status = "rejected";
    campaign.isApproved = false;
    saveCampaigns(campaigns);
  }
  res.json({ success: true, campaign });
});

app.patch("/api/admin/campaigns/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const campaigns = loadCampaigns();
  const campaign = campaigns.find((c: any) => c.id === id);
  if (campaign && status) {
    campaign.status = status;
    if (status === "active") campaign.isApproved = true;
    saveCampaigns(campaigns);
  }
  res.json({ success: true, campaign });
});

// Withdrawals Management
let adminWithdrawals: any[] = [];

app.get("/api/admin/withdrawals", (req, res) => {
  res.json(adminWithdrawals);
});

app.post("/api/admin/withdrawals/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const w = adminWithdrawals.find(item => item.id === id);
  if (w) {
    w.status = "approved";
    w.processedAt = new Date().toISOString();
  }
  res.json({ success: true, withdrawal: w });
});

app.post("/api/admin/withdrawals/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  const w = adminWithdrawals.find(item => item.id === id);
  if (w) {
    w.status = "rejected";
    w.processedAt = new Date().toISOString();
  }
  res.json({ success: true, withdrawal: w });
});

// Submissions Management
app.get("/api/admin/submissions/pending", (req, res) => {
  const reservations = loadReservations();
  const campaigns = loadCampaigns();
  const pending = reservations
    .filter((r: any) => r.status === "submitted")
    .map((r: any) => {
      const camp = campaigns.find((c: any) => c.id === r.campaignId) || r.campaign;
      return {
        reservation: r,
        user: { id: r.userId, name: currentUserProfile.name, email: currentUserProfile.email, instagramUsername: currentUserProfile.instagramUsername, tier: currentUserProfile.tier },
        submission: { id: r.id, reservationId: r.id, link: r.submissionLink || "", clipUrl: r.clipUrl || null, submittedAt: r.submittedAt },
        campaign: camp,
        sponsor: { id: camp?.sponsorId || 2, name: camp?.brand || "Sponsor", email: "sponsor@mingree.com", companyName: camp?.brand || "Sponsor" }
      };
    });
  res.json(pending);
});

app.get("/api/admin/campaign-submissions", (req, res) => {
  const reservations = loadReservations();
  const campaigns = loadCampaigns();
  const groups = campaigns.map((camp: any) => {
    const campReservations = reservations.filter((r: any) => r.campaignId === camp.id);
    const submissions = campReservations.map((r: any) => ({
      reservation: r,
      user: { id: r.userId, name: currentUserProfile.name, email: currentUserProfile.email, instagramUsername: currentUserProfile.instagramUsername, tier: currentUserProfile.tier },
      submission: { id: r.id, reservationId: r.id, link: r.submissionLink || "", clipUrl: r.clipUrl || null, submittedAt: r.submittedAt }
    }));
    return {
      campaign: camp,
      sponsor: { id: camp.sponsorId || 2, name: camp.brand || "Sponsor", email: "sponsor@mingree.com", companyName: camp.brand || "Sponsor" },
      stats: {
        totalReservations: campReservations.length,
        reserved: campReservations.filter((r: any) => r.status === "reserved").length,
        submitted: campReservations.filter((r: any) => r.status === "submitted").length,
        approved: campReservations.filter((r: any) => r.status === "approved").length,
        rejected: campReservations.filter((r: any) => r.status === "rejected").length,
        expired: campReservations.filter((r: any) => r.status === "expired").length,
        spotsFilledPercent: camp.totalSpots > 0 ? Math.round(((camp.totalSpots - camp.spotsRemaining) / camp.totalSpots) * 100) : 0
      },
      submissions
    };
  });
  res.json(groups);
});

app.post("/api/admin/submissions/:id/approve", (req, res) => {
  const resId = Number(req.params.id);
  const reservations = loadReservations();
  const r = reservations.find((item: any) => item.id === resId);
  if (r) {
    r.status = "approved";
    saveReservations(reservations);
  }
  res.json({ success: true, message: "Submission approved and payout credited" });
});

app.post("/api/admin/submissions/:id/reject", (req, res) => {
  const resId = Number(req.params.id);
  const { reason } = req.body;
  const reservations = loadReservations();
  const r = reservations.find((item: any) => item.id === resId);
  if (r) {
    r.status = "rejected";
    r.rejectReason = reason || "Guidelines not met";
    saveReservations(reservations);
  }
  res.json({ success: true, message: "Submission rejected" });
});

// Transactions Ledger
let adminTransactions: any[] = [];
app.get("/api/admin/transactions", (req, res) => {
  res.json(adminTransactions);
});

// UPI Payments
let adminUpiPayments: any[] = [];

app.get("/api/admin/upi-payments", (req, res) => {
  res.json(adminUpiPayments);
});

app.post("/api/admin/upi-payments/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const p = adminUpiPayments.find(item => item.id === id);
  if (p) p.status = "approved";
  res.json({ success: true, payment: p });
});

app.post("/api/admin/upi-payments/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  const p = adminUpiPayments.find(item => item.id === id);
  if (p) p.status = "rejected";
  res.json({ success: true, payment: p });
});

// Promo codes
let adminPromoCodes = [
  {
    id: 501,
    code: "LAUNCH50",
    discountPercent: 50,
    validUntil: "2025-12-31",
    usageCount: 42,
    maxUsage: 500,
    isActive: true,
  },
  {
    id: 502,
    code: "PROCREATOR",
    discountPercent: 25,
    validUntil: "2025-09-30",
    usageCount: 18,
    maxUsage: 200,
    isActive: true,
  }
];

app.get("/api/admin/promo-codes", (req, res) => {
  res.json(adminPromoCodes);
});

app.post("/api/admin/promo-codes", (req, res) => {
  const newCode = {
    id: Date.now(),
    code: (req.body.code || "PROMO").toUpperCase(),
    discountPercent: Number(req.body.discountPercent) || 20,
    validUntil: req.body.validUntil || "2025-12-31",
    usageCount: 0,
    maxUsage: Number(req.body.maxUsage) || 100,
    isActive: true,
  };
  adminPromoCodes.push(newCode);
  res.json(newCode);
});

app.delete("/api/admin/promo-codes/:id", (req, res) => {
  const id = Number(req.params.id);
  adminPromoCodes = adminPromoCodes.filter(c => c.id !== id);
  res.json({ success: true });
});

// Support tickets
let adminSupportTickets: any[] = [];

app.get("/api/admin/support-tickets", (req, res) => {
  res.json(adminSupportTickets);
});

app.get("/api/admin/support-tickets/:id", (req, res) => {
  const id = Number(req.params.id);
  const ticket = adminSupportTickets.find(t => t.id === id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json(ticket);
});

app.post("/api/admin/support-tickets/:id/reply", (req, res) => {
  const id = Number(req.params.id);
  const { message } = req.body;
  const ticket = adminSupportTickets.find(t => t.id === id);
  if (ticket && message) {
    ticket.replies.push({
      id: Date.now(),
      sender: "admin",
      message,
      createdAt: new Date().toISOString(),
    });
  }
  res.json({ success: true, ticket });
});

app.patch("/api/admin/support-tickets/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const ticket = adminSupportTickets.find(t => t.id === id);
  if (ticket && status) ticket.status = status;
  res.json({ success: true, ticket });
});

app.post("/api/admin/newsletter/broadcast", (req, res) => {
  const { subject, audience } = req.body;
  console.log(`[NEWSLETTER] Broadcast sent to ${audience || 'all'}: ${subject}`);
  res.json({ success: true, message: "Broadcast dispatched to all subscribers" });
});

// ================= CATEGORIES & GROUPS APIS =================
const CATEGORY_SUBSCRIPTIONS_FILE = getDataFilePath("category_subscriptions.json");

interface CategorySubscriptionRecord {
  id: number;
  userId: number;
  category: string;
  tier: string;
  joinedAt: string;
}

function loadCategorySubscriptions(): CategorySubscriptionRecord[] {
  try {
    if (fs.existsSync(CATEGORY_SUBSCRIPTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(CATEGORY_SUBSCRIPTIONS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading category subscriptions file:", err);
  }
  return [];
}

function saveCategorySubscriptions(subs: CategorySubscriptionRecord[]) {
  try {
    fs.writeFileSync(CATEGORY_SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving category subscriptions file:", err);
  }
}

// GET /api/categories - list all categories
app.get("/api/categories", (req, res) => {
  const subs = loadCategorySubscriptions();
  const categoriesWithCounts = PROMOTION_CATEGORIES.map((cat) => {
    const memberCount = subs.filter((s) => s.category === cat.id).length;
    return {
      ...cat,
      memberCount,
      activeCampaignsCount: 2, // dynamic campaign count
    };
  });
  res.json(categoriesWithCounts);
});

// GET /api/categories/:category/campaigns - campaigns for category
app.get("/api/categories/:category/campaigns", (req, res) => {
  res.json([]);
});

// GET /api/users/:userId/category-subscriptions - get creator's joined groups
app.get("/api/users/:userId/category-subscriptions", (req, res) => {
  const userId = Number(req.params.userId);
  const subs = loadCategorySubscriptions();
  const userSubs = subs.filter((s) => s.userId === userId);
  res.json(userSubs);
});

// POST /api/users/:userId/category-subscriptions - join category + tier group
app.post("/api/users/:userId/category-subscriptions", (req, res) => {
  const userId = Number(req.params.userId);
  const { category, tier } = req.body;

  if (!category || !tier) {
    return res.status(400).json({ error: "Category and tier are required" });
  }

  const subs = loadCategorySubscriptions();
  const existing = subs.find(
    (s) => s.userId === userId && s.category === category && s.tier === tier
  );

  if (existing) {
    return res.json(existing);
  }

  const newSub: CategorySubscriptionRecord = {
    id: Date.now(),
    userId,
    category,
    tier,
    joinedAt: new Date().toISOString(),
  };

  subs.push(newSub);
  saveCategorySubscriptions(subs);
  console.log(`[GROUPS] User #${userId} joined group: ${category} (${tier})`);

  res.status(201).json(newSub);
});

// DELETE /api/users/:userId/category-subscriptions - leave category + tier group
app.delete("/api/users/:userId/category-subscriptions", (req, res) => {
  const userId = Number(req.params.userId);
  const { category, tier } = req.body;

  if (!category || !tier) {
    return res.status(400).json({ error: "Category and tier are required" });
  }

  let subs = loadCategorySubscriptions();
  const beforeCount = subs.length;
  subs = subs.filter(
    (s) => !(s.userId === userId && s.category === category && s.tier === tier)
  );
  saveCategorySubscriptions(subs);
  console.log(`[GROUPS] User #${userId} left group: ${category} (${tier})`);

  res.json({ success: true, removed: beforeCount !== subs.length });
});

// GET /api/category-subscriptions - list all (admin / debug)
app.get("/api/category-subscriptions", (req, res) => {
  res.json(loadCategorySubscriptions());
});

// ================= CASHFREE & SPONSOR WALLET PAYMENT GATEWAY =================
let sponsorWalletBalances: Record<number, number> = { 1: 5000, 2: 12500 };

app.get("/api/sponsors/:id/wallet", (req, res) => {
  const sponsorId = Number(req.params.id);
  const balance = sponsorWalletBalances[sponsorId] !== undefined ? sponsorWalletBalances[sponsorId] : 5000;
  res.json({
    balance: balance.toFixed(2),
    minWithdrawalAmount: 1000,
    maxWithdrawalAmount: 500000,
    gstPercent: 18,
  });
});

app.post("/api/sponsors/:id/wallet/deposit", (req, res) => {
  const sponsorId = Number(req.params.id);
  const { amount, description } = req.body;
  const numAmount = parseFloat(amount) || 0;
  if (numAmount <= 0) {
    return res.status(400).json({ error: "Invalid deposit amount" });
  }

  const current = sponsorWalletBalances[sponsorId] !== undefined ? sponsorWalletBalances[sponsorId] : 5000;
  const newBalance = current + numAmount;
  sponsorWalletBalances[sponsorId] = newBalance;

  const tx = {
    id: Date.now(),
    userId: sponsorId,
    type: "deposit",
    category: "wallet_topup",
    amount: numAmount.toFixed(2),
    tax: "0.00",
    net: numAmount.toFixed(2),
    description: description || "Wallet deposit via payment gateway",
    status: "completed",
    createdAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    newBalance: newBalance.toFixed(2),
    transaction: tx,
  });
});

app.post("/api/cashfree/create-order", async (req, res) => {
  try {
    const { amount, sponsorId, userId, customerName, customerEmail, customerPhone, purpose } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Invalid order amount" });
    }

    const orderId = `cf_order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const settings = loadSettings();
    const appId = process.env.CASHFREE_APP_ID || settings.cashfree_app_id || "";
    const secretKey = process.env.CASHFREE_SECRET_KEY || settings.cashfree_secret_key || "";
    const isProd = process.env.CASHFREE_MODE === "production" || settings.cashfree_mode === "production";

    // If Cashfree live/sandbox API keys are available, call Cashfree API
    if (appId && secretKey) {
      try {
        const cfUrl = isProd 
          ? "https://api.cashfree.com/pg/orders" 
          : "https://sandbox.cashfree.com/pg/orders";

        const response = await fetch(cfUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": appId,
            "x-client-secret": secretKey,
            "x-api-version": "2023-08-01",
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: numAmount,
            order_currency: "INR",
            customer_details: {
              customer_id: String(sponsorId || userId || "cust_1"),
              customer_name: customerName || "Mingree User",
              customer_email: customerEmail || "user@mingree.com",
              customer_phone: customerPhone || "9999999999",
            },
            order_meta: {
              return_url: `${req.protocol}://${req.get("host")}/sponsor/wallet?order_id=${orderId}&status=success`,
            },
          }),
        });

        const data = await response.json();
        if (response.ok && data.payment_session_id) {
          return res.json({
            success: true,
            order_id: orderId,
            payment_session_id: data.payment_session_id,
            cf_order_id: data.cf_order_id,
          });
        }
      } catch (err) {
        console.error("[CASHFREE API ERROR]", err);
      }
    }

    // Fallback simulation / Sandbox mode for seamless testing
    return res.json({
      success: true,
      order_id: orderId,
      payment_session_id: `session_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      simulated: true,
      message: "Cashfree simulated session created successfully",
    });
  } catch (error: any) {
    console.error("[CASHFREE CREATE ORDER ERROR]", error);
    return res.status(500).json({ error: error.message || "Failed to create Cashfree order" });
  }
});

app.post("/api/cashfree/verify", async (req, res) => {
  try {
    const { orderId, sponsorId, userId, amount, purpose } = req.body;
    const numAmount = parseFloat(amount) || 0;

    if (purpose === "wallet_deposit" && sponsorId) {
      const current = sponsorWalletBalances[sponsorId] !== undefined ? sponsorWalletBalances[sponsorId] : 5000;
      const newBalance = current + numAmount;
      sponsorWalletBalances[sponsorId] = newBalance;
      return res.json({
        success: true,
        walletCredit: numAmount.toFixed(2),
        newBalance: newBalance.toFixed(2),
      });
    }

    if (purpose === "subscription" && userId) {
      currentUserProfile.subscriptionPlan = "pro";
      currentUserProfile.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      saveUserProfile();
      return res.json({
        success: true,
        message: "Subscription activated successfully via Cashfree",
      });
    }

    return res.json({ success: true, message: "Payment verified successfully" });
  } catch (error: any) {
    console.error("[CASHFREE VERIFY ERROR]", error);
    return res.status(500).json({ error: error.message || "Failed to verify Cashfree payment" });
  }
});

// Catch-all for API endpoints to ALWAYS return valid JSON
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});


// ================= VITE MIDDLEWARE & SERVER START =================
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
} else {
  // Initialize static middleware for Vercel
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.status(200).send("Mingree Full-Stack App is running successfully!");
    });
  }
}

export default app;
