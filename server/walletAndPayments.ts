import { db } from "./db";
import { wallets, ledgerEntries, paymentOrders, upiPayments, subscriptions, kyc } from "../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { recordSecurityEvent } from "./instagramSecurity";

// In-memory fallback stores for local testing when DB is not reachable
interface WalletRecord {
  id: number;
  userId: number;
  balance: string;
  escrowHeld: string;
}

interface LedgerRecord {
  id: number;
  userId: number;
  type: string;
  amount: string;
  balanceAfter: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

interface PaymentOrderRecord {
  id: number;
  orderId: string;
  userId: number;
  purpose: string;
  amount: string;
  status: string;
}

interface UpiPaymentRecord {
  id: number;
  utr: string;
  userId: number;
  amount: string;
  status: string;
  createdAt: string;
}

const memoryWallets = new Map<number, WalletRecord>();
const memoryLedger: LedgerRecord[] = [];
const memoryPaymentOrders = new Map<string, PaymentOrderRecord>();
const memoryUpiPayments = new Map<string, UpiPaymentRecord>();

// Helper to get or initialize a user's wallet without free balances
export async function getOrCreateWallet(userId: number): Promise<{ balance: number; escrowHeld: number }> {
  try {
    const existing = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (existing.length > 0) {
      return {
        balance: parseFloat(existing[0].balance || "0.00"),
        escrowHeld: parseFloat(existing[0].escrowHeld || "0.00"),
      };
    }
    await db.insert(wallets).values({
      userId,
      balance: "0.00",
      escrowHeld: "0.00",
    } as any);
    return { balance: 0, escrowHeld: 0 };
  } catch {
    let mem = memoryWallets.get(userId);
    if (!mem) {
      mem = { id: Date.now(), userId, balance: "0.00", escrowHeld: "0.00" };
      memoryWallets.set(userId, mem);
    }
    return {
      balance: parseFloat(mem.balance),
      escrowHeld: parseFloat(mem.escrowHeld),
    };
  }
}

// 1. Lock Escrow (Artist locks funds for campaign / deal)
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
    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          escrowHeld: newEscrow.toFixed(2),
        } as any)
        .where(eq(wallets.userId, artistId));

      await tx.insert(ledgerEntries).values({
        userId: artistId,
        type: "escrow_lock",
        amount: (-amount).toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        refType: ref.refType,
        refId: ref.refId,
      } as any);
    });
  } catch {
    const mem = memoryWallets.get(artistId) || { id: Date.now(), userId: artistId, balance: "0.00", escrowHeld: "0.00" };
    mem.balance = newBalance.toFixed(2);
    mem.escrowHeld = newEscrow.toFixed(2);
    memoryWallets.set(artistId, mem);

    memoryLedger.unshift({
      id: Date.now(),
      userId: artistId,
      type: "escrow_lock",
      amount: (-amount).toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      refType: ref.refType,
      refId: ref.refId,
      createdAt: new Date().toISOString(),
    });
  }

  return { success: true, newBalance, newEscrow };
}

// 2. Release Escrow (Artist approves deal; funds transfer from artist escrow to creator wallet balance)
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
    await db.transaction(async (tx) => {
      // Artist Escrow decrement
      await tx
        .update(wallets)
        .set({ escrowHeld: artistNewEscrow.toFixed(2) } as any)
        .where(eq(wallets.userId, artistId));

      await tx.insert(ledgerEntries).values({
        userId: artistId,
        type: "escrow_release",
        amount: (-amount).toFixed(2),
        balanceAfter: artistWallet.balance.toFixed(2),
        refType: ref.refType,
        refId: ref.refId,
      } as any);

      // Creator Balance increment
      await tx
        .update(wallets)
        .set({ balance: creatorNewBalance.toFixed(2) } as any)
        .where(eq(wallets.userId, creatorId));

      await tx.insert(ledgerEntries).values({
        userId: creatorId,
        type: "payout_received",
        amount: amount.toFixed(2),
        balanceAfter: creatorNewBalance.toFixed(2),
        refType: ref.refType,
        refId: ref.refId,
      } as any);
    });
  } catch {
    const aMem = memoryWallets.get(artistId) || { id: Date.now(), userId: artistId, balance: "0.00", escrowHeld: "0.00" };
    aMem.escrowHeld = artistNewEscrow.toFixed(2);
    memoryWallets.set(artistId, aMem);

    const cMem = memoryWallets.get(creatorId) || { id: Date.now(), userId: creatorId, balance: "0.00", escrowHeld: "0.00" };
    cMem.balance = creatorNewBalance.toFixed(2);
    memoryWallets.set(creatorId, cMem);

    memoryLedger.unshift(
      {
        id: Date.now(),
        userId: artistId,
        type: "escrow_release",
        amount: (-amount).toFixed(2),
        balanceAfter: artistWallet.balance.toFixed(2),
        refType: ref.refType,
        refId: ref.refId,
        createdAt: new Date().toISOString(),
      },
      {
        id: Date.now() + 1,
        userId: creatorId,
        type: "payout_received",
        amount: amount.toFixed(2),
        balanceAfter: creatorNewBalance.toFixed(2),
        refType: ref.refType,
        refId: ref.refId,
        createdAt: new Date().toISOString(),
      }
    );
  }

  return { success: true };
}

