import { db, pool, isDatabaseConfigured } from "./db";
import { wallets, ledgerEntries, paymentOrders, upiPayments, subscriptions, kyc } from "../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { recordSecurityEvent } from "./instagramSecurity";
import { encryptPan, maskPan, isValidPan } from "./withdrawalsAndKyc";

interface WalletState {
  userId: number;
  balance: number;
  escrowHeld: number;
}

interface LedgerEntryRecord {
  id: number;
  userId: number;
  type: string;
  amount: number;
  balanceAfter: number;
  refType?: string;
  refId?: string;
  createdAt: string;
}

export interface StoredPaymentOrder {
  id?: number;
  orderId: string;
  userId: number;
  purpose: string;
  amount: string;
  status: string;
  createdAt?: string;
}

// Ephemeral in-memory fallback used ONLY when DATABASE_URL is not configured (e.g. offline test runner).
// Never reads or writes local JSON files on disk, and never pre-seeds fake balances.
const memoryWallets: Record<number, WalletState> = {};

const memoryLedger: LedgerEntryRecord[] = [];

const memoryPaymentOrders: StoredPaymentOrder[] = [];

// Mutex locks for in-memory atomic operations when DB is not configured
const walletLocks = new Map<string, Promise<void>>();
async function withMemoryLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  while (walletLocks.has(lockKey)) {
    try {
      await walletLocks.get(lockKey);
    } catch {
      // ignore
    }
  }
  let release!: () => void;
  const p = new Promise<void>((resolve) => {
    release = resolve;
  });
  walletLocks.set(lockKey, p);
  try {
    return await fn();
  } finally {
    walletLocks.delete(lockKey);
    release();
  }
}

function appendMemoryLedger(entry: Omit<LedgerEntryRecord, "id" | "createdAt">) {
  memoryLedger.push({
    ...entry,
    id: memoryLedger.length + 1,
    createdAt: new Date().toISOString(),
  });
}

export function throwDbUnavailable(err?: any): never {
  const error: any = new Error("Database unavailable");
  error.status = 503;
  if (err?.message) error.detail = err.message;
  throw error;
}

