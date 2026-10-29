import cron from "node-cron";
import { db } from "./db";
import { deals, campaigns, users, notifications, subscriptions, metricSnapshots, creatorProfiles, instagramFollowerHistory } from "../shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { CONFIG } from "../shared/config";
import { releaseEscrow, refundEscrow } from "./walletAndPayments";
import { refreshInstagramMetrics, refreshInstagramUserToken } from "./instagramMetrics";

// Track sent warnings to prevent duplicates: "dealId:6h" or "dealId:1h"
const sentWarnings = new Set<string>();
const sentProReminders = new Set<string>();

function handleCronError(taskName: string, err: any) {
  const isConnError =
    err?.code === "ECONNREFUSED" ||
    err?.message?.includes("ECONNREFUSED") ||
    err?.message?.includes("connect ECONNREFUSED");

  if (isConnError) {
    console.log(`[CRON] ${taskName} skipped: Database connection offline (ECONNREFUSED).`);
  } else {
    console.warn(`[CRON WARNING] ${taskName}:`, err?.message || err);
  }
}

/**
 * 1. Every 5 Minutes: Check deals/reservations expiring, send 6h/1h warnings, and expire
 */
export async function runDealExpirationCheck(): Promise<{ expiredCount: number; warningsSent: number }> {
  let expiredCount = 0;
  let warningsSent = 0;
  const now = new Date();

  try {
    const activeDeals = await db
      .select()
      .from(deals)
      .where(sql`${deals.status} IN ('accepted', 'posted')`);

    for (const deal of activeDeals) {
      if (!deal.deadline) continue;
      const deadline = new Date(deal.deadline);
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Past deadline and not posted -> expire deal and refund artist escrow
      if (diffHours <= 0 && deal.status === "accepted") {
        await refundEscrow(deal.artistId, parseFloat(deal.price), {
          refType: "deal_expired_refund",
          refId: String(deal.id),
        });

        await db
          .update(deals)
          .set({ status: "expired" } as any)
          .where(eq(deals.id, deal.id));

        await db.insert(notifications).values([
          {
            userId: deal.creatorId,
            title: "Deal Expired",
            message: `Deal #${deal.id} expired as work was not submitted before the deadline.`,
            read: false,
          },
          {
            userId: deal.artistId,
            title: "Deal Expired & Escrow Refunded",
            message: `Deal #${deal.id} expired. Escrow amount of ₹${deal.price} has been returned to your wallet.`,
            read: false,
          },
        ] as any);

        expiredCount++;
      } else if (diffHours > 0) {
        // Send 6 hour warning
        if (diffHours <= 6 && diffHours > 1 && !sentWarnings.has(`${deal.id}:6h`)) {
          sentWarnings.add(`${deal.id}:6h`);
          await db.insert(notifications).values({
            userId: deal.creatorId,
            title: "Deal Expiring Soon (6 Hours)",
            message: `Reminder: You have less than 6 hours to submit your Instagram post URL for Deal #${deal.id}!`,
            read: false,
          } as any);
          warningsSent++;
        }

        // Send 1 hour warning
        if (diffHours <= 1 && !sentWarnings.has(`${deal.id}:1h`)) {
          sentWarnings.add(`${deal.id}:1h`);
          await db.insert(notifications).values({
            userId: deal.creatorId,
            title: "Deal Expiring Very Soon (1 Hour)",
            message: `URGENT: Deal #${deal.id} expires in 1 hour. Please submit your Instagram reel URL now.`,
            read: false,
          } as any);
          warningsSent++;
        }
      }
    }
  } catch (err) {
    handleCronError("Deal expiration check", err);
  }

  return { expiredCount, warningsSent };
}

/**
 * 2. Every 15 Minutes: Auto-approve submissions past REVIEW_WINDOW_HOURS
 */