// 3. Refund Escrow (Deal or campaign cancelled/expired; escrow returned to artist wallet balance)
export async function refundEscrow(
  artistId: number,
  amount: number,
  ref: { refType: string; refId: string }
): Promise<{ success: boolean; newBalance: number }> {
  const current = await getOrCreateWallet(artistId);
  const newEscrow = Math.max(0, current.escrowHeld - amount);
  const newBalance = current.balance + amount;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          escrowHeld: newEscrow.toFixed(2),
        } as any)
        .where(eq(wallets.userId, artistId));

      await tx.insert(ledgerEntries).values({
        userId: artistId,
        type: "escrow_refund",
        amount: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        refType: ref.refType,
        refId: ref.refId,
      } as any);
    });
  } catch {
    const mem = memoryWallets.get(artistId) || { id: Date.now(), userId: artistId, balance: "0.00", escrowHeld: "0.00" };
    mem.escrowHeld = newEscrow.toFixed(2);
    mem.balance = newBalance.toFixed(2);
    memoryWallets.set(artistId, mem);

    memoryLedger.unshift({
      id: Date.now(),
      userId: artistId,
      type: "escrow_refund",
      amount: amount.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      refType: ref.refType,
      refId: ref.refId,
      createdAt: new Date().toISOString(),
    });
  }

  return { success: true, newBalance };
}

// 4. Payment Orders & Idempotent Processing
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
  } catch {
    memoryPaymentOrders.set(params.orderId, {
      id: Date.now(),
      orderId: params.orderId,
      userId: params.userId,
      purpose: params.purpose,
      amount: amountStr,
      status: "pending",
    });
  }
}

export async function processOrderPaymentSuccess(orderId: string, details?: { gstin?: string; pan?: string; billingAddress?: string }): Promise<{
  alreadyProcessed: boolean;
  order: { userId: number; purpose: string; amount: number };
  newBalance?: number;
}> {
  let storedOrder: { id?: number; orderId: string; userId: number; purpose: string; amount: string; status: string } | null = null;

  try {
    const rows = await db.select().from(paymentOrders).where(eq(paymentOrders.orderId, orderId));
    if (rows.length > 0) {
      storedOrder = rows[0];
    }
  } catch {
    storedOrder = memoryPaymentOrders.get(orderId) || null;
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

  // Process payment success in transaction
  try {
    let finalBalance = 0;
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

    return {
      alreadyProcessed: false,
      order: { userId, purpose: storedOrder.purpose, amount: numAmount },
      newBalance: finalBalance,
    };
  } catch (err) {
    // Memory Fallback
    storedOrder.status = "paid";
    memoryPaymentOrders.set(orderId, {
      id: storedOrder.id || Date.now(),
      orderId: storedOrder.orderId,
      userId: storedOrder.userId,
      purpose: storedOrder.purpose,
      amount: storedOrder.amount,
      status: storedOrder.status,
    });

    const memW = memoryWallets.get(userId) || { id: Date.now(), userId, balance: "0.00", escrowHeld: "0.00" };
    let newBal = parseFloat(memW.balance);

    if (storedOrder.purpose !== "subscription") {
      newBal += numAmount;
      memW.balance = newBal.toFixed(2);
      memoryWallets.set(userId, memW);

      memoryLedger.unshift({
        id: Date.now(),
        userId,
        type: "wallet_deposit",
        amount: numAmount.toFixed(2),
        balanceAfter: newBal.toFixed(2),
        refType: "payment_order",
        refId: orderId,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      alreadyProcessed: false,
      order: { userId, purpose: storedOrder.purpose, amount: numAmount },
      newBalance: newBal,
    };
  }
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

// 6. Manual UPI Top-Up Submissions
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

    if (memoryUpiPayments.has(cleanUtr)) {
      throw new Error(`A payment with UTR number '${cleanUtr}' has already been submitted.`);
    }

    const rec = {
      id: Date.now(),
      utr: cleanUtr,
      userId,
      amount: amountStr,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    memoryUpiPayments.set(cleanUtr, rec);
    return { id: rec.id, status: "pending" };
  }
}

export async function approveUpiTopup(upiId: number, adminUserId: number): Promise<{ success: boolean; creditAmount: number; userId: number }> {
  let paymentRecord: { id: number; utr: string; userId: number; amount: string; status: string } | null = null;

  try {
    const rows = await db.select().from(upiPayments).where(eq(upiPayments.id, upiId));
    if (rows.length > 0) paymentRecord = rows[0];
  } catch {
    paymentRecord = Array.from(memoryUpiPayments.values()).find((p) => p.id === upiId) || null;
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
  } catch {
    paymentRecord.status = "approved";
    const currentW = await getOrCreateWallet(targetUserId);
    const newBal = currentW.balance + numAmount;
    const memW = memoryWallets.get(targetUserId) || { id: Date.now(), userId: targetUserId, balance: "0.00", escrowHeld: "0.00" };
    memW.balance = newBal.toFixed(2);
    memoryWallets.set(targetUserId, memW);

    memoryLedger.unshift({
      id: Date.now(),
      userId: targetUserId,
      type: "upi_topup",
      amount: numAmount.toFixed(2),
      balanceAfter: newBal.toFixed(2),
      refType: "upi_payment",
      refId: paymentRecord.utr,
      createdAt: new Date().toISOString(),
    });
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

// 7. Admin Manual Wallet Credit
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
  } catch {
    const memW = memoryWallets.get(targetUserId) || { id: Date.now(), userId: targetUserId, balance: "0.00", escrowHeld: "0.00" };
    memW.balance = newBalance.toFixed(2);
    memoryWallets.set(targetUserId, memW);

    memoryLedger.unshift({
      id: Date.now(),
      userId: targetUserId,
      type: "admin_credit",
      amount: amount.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      refType: "admin_adjustment",
      refId: reason.trim(),
      createdAt: new Date().toISOString(),
    });
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