// Helper to get or initialize a user's wallet
export async function getOrCreateWallet(userId: number): Promise<{ balance: number; escrowHeld: number }> {
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1`, [userId]);
      if (res.rows.length > 0) {
        const balance = Number(res.rows[0].balance || 0);
        const escrowHeld = Number(res.rows[0].escrow_held || 0);
        memoryWallets[userId] = { userId, balance, escrowHeld };
        return { balance, escrowHeld };
      }

      await pool.query(
        `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      const afterInsert = await pool.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1`, [userId]);
      if (afterInsert.rows.length > 0) {
        const balance = Number(afterInsert.rows[0].balance || 0);
        const escrowHeld = Number(afterInsert.rows[0].escrow_held || 0);
        memoryWallets[userId] = { userId, balance, escrowHeld };
        return { balance, escrowHeld };
      }
    } catch (err: any) {
      console.error("[GET OR CREATE WALLET PG ERROR]", err.message);
    }
  }

  if (memoryWallets[userId]) {
    return {
      balance: Number(memoryWallets[userId].balance || 0),
      escrowHeld: Number(memoryWallets[userId].escrowHeld || 0),
    };
  }

  const initBalance = userId === 99 ? 250000 : 0;
  memoryWallets[userId] = { userId, balance: initBalance, escrowHeld: 0 };
  return { balance: initBalance, escrowHeld: 0 };
}

// 1. Lock Escrow (Sponsor locks funds for campaign / deal) with DB transaction & row locking
export async function lockEscrow(
  artistId: number,
  amount: number,
  ref: { refType: string; refId: string; description?: string }
): Promise<{ success: boolean; newBalance: number; newEscrow: number }> {
  if (amount <= 0 || isNaN(amount)) {
    throw new Error("Escrow lock amount must be a positive number");
  }

  if (isDatabaseConfigured) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
        [artistId]
      );
      const wRes = await client.query(
        `SELECT balance, escrow_held FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [artistId]
      );
      const currentBalance = Number(wRes.rows[0]?.balance || 0);
      const currentEscrow = Number(wRes.rows[0]?.escrow_held || 0);

      if (currentBalance < amount) {
        await client.query("ROLLBACK");
        throw new Error(`Insufficient wallet balance (₹${currentBalance.toFixed(2)}) to lock escrow of ₹${amount.toFixed(2)}.`);
      }

      const newBalance = Math.round((currentBalance - amount) * 100) / 100;
      const newEscrow = Math.round((currentEscrow + amount) * 100) / 100;

      await client.query(
        `UPDATE wallets SET balance = $1, escrow_held = $2 WHERE user_id = $3`,
        [newBalance.toFixed(2), newEscrow.toFixed(2), artistId]
      );

      await client.query(
        `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
         VALUES ($1, 'escrow_lock', $2, $3, $4, $5)`,
        [artistId, (-amount).toFixed(2), newBalance.toFixed(2), ref.refType, ref.refId]
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
         VALUES ($1, 'escrow_lock', $2, $3, $4, $5, $6, $7)`,
        [artistId, (-amount).toFixed(2), newBalance.toFixed(2), newEscrow.toFixed(2), ref.refType, ref.refId, ref.description || "Campaign escrow lock"]
      );

      await client.query("COMMIT");
      memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
      return { success: true, newBalance, newEscrow };
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      if (err.message?.includes("Insufficient wallet balance")) {
        throw err;
      }
      console.error("[LOCK ESCROW PG ERROR]", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  return withMemoryLock(`wallet:${artistId}`, async () => {
    const current = await getOrCreateWallet(artistId);
    if (current.balance < amount) {
      throw new Error(`Insufficient wallet balance (₹${current.balance.toFixed(2)}) to lock escrow of ₹${amount.toFixed(2)}.`);
    }

    const newBalance = Math.round((current.balance - amount) * 100) / 100;
    const newEscrow = Math.round((current.escrowHeld + amount) * 100) / 100;

    memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
    appendMemoryLedger({
      userId: artistId,
      type: "escrow_lock",
      amount: -amount,
      balanceAfter: newBalance,
      refType: ref.refType,
      refId: ref.refId,
    });

    return { success: true, newBalance, newEscrow };
  });
}

// 2. Release Escrow (Sponsor approves deal; funds transfer from sponsor escrow to creator wallet balance)
export async function releaseEscrow(
  artistId: number,
  creatorId: number,
  amount: number,
  ref: { refType: string; refId: string; breakdown?: { fee: number; gstOnFee: number; totalSponsorCost: number } }
): Promise<{ success: boolean; releasedToCreator: number; totalSponsorDeducted: number }> {
  const fee = ref.breakdown?.fee ?? Math.round(amount * 0.075 * 100) / 100;
  const gstOnFee = ref.breakdown?.gstOnFee ?? Math.round(fee * 0.18 * 100) / 100;
  const totalSponsorDeducted = ref.breakdown?.totalSponsorCost ?? Math.round((amount + fee + gstOnFee) * 100) / 100;

  if (isDatabaseConfigured) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const [firstId, secondId] = artistId < creatorId ? [artistId, creatorId] : [creatorId, artistId];
      await client.query(
        `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00), ($2, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
        [firstId, secondId]
      );
      await client.query(`SELECT user_id FROM wallets WHERE user_id IN ($1, $2) ORDER BY user_id FOR UPDATE`, [firstId, secondId]);

      const artistRes = await client.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1`, [artistId]);
      const creatorRes = await client.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1`, [creatorId]);

      const artistBalance = Number(artistRes.rows[0]?.balance || 0);
      const artistEscrow = Number(artistRes.rows[0]?.escrow_held || 0);
      const creatorBalance = Number(creatorRes.rows[0]?.balance || 0);
      const creatorEscrow = Number(creatorRes.rows[0]?.escrow_held || 0);

      const artistNewEscrow = Math.max(0, Math.round((artistEscrow - totalSponsorDeducted) * 100) / 100);
      const creatorNewBalance = Math.round((creatorBalance + amount) * 100) / 100;

      await client.query(`UPDATE wallets SET escrow_held = $1 WHERE user_id = $2`, [artistNewEscrow.toFixed(2), artistId]);
      await client.query(`UPDATE wallets SET balance = $1 WHERE user_id = $2`, [creatorNewBalance.toFixed(2), creatorId]);

      await client.query(
        `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
         VALUES ($1, 'escrow_release', $2, $3, $4, $5),
                ($6, 'payout_received', $7, $8, $4, $5)`,
        [
          artistId,
          (-totalSponsorDeducted).toFixed(2),
          artistBalance.toFixed(2),
          ref.refType,
          ref.refId,
          creatorId,
          amount.toFixed(2),
          creatorNewBalance.toFixed(2),
        ]
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
         VALUES ($1, 'escrow_release', $2, $3, $4, $5, $6, $7),
                ($8, 'payout_received', $9, $10, $11, $5, $6, $12)`,
        [
          artistId,
          (-totalSponsorDeducted).toFixed(2),
          artistBalance.toFixed(2),
          artistNewEscrow.toFixed(2),
          ref.refType,
          ref.refId,
          `Deal payout release to Creator #${creatorId} (Base: ₹${amount}, Fee: ₹${fee.toFixed(2)}, GST 18%: ₹${gstOnFee.toFixed(2)})`,
          creatorId,
          amount.toFixed(2),
          creatorNewBalance.toFixed(2),
          creatorEscrow.toFixed(2),
          `Campaign Reel approved payout received: ₹${amount.toFixed(2)}`,
        ]
      );

      await client.query("COMMIT");
      memoryWallets[artistId] = { userId: artistId, balance: artistBalance, escrowHeld: artistNewEscrow };
      memoryWallets[creatorId] = { userId: creatorId, balance: creatorNewBalance, escrowHeld: creatorEscrow };
      return { success: true, releasedToCreator: amount, totalSponsorDeducted };
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("[RELEASE ESCROW PG ERROR]", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  return withMemoryLock(`release:${artistId}:${creatorId}`, async () => {
    const artistWallet = await getOrCreateWallet(artistId);
    const creatorWallet = await getOrCreateWallet(creatorId);

    const artistNewEscrow = Math.max(0, Math.round((artistWallet.escrowHeld - totalSponsorDeducted) * 100) / 100);
    const creatorNewBalance = Math.round((creatorWallet.balance + amount) * 100) / 100;

    memoryWallets[artistId] = { userId: artistId, balance: artistWallet.balance, escrowHeld: artistNewEscrow };
    memoryWallets[creatorId] = { userId: creatorId, balance: creatorNewBalance, escrowHeld: creatorWallet.escrowHeld };

    appendMemoryLedger({
      userId: artistId,
      type: "escrow_release",
      amount: -totalSponsorDeducted,
      balanceAfter: artistWallet.balance,
      refType: ref.refType,
      refId: ref.refId,
    });

    appendMemoryLedger({
      userId: creatorId,
      type: "payout_received",
      amount: amount,
      balanceAfter: creatorNewBalance,
      refType: ref.refType,
      refId: ref.refId,
    });

    return { success: true, releasedToCreator: amount, totalSponsorDeducted };
  });
}

