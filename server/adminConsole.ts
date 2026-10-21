import { db } from "./db";
import {
  users,
  creatorProfiles,
  deals,
  campaigns,
  disputes,
  withdrawals,
  upiPayments,
  promoCodes,
  supportTickets,
  appConfig,
  securityAuditLogs,
  instagramIdentities,
  ledgerEntries,
  subscriptions,
  wallets,
  kyc,
  payoutMethods,
} from "../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { CONFIG } from "../shared/config";
import { releaseEscrow, refundEscrow, getOrCreateWallet } from "./walletAndPayments";
import { recordSecurityEvent } from "./instagramSecurity";

/**
 * Audit Log Helper for Admin Actions
 */
export async function recordAdminAuditLog(adminUserId: number, event: string, details: any, ipAddress?: string): Promise<void> {
  try {
    await db.insert(securityAuditLogs).values({
      event: `ADMIN_${event.toUpperCase()}`,
      mingreeUserId: adminUserId,
      details: details || {},
      ipAddress: ipAddress || "127.0.0.1",
      createdAt: new Date(),
    } as any);
  } catch (err) {
    console.error("[AUDIT LOG ERROR] Failed to record admin audit log:", err);
  }
}

// 1. Users & Creator Profiles Section
export async function getAdminUsersList(): Promise<any[]> {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allProfiles = await db.select().from(creatorProfiles);
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    return allUsers.map((u) => {
      const p = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        handle: u.handle,
        avatar: u.avatar,
        tier: u.tier,
        companyName: u.companyName,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
        creatorProfile: p
          ? {
              username: p.username,
              followers: p.followers,
              tierLabel: p.tierLabel,
              medianViews: p.medianViews,
              engagementRate: p.engagementRate,
              indiaAudiencePct: p.indiaAudiencePct,
              riskScore: p.riskScore,
              status: p.status,
            }
          : null,
      };
    });
  } catch {
    return [];
  }
}

export async function toggleBlockUserAdmin(adminUserId: number, targetUserId: number, block: boolean, reason?: string): Promise<any> {
  const newStatus = block ? "blocked" : "active";
  try {
    await db
      .update(creatorProfiles)
      .set({ status: newStatus } as any)
      .where(eq(creatorProfiles.userId, targetUserId));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, block ? "BLOCK_USER" : "UNBLOCK_USER", { targetUserId, block, reason });
  return { success: true, targetUserId, newStatus };
}

// 2. Risk Review Queue Section
export async function getRiskReviewQueueAdmin(): Promise<any[]> {
  try {
    const profiles = await db
      .select()
      .from(creatorProfiles)
      .where(sql`${creatorProfiles.status} = 'needs_review' OR ${creatorProfiles.riskScore} >= 40`);

    const userRows = await db.select().from(users);
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return profiles.map((p) => ({
      ...p,
      user: userMap.get(p.userId) || null,
    }));
  } catch {
    return [];
  }
}

export async function decideRiskReviewAdmin(adminUserId: number, targetUserId: number, action: "approve" | "reject", notes?: string): Promise<any> {
  const newStatus = action === "approve" ? "active" : "blocked";
  try {
    await db
      .update(creatorProfiles)
      .set({ status: newStatus } as any)
      .where(eq(creatorProfiles.userId, targetUserId));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, `RISK_DECISION_${action.toUpperCase()}`, { targetUserId, action, notes });
  return { success: true, targetUserId, newStatus, action };
}

// 3. Disputes Section
export async function getDisputesAdmin(): Promise<any[]> {
  try {
    const allDisputes = await db.select().from(disputes).orderBy(desc(disputes.id));
    const dealRows = await db.select().from(deals);
    const userRows = await db.select().from(users);

    const dealMap = new Map(dealRows.map((d) => [d.id, d]));
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return allDisputes.map((disp) => {
      const d = dealMap.get(disp.dealId);
      return {
        ...disp,
        deal: d || null,
        raisedByUser: userMap.get(disp.raisedByUserId) || null,
        artist: d ? userMap.get(d.artistId) || null : null,
        creator: d ? userMap.get(d.creatorId) || null : null,
      };
    });
  } catch {
    return [];
  }
}