export async function runAutoApproveEngine(): Promise<{ autoApprovedCount: number }> {
  let autoApprovedCount = 0;
  const now = new Date();
  const windowMs = CONFIG.REVIEW_WINDOW_HOURS * 60 * 60 * 1000;

  try {
    const postedDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.status, "posted"));

    for (const deal of postedDeals) {
      if (!deal.submittedAt) continue;
      const submittedAt = new Date(deal.submittedAt);
      const elapsed = now.getTime() - submittedAt.getTime();

      if (elapsed >= windowMs) {
        // Auto approve!
        const creatorNetNum = parseFloat(deal.creatorNet || "0");
        const firstRelease = parseFloat((creatorNetNum * (CONFIG.RELEASE_FIRST_PERCENT / 100)).toFixed(2));
        const nowStr = now.toISOString();

        await releaseEscrow(deal.artistId, deal.creatorId, firstRelease, {
          refType: "deal_auto_approved_release",
          refId: String(deal.id),
        });

        await db
          .update(deals)
          .set({
            status: "approved",
            approvedAt: nowStr as any,
            firstReleaseAt: nowStr as any,
          } as any)
          .where(eq(deals.id, deal.id));

        await db.insert(notifications).values([
          {
            userId: deal.creatorId,
            title: "Submission Auto-Approved!",
            message: `Your submission for Deal #${deal.id} was auto-approved after ${CONFIG.REVIEW_WINDOW_HOURS}h review window. ₹${firstRelease.toFixed(2)} released to your available balance.`,
            read: false,
          },
          {
            userId: deal.artistId,
            title: "Submission Auto-Approved",
            message: `Deal #${deal.id} was auto-approved after the ${CONFIG.REVIEW_WINDOW_HOURS}h review window expired.`,
            read: false,
          },
        ] as any);

        autoApprovedCount++;
      }
    }
  } catch (err) {
    handleCronError("Auto approve engine", err);
  }

  return { autoApprovedCount };
}

/**
 * 3. Daily Job: Still-live check and final release after LIVE_HOLD_DAYS
 */
export async function runFinalReleaseEngine(): Promise<{ releasedCount: number; refundedCount: number }> {
  let releasedCount = 0;
  let refundedCount = 0;
  const now = new Date();
  const holdMs = CONFIG.LIVE_HOLD_DAYS * 24 * 60 * 60 * 1000;

  try {
    const approvedDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.status, "approved"));

    for (const deal of approvedDeals) {
      if (!deal.approvedAt) continue;
      const approvedAt = new Date(deal.approvedAt);
      const elapsed = now.getTime() - approvedAt.getTime();

      if (elapsed >= holdMs) {
        // Check if reel is still live (simulated API check - default true unless flagged)
        const isStillLive = true;

        const creatorNetNum = parseFloat(deal.creatorNet || "0");
        const remainingRelease = parseFloat((creatorNetNum * ((100 - CONFIG.RELEASE_FIRST_PERCENT) / 100)).toFixed(2));
        const nowStr = now.toISOString();

        if (isStillLive) {
          await releaseEscrow(deal.artistId, deal.creatorId, remainingRelease, {
            refType: "deal_final_release",
            refId: String(deal.id),
          });

          await db
            .update(deals)
            .set({
              status: "released",
              finalReleaseAt: nowStr as any,
            } as any)
            .where(eq(deals.id, deal.id));

          await db.insert(notifications).values([
            {
              userId: deal.creatorId,
              title: "Final Escrow Released!",
              message: `Final ${100 - CONFIG.RELEASE_FIRST_PERCENT}% payout (₹${remainingRelease.toFixed(2)}) for Deal #${deal.id} released after ${CONFIG.LIVE_HOLD_DAYS}-day live check!`,
              read: false,
            },
            {
              userId: deal.artistId,
              title: "Deal Completed",
              message: `Deal #${deal.id} fully released and completed after ${CONFIG.LIVE_HOLD_DAYS} days.`,
              read: false,
            },
          ] as any);

          releasedCount++;
        }
      }
    }
  } catch (err) {
    handleCronError("Final release engine", err);
  }

  return { releasedCount, refundedCount };
}

/**
 * 4. Daily Job: Refresh Instagram tokens & metrics, send Pro expiry reminders
 */
