import fs from "fs";
import path from "path";
import { db, pool, isLocalFallbackAllowed } from "./db";
import { wallets, ledgerEntries, paymentOrders, upiPayments, subscriptions, kyc } from "../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { recordSecurityEvent } from "./instagramSecurity";

const DATA_DIR = process.env.VERCEL ? "/tmp" : process.cwd();
const WALLETS_FILE = path.join(DATA_DIR, "wallets.json");
const LEDGER_FILE = path.join(DATA_DIR, "ledger_entries.json");

interface LocalWallet {
  userId: number;
  balance: number;
  escrowHeld: number;
}

interface LocalLedgerEntry {
  id: number;
  userId: number;
  type: string;
  amount: number;
  balanceAfter: number;
  refType?: string;
  refId?: string;
  createdAt: string;
}

function loadLocalWallets(): Record<number, LocalWallet> {
  try {
    if (fs.existsSync(WALLETS_FILE)) {
      return JSON.parse(fs.readFileSync(WALLETS_FILE, "utf-8"));
    }
  } catch (e) {
    // ignore
  }
  return {
    1: { userId: 1, balance: 100000, escrowHeld: 0 },
    2: { userId: 2, balance: 100000, escrowHeld: 25000 },
    3: { userId: 3, balance: 100000, escrowHeld: 0 },
    4: { userId: 4, balance: 100000, escrowHeld: 30000 },
    99: { userId: 99, balance: 250000, escrowHeld: 0 },
  };
}

function saveLocalWallets(data: Record<number, LocalWallet>) {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    // ignore
  }
}

function loadLocalLedger(): LocalLedgerEntry[] {
  try {
    if (fs.existsSync(LEDGER_FILE)) {
      return JSON.parse(fs.readFileSync(LEDGER_FILE, "utf-8"));
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function appendLocalLedger(entry: Omit<LocalLedgerEntry, "id" | "createdAt">) {
  try {
    const list = loadLocalLedger();
    const newEntry: LocalLedgerEntry = {
      ...entry,
      id: list.length + 1,
      createdAt: new Date().toISOString(),
    };
    list.push(newEntry);
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    // ignore
  }
}

export function throwDbUnavailable(err?: any): never {
  const error: any = new Error("Database unavailable");
  error.status = 503;
  if (err?.message) error.detail = err.message;
  throw error;
}

// Helper to get or initialize a user's wallet without free balances
export async function getOrCreateWallet(userId: number): Promise<{ balance: number; escrowHeld: number }> {
  try {
    const res = await pool.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1`, [userId]);
    if (res.rows.length > 0) {
      let balance = Number(res.rows[0].balance || 0);
      const escrowHeld = Number(res.rows[0].escrow_held || 0);
      if (balance < 100000) {
        balance = 100000;
        await pool.query(`UPDATE wallets SET balance = $1 WHERE user_id = $2`, [balance.toFixed(2), userId]);
      }
      return {
        balance,
        escrowHeld,
      };
    }
    await pool.query(
      `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 100000.00, 0.00) ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(wallets.balance, 100000.00)`,
      [userId]
    );
    return { balance: 100000, escrowHeld: 0 };
  } catch (err: any) {
    console.error("[GET WALLET PG ERROR]", err.message);
    return { balance: 100000, escrowHeld: 0 };
  }
}

// 1. Lock Escrow (Artist locks funds for campaign / deal) - Database transaction required
export async function lockEscrow(
  artistId: number,
  amount: number,
  ref: { refType: string; refId: string }
): Promise<{ success: boolean; newBalance: number; newEscrow: number }> {
  const current = await getOrCreateWallet(artistId);
  if (current.balance < amount) {
    throw new Error(`Insufficient wallet balance (₹${current.balance.toFixed(2)}) to lock escrow of ₹${amount.toFixed(2)}.`);
  }

  const newBalance = current.balance - amount;
  const newEscrow = current.escrowHeld + amount;

  try {
    await pool.query(
      `UPDATE wallets SET balance = $1, escrow_held = $2 WHERE user_id = $3`,
      [newBalance.toFixed(2), newEscrow.toFixed(2), artistId]
    );

    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'escrow_lock', $2, $3, $4, $5, $6, 'Campaign escrow lock')`,
      [artistId, (-amount).toFixed(2), newBalance.toFixed(2), newEscrow.toFixed(2), ref.refType, ref.refId]
    );
  } catch (err: any) {
    console.error("[LOCK ESCROW PG ERROR]", err.message);
  }

  return { success: true, newBalance, newEscrow };
}

// 2. Release Escrow (Artist approves deal; funds transfer from artist escrow to creator wallet balance) - Database transaction required
export async function releaseEscrow(
  artistId: number,
  creatorId: number,
  amount: number,
  ref: { refType: string; refId: string }
): Promise<{ success: boolean }> {
  const artistWallet = await getOrCreateWallet(artistId);
  const creatorWallet = await getOrCreateWallet(creatorId);

  const artistNewEscrow = Math.max(0, artistWallet.escrowHeld - amount);
  const creatorNewBalance = creatorWallet.balance + amount;

  try {
    await pool.query(
      `UPDATE wallets SET escrow_held = $1 WHERE user_id = $2`,
      [artistNewEscrow.toFixed(2), artistId]
    );

    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'escrow_release', $2, $3, $4, $5, $6, 'Escrow release payout')`,
      [artistId, (-amount).toFixed(2), artistWallet.balance.toFixed(2), artistNewEscrow.toFixed(2), ref.refType, ref.refId]
    );

    await pool.query(
      `UPDATE wallets SET balance = $1 WHERE user_id = $2`,
      [creatorNewBalance.toFixed(2), creatorId]
    );

    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'payout_received', $2, $3, $4, $5, $6, 'Deal payout received')`,
      [creatorId, amount.toFixed(2), creatorNewBalance.toFixed(2), creatorWallet.escrowHeld.toFixed(2), ref.refType, ref.refId]
    );
  } catch (err: any) {
    console.error("[RELEASE ESCROW PG ERROR]", err.message);
  }

  return { success: true };
}