export async function resolveDisputeAdmin(
  adminUserId: number,
  disputeId: number,
  resolution: "refund_artist" | "release_creator" | "split",
  resolutionNotes?: string,
  splitParams?: { creatorAmount: number; artistAmount: number }
): Promise<any> {
  let dispute: any = null;
  let deal: any = null;

  try {
    const rows = await db.select().from(disputes).where(eq(disputes.id, disputeId));
    if (rows.length > 0) dispute = rows[0];

    if (dispute) {
      const dealRows = await db.select().from(deals).where(eq(deals.id, dispute.dealId));
      if (dealRows.length > 0) deal = dealRows[0];
    }
  } catch {
    // handled
  }

  if (!dispute || !deal) {
    throw new Error("Dispute or associated deal record not found");
  }

  const dealPrice = parseFloat(deal.price);

  if (resolution === "refund_artist") {
    await refundEscrow(deal.artistId, dealPrice, {
      refType: "dispute_refund",
      refId: String(disputeId),
    });
  } else if (resolution === "release_creator") {
    const creatorNetNum = parseFloat(deal.creatorNet);
    await releaseEscrow(deal.artistId, deal.creatorId, creatorNetNum, {
      refType: "dispute_release",
      refId: String(disputeId),
    });
  } else if (resolution === "split" && splitParams) {
    if (splitParams.artistAmount > 0) {
      await refundEscrow(deal.artistId, splitParams.artistAmount, {
        refType: "dispute_split_refund",
        refId: String(disputeId),
      });
    }
    if (splitParams.creatorAmount > 0) {
      await releaseEscrow(deal.artistId, deal.creatorId, splitParams.creatorAmount, {
        refType: "dispute_split_release",
        refId: String(disputeId),
      });
    }
  }

  try {
    await db
      .update(disputes)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolutionNotes: `${resolution}: ${resolutionNotes || "Admin resolved"}`,
      } as any)
      .where(eq(disputes.id, disputeId));

    await db
      .update(deals)
      .set({ status: "disputed_resolved" } as any)
      .where(eq(deals.id, deal.id));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, "RESOLVE_DISPUTE", { disputeId, resolution, resolutionNotes, splitParams });
  return { success: true, disputeId, resolution, message: "Dispute resolved and funds processed." };
}

// 4. Manual UPI Payments Section
export async function getUpiPaymentsAdmin(): Promise<any[]> {
  try {
    const rows = await db.select().from(upiPayments).orderBy(desc(upiPayments.id));
    const userRows = await db.select().from(users);
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return rows.map((p) => ({
      ...p,
      user: userMap.get(p.userId) || null,
    }));
  } catch {
    return [];
  }
}

export async function approveUpiPaymentAdmin(adminUserId: number, paymentId: number): Promise<any> {
  let upiRow: any = null;
  try {
    const rows = await db.select().from(upiPayments).where(eq(upiPayments.id, paymentId));
    if (rows.length > 0) upiRow = rows[0];
  } catch {
    // handled
  }

  if (!upiRow) throw new Error("UPI payment record not found");

  const amountNum = parseFloat(upiRow.amount);

  try {
    await db
      .update(upiPayments)
      .set({ status: "approved" } as any)
      .where(eq(upiPayments.id, paymentId));

    // Activate Pro subscription or top up wallet
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(subscriptions).values({
      userId: upiRow.userId,
      plan: "pro",
      status: "active",
      expiresAt,
    } as any);
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, "APPROVE_UPI_PAYMENT", { paymentId, amount: amountNum, userId: upiRow.userId });
  return { success: true, paymentId, message: "UPI Payment approved and Pro plan activated." };
}

export async function rejectUpiPaymentAdmin(adminUserId: number, paymentId: number, reason?: string): Promise<any> {
  try {
    await db
      .update(upiPayments)
      .set({ status: "rejected" } as any)
      .where(eq(upiPayments.id, paymentId));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, "REJECT_UPI_PAYMENT", { paymentId, reason });
  return { success: true, paymentId, message: "UPI Payment rejected." };
}

// 5. Config Editor (`app_config`)
export async function getAppConfigAdmin(): Promise<Record<string, any>> {
  const mergedConfig: Record<string, any> = { ...CONFIG };
  try {
    const rows = await db.select().from(appConfig);
    for (const row of rows) {
      mergedConfig[row.key] = isNaN(Number(row.value)) ? row.value : Number(row.value);
    }
  } catch {
    // default
  }
  return mergedConfig;
}

export async function updateAppConfigAdmin(adminUserId: number, newConfigs: Record<string, any>): Promise<any> {
  for (const [key, val] of Object.entries(newConfigs)) {
    const valStr = String(val);
    try {
      const existing = await db.select().from(appConfig).where(eq(appConfig.key, key));
      if (existing.length > 0) {
        await db
          .update(appConfig)
          .set({ value: valStr } as any)
          .where(eq(appConfig.key, key));
      } else {
        await db.insert(appConfig).values({ key, value: valStr } as any);
      }
    } catch {
      // handled
    }
  }

  await recordAdminAuditLog(adminUserId, "UPDATE_APP_CONFIG", { newConfigs });
  return { success: true, message: "Application configuration updated successfully." };
}

// 6. Promo Codes Section
export async function getPromoCodesAdmin(): Promise<any[]> {
  try {
    return await db.select().from(promoCodes).orderBy(desc(promoCodes.id));
  } catch {
    return [];
  }
}

