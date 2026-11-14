import { db, pool, isDatabaseConfigured } from "./db";
import { withdrawals, payoutMethods, kyc, wallets, ledgerEntries, notifications } from "../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { CONFIG } from "../shared/config";
import { getOrCreateWallet } from "./walletAndPayments";
import { recordSecurityEvent } from "./instagramSecurity";

function throwDbUnavailable(err?: any): never {
  const error: any = new Error("Database unavailable");
  error.status = 503;
  if (err?.message) error.detail = err.message;
  throw error;
}

let ephemeralDevPanKey: string | null = null;
function getEphemeralDevPanKey(): string {
  if (!ephemeralDevPanKey) {
    ephemeralDevPanKey = crypto.randomBytes(32).toString("hex");
  }
  return ephemeralDevPanKey;
}

function getPanEncryptionKey(): Buffer {
  const raw = (process.env.TOKEN_ENC_KEY || process.env.JWT_SECRET || "").trim();
  if (!raw) {
    return crypto.scryptSync(getEphemeralDevPanKey(), "pan_salt", 32);
  }
  return crypto.scryptSync(raw, "pan_salt", 32);
}

// 1. PAN Encryption & Masking
export function encryptPan(panText: string): string {
  if (!panText) return "";
  const cleanPan = panText.trim().toUpperCase();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getPanEncryptionKey(), iv);
  let encrypted = cipher.update(cleanPan, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptPan(ciphertext: string): string {
  if (!ciphertext) return "";
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return "";
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getPanEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskPan(panText: string): string {
  if (!panText) return "";
  const clean = panText.trim().toUpperCase();
  if (clean.length < 10) return "••••••••••";
  return `${clean.slice(0, 5)}••••${clean.slice(9)}`;
}

export function isValidPan(panText: string): boolean {
  if (!panText || typeof panText !== "string") return false;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(panText.trim().toUpperCase());
}

// 2. KYC Handler (Save/Verify PAN for Creator) - Database backed
export async function saveUserKyc(userId: number, pan: string, name: string): Promise<{ success: boolean; maskedPan: string }> {
  if (!isValidPan(pan)) {
    throw new Error("Invalid PAN format. Standard format is 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)");
  }
  if (!name || !name.trim()) {
    throw new Error("Name as per PAN card is required");
  }

  const cleanPan = pan.trim().toUpperCase();
  const encrypted = encryptPan(cleanPan);
  const masked = maskPan(cleanPan);

  try {
    const existing = await db.select().from(kyc).where(eq(kyc.userId, userId));
    if (existing.length > 0) {
      await db
        .update(kyc)
        .set({
          panEncrypted: encrypted,
          panMasked: masked,
          fullNameOnPan: name.trim(),
          name: name.trim(),
          status: "active",
        } as any)
        .where(eq(kyc.userId, userId));
    } else {
      await db.insert(kyc).values({
        userId,
        panEncrypted: encrypted,
        panMasked: masked,
        fullNameOnPan: name.trim(),
        name: name.trim(),
        dob: "2000-01-01",
        status: "active",
      } as any);
    }
  } catch (err: any) {
    throwDbUnavailable(err);
  }

  return { success: true, maskedPan: masked };
}

export async function getUserKyc(userId: number): Promise<{ verified: boolean; name?: string; maskedPan?: string }> {
  try {
    const rows = await db.select().from(kyc).where(eq(kyc.userId, userId));
    if (rows.length > 0 && rows[0].panEncrypted) {
      return {
        verified: true,
        name: rows[0].name || rows[0].fullNameOnPan || undefined,
        maskedPan: rows[0].panMasked || maskPan("ABCDE1234F"),
      };
    }
    return { verified: false };
  } catch (err: any) {
    throwDbUnavailable(err);
  }
}

export function encryptPayoutDetails(details: any): string {
  return encryptPan(JSON.stringify(details));
}

export function maskPayoutDetails(type: "UPI" | "Bank", details: any): { maskedAccount: string; publicDetails: any } {
  if (type === "UPI") {
    const upi = String(details.upiId || details.upi_id || "").trim();
    const parts = upi.split("@");
    const prefix = parts[0] || "";
    const domain = parts[1] || "";
    const maskedPrefix = prefix.length > 2 ? `${prefix.slice(0, 2)}•••${prefix.slice(-1)}` : "•••";
    const maskedAccount = `${maskedPrefix}@${domain}`;
    return {
      maskedAccount,
      publicDetails: { ...details, upiId: maskedAccount, upi_id: maskedAccount },
    };
  } else {
    const acc = String(details.accountNumber || details.account_number || "").trim();
    const ifsc = String(details.ifscCode || details.ifsc || "").trim().toUpperCase();
    const holder = String(details.accountHolderName || details.account_holder_name || "").trim();
    const maskedAcc = acc.length > 4 ? `••••••••${acc.slice(-4)}` : "••••••••";
    return {
      maskedAccount: maskedAcc,
      publicDetails: {
        ...details,
        accountNumber: maskedAcc,
        account_number: maskedAcc,
        ifscCode: ifsc,
        accountHolderName: holder,
      },
    };
  }
}

// 3. Payout Methods Management - Database backed
export async function addPayoutMethod(userId: number, type: "UPI" | "Bank", details: any, isDefault = true): Promise<any> {
  if (type === "UPI") {
    if (!details.upiId || !details.upiId.includes("@")) {
      throw new Error("Invalid UPI ID format (e.g. name@upi)");
    }
  } else if (type === "Bank") {
    if (!details.accountNumber || !details.ifscCode || !details.accountHolderName) {
      throw new Error("Bank Account Number, IFSC Code, and Account Holder Name are required");
    }
  }

  const { maskedAccount, publicDetails } = maskPayoutDetails(type, details);
  const encrypted = encryptPayoutDetails(details);

  try {
    if (isDefault) {
      await db.update(payoutMethods).set({ isDefault: false } as any).where(eq(payoutMethods.userId, userId));
    }
    const inserted = await db.insert(payoutMethods).values({
      userId,
      type,
      accountDetails: publicDetails,
      accountDetailsEncrypted: encrypted,
      maskedAccount,
      isDefault,
    } as any).returning();
    const row = inserted[0];
    return {
      ...row,
      ...publicDetails,
    };
  } catch (err: any) {
    throwDbUnavailable(err);
  }
}

export async function getUserPayoutMethods(userId: number): Promise<any[]> {
  try {
    const rows = await db.select().from(payoutMethods).where(eq(payoutMethods.userId, userId));
    return rows.map((r: any) => ({
      ...r,
      ...(r.accountDetails || {}),
    }));
  } catch (err: any) {
    throwDbUnavailable(err);
  }
}

// 4. Request Withdrawal (Atomic Transaction with SELECT FOR UPDATE row lock)
export async function requestWithdrawal(params: {
  userId: number;
  userRole: string;
  amount: number;
  payoutMethodId: number;
}): Promise<{ withdrawalId: number; pendingHoldAmount: number; newAvailableBalance: number }> {
  const { userId, userRole, amount, payoutMethodId } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be a positive number");
  }

  // Minimum checks
  const minWithdrawal = userRole === "creator" ? CONFIG.MIN_CREATOR_WITHDRAWAL : CONFIG.MIN_ARTIST_WITHDRAWAL;
  if (amount < minWithdrawal) {
    throw new Error(`Minimum withdrawal amount for ${userRole}s is ₹${minWithdrawal}`);
  }

  // Require KYC for creators before payout
  if (userRole === "creator") {
    const kycStatus = await getUserKyc(userId);
    if (!kycStatus.verified) {
      throw new Error("KYC verification required before requesting your first withdrawal. Please provide your PAN and Name as per PAN.");
    }
  }

  if (!isDatabaseConfigured) {
    throwDbUnavailable(new Error("Database not configured"));
  }

  const withdrawalId = Date.now() + Math.floor(Math.random() * 1000);
  let newBalance = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify payoutMethodId belongs to the requesting user
    const pmRes = await client.query(
      `SELECT id FROM payout_methods WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [payoutMethodId, userId]
    );
    if (pmRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or unauthorized payout method");
    }

    // Ensure wallet row exists and lock it exclusively
    await client.query(
      `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    const walletRes = await client.query(
      `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    const currentBalance = Number(walletRes.rows[0]?.balance || 0);
    if (currentBalance < amount) {
      await client.query("ROLLBACK");
      throw new Error(`Insufficient available balance (₹${currentBalance.toFixed(2)}) for withdrawal request of ₹${amount.toFixed(2)}`);
    }

    newBalance = Math.round((currentBalance - amount) * 100) / 100;

    await client.query(
      `UPDATE wallets SET balance = $1 WHERE user_id = $2`,
      [newBalance.toFixed(2), userId]
    );

    await client.query(
      `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
       VALUES ($1, 'withdrawal_hold', $2, $3, 'withdrawal_request', $4)`,
      [userId, (-amount).toFixed(2), newBalance.toFixed(2), String(withdrawalId)]
    );

    await client.query(
      `INSERT INTO withdrawals (id, user_id, amount, tds_amount, payout_method_id, status)
       VALUES ($1, $2, $3, '0.00', $4, 'pending')`,
      [withdrawalId, userId, amount.toFixed(2), payoutMethodId]
    );

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    if (err?.status === 503 || err?.message?.includes("Insufficient") || err?.message?.includes("payout method")) {
      throw err;
    }
    throwDbUnavailable(err);
  } finally {
    client.release();
  }

  return {
    withdrawalId,
    pendingHoldAmount: amount,
    newAvailableBalance: newBalance,
  };
}

// 5. Admin Approve Withdrawal - Atomic Transaction with SELECT FOR UPDATE
export async function approveWithdrawal(withdrawalId: number, adminUserId: number, utrRef: string): Promise<{ success: boolean; message: string }> {
  if (!utrRef || !utrRef.trim()) {
    throw new Error("Transfer reference / UTR is required to approve withdrawal");
  }
  if (!isDatabaseConfigured) {
    throwDbUnavailable(new Error("Database not configured"));
  }

  const cleanUtr = utrRef.trim();
  let amountNum = 0;
  let targetUserId = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const wRes = await client.query(
      `SELECT id, user_id, amount, status FROM withdrawals WHERE id = $1 FOR UPDATE`,
      [withdrawalId]
    );
    if (wRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Withdrawal request not found");
    }
    const record = wRes.rows[0];
    if (record.status !== "pending") {
      await client.query("ROLLBACK");
      throw new Error(`Withdrawal is already ${record.status}`);
    }

    amountNum = parseFloat(record.amount);
    targetUserId = Number(record.user_id);

    const walletRes = await client.query(`SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [targetUserId]);
    const currentBal = Number(walletRes.rows[0]?.balance || 0);

    await client.query(
      `UPDATE withdrawals SET status = 'approved', utr_ref = $1 WHERE id = $2`,
      [cleanUtr, withdrawalId]
    );

    await client.query(
      `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
       VALUES ($1, 'withdrawal_completed', $2, $3, 'withdrawal_approved', $4)`,
      [targetUserId, (-amountNum).toFixed(2), currentBal.toFixed(2), String(withdrawalId)]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, read)
       VALUES ($1, $2, $3, false)`,
      [
        targetUserId,
        "Withdrawal Approved! 🎉",
        `Your withdrawal of ₹${amountNum.toFixed(2)} has been transferred! Reference UTR: ${cleanUtr}`,
      ]
    );

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    if (err?.message?.includes("not found") || err?.message?.includes("already")) {
      throw err;
    }
    throwDbUnavailable(err);
  } finally {
    client.release();
  }

  recordSecurityEvent({
    event: "ADMIN_IDENTITY_UNLOCKED",
    mingreeUserId: adminUserId,
    instagramUsername: "admin_withdrawal_approval",
    riskScore: 0,
    riskLevel: "LOW",
    riskFactors: [],
    followers: 0,
    mediaCount: 0,
    ipAddress: "127.0.0.1",
    userAgent: "Admin",
    decision: "ALLOW",
    details: `Admin #${adminUserId} approved Withdrawal #${withdrawalId} (₹${amountNum}) for User #${targetUserId}. UTR: ${cleanUtr}`,
  });

  return { success: true, message: `Withdrawal #${withdrawalId} approved. UTR: ${cleanUtr}` };
}