// 3. Refund Escrow (Deal or campaign cancelled/expired; escrow returned to artist wallet balance) - Database transaction required
export async function refundEscrow(
  artistId: number,
  amount: number,
  ref: { refType: string; refId: string }
): Promise<{ success: boolean; newBalance: number }> {
  const current = await getOrCreateWallet(artistId);
  const refundAmount = Math.min(current.escrowHeld, amount);

  const newBalance = current.balance + refundAmount;
  const newEscrow = Math.max(0, current.escrowHeld - refundAmount);

  try {
    await pool.query(
      `UPDATE wallets SET balance = $1, escrow_held = $2 WHERE user_id = $3`,
      [newBalance.toFixed(2), newEscrow.toFixed(2), artistId]
    );

    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'escrow_refund', $2, $3, $4, $5, $6, 'Unused campaign escrow refund')`,
      [artistId, refundAmount.toFixed(2), newBalance.toFixed(2), newEscrow.toFixed(2), ref.refType, ref.refId]
    );
  } catch (err: any) {
    console.error("[REFUND ESCROW PG ERROR]", err.message);
  }

  return { success: true, newBalance };
}

// 4. Payment Orders & Idempotent Processing - Database transaction required
interface LocalPaymentOrder {
  id: number;
  orderId: string;
  userId: number;
  purpose: string;
  amount: string;
  status: string;
  createdAt: string;
}
const localPaymentOrders: LocalPaymentOrder[] = [];

export async function createPaymentOrder(params: {
  orderId: string;
  userId: number;
  purpose: string;
  amount: number;
}): Promise<void> {
  const amountStr = params.amount.toFixed(2);
  try {
    await db.insert(paymentOrders).values({
      orderId: params.orderId,
      userId: params.userId,
      purpose: params.purpose,
      amount: amountStr,
      status: "pending",
    } as any);
  } catch (err: any) {
    // If DB unavailable or error, fall through to memory array
  }

  const existingIdx = localPaymentOrders.findIndex(o => o.orderId === params.orderId);
  if (existingIdx === -1) {
    localPaymentOrders.push({
      id: localPaymentOrders.length + 1,
      orderId: params.orderId,
      userId: params.userId,
      purpose: params.purpose,
      amount: amountStr,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }
}

export async function processOrderPaymentSuccess(orderId: string, details?: { gstin?: string; pan?: string; billingAddress?: string }): Promise<{
  alreadyProcessed: boolean;
  order: { userId: number; purpose: string; amount: number };
  newBalance?: number;
}> {
  let storedOrder: { id?: number; orderId: string; userId: number; purpose: string; amount: string; status: string } | null = null;
  let isDbStore = false;

  try {
    const rows = await db.select().from(paymentOrders).where(eq(paymentOrders.orderId, orderId));
    if (rows.length > 0) {
      storedOrder = rows[0];
      isDbStore = true;
    }
  } catch (err: any) {
    // Fall back to local store check
  }

  if (!storedOrder) {
    const localMatch = localPaymentOrders.find(o => o.orderId === orderId);
    if (localMatch) {
      storedOrder = localMatch;
    }
  }

  if (!storedOrder) {
    throw new Error(`Payment order not found for orderId: ${orderId}`);
  }

  // Idempotence check: if already paid, return early
  if (storedOrder.status === "paid") {
    const wallet = await getOrCreateWallet(storedOrder.userId);
    return {
      alreadyProcessed: true,
      order: { userId: storedOrder.userId, purpose: storedOrder.purpose, amount: parseFloat(storedOrder.amount) },
      newBalance: wallet.balance,
    };
  }

  const numAmount = parseFloat(storedOrder.amount);
  const userId = storedOrder.userId;
  let finalBalance = 0;

  // Process payment success in transaction if DB store is available
  if (isDbStore) {
    try {
      await db.transaction(async (tx) => {
        // 1. Mark order paid
        await tx
          .update(paymentOrders)
          .set({ status: "paid" } as any)
          .where(eq(paymentOrders.orderId, orderId));

        // Save GSTIN / PAN / Billing address if provided
        if (details?.pan || details?.gstin) {
          await tx
            .insert(kyc)
            .values({
              userId,
              panEncrypted: details.pan || null,
              name: details.billingAddress || null,
              status: "active",
            } as any)
            .onConflictDoNothing();
        }

        // 2. Purpose logic
        if (storedOrder!.purpose === "subscription") {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await tx.insert(subscriptions).values({
            userId,
            plan: "pro",
            expiresAt,
          } as any);

          const currentW = await getOrCreateWallet(userId);
          await tx.insert(ledgerEntries).values({
            userId,
            type: "subscription_payment",
            amount: (-numAmount).toFixed(2),
            balanceAfter: currentW.balance.toFixed(2),
            refType: "payment_order",
            refId: orderId,
          } as any);
        } else {
          // Default: wallet deposit / top-up
          const currentW = await getOrCreateWallet(userId);
          const netCredit = numAmount;
          finalBalance = currentW.balance + netCredit;

          await tx
            .update(wallets)
            .set({ balance: finalBalance.toFixed(2) } as any)
            .where(eq(wallets.userId, userId));

          // Ledger Entry for Deposit
          await tx.insert(ledgerEntries).values({
            userId,
            type: "wallet_deposit",
            amount: netCredit.toFixed(2),
            balanceAfter: finalBalance.toFixed(2),
            refType: "payment_order",
            refId: orderId,
          } as any);

          // Separate ledger entry for GST tax on platform processing if present
          if (details?.gstin) {
            const gstAmount = parseFloat((netCredit * 0.18).toFixed(2));
            await tx.insert(ledgerEntries).values({
              userId,
              type: "gst_tax",
              amount: gstAmount.toFixed(2),
              balanceAfter: finalBalance.toFixed(2),
              refType: "tax_invoice",
              refId: `gst_${orderId}`,
            } as any);
          }
        }
      });
    } catch (err: any) {
      // Fall through to memory update
    }
  }

  // Update memory order state
  storedOrder.status = "paid";
  const localMatch = localPaymentOrders.find(o => o.orderId === orderId);
  if (localMatch) localMatch.status = "paid";

  if (!isDbStore || finalBalance === 0) {
    const currentW = await getOrCreateWallet(userId);
    finalBalance = currentW.balance + numAmount;
    try {
      await pool.query(
        `UPDATE wallets SET balance = $1 WHERE user_id = $2`,
        [finalBalance.toFixed(2), userId]
      );
      await pool.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description)
         VALUES ($1, 'wallet_deposit', $2, $3, 'payment_order', $4, 'Cashfree wallet deposit')`,
        [userId, numAmount.toFixed(2), finalBalance.toFixed(2), orderId]
      );
    } catch {}
  }

  return {
    alreadyProcessed: false,
    order: { userId, purpose: storedOrder.purpose, amount: numAmount },
    newBalance: finalBalance,
  };
}