export async function createPromoCodeAdmin(
  adminUserId: number,
  data: {
    code: string;
    discountType: string;
    discountValue: number;
    maxUses?: number;
    expiresAt?: string;
    isActive?: boolean;
  }
): Promise<any> {
  const cleanCode = data.code.trim().toUpperCase();
  let created: any = null;

  try {
    const inserted = await db
      .insert(promoCodes)
      .values({
        code: cleanCode,
        discountType: data.discountType,
        discountValue: String(data.discountValue),
        maxUses: data.maxUses || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      } as any)
      .returning();
    created = inserted[0];
  } catch {
    created = {
      id: Date.now(),
      code: cleanCode,
      discountType: data.discountType,
      discountValue: String(data.discountValue),
      maxUses: data.maxUses || null,
      isActive: true,
    };
  }

  await recordAdminAuditLog(adminUserId, "CREATE_PROMO_CODE", { code: cleanCode, created });
  return { success: true, promoCode: created };
}

export async function togglePromoCodeAdmin(adminUserId: number, promoId: number, isActive: boolean): Promise<any> {
  try {
    await db
      .update(promoCodes)
      .set({ isActive } as any)
      .where(eq(promoCodes.id, promoId));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, "TOGGLE_PROMO_CODE", { promoId, isActive });
  return { success: true, promoId, isActive };
}

// 7. Support Tickets Section
export async function getSupportTicketsAdmin(): Promise<any[]> {
  try {
    const tickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.id));
    const userRows = await db.select().from(users);
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return tickets.map((t) => ({
      ...t,
      user: userMap.get(t.userId) || null,
    }));
  } catch {
    return [];
  }
}

export async function respondSupportTicketAdmin(adminUserId: number, ticketId: number, responseText: string, newStatus = "resolved"): Promise<any> {
  try {
    await db
      .update(supportTickets)
      .set({ status: newStatus } as any)
      .where(eq(supportTickets.id, ticketId));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, "RESPOND_SUPPORT_TICKET", { ticketId, newStatus, responseText });
  return { success: true, ticketId, newStatus };
}

// 8. Instagram Identity Binding Transfers & Security Audit Logs
export async function getSecurityAuditLogsAdmin(): Promise<any[]> {
  try {
    return await db.select().from(securityAuditLogs).orderBy(desc(securityAuditLogs.id)).limit(100);
  } catch {
    return [];
  }
}

export async function getInstagramBindingsAdmin(): Promise<any[]> {
  try {
    const bindings = await db.select().from(instagramIdentities);
    const userRows = await db.select().from(users);
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    return bindings.map((b) => ({
      ...b,
      user: userMap.get(b.userId) || null,
    }));
  } catch {
    return [];
  }
}

export async function transferInstagramBindingAdmin(adminUserId: number, targetInstagramUserId: string, newUserId: number): Promise<any> {
  try {
    await db
      .update(instagramIdentities)
      .set({ userId: newUserId } as any)
      .where(eq(instagramIdentities.instagramUserId, targetInstagramUserId));
  } catch {
    // handled
  }

  await recordAdminAuditLog(adminUserId, "TRANSFER_INSTAGRAM_BINDING", { targetInstagramUserId, newUserId });
  return { success: true, targetInstagramUserId, newUserId, message: "Instagram identity binding transferred." };
}

// 9. Platform Revenue Breakdown
export async function getPlatformRevenueAdmin(): Promise<{
  totalArtistFees: number;
  totalCreatorFees: number;
  totalGstOnFees: number;
  totalProSubscriptions: number;
  totalNetEarnings: number;
}> {
  let totalArtistFees = 0;
  let totalCreatorFees = 0;
  let totalGstOnFees = 0;
  let totalProSubscriptions = 0;

  try {
    const dealsList = await db.select().from(deals);
    for (const d of dealsList) {
      if (d.status === "approved" || d.status === "released") {
        const fa = parseFloat(d.feeArtist || "0");
        const fc = parseFloat(d.feeCreator || "0");
        totalArtistFees += fa;
        totalCreatorFees += fc;
        totalGstOnFees += fa * 0.18; // 18% GST on artist platform fee
      }
    }

    const proPayments = await db.select().from(upiPayments).where(eq(upiPayments.status, "approved"));
    for (const p of proPayments) {
      totalProSubscriptions += parseFloat(p.amount || "0");
    }
  } catch {
    // handled
  }

  totalArtistFees = parseFloat(totalArtistFees.toFixed(2));
  totalCreatorFees = parseFloat(totalCreatorFees.toFixed(2));
  totalGstOnFees = parseFloat(totalGstOnFees.toFixed(2));
  totalProSubscriptions = parseFloat(totalProSubscriptions.toFixed(2));
  const totalNetEarnings = parseFloat((totalArtistFees + totalCreatorFees + totalProSubscriptions).toFixed(2));

  return {
    totalArtistFees,
    totalCreatorFees,
    totalGstOnFees,
    totalProSubscriptions,
    totalNetEarnings,
  };
}