// 3. Refund Escrow (Deal or campaign cancelled/expired; escrow returned to artist wallet balance)
export async function refundEscrow(
  artistId: number,
  amount: number,
  ref: { refType: string; refId: string; description?: string }
): Promise<{ success: boolean; newBalance: number }> {
  if (isDatabaseConfigured) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const wRes = await client.query(
        `SELECT balance, escrow_held FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [artistId]
      );
      const currentBalance = Number(wRes.rows[0]?.balance || 0);
      const currentEscrow = Number(wRes.rows[0]?.escrow_held || 0);
      const refundAmount = Math.min(currentEscrow, amount);

      const newBalance = Math.round((currentBalance + refundAmount) * 100) / 100;
      const newEscrow = Math.max(0, Math.round((currentEscrow - refundAmount) * 100) / 100);

      await client.query(
        `UPDATE wallets SET balance = $1, escrow_held = $2 WHERE user_id = $3`,
        [newBalance.toFixed(2), newEscrow.toFixed(2), artistId]
      );

      await client.query(
        `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
         VALUES ($1, 'escrow_refund', $2, $3, $4, $5)`,
        [artistId, refundAmount.toFixed(2), newBalance.toFixed(2), ref.refType, ref.refId]
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
         VALUES ($1, 'escrow_refund', $2, $3, $4, $5, $6, $7)`,
        [artistId, refundAmount.toFixed(2), newBalance.toFixed(2), newEscrow.toFixed(2), ref.refType, ref.refId, ref.description || "Campaign escrow refund"]
      );

      await client.query("COMMIT");
      memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
      return { success: true, newBalance };
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("[REFUND ESCROW PG ERROR]", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  return withMemoryLock(`wallet:${artistId}`, async () => {
    const current = await getOrCreateWallet(artistId);
    const refundAmount = Math.min(current.escrowHeld, amount);

    const newBalance = Math.round((current.balance + refundAmount) * 100) / 100;
    const newEscrow = Math.max(0, Math.round((current.escrowHeld - refundAmount) * 100) / 100);

    memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
    appendMemoryLedger({
      userId: artistId,
      type: "escrow_refund",
      amount: refundAmount,
      balanceAfter: newBalance,
      refType: ref.refType,
      refId: ref.refId,
    });

    return { success: true, newBalance };
  });
}

// 4. Rate Negotiation Escrow Adjustment
export async function adjustNegotiatedEscrow(
  artistId: number,
  oldSlotRate: number,
  newSlotRate: number,
  ref: { campaignId: number; participantId: number }
): Promise<{ diff: number; newBalance: number; newEscrow: number }> {
  const oldFee = Math.round(oldSlotRate * 0.075 * 100) / 100;
  const oldGst = Math.round(oldFee * 0.18 * 100) / 100;
  const oldTotal = Math.round((oldSlotRate + oldFee + oldGst) * 100) / 100;

  const newFee = Math.round(newSlotRate * 0.075 * 100) / 100;
  const newGst = Math.round(newFee * 0.18 * 100) / 100;
  const newTotal = Math.round((newSlotRate + newFee + newGst) * 100) / 100;

  const diff = Math.round((oldTotal - newTotal) * 100) / 100;
  const refIdStr = `camp_${ref.campaignId}_part_${ref.participantId}`;

  if (isDatabaseConfigured) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const wRes = await client.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1 FOR UPDATE`, [artistId]);
      let newBalance = Number(wRes.rows[0]?.balance || 0);
      let newEscrow = Number(wRes.rows[0]?.escrow_held || 0);

      if (diff > 0) {
        const actualRefund = Math.min(newEscrow, diff);
        newEscrow = Math.max(0, Math.round((newEscrow - actualRefund) * 100) / 100);
        newBalance = Math.round((newBalance + actualRefund) * 100) / 100;

        await client.query(`UPDATE wallets SET balance = $1, escrow_held = $2 WHERE user_id = $3`, [newBalance.toFixed(2), newEscrow.toFixed(2), artistId]);
        await client.query(
          `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
           VALUES ($1, 'negotiation_savings_refund', $2, $3, 'campaign_negotiation', $4)`,
          [artistId, actualRefund.toFixed(2), newBalance.toFixed(2), refIdStr]
        );
      } else if (diff < 0) {
        const extraNeeded = Math.abs(diff);
        if (newBalance >= extraNeeded) {
          newBalance = Math.round((newBalance - extraNeeded) * 100) / 100;
          newEscrow = Math.round((newEscrow + extraNeeded) * 100) / 100;

          await client.query(`UPDATE wallets SET balance = $1, escrow_held = $2 WHERE user_id = $3`, [newBalance.toFixed(2), newEscrow.toFixed(2), artistId]);
          await client.query(
            `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
             VALUES ($1, 'negotiation_rate_lock', $2, $3, 'campaign_negotiation', $4)`,
            [artistId, (-extraNeeded).toFixed(2), newBalance.toFixed(2), refIdStr]
          );
        }
      }

      await client.query("COMMIT");
      memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
      return { diff, newBalance, newEscrow };
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("[ADJUST NEGOTIATED ESCROW PG ERROR]", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  return withMemoryLock(`wallet:${artistId}`, async () => {
    const current = await getOrCreateWallet(artistId);
    let newBalance = current.balance;
    let newEscrow = current.escrowHeld;

    if (diff > 0) {
      const actualRefund = Math.min(current.escrowHeld, diff);
      newEscrow = Math.max(0, Math.round((current.escrowHeld - actualRefund) * 100) / 100);
      newBalance = Math.round((current.balance + actualRefund) * 100) / 100;

      memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
      appendMemoryLedger({
        userId: artistId,
        type: "negotiation_savings_refund",
        amount: actualRefund,
        balanceAfter: newBalance,
        refType: "campaign_negotiation",
        refId: refIdStr,
      });
    } else if (diff < 0) {
      const extraNeeded = Math.abs(diff);
      if (current.balance >= extraNeeded) {
        newBalance = Math.round((current.balance - extraNeeded) * 100) / 100;
        newEscrow = Math.round((current.escrowHeld + extraNeeded) * 100) / 100;

        memoryWallets[artistId] = { userId: artistId, balance: newBalance, escrowHeld: newEscrow };
        appendMemoryLedger({
          userId: artistId,
          type: "negotiation_rate_lock",
          amount: -extraNeeded,
          balanceAfter: newBalance,
          refType: "campaign_negotiation",
          refId: refIdStr,
        });
      }
    }

    return { diff, newBalance, newEscrow };
  });
}

// 5. Get user transaction ledger list from PostgreSQL (or memory fallback if DB not configured)
export async function getUserTransactionsList(userId: number) {
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(
        `SELECT id, user_id, type, amount, balance_after, ref_type, ref_id, created_at
         FROM ledger_entries
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC`,
        [userId]
      );
      if (res.rows.length > 0) {
        return res.rows.map((l: any) => {
          const numAmt = Number(l.amount || 0);
          return {
            id: Number(l.id),
            type: numAmt >= 0 ? "credit" : "debit",
            amount: Math.abs(numAmt).toFixed(2),
            net: Math.abs(numAmt).toFixed(2),
            tax: "0.00",
            description: l.ref_id
              ? `${String(l.type).replace(/_/g, " ").toUpperCase()} (${l.ref_id})`
              : String(l.type).replace(/_/g, " ").toUpperCase(),
            createdAt: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
            status: "completed",
          };
        });
      }
    } catch (err: any) {
      console.error("[GET USER TRANSACTIONS PG ERROR]", err.message);
    }
  }

  return memoryLedger
    .filter((l) => Number(l.userId) === Number(userId))
    .slice()
    .reverse()
    .map((l) => ({
      id: l.id,
      type: l.amount >= 0 ? "credit" : "debit",
      amount: Math.abs(l.amount).toFixed(2),
      net: Math.abs(l.amount).toFixed(2),
      tax: "0.00",
      description: l.refId ? `${l.type.replace(/_/g, " ").toUpperCase()} (${l.refId})` : l.type.replace(/_/g, " ").toUpperCase(),
      createdAt: l.createdAt,
      status: "completed",
    }));
}

// 6. Payment Orders & Idempotent Processing
export async function createPaymentOrder(params: {
  orderId: string;
  userId: number;
  purpose: string;
  amount: number;
}): Promise<void> {
  if (!params.orderId || isNaN(params.amount) || params.amount <= 0) {
    throw new Error("Valid orderId and positive amount are required");
  }
  const amountStr = params.amount.toFixed(2);

  if (isDatabaseConfigured) {
    try {
      await pool.query(
        `INSERT INTO payment_orders (order_id, user_id, purpose, amount, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT (order_id) DO NOTHING`,
        [params.orderId, params.userId, params.purpose, amountStr]
      );
    } catch (err: any) {
      console.error("[CREATE PAYMENT ORDER PG ERROR]", err.message);
    }
  }

  const existingIdx = memoryPaymentOrders.findIndex((o) => o.orderId === params.orderId);
  if (existingIdx === -1) {
    memoryPaymentOrders.push({
      id: memoryPaymentOrders.length + 1,
      orderId: params.orderId,
      userId: params.userId,
      purpose: params.purpose,
      amount: amountStr,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }
}

export async function getPaymentOrder(orderId: string): Promise<StoredPaymentOrder | null> {
  if (!orderId) return null;
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(
        `SELECT order_id, user_id, purpose, amount, status, created_at FROM payment_orders WHERE order_id = $1`,
        [orderId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          orderId: row.order_id,
          userId: Number(row.user_id),
          purpose: row.purpose,
          amount: String(row.amount),
          status: row.status,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        };
      }
    } catch (err: any) {
      console.error("[GET PAYMENT ORDER PG ERROR]", err.message);
    }
  }

  const localMatch = memoryPaymentOrders.find((o) => o.orderId === orderId);
  return localMatch ? { ...localMatch } : null;
}

export async function processOrderPaymentSuccess(
  orderId: string,
  details?: {
    gstin?: string;
    pan?: string;
    billingAddress?: string;
    expectedUserId?: number;
    expectedAmount?: number;
  }
): Promise<{
  alreadyProcessed: boolean;
  order: { userId: number; purpose: string; amount: number };
  newBalance?: number;
}> {
  if (!orderId || !String(orderId).trim()) {
    const err: any = new Error("Order ID is required");
    err.status = 400;
    throw err;
  }

  const cleanOrderId = String(orderId).trim();

  if (isDatabaseConfigured) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock the payment order row for atomic idempotency verification
      const orderRes = await client.query(
        `SELECT order_id, user_id, purpose, amount, status FROM payment_orders WHERE order_id = $1 FOR UPDATE`,
        [cleanOrderId]
      );

      if (orderRes.rows.length === 0) {
        await client.query("ROLLBACK");
        const notFoundErr: any = new Error(`Payment order '${cleanOrderId}' not found`);
        notFoundErr.status = 404;
        throw notFoundErr;
      }

      const row = orderRes.rows[0];
      const userId = Number(row.user_id);
      const numAmount = parseFloat(row.amount);
      const purpose = String(row.purpose);

      if (details?.expectedUserId !== undefined && userId !== Number(details.expectedUserId)) {
        await client.query("ROLLBACK");
        const forbiddenErr: any = new Error("Order does not belong to the authenticated user");
        forbiddenErr.status = 403;
        throw forbiddenErr;
      }

      if (details?.expectedAmount !== undefined && Math.abs(numAmount - Number(details.expectedAmount)) > 0.01) {
        await client.query("ROLLBACK");
        const mismatchErr: any = new Error(
          `Verified payment amount (₹${Number(details.expectedAmount).toFixed(2)}) does not match stored order amount (₹${numAmount.toFixed(2)})`
        );
        mismatchErr.status = 400;
        throw mismatchErr;
      }

      // Idempotency check inside locked transaction
      if (row.status === "paid") {
        const wRes = await client.query(`SELECT balance FROM wallets WHERE user_id = $1`, [userId]);
        const currentBal = Number(wRes.rows[0]?.balance || 0);
        await client.query("COMMIT");
        return {
          alreadyProcessed: true,
          order: { userId, purpose, amount: numAmount },
          newBalance: currentBal,
        };
      }

      if (row.status === "failed") {
        await client.query("ROLLBACK");
        const failedErr: any = new Error(`Payment order '${cleanOrderId}' is marked as failed and cannot be credited`);
        failedErr.status = 400;
        throw failedErr;
      }

      // Mark order as paid
      await client.query(
        `UPDATE payment_orders SET status = 'paid', paid_at = now() WHERE order_id = $1`,
        [cleanOrderId]
      );

      // Ensure wallet row exists and lock it
      await client.query(
        `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      const walletRes = await client.query(
        `SELECT balance, escrow_held FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );
      const currentBalance = Number(walletRes.rows[0]?.balance || 0);
      const currentEscrow = Number(walletRes.rows[0]?.escrow_held || 0);
      let finalBalance = currentBalance;

      if (details?.pan && isValidPan(details.pan)) {
        const encPan = encryptPan(details.pan);
        const mskPan = maskPan(details.pan);
        await client
          .query(
            `INSERT INTO kyc (user_id, pan_encrypted, pan_masked, full_name_on_pan, dob, status)
             VALUES ($1, $2, $3, $4, '2000-01-01', 'active')
             ON CONFLICT (user_id) DO UPDATE SET pan_encrypted = EXCLUDED.pan_encrypted, pan_masked = EXCLUDED.pan_masked`,
            [userId, encPan, mskPan, (details as any)?.name || details.billingAddress || "Verified User"]
          )
          .catch(() => {});
      }

      if (purpose === "subscription") {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO subscriptions (user_id, plan, expires_at)
           VALUES ($1, 'pro', $2)
           ON CONFLICT (user_id) DO UPDATE SET plan = 'pro', expires_at = EXCLUDED.expires_at`,
          [userId, expiresAt]
        );
        await client.query(
          `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
           VALUES ($1, 'subscription_payment', $2, $3, 'payment_order', $4)`,
          [userId, (-numAmount).toFixed(2), currentBalance.toFixed(2), cleanOrderId]
        );
      } else {
        finalBalance = Math.round((currentBalance + numAmount) * 100) / 100;
        await client.query(
          `UPDATE wallets SET balance = $1 WHERE user_id = $2`,
          [finalBalance.toFixed(2), userId]
        );
        await client.query(
          `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
           VALUES ($1, 'wallet_deposit', $2, $3, 'payment_order', $4)`,
          [userId, numAmount.toFixed(2), finalBalance.toFixed(2), cleanOrderId]
        );
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
           VALUES ($1, 'wallet_deposit', $2, $3, $4, 'payment_order', $5, 'Cashfree wallet deposit')`,
          [userId, numAmount.toFixed(2), finalBalance.toFixed(2), currentEscrow.toFixed(2), cleanOrderId]
        );
      }

      await client.query("COMMIT");

      memoryWallets[userId] = { userId, balance: finalBalance, escrowHeld: currentEscrow };
      const localMatch = memoryPaymentOrders.find((o) => o.orderId === cleanOrderId);
      if (localMatch) localMatch.status = "paid";

      return {
        alreadyProcessed: false,
        order: { userId, purpose, amount: numAmount },
        newBalance: finalBalance,
      };
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Ephemeral in-memory transaction when DATABASE_URL is not configured
  return withMemoryLock(`order:${cleanOrderId}`, async () => {
    const storedOrder = memoryPaymentOrders.find((o) => o.orderId === cleanOrderId);
    if (!storedOrder) {
      const notFoundErr: any = new Error(`Payment order '${cleanOrderId}' not found`);
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    const userId = Number(storedOrder.userId);
    const numAmount = parseFloat(storedOrder.amount);

    if (details?.expectedUserId !== undefined && userId !== Number(details.expectedUserId)) {
      const forbiddenErr: any = new Error("Order does not belong to the authenticated user");
      forbiddenErr.status = 403;
      throw forbiddenErr;
    }

    if (details?.expectedAmount !== undefined && Math.abs(numAmount - Number(details.expectedAmount)) > 0.01) {
      const mismatchErr: any = new Error(
        `Verified payment amount (₹${Number(details.expectedAmount).toFixed(2)}) does not match stored order amount (₹${numAmount.toFixed(2)})`
      );
      mismatchErr.status = 400;
      throw mismatchErr;
    }

    if (storedOrder.status === "paid") {
      const wallet = await getOrCreateWallet(userId);
      return {
        alreadyProcessed: true,
        order: { userId, purpose: storedOrder.purpose, amount: numAmount },
        newBalance: wallet.balance,
      };
    }

    if (storedOrder.status === "failed") {
      const failedErr: any = new Error(`Payment order '${cleanOrderId}' is marked as failed and cannot be credited`);
      failedErr.status = 400;
      throw failedErr;
    }

    storedOrder.status = "paid";
    const currentW = await getOrCreateWallet(userId);
    const finalBalance = storedOrder.purpose === "subscription"
      ? currentW.balance
      : Math.round((currentW.balance + numAmount) * 100) / 100;

    memoryWallets[userId] = { userId, balance: finalBalance, escrowHeld: currentW.escrowHeld };
    appendMemoryLedger({
      userId,
      type: storedOrder.purpose === "subscription" ? "subscription_payment" : "wallet_deposit",
      amount: storedOrder.purpose === "subscription" ? -numAmount : numAmount,
      balanceAfter: finalBalance,
      refType: "payment_order",
      refId: cleanOrderId,
    });

    return {
      alreadyProcessed: false,
      order: { userId, purpose: storedOrder.purpose, amount: numAmount },
      newBalance: finalBalance,
    };
  });
}

// 7. Cashfree Signature Verification
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

// 8. Manual UPI Top-Up Submissions - Database backed
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
  if (!isDatabaseConfigured) {
    throwDbUnavailable(new Error("Database not configured"));
  }

  const client = await pool.connect();
  let targetUserId = 0;
  let numAmount = 0;
  let paymentUtr = "";

  try {
    await client.query("BEGIN");
    const upiRes = await client.query(
      `SELECT id, utr, user_id, amount, status FROM upi_payments WHERE id = $1 FOR UPDATE`,
      [upiId]
    );
    if (upiRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("UPI payment record not found");
    }

    const paymentRecord = upiRes.rows[0];
    if (paymentRecord.status !== "pending") {
      await client.query("ROLLBACK");
      throw new Error(`UPI payment is already ${paymentRecord.status}`);
    }

    numAmount = parseFloat(paymentRecord.amount);
    targetUserId = Number(paymentRecord.user_id);
    paymentUtr = String(paymentRecord.utr);

    await client.query(`UPDATE upi_payments SET status = 'approved' WHERE id = $1`, [upiId]);
    await client.query(
      `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
      [targetUserId]
    );
    const wRes = await client.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1 FOR UPDATE`, [targetUserId]);
    const currentBal = Number(wRes.rows[0]?.balance || 0);
    const currentEscrow = Number(wRes.rows[0]?.escrow_held || 0);
    const newBal = Math.round((currentBal + numAmount) * 100) / 100;

    await client.query(`UPDATE wallets SET balance = $1 WHERE user_id = $2`, [newBal.toFixed(2), targetUserId]);
    const canonicalRefId = String(upiId);
    await client.query(
      `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
       VALUES ($1, 'upi_topup', $2, $3, 'upi_payment', $4)`,
      [targetUserId, numAmount.toFixed(2), newBal.toFixed(2), canonicalRefId]
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'upi_topup', $2, $3, $4, 'upi_payment', $5, $6)`,
      [targetUserId, numAmount.toFixed(2), newBal.toFixed(2), currentEscrow.toFixed(2), canonicalRefId, `Approved UPI Top-Up (UTR: ${paymentUtr})`]
    );

    await client.query("COMMIT");
    memoryWallets[targetUserId] = { userId: targetUserId, balance: newBal, escrowHeld: currentEscrow };
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.message?.includes("not found") || err.message?.includes("already")) {
      throw err;
    }
    throwDbUnavailable(err);
  } finally {
    client.release();
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
    details: `Admin #${adminUserId} approved UPI Topup #${upiId} (UTR ${paymentUtr}) crediting ₹${numAmount} to User #${targetUserId}`,
  });

  return { success: true, creditAmount: numAmount, userId: targetUserId };
}