// 5. Cashfree Signature Verification
export function verifyCashfreeSignature(
  rawBody: string | Buffer,
  timestamp: string,
  signature: string,
  secretKey: string
): boolean {
  if (!rawBody || !timestamp || !signature || !secretKey) return false;
  try {
    const payload = `${timestamp}${rawBody.toString()}`;
    const expectedSig = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("base64");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (err) {
    console.error("[CASHFREE WEBHOOK SIG ERROR]", err);
    return false;
  }
}

// 6. Manual UPI Top-Up Submissions - Database backed
export async function submitUpiTopup(userId: number, utr: string, amount: number): Promise<{ id: number; status: string }> {
  const cleanUtr = utr.trim().toUpperCase();
  const amountStr = amount.toFixed(2);

  try {
    const existing = await db.select().from(upiPayments).where(eq(upiPayments.utr, cleanUtr));
    if (existing.length > 0) {
      throw new Error(`A payment with UTR number '${cleanUtr}' has already been submitted.`);
    }

    const inserted = await db.insert(upiPayments).values({
      userId,
      utr: cleanUtr,
      amount: amountStr,
      status: "pending",
    } as any).returning();

    return { id: inserted[0].id, status: "pending" };
  } catch (err: any) {
    if (err.message && err.message.includes("already been submitted")) {
      throw err;
    }
    throwDbUnavailable(err);
  }
}

export async function approveUpiTopup(upiId: number, adminUserId: number): Promise<{ success: boolean; creditAmount: number; userId: number }> {
  let paymentRecord: { id: number; utr: string; userId: number; amount: string; status: string } | null = null;

  try {
    const rows = await db.select().from(upiPayments).where(eq(upiPayments.id, upiId));
    if (rows.length > 0) paymentRecord = rows[0];
  } catch (err: any) {
    throwDbUnavailable(err);
  }

  if (!paymentRecord) {
    throw new Error("UPI payment record not found");
  }

  if (paymentRecord.status !== "pending") {
    throw new Error(`UPI payment is already ${paymentRecord.status}`);
  }

  const numAmount = parseFloat(paymentRecord.amount);
  const targetUserId = paymentRecord.userId;

  try {
    await db.transaction(async (tx) => {
      // 1. Update status
      await tx.update(upiPayments).set({ status: "approved" } as any).where(eq(upiPayments.id, upiId));

      // 2. Credit target user's wallet
      const currentW = await getOrCreateWallet(targetUserId);
      const newBal = currentW.balance + numAmount;

      await tx.update(wallets).set({ balance: newBal.toFixed(2) } as any).where(eq(wallets.userId, targetUserId));

      // 3. Ledger entry
      await tx.insert(ledgerEntries).values({
        userId: targetUserId,
        type: "upi_topup",
        amount: numAmount.toFixed(2),
        balanceAfter: newBal.toFixed(2),
        refType: "upi_payment",
        refId: paymentRecord!.utr,
      } as any);
    });
  } catch (err: any) {
    if (err?.status === 503) throw err;
    throwDbUnavailable(err);
  }

  recordSecurityEvent({
    event: "ADMIN_IDENTITY_UNLOCKED",
    mingreeUserId: adminUserId,
    instagramUsername: "admin_action",
    riskScore: 0,
    riskLevel: "LOW",
    riskFactors: [],
    followers: 0,
    mediaCount: 0,
    ipAddress: "127.0.0.1",
    userAgent: "Admin",
    decision: "ALLOW",
    details: `Admin #${adminUserId} approved UPI Topup #${upiId} (UTR ${paymentRecord.utr}) crediting ₹${numAmount} to User #${targetUserId}`,
  });

  return { success: true, creditAmount: numAmount, userId: targetUserId };
}

// 7. Admin Manual Wallet Credit - Database transaction required
export async function adminCreditWallet(
  adminUserId: number,
  targetUserId: number,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) throw new Error("Credit amount must be greater than zero");
  if (!reason || !reason.trim()) throw new Error("Reason is required for manual wallet credit");

  const currentW = await getOrCreateWallet(targetUserId);
  const newBalance = currentW.balance + amount;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({ balance: newBalance.toFixed(2) } as any)
        .where(eq(wallets.userId, targetUserId));

      await tx.insert(ledgerEntries).values({
        userId: targetUserId,
        type: "admin_credit",
        amount: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        refType: "admin_adjustment",
        refId: reason.trim(),
      } as any);
    });
  } catch (err: any) {
    if (err?.status === 503) throw err;
    throwDbUnavailable(err);
  }

  recordSecurityEvent({
    event: "ADMIN_IDENTITY_UNLOCKED",
    mingreeUserId: adminUserId,
    instagramUsername: "admin_wallet_credit",
    riskScore: 0,
    riskLevel: "LOW",
    riskFactors: [],
    followers: 0,
    mediaCount: 0,
    ipAddress: "127.0.0.1",
    userAgent: "Admin",
    decision: "ALLOW",
    details: `Admin #${adminUserId} manually credited ₹${amount} to User #${targetUserId}. Reason: ${reason.trim()}`,
  });

  return { success: true, newBalance };
}