// 6. Admin Reject Withdrawal (Returns hold amount back to available balance) - Atomic SELECT FOR UPDATE
export async function rejectWithdrawal(withdrawalId: number, adminUserId: number, reason: string): Promise<{ success: boolean; message: string }> {
  if (!reason || !reason.trim()) {
    throw new Error("Rejection reason is required");
  }
  if (!isDatabaseConfigured) {
    throwDbUnavailable(new Error("Database not configured"));
  }

  const cleanReason = reason.trim();
  let amountNum = 0;
  let targetUserId = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const wRes = await client.query(
      `SELECT id, user_id, amount, status FROM withdrawals WHERE id = $1 FOR UPDATE`,
      [withdrawalId]
    );
    if (wRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Withdrawal request not found");
    }
    const record = wRes.rows[0];
    if (record.status !== "pending") {
      await client.query("ROLLBACK");
      throw new Error(`Withdrawal is already ${record.status}`);
    }

    amountNum = parseFloat(record.amount);
    targetUserId = Number(record.user_id);

    await client.query(
      `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
      [targetUserId]
    );
    const walletRes = await client.query(`SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [targetUserId]);
    const currentBal = Number(walletRes.rows[0]?.balance || 0);
    const refundedBalance = Math.round((currentBal + amountNum) * 100) / 100;

    await client.query(
      `UPDATE withdrawals SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
      [cleanReason, withdrawalId]
    );

    await client.query(
      `UPDATE wallets SET balance = $1 WHERE user_id = $2`,
      [refundedBalance.toFixed(2), targetUserId]
    );

    await client.query(
      `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
       VALUES ($1, 'withdrawal_refund', $2, $3, 'withdrawal_rejected', $4)`,
      [targetUserId, amountNum.toFixed(2), refundedBalance.toFixed(2), String(withdrawalId)]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, read)
       VALUES ($1, $2, $3, false)`,
      [
        targetUserId,
        "Withdrawal Request Returned",
        `Your withdrawal of ₹${amountNum.toFixed(2)} was returned to your balance. Reason: ${cleanReason}`,
      ]
    );

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    if (err?.message?.includes("not found") || err?.message?.includes("already")) {
      throw err;
    }
    throwDbUnavailable(err);
  } finally {
    client.release();
  }

  recordSecurityEvent({
    event: "ADMIN_IDENTITY_UNLOCKED",
    mingreeUserId: adminUserId,
    instagramUsername: "admin_withdrawal_rejection",
    riskScore: 0,
    riskLevel: "LOW",
    riskFactors: [],
    followers: 0,
    mediaCount: 0,
    ipAddress: "127.0.0.1",
    userAgent: "Admin",
    decision: "ALLOW",
    details: `Admin #${adminUserId} rejected Withdrawal #${withdrawalId} (₹${amountNum}). Returned to User #${targetUserId}. Reason: ${cleanReason}`,
  });

  return { success: true, message: `Withdrawal #${withdrawalId} rejected. Funds returned to user's wallet.` };
}

// 7. Get User Withdrawals History - Database backed
export async function getUserWithdrawalHistory(userId: number): Promise<any[]> {
  try {
    return await db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
  } catch (err: any) {
    throwDbUnavailable(err);
  }
}

// 8. Get All Withdrawals for Admin Console - Database backed
export async function getAllWithdrawalsAdmin(): Promise<any[]> {
  try {
    return await db.select().from(withdrawals);
  } catch (err: any) {
    throwDbUnavailable(err);
  }
}