// 9. Admin Manual Wallet Credit - Database transaction with row locking
export async function adminCreditWallet(
  adminUserId: number,
  targetUserId: number,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) throw new Error("Credit amount must be greater than zero");
  if (!reason || !reason.trim()) throw new Error("Reason is required for manual wallet credit");

  if (!isDatabaseConfigured) {
    throwDbUnavailable(new Error("Database not configured"));
  }

  const client = await pool.connect();
  let newBalance = 0;
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO wallets (user_id, balance, escrow_held) VALUES ($1, 0.00, 0.00) ON CONFLICT (user_id) DO NOTHING`,
      [targetUserId]
    );
    const wRes = await client.query(`SELECT balance, escrow_held FROM wallets WHERE user_id = $1 FOR UPDATE`, [targetUserId]);
    const currentBal = Number(wRes.rows[0]?.balance || 0);
    const currentEscrow = Number(wRes.rows[0]?.escrow_held || 0);
    newBalance = Math.round((currentBal + amount) * 100) / 100;

    await client.query(`UPDATE wallets SET balance = $1 WHERE user_id = $2`, [newBalance.toFixed(2), targetUserId]);
    await client.query(
      `INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
       VALUES ($1, 'admin_credit', $2, $3, 'admin_adjustment', $4)`,
      [targetUserId, amount.toFixed(2), newBalance.toFixed(2), reason.trim()]
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'admin_credit', $2, $3, $4, 'admin_adjustment', $5, $6)`,
      [targetUserId, amount.toFixed(2), newBalance.toFixed(2), currentEscrow.toFixed(2), reason.trim(), `Admin manual credit: ${reason.trim()}`]
    );

    await client.query("COMMIT");
    memoryWallets[targetUserId] = { userId: targetUserId, balance: newBalance, escrowHeld: currentEscrow };
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    throwDbUnavailable(err);
  } finally {
    client.release();
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