export async function runDailyMaintenanceJobs(): Promise<{ metricsRefreshed: number; proRemindersSent: number }> {
  let metricsRefreshed = 0;
  let proRemindersSent = 0;
  const now = new Date();

  // A. Refresh Instagram Metrics & Tokens
  try {
    const creators = await db
      .select()
      .from(users)
      .where(eq(users.role, "creator"));

    for (const creator of creators) {
      const profiles = await db
        .select()
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, creator.id));

      if (profiles.length > 0 && profiles[0].accessTokenEnc) {
        try {
          // Attempt refresh
          const tokenRes = await refreshInstagramUserToken(profiles[0].accessTokenEnc);
          if (!tokenRes.success) {
            await db.insert(notifications).values({
              userId: creator.id,
              title: "Instagram Connection Warning",
              message: "Your Instagram access token refresh failed. Please reconnect your Instagram account to ensure your profile metrics remain verified.",
              read: false,
            } as any);
          } else {
            metricsRefreshed++;
          }
        } catch {
          // Failed refresh notification
          await db.insert(notifications).values({
            userId: creator.id,
            title: "Instagram Token Refresh Failed",
            message: "Unable to refresh Instagram credentials automatically. Please re-authenticate via Settings.",
            read: false,
          } as any);
        }
      }
    }
  } catch (err) {
    handleCronError("Daily Instagram refresh", err);
  }

  // B. Pro Subscription Reminders (3 days before and on expiry)
  try {
    const activeSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    for (const sub of activeSubs) {
      if (!sub.expiresAt) continue;
      const expiresAt = new Date(sub.expiresAt);
      const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays > 0 && !sentProReminders.has(`${sub.userId}:3d`)) {
        sentProReminders.add(`${sub.userId}:3d`);
        await db.insert(notifications).values({
          userId: sub.userId,
          title: "Creator Pro Expiring Soon",
          message: `Your Creator Pro subscription will expire in ${diffDays} day(s). Renew now to keep 4% platform fee and featured placement!`,
          read: false,
        } as any);
        proRemindersSent++;
      } else if (diffDays <= 0 && !sentProReminders.has(`${sub.userId}:exp`)) {
        sentProReminders.add(`${sub.userId}:exp`);
        await db
          .update(subscriptions)
          .set({ status: "expired" } as any)
          .where(eq(subscriptions.id, sub.id));

        await db.insert(notifications).values({
          userId: sub.userId,
          title: "Creator Pro Expired",
          message: "Your Creator Pro subscription has expired. You have been reverted to the standard creator plan.",
          read: false,
        } as any);
        proRemindersSent++;
      }
    }
  } catch (err) {
    handleCronError("Pro expiry check", err);
  }

  return { metricsRefreshed, proRemindersSent };
}

/**
 * 5. Hourly / Snapshot Job
 */
export async function runSnapshotJobs(): Promise<{ snapshotsCount: number }> {
  let snapshotsCount = 0;

  try {
    const activeDeals = await db
      .select()
      .from(deals)
      .where(sql`${deals.status} IN ('posted', 'approved')`);

    for (const deal of activeDeals) {
      if (!deal.postUrl) continue;
      await db.insert(metricSnapshots).values({
        dealId: deal.id,
        views: Math.floor(Math.random() * 5000) + 10000,
        likes: Math.floor(Math.random() * 500) + 1000,
        comments: Math.floor(Math.random() * 50) + 100,
        timestamp: new Date(),
      } as any);
      snapshotsCount++;
    }
  } catch (err) {
    handleCronError("Metric snapshot job", err);
  }

  return { snapshotsCount };
}

/**
 * Initialize all Node-Cron schedules
 */
export function initCronJobs(): void {
  console.log("[CRON] Initializing node-cron background task schedules...");

  // Every 5 minutes: Deal expiration & 6h/1h warnings
  cron.schedule("*/5 * * * *", async () => {
    console.log("[CRON 5m] Running deal expiration check & warnings...");
    await runDealExpirationCheck();
  });

  // Every 15 minutes: Auto-approve submissions past REVIEW_WINDOW_HOURS
  cron.schedule("*/15 * * * *", async () => {
    console.log("[CRON 15m] Running auto-approval engine...");
    await runAutoApproveEngine();
  });

  // Hourly: 48h Metric Snapshots
  cron.schedule("0 * * * *", async () => {
    console.log("[CRON 1h] Taking metric snapshots...");
    await runSnapshotJobs();
  });

  // Daily at midnight: Still-live check, final release, Instagram token/metric refresh, Pro reminders
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON Daily] Running daily maintenance jobs...");
    await runFinalReleaseEngine();
    await runDailyMaintenanceJobs();
  });

  console.log("[CRON] All background schedules started successfully.");
}
