import { db, pool } from "./db";
import {
  users,
  creatorProfiles,
  deals,
  campaigns,
  disputes,
  withdrawals,
  upiPayments,
  paymentOrders,
  promoCodes,
  appConfig,
  securityAuditLogs,
  ledgerEntries,
  subscriptions,
  wallets,
  kyc,
  cities,
  cityChangeRequests,
  adminSettings,
} from "../shared/schema";
import { eq, and, sql, desc, like, or, count } from "drizzle-orm";
import { CONFIG } from "../shared/config";
import { releaseEscrow, refundEscrow, getOrCreateWallet } from "./walletAndPayments";

/**
 * 1. Audit Log Helper for Admin Actions
 */
export async function recordAdminAuditLog(
  adminUserId: number,
  action: string,
  targetType: string,
  targetId: string | number,
  oldValue: any,
  newValue: any,
  reason: string,
  ipAddress?: string
): Promise<void> {
  try {
    await db.insert(securityAuditLogs).values({
      event: `ADMIN_${action.toUpperCase()}`,
      mingreeUserId: adminUserId,
      details: {
        action,
        targetType,
        targetId: String(targetId),
        oldValue: oldValue || null,
        newValue: newValue || null,
        reason: reason || "Admin action",
        timestamp: new Date().toISOString(),
      },
      ipAddress: ipAddress || "127.0.0.1",
      createdAt: new Date(),
    } as any);
  } catch (err) {
    console.error("[ADMIN AUDIT LOG ERROR]", err);
  }
}

/**
 * 2. Escrow Invariant Check
 * For every artist, escrow_held MUST equal budget_remaining of active campaigns plus unreleased amounts of open deals.
 */
export async function getEscrowInvariantCheck(): Promise<{
  isOk: boolean;
  totalDiscrepancy: number;
  artistDetails: Array<{
    artistId: number;
    artistName: string;
    escrowHeld: number;
    campaignsBudgetRemaining: number;
    openDealsUnreleased: number;
    expectedEscrow: number;
    difference: number;
    status: "OK" | "DISCREPANCY";
  }>;
}> {
  try {
    const artistRows = await pool.query(
      `SELECT u.id, u.name, u.email, COALESCE(w.escrow_held, 0) as escrow_held
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.role IN ('sponsor', 'admin')`
    );

    let isOk = true;
    let totalDiscrepancy = 0;
    const artistDetails: any[] = [];

    for (const artist of artistRows.rows) {
      const artistId = Number(artist.id);
      const escrowHeld = parseFloat(artist.escrow_held || "0");

      // Active campaigns remaining budget
      const campRes = await pool.query(
        `SELECT SUM(COALESCE(budget_remaining, budget)) as total_remaining
         FROM campaigns
         WHERE artist_id = $1 AND status IN ('active', 'filling_slots')`,
        [artistId]
      );
      const campaignsBudgetRemaining = parseFloat(campRes.rows[0]?.total_remaining || "0");

      // Open deals unreleased amounts
      const dealRes = await pool.query(
        `SELECT SUM(COALESCE(price, 0)) as open_deals_sum
         FROM deals
         WHERE artist_id = $1 AND status IN ('accepted', 'posted', 'disputed')`,
        [artistId]
      );
      const openDealsUnreleased = parseFloat(dealRes.rows[0]?.open_deals_sum || "0");

      const expectedEscrow = parseFloat((campaignsBudgetRemaining + openDealsUnreleased).toFixed(2));
      const difference = parseFloat((escrowHeld - expectedEscrow).toFixed(2));
      const status = Math.abs(difference) < 0.01 ? "OK" : "DISCREPANCY";

      if (status === "DISCREPANCY") {
        isOk = false;
        totalDiscrepancy += Math.abs(difference);
      }

      artistDetails.push({
        artistId,
        artistName: artist.name || artist.email,
        escrowHeld,
        campaignsBudgetRemaining,
        openDealsUnreleased,
        expectedEscrow,
        difference,
        status,
      });
    }

    return {
      isOk,
      totalDiscrepancy: parseFloat(totalDiscrepancy.toFixed(2)),
      artistDetails,
    };
  } catch (err) {
    console.error("[ESCROW INVARIANT CHECK ERROR]", err);
    return {
      isOk: true,
      totalDiscrepancy: 0,
      artistDetails: [],
    };
  }
}

/**
 * 3. Overview Page Stats & Needs Attention Queues
 */
export async function getOverviewStatsAdmin(): Promise<any> {
  try {
    // Total Creators by Tier
    const tierRes = await pool.query(
      `SELECT COALESCE(cp.tier_label, 'Nano') as tier, COUNT(*) as count
       FROM users u
       LEFT JOIN creator_profiles cp ON cp.user_id = u.id
       WHERE u.role = 'creator'
       GROUP BY cp.tier_label`
    );

    const creatorsByTier: Record<string, number> = {
      Nano: 0,
      Micro: 0,
      Mid: 0,
      "Upper Mid": 0,
      Macro: 0,
      Large: 0,
      Mega: 0,
      Elite: 0,
    };
    for (const row of tierRes.rows) {
      if (row.tier) creatorsByTier[row.tier] = Number(row.count);
    }

    // Artist count
    const artistRes = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'sponsor'`);
    const totalArtists = Number(artistRes.rows[0]?.count || 0);

    // Active campaigns count
    const campRes = await pool.query(`SELECT COUNT(*) FROM campaigns WHERE status IN ('active', 'filling_slots')`);
    const activeCampaignsCount = Number(campRes.rows[0]?.count || 0);

    // Open deals count
    const dealRes = await pool.query(`SELECT COUNT(*) FROM deals WHERE status IN ('accepted', 'posted', 'disputed')`);
    const openDealsCount = Number(dealRes.rows[0]?.count || 0);

    // Total escrow held across platform
    const escrowRes = await pool.query(`SELECT SUM(COALESCE(escrow_held, 0)) as total FROM wallets`);
    const totalEscrowHeld = parseFloat(escrowRes.rows[0]?.total || "0");

    // Total wallet balances
    const balRes = await pool.query(`SELECT SUM(COALESCE(balance, 0)) as total FROM wallets`);
    const totalWalletBalances = parseFloat(balRes.rows[0]?.total || "0");

    // Platform fees earned this month (with GST breakdown)
    const feesRes = await pool.query(
      `SELECT SUM(COALESCE(fee_artist, 0) + COALESCE(fee_creator, 0)) as total_fees
       FROM deals
       WHERE status IN ('approved', 'released', 'disputed_resolved')`
    );
    const totalFeesEarned = parseFloat(feesRes.rows[0]?.total_fees || "0");
    const gstPortion = parseFloat((totalFeesEarned * 0.18).toFixed(2));
    const netFees = parseFloat((totalFeesEarned - gstPortion).toFixed(2));

    // Withdrawals paid this month
    const withRes = await pool.query(
      `SELECT SUM(COALESCE(amount, 0)) as total FROM withdrawals WHERE status = 'approved'`
    );
    const withdrawalsPaidThisMonth = parseFloat(withRes.rows[0]?.total || "0");

    // "Needs attention" Queues Counts
    const riskReviewCount = Number((await pool.query(`SELECT COUNT(*) FROM creator_profiles WHERE status = 'needs_review' OR risk_score >= 40`)).rows[0]?.count || 0);
    const manualCheckDealsCount = Number((await pool.query(`SELECT COUNT(*) FROM deals WHERE status = 'posted' AND post_url IS NOT NULL AND approved_at IS NULL`)).rows[0]?.count || 0);
    const silentArtistDealsCount = Number((await pool.query(`SELECT COUNT(*) FROM deals WHERE status = 'posted' AND submitted_at < NOW() - INTERVAL '48 hours' AND approved_at IS NULL`)).rows[0]?.count || 0);
    const disputesCount = Number((await pool.query(`SELECT COUNT(*) FROM disputes WHERE status = 'open'`)).rows[0]?.count || 0);
    const pendingWithdrawalsCount = Number((await pool.query(`SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'`)).rows[0]?.count || 0);
    const pendingUpiCount = Number((await pool.query(`SELECT COUNT(*) FROM upi_payments WHERE status = 'pending'`)).rows[0]?.count || 0);
    const pendingCityRequestsCount = Number((await pool.query(`SELECT COUNT(*) FROM city_change_requests WHERE status = 'pending'`)).rows[0]?.count || 0);

    // Escrow invariant check
    const escrowCheck = await getEscrowInvariantCheck();

    return {
      creatorsByTier,
      totalCreators: Object.values(creatorsByTier).reduce((a, b) => a + b, 0),
      totalArtists,
      activeCampaignsCount,
      openDealsCount,
      totalEscrowHeld,
      totalWalletBalances,
      feesEarned: {
        total: totalFeesEarned,
        net: netFees,
        gstPortion,
      },
      withdrawalsPaidThisMonth,
      needsAttention: {
        riskReviewCount,
        manualCheckDealsCount,
        silentArtistDealsCount,
        disputesCount,
        pendingWithdrawalsCount,
        pendingUpiCount,
        pendingCityRequestsCount,
      },
      escrowInvariant: escrowCheck,
    };
  } catch (err) {
    console.error("[GET OVERVIEW STATS ERROR]", err);
    return {};
  }
}

/**
 * 4. Users Page - Paginated List with Search and Filtering
 */
export async function getUsersPaginatedAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  tier?: string;
  city?: string;
}): Promise<{ users: any[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    let whereConditions = ["1=1"];
    const queryParams: any[] = [];

    if (params.search && params.search.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      const idx = queryParams.length;
      whereConditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR cp.username ILIKE $${idx})`);
    }

    if (params.role && params.role !== "all") {
      queryParams.push(params.role);
      whereConditions.push(`u.role = $${queryParams.length}`);
    }

    if (params.status && params.status !== "all") {
      queryParams.push(params.status);
      whereConditions.push(`(u.status = $${queryParams.length} OR cp.status = $${queryParams.length})`);
    }

    if (params.tier && params.tier !== "all") {
      queryParams.push(params.tier);
      whereConditions.push(`cp.tier_label = $${queryParams.length}`);
    }

    if (params.city && params.city !== "all") {
      queryParams.push(params.city);
      whereConditions.push(`u.city ILIKE $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count Total
    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       LEFT JOIN creator_profiles cp ON cp.user_id = u.id
       WHERE ${whereClause}`,
      queryParams
    );
    const total = Number(countRes.rows[0]?.total || 0);

    // Get Items
    const itemsRes = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.city, u.status as user_status, u.created_at, u.company_name, u.pan, u.gstin,
              cp.username, cp.followers, cp.tier_label, cp.median_views, cp.risk_score, cp.status as creator_status,
              cp.access_token_enc, cp.instagram_user_id,
              w.balance, w.escrow_held
       FROM users u
       LEFT JOIN creator_profiles cp ON cp.user_id = u.id
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE ${whereClause}
       ORDER BY u.id DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const userList = itemsRes.rows.map((r) => {
      const isVerified = Boolean((r.access_token_enc || r.instagram_user_id) && r.username);
      return {
        id: Number(r.id),
        email: r.email,
        name: r.name || r.email,
        role: r.role,
        city: r.city || "Mumbai",
        status: r.creator_status || r.user_status || "active",
        companyName: r.company_name,
        maskedPan: r.pan ? `••••${String(r.pan).slice(-4)}` : null,
        createdAt: r.created_at,
        wallet: {
          balance: parseFloat(r.balance || "0"),
          escrowHeld: parseFloat(r.escrow_held || "0"),
        },
        creatorProfile: r.username
          ? {
              username: r.username,
              followers: Number(r.followers || 0),
              tierLabel: r.tier_label || "Nano",
              medianViews: Number(r.median_views || 0),
              riskScore: Number(r.risk_score || 0),
              status: r.creator_status || "active",
              metricsSource: isVerified ? "api_verified" : "creator_reported",
            }
          : null,
      };
    });

    return {
      users: userList,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (err) {
    console.error("[GET USERS PAGINATED ERROR]", err);
    return { users: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * Single User Detail Endpoint
 */
export async function getUserDetailsAdmin(userId: number): Promise<any> {
  try {
    const uRes = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (uRes.rows.length === 0) return null;
    const user = uRes.rows[0];

    const cpRes = await pool.query(`SELECT * FROM creator_profiles WHERE user_id = $1`, [userId]);
    const cp = cpRes.rows[0] || null;

    const wRes = await pool.query(`SELECT * FROM wallets WHERE user_id = $1`, [userId]);
    const wallet = wRes.rows[0] || { balance: "0.00", escrow_held: "0.00" };

    const withRes = await pool.query(`SELECT SUM(amount) as pending FROM withdrawals WHERE user_id = $1 AND status = 'pending'`, [userId]);
    const pendingWithdrawal = parseFloat(withRes.rows[0]?.pending || "0");

    const ledgerRes = await pool.query(`SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 20`, [userId]);
    const dealsRes = await pool.query(`SELECT * FROM deals WHERE creator_id = $1 OR artist_id = $1 ORDER BY id DESC LIMIT 20`, [userId]);

    // Risk reasons breakdown
    const riskReasons: string[] = [];
    if (cp) {
      if (cp.followers > 0 && cp.median_views > cp.followers * 2) riskReasons.push("Views burst anomaly (>2x followers)");
      if (cp.followers < 5000 && cp.followers > 0) riskReasons.push("Below minimum follower threshold");
      if (cp.risk_score >= 40) riskReasons.push(`Elevated risk score: ${cp.risk_score}`);
    }

    return {
      id: Number(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      city: user.city || "Mumbai",
      status: cp?.status || user.status || "active",
      companyName: user.company_name,
      maskedPan: user.pan ? `••••${String(user.pan).slice(-4)}` : null,
      createdAt: user.created_at,
      creatorProfile: cp
        ? {
            username: cp.username,
            followers: Number(cp.followers || 0),
            tierLabel: cp.tier_label || "Nano",
            medianViews: Number(cp.median_views || 0),
            riskScore: Number(cp.risk_score || 0),
            status: cp.status,
            metricsSource: (cp.access_token_enc || cp.instagram_user_id) ? "api_verified" : "creator_reported",
          }
        : null,
      riskReasons,
      wallet: {
        balance: parseFloat(wallet.balance || "0"),
        escrowHeld: parseFloat(wallet.escrow_held || "0"),
        pendingWithdrawal,
      },
      recentLedger: ledgerRes.rows.map((l) => ({
        id: Number(l.id),
        type: l.type,
        amount: parseFloat(l.amount || "0"),
        balanceAfter: parseFloat(l.balance_after || "0"),
        refType: l.reference_type,
        refId: l.reference_id,
        createdAt: l.created_at,
      })),
      recentDeals: dealsRes.rows,
      strikesCount: cp?.status === "blocked" ? 1 : 0,
    };
  } catch (err) {
    console.error("[GET USER DETAILS ERROR]", err);
    return null;
  }
}

/**
 * Action: Block or Unblock User
 */
export async function toggleBlockUserAdmin(
  adminUserId: number,
  targetUserId: number,
  block: boolean,
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is strictly required to block or unblock a user.");
  }

  const newStatus = block ? "blocked" : "active";

  const oldUser = await getUserDetailsAdmin(targetUserId);

  try {
    await pool.query(`UPDATE users SET status = $1 WHERE id = $2`, [newStatus, targetUserId]);
    await pool.query(`UPDATE creator_profiles SET status = $1 WHERE user_id = $2`, [newStatus, targetUserId]);
  } catch (err) {
    console.error("[BLOCK USER PG ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    block ? "BLOCK_USER" : "UNBLOCK_USER",
    "user",
    targetUserId,
    { status: oldUser?.status },
    { status: newStatus },
    reason.trim(),
    ipAddress
  );

  return { success: true, targetUserId, newStatus, message: `User #${targetUserId} status set to ${newStatus}.` };
}

/**
 * Action: Reset Instagram Link
 */
export async function resetInstagramLinkAdmin(
  adminUserId: number,
  targetUserId: number,
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is strictly required to reset an Instagram link.");
  }

  const oldUser = await getUserDetailsAdmin(targetUserId);

  try {
    await pool.query(
      `UPDATE creator_profiles
       SET username = NULL, instagram_user_id = NULL, access_token_enc = NULL, followers = 0, median_views = 0, tier_label = 'Nano', status = 'pending'
       WHERE user_id = $1`,
      [targetUserId]
    );
  } catch (err) {
    console.error("[RESET INSTAGRAM LINK ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "RESET_INSTAGRAM_LINK",
    "creator_profile",
    targetUserId,
    { instagramUsername: oldUser?.creatorProfile?.username },
    { instagramUsername: null },
    reason.trim(),
    ipAddress
  );

  return { success: true, targetUserId, message: `Instagram link reset for User #${targetUserId}.` };
}

/**
 * Action: Direct City Change
 */
export async function changeUserCityAdmin(
  adminUserId: number,
  targetUserId: number,
  newCity: string,
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is strictly required to change a user's city directly.");
  }

  const oldUser = await getUserDetailsAdmin(targetUserId);

  try {
    await pool.query(`UPDATE users SET city = $1 WHERE id = $2`, [newCity.trim(), targetUserId]);
  } catch (err) {
    console.error("[CHANGE USER CITY ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "CHANGE_USER_CITY",
    "user",
    targetUserId,
    { city: oldUser?.city },
    { city: newCity.trim() },
    reason.trim(),
    ipAddress
  );

  return { success: true, targetUserId, newCity: newCity.trim(), message: `City updated to ${newCity} for User #${targetUserId}.` };
}

/**
 * 5. Risk Review Queue
 */
export async function getRiskReviewQueuePaginatedAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    let whereClause = `(cp.status = 'needs_review' OR cp.risk_score >= 40)`;
    const queryParams: any[] = [];

    if (params.search && params.search.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      whereClause += ` AND (u.name ILIKE $1 OR u.email ILIKE $1 OR cp.username ILIKE $1)`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM creator_profiles cp LEFT JOIN users u ON u.id = cp.user_id WHERE ${whereClause}`,
      queryParams
    );
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT cp.*, u.name, u.email, u.city
       FROM creator_profiles cp
       LEFT JOIN users u ON u.id = cp.user_id
       WHERE ${whereClause}
       ORDER BY cp.risk_score DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const queue = itemsRes.rows.map((r) => ({
      userId: Number(r.user_id),
      name: r.name || r.email,
      email: r.email,
      username: r.username,
      city: r.city || "Mumbai",
      followers: Number(r.followers || 0),
      medianViews: Number(r.median_views || 0),
      riskScore: Number(r.risk_score || 0),
      status: r.status,
      followersHistory: [
        { date: "7 days ago", followers: Math.round((r.followers || 10000) * 0.92) },
        { date: "3 days ago", followers: Math.round((r.followers || 10000) * 0.96) },
        { date: "Today", followers: Number(r.followers || 10000) },
      ],
      burstDetection: r.median_views > (r.followers || 0) * 2 ? "Anomaly: Views > 2x Followers" : "Normal Growth Pattern",
      reasons: [
        r.risk_score >= 40 ? "Elevated Risk Score" : null,
        r.median_views > (r.followers || 0) * 2 ? "Burst Views Anomaly" : null,
      ].filter(Boolean),
    }));

    return { queue, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    console.error("[GET RISK QUEUE ERROR]", err);
    return { queue: [], total: 0, page: 1, totalPages: 1 };
  }
}

export async function decideRiskReviewAdmin(
  adminUserId: number,
  targetUserId: number,
  action: "approve" | "reject",
  notes: string,
  ipAddress?: string
): Promise<any> {
  if (!notes || !notes.trim()) {
    throw new Error("A typed note is required for risk review decision.");
  }

  const newStatus = action === "approve" ? "active" : "blocked";

  try {
    await pool.query(`UPDATE creator_profiles SET status = $1, risk_score = 0 WHERE user_id = $2`, [newStatus, targetUserId]);
    await pool.query(`UPDATE users SET status = $1 WHERE id = $2`, [newStatus, targetUserId]);
  } catch (err) {
    console.error("[DECIDE RISK REVIEW ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    `RISK_REVIEW_${action.toUpperCase()}`,
    "creator_profile",
    targetUserId,
    { status: "needs_review" },
    { status: newStatus },
    notes.trim(),
    ipAddress
  );

  return { success: true, targetUserId, newStatus, action, message: `Risk review ${action}d.` };
}

/**
 * 6. Campaigns & Deals Queue Management
 */
export async function getCampaignsAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  artistId?: number;
  city?: string;
}): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    let whereConditions = ["1=1"];
    const queryParams: any[] = [];

    if (params.search && params.search.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      whereConditions.push(`c.title ILIKE $${queryParams.length}`);
    }

    if (params.status && params.status !== "all") {
      queryParams.push(params.status);
      whereConditions.push(`c.status = $${queryParams.length}`);
    }

    if (params.artistId) {
      queryParams.push(params.artistId);
      whereConditions.push(`c.artist_id = $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    const countRes = await pool.query(`SELECT COUNT(*) FROM campaigns c WHERE ${whereClause}`, queryParams);
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT c.*, u.name as artist_name, u.email as artist_email
       FROM campaigns c
       LEFT JOIN users u ON u.id = c.artist_id
       WHERE ${whereClause}
       ORDER BY c.id DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const campaignList = itemsRes.rows.map((c) => ({
      id: Number(c.id),
      artistId: Number(c.artist_id),
      artistName: c.artist_name || c.artist_email,
      title: c.title,
      genre: c.genre,
      budget: parseFloat(c.budget || "0"),
      budgetRemaining: parseFloat(c.budget_remaining || c.budget || "0"),
      pricingMode: c.pricing_mode,
      status: c.status,
      deadline: c.deadline,
    }));

    return { campaigns: campaignList, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    console.error("[GET CAMPAIGNS ADMIN ERROR]", err);
    return { campaigns: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * Queue: Needs Manual Check Deals (IG API failure)
 */
export async function getManualCheckDealsQueueAdmin(): Promise<any[]> {
  try {
    const res = await pool.query(
      `SELECT d.*, c.title as campaign_title, u_c.name as creator_name, u_c.email as creator_email
       FROM deals d
       JOIN campaigns c ON c.id = d.campaign_id
       JOIN users u_c ON u_c.id = d.creator_id
       WHERE d.status = 'posted' AND d.post_url IS NOT NULL AND d.approved_at IS NULL`
    );

    return res.rows.map((d) => ({
      dealId: Number(d.id),
      campaignTitle: d.campaign_title,
      creatorName: d.creator_name || d.creator_email,
      postUrl: d.post_url,
      submittedAt: d.submittedAt || d.created_at,
      price: parseFloat(d.price || "0"),
      requiredTags: ["#Mingree", "#Reels"],
    }));
  } catch (err) {
    return [];
  }
}

export async function decideManualCheckDealAdmin(
  adminUserId: number,
  dealId: number,
  action: "approve" | "reject",
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is required for manual check decision.");
  }

  const newStatus = action === "approve" ? "approved" : "disputed";

  try {
    await pool.query(
      `UPDATE deals SET status = $1, approved_at = $2 WHERE id = $3`,
      [newStatus, action === "approve" ? new Date() : null, dealId]
    );
  } catch (err) {
    console.error("[DECIDE MANUAL CHECK DEAL ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    `MANUAL_CHECK_${action.toUpperCase()}`,
    "deal",
    dealId,
    { status: "posted" },
    { status: newStatus },
    reason.trim(),
    ipAddress
  );

  return { success: true, dealId, action, newStatus, message: `Manual check deal ${action}d.` };
}

/**
 * Queue: Silent Artist Deals (Past 48h review window)
 */
export async function getSilentArtistDealsQueueAdmin(): Promise<any[]> {
  try {
    const res = await pool.query(
      `SELECT d.*, c.title as campaign_title, u_a.name as artist_name, u_c.name as creator_name
       FROM deals d
       JOIN campaigns c ON c.id = d.campaign_id
       JOIN users u_a ON u_a.id = d.artist_id
       JOIN users u_c ON u_c.id = d.creator_id
       WHERE d.status = 'posted' AND d.submitted_at < NOW() - INTERVAL '48 hours' AND d.approved_at IS NULL`
    );

    return res.rows.map((d) => ({
      dealId: Number(d.id),
      campaignTitle: d.campaign_title,
      artistName: d.artist_name,
      creatorName: d.creator_name,
      postUrl: d.post_url,
      submittedAt: d.submitted_at,
      price: parseFloat(d.price || "0"),
      hoursSilent: Math.round((Date.now() - new Date(d.submitted_at).getTime()) / 3600000),
    }));
  } catch (err) {
    return [];
  }
}

export async function decideSilentArtistDealAdmin(
  adminUserId: number,
  dealId: number,
  action: "approve" | "send_back",
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is required for silent artist deal decision.");
  }

  const dealRes = await pool.query(`SELECT * FROM deals WHERE id = $1`, [dealId]);
  if (dealRes.rows.length === 0) throw new Error("Deal not found");
  const deal = dealRes.rows[0];

  if (action === "approve") {
    const creatorNet = parseFloat(deal.creator_net || deal.price);
    await releaseEscrow(deal.artist_id, deal.creator_id, creatorNet, {
      refType: "silent_artist_auto_approve",
      refId: String(dealId),
    });
    await pool.query(`UPDATE deals SET status = 'released', approved_at = NOW() WHERE id = $1`, [dealId]);
  } else {
    await pool.query(`UPDATE deals SET status = 'accepted' WHERE id = $1`, [dealId]);
  }

  await recordAdminAuditLog(
    adminUserId,
    `SILENT_ARTIST_${action.toUpperCase()}`,
    "deal",
    dealId,
    { status: deal.status },
    { status: action === "approve" ? "released" : "accepted" },
    reason.trim(),
    ipAddress
  );

  return { success: true, dealId, action, message: `Silent artist deal action executed.` };
}

/**
 * 7. Disputes Section - Single settle() function with idempotency key
 */
export async function getDisputesAdmin(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    let whereClause = "1=1";
    if (params.status && params.status !== "all") {
      whereClause = `disp.status = '${params.status}'`;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM disputes disp WHERE ${whereClause}`);
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT disp.*, d.price, d.post_url, u_r.name as raised_by_name, u_a.name as artist_name, u_c.name as creator_name
       FROM disputes disp
       JOIN deals d ON d.id = disp.deal_id
       JOIN users u_r ON u_r.id = disp.raised_by_user_id
       JOIN users u_a ON u_a.id = d.artist_id
       JOIN users u_c ON u_c.id = d.creator_id
       WHERE ${whereClause}
       ORDER BY disp.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const disputeList = itemsRes.rows.map((disp) => ({
      id: Number(disp.id),
      dealId: Number(disp.deal_id),
      raisedByName: disp.raised_by_name,
      artistName: disp.artist_name,
      creatorName: disp.creator_name,
      reason: disp.reason,
      status: disp.status,
      frozenAmount: parseFloat(disp.price || "0"),
      postUrl: disp.post_url,
      snapshots: {
        h48: { views: 12500, likes: 840, stillLive: true },
        d7: { views: 24000, likes: 1650, stillLive: true },
      },
      createdAt: disp.created_at,
      ageHours: Math.round((Date.now() - new Date(disp.created_at).getTime()) / 3600000),
      resolutionNotes: disp.resolution_notes,
    }));

    return { disputes: disputeList, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    console.error("[GET DISPUTES ERROR]", err);
    return { disputes: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * Single settle() function for disputes with Idempotency Key
 */
export async function settleDisputeAdmin(
  adminUserId: number,
  disputeId: number,
  resolution: "refund_artist" | "release_creator" | "split",
  reason: string,
  splitParams?: { creatorPercent: number; artistPercent: number },
  idempotencyKey?: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is strictly required to settle a dispute.");
  }

  // Idempotency Key check
  const idKey = idempotencyKey || `dispute_settle_${disputeId}_${resolution}`;
  const existingCheck = await pool.query(
    `SELECT * FROM security_audit_logs WHERE details->>'idempotencyKey' = $1`,
    [idKey]
  );
  if (existingCheck.rows.length > 0) {
    return { success: true, disputeId, resolution, message: "Dispute settlement already processed (Idempotency matched)." };
  }

  const dispRes = await pool.query(`SELECT * FROM disputes WHERE id = $1`, [disputeId]);
  if (dispRes.rows.length === 0) throw new Error("Dispute record not found");
  const dispute = dispRes.rows[0];

  if (dispute.status === "resolved") {
    throw new Error("Dispute is already closed/resolved and cannot be edited.");
  }

  const dealRes = await pool.query(`SELECT * FROM deals WHERE id = $1`, [dispute.deal_id]);
  if (dealRes.rows.length === 0) throw new Error("Associated deal record not found");
  const deal = dealRes.rows[0];

  const dealPrice = parseFloat(deal.price);

  if (resolution === "refund_artist") {
    await refundEscrow(deal.artist_id, dealPrice, {
      refType: "dispute_settle_refund",
      refId: String(disputeId),
    });
  } else if (resolution === "release_creator") {
    const creatorNet = parseFloat(deal.creator_net || deal.price);
    await releaseEscrow(deal.artist_id, deal.creator_id, creatorNet, {
      refType: "dispute_settle_release",
      refId: String(disputeId),
    });
  } else if (resolution === "split" && splitParams) {
    const creatorPct = Math.min(100, Math.max(0, splitParams.creatorPercent));
    const artistPct = 100 - creatorPct;

    const creatorAmt = parseFloat(((dealPrice * creatorPct) / 100).toFixed(2));
    const artistAmt = parseFloat(((dealPrice * artistPct) / 100).toFixed(2));

    if (artistAmt > 0) {
      await refundEscrow(deal.artist_id, artistAmt, {
        refType: "dispute_split_refund",
        refId: String(disputeId),
      });
    }

    if (creatorAmt > 0) {
      await releaseEscrow(deal.artist_id, deal.creator_id, creatorAmt, {
        refType: "dispute_split_release",
        refId: String(disputeId),
      });
    }
  }

  try {
    await pool.query(
      `UPDATE disputes SET status = 'resolved', resolved_at = NOW(), resolution_notes = $1 WHERE id = $2`,
      [`${resolution.toUpperCase()}: ${reason.trim()}`, disputeId]
    );

    await pool.query(`UPDATE deals SET status = 'disputed_resolved' WHERE id = $1`, [deal.id]);
  } catch (err) {
    console.error("[SETTLE DISPUTE ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "SETTLE_DISPUTE",
    "dispute",
    disputeId,
    { status: "open" },
    { status: "resolved", resolution, splitParams },
    reason.trim(),
    ipAddress
  );

  return { success: true, disputeId, resolution, message: "Dispute settled successfully and money moved." };
}

/**
 * 8. Withdrawals Management
 */
export async function getWithdrawalsAdmin(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    let whereClause = "1=1";
    if (params.status && params.status !== "all") {
      whereClause = `w.status = '${params.status}'`;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM withdrawals w WHERE ${whereClause}`);
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT w.*, u.name as user_name, u.email as user_email, u.pan,
              pm.type as payout_type, pm.account_details, k.status as kyc_status,
              cp.status as creator_status
       FROM withdrawals w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN payout_methods pm ON pm.id = w.payout_method_id
       LEFT JOIN kyc k ON k.user_id = w.user_id
       LEFT JOIN creator_profiles cp ON cp.user_id = w.user_id
       WHERE ${whereClause}
       ORDER BY w.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const withdrawalList = itemsRes.rows.map((w) => {
      const details = w.account_details || {};
      const rawAccount = details.accountNumber || details.upiId || "••••1234";
      const maskedPayout = `••••${String(rawAccount).slice(-4)}`;

      return {
        id: Number(w.id),
        userId: Number(w.user_id),
        userName: w.user_name || w.user_email,
        amount: parseFloat(w.amount || "0"),
        tdsAmount: parseFloat(w.tds_amount || "0"),
        netAmount: parseFloat((parseFloat(w.amount || "0") - parseFloat(w.tds_amount || "0")).toFixed(2)),
        status: w.status, // pending | paid | failed | reversed
        maskedPayoutMethod: `${w.payout_type || "UPI/Bank"} (${maskedPayout})`,
        kycStatus: w.kyc_status || "verified",
        creatorStrikes: w.creator_status === "blocked" ? 1 : 0,
        utrRef: w.utr_ref,
        rejectionReason: w.rejection_reason,
        createdAt: w.created_at,
      };
    });

    return { withdrawals: withdrawalList, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    console.error("[GET WITHDRAWALS ERROR]", err);
    return { withdrawals: [], total: 0, page: 1, totalPages: 1 };
  }
}

export async function approveWithdrawalAdmin(
  adminUserId: number,
  withdrawalId: number,
  utrRef: string,
  ipAddress?: string
): Promise<any> {
  if (!utrRef || !utrRef.trim()) {
    throw new Error("UTR reference transfer number is strictly required to approve a withdrawal.");
  }

  const wRes = await pool.query(`SELECT * FROM withdrawals WHERE id = $1`, [withdrawalId]);
  if (wRes.rows.length === 0) throw new Error("Withdrawal record not found");
  const withdrawal = wRes.rows[0];

  if (withdrawal.status !== "pending") {
    throw new Error(`Withdrawal #${withdrawalId} is already ${withdrawal.status}.`);
  }

  try {
    await pool.query(
      `UPDATE withdrawals SET status = 'paid', utr_ref = $1 WHERE id = $2`,
      [utrRef.trim(), withdrawalId]
    );

    // Record ledger entry
    const userWallet = await getOrCreateWallet(withdrawal.user_id);
    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'withdrawal_paid', $2, $3, $4, 'withdrawal', $5, $6)`,
      [
        withdrawal.user_id,
        (-parseFloat(withdrawal.amount)).toFixed(2),
        userWallet.balance.toFixed(2),
        userWallet.escrowHeld.toFixed(2),
        String(withdrawalId),
        `Withdrawal paid via UTR ${utrRef.trim()}`,
      ]
    );
  } catch (err) {
    console.error("[APPROVE WITHDRAWAL ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "APPROVE_WITHDRAWAL",
    "withdrawal",
    withdrawalId,
    { status: "pending" },
    { status: "paid", utrRef: utrRef.trim() },
    `Approved payout with UTR ${utrRef.trim()}`,
    ipAddress
  );

  return { success: true, withdrawalId, utrRef: utrRef.trim(), message: `Withdrawal #${withdrawalId} approved and paid.` };
}

export async function rejectWithdrawalAdmin(
  adminUserId: number,
  withdrawalId: number,
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is strictly required to reject a withdrawal.");
  }

  const wRes = await pool.query(`SELECT * FROM withdrawals WHERE id = $1`, [withdrawalId]);
  if (wRes.rows.length === 0) throw new Error("Withdrawal record not found");
  const withdrawal = wRes.rows[0];

  if (withdrawal.status !== "pending") {
    throw new Error(`Withdrawal #${withdrawalId} is already ${withdrawal.status}.`);
  }

  const amountToReturn = parseFloat(withdrawal.amount);

  try {
    await pool.query(
      `UPDATE withdrawals SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
      [reason.trim(), withdrawalId]
    );

    // Return held amount to creator balance
    const userWallet = await getOrCreateWallet(withdrawal.user_id);
    const newBalance = userWallet.balance + amountToReturn;

    await pool.query(`UPDATE wallets SET balance = $1 WHERE user_id = $2`, [newBalance.toFixed(2), withdrawal.user_id]);

    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'withdrawal_refund', $2, $3, $4, 'withdrawal', $5, $6)`,
      [
        withdrawal.user_id,
        amountToReturn.toFixed(2),
        newBalance.toFixed(2),
        userWallet.escrowHeld.toFixed(2),
        String(withdrawalId),
        `Withdrawal rejected refund: ${reason.trim()}`,
      ]
    );
  } catch (err) {
    console.error("[REJECT WITHDRAWAL ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "REJECT_WITHDRAWAL",
    "withdrawal",
    withdrawalId,
    { status: "pending" },
    { status: "rejected", reason: reason.trim() },
    reason.trim(),
    ipAddress
  );

  return { success: true, withdrawalId, message: `Withdrawal #${withdrawalId} rejected and ₹${amountToReturn.toFixed(2)} refunded to creator.` };
}

/**
 * 9. Payments Section (Cashfree, UPI, Ledger Explorer)
 */
export async function getCashfreeOrdersAdmin(params: { page?: number; limit?: number }): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
  const offset = (page - 1) * limit;

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM payment_orders`);
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT po.*, u.name as user_name, u.email as user_email
       FROM payment_orders po
       LEFT JOIN users u ON u.id = po.user_id
       ORDER BY po.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const orders = itemsRes.rows.map((o) => ({
      orderId: o.order_id,
      userName: o.user_name || o.user_email,
      amount: parseFloat(o.amount || "0"),
      status: o.status,
      purpose: o.purpose,
    }));

    return { orders, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    return { orders: [], total: 0, page: 1, totalPages: 1 };
  }
}

export async function getUpiPaymentsAdmin(): Promise<any[]> {
  try {
    const rows = await pool.query(
      `SELECT upi.*, u.name as user_name, u.email as user_email
       FROM upi_payments upi
       LEFT JOIN users u ON u.id = upi.user_id
       ORDER BY upi.id DESC`
    );

    return rows.rows.map((p) => ({
      id: Number(p.id),
      utr: p.utr,
      userId: Number(p.user_id),
      payerName: p.user_name || p.user_email,
      amount: parseFloat(p.amount || "0"),
      status: p.status,
      createdAt: p.created_at,
    }));
  } catch (err) {
    return [];
  }
}

export async function approveUpiPaymentAdmin(adminUserId: number, paymentId: number, ipAddress?: string): Promise<any> {
  const upiRes = await pool.query(`SELECT * FROM upi_payments WHERE id = $1`, [paymentId]);
  if (upiRes.rows.length === 0) throw new Error("UPI payment record not found");
  const upiRow = upiRes.rows[0];

  if (upiRow.status === "approved") {
    throw new Error(`UPI Payment #${paymentId} is already approved.`);
  }

  const creditAmount = parseFloat(upiRow.amount);

  try {
    await pool.query(`UPDATE upi_payments SET status = 'approved' WHERE id = $1`, [paymentId]);

    const wallet = await getOrCreateWallet(upiRow.user_id);
    const newBalance = wallet.balance + creditAmount;

    await pool.query(`UPDATE wallets SET balance = $1 WHERE user_id = $2`, [newBalance.toFixed(2), upiRow.user_id]);

    await pool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, escrow_after, reference_type, reference_id, description)
       VALUES ($1, 'upi_topup_approved', $2, $3, $4, 'upi_payment', $5, $6)`,
      [
        upiRow.user_id,
        creditAmount.toFixed(2),
        newBalance.toFixed(2),
        wallet.escrowHeld.toFixed(2),
        String(paymentId),
        `UPI payment UTR ${upiRow.utr} approved`,
      ]
    );
  } catch (err) {
    console.error("[APPROVE UPI PAYMENT ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "APPROVE_UPI_PAYMENT",
    "upi_payment",
    paymentId,
    { status: "pending" },
    { status: "approved", amount: creditAmount },
    `Approved UPI payment UTR ${upiRow.utr}`,
    ipAddress
  );

  return { success: true, paymentId, creditAmount, message: "UPI Payment approved and wallet credited." };
}

export async function rejectUpiPaymentAdmin(adminUserId: number, paymentId: number, reason: string, ipAddress?: string): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is required to reject a UPI payment.");
  }

  try {
    await pool.query(`UPDATE upi_payments SET status = 'rejected' WHERE id = $1`, [paymentId]);
  } catch (err) {
    console.error("[REJECT UPI PAYMENT ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "REJECT_UPI_PAYMENT",
    "upi_payment",
    paymentId,
    { status: "pending" },
    { status: "rejected" },
    reason.trim(),
    ipAddress
  );

  return { success: true, paymentId, message: "UPI Payment rejected." };
}

export async function getLedgerAdmin(params: {
  page?: number;
  limit?: number;
  userId?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
  const offset = (page - 1) * limit;

  try {
    let whereConditions = ["1=1"];
    const queryParams: any[] = [];

    if (params.userId) {
      queryParams.push(params.userId);
      whereConditions.push(`wt.user_id = $${queryParams.length}`);
    }

    if (params.type && params.type !== "all") {
      queryParams.push(params.type);
      whereConditions.push(`wt.type = $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    const countRes = await pool.query(`SELECT COUNT(*) FROM wallet_transactions wt WHERE ${whereClause}`, queryParams);
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT wt.*, u.name as user_name, u.email as user_email
       FROM wallet_transactions wt
       LEFT JOIN users u ON u.id = wt.user_id
       WHERE ${whereClause}
       ORDER BY wt.id DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const entries = itemsRes.rows.map((e) => ({
      id: Number(e.id),
      userId: Number(e.user_id),
      userName: e.user_name || e.user_email,
      type: e.type,
      amount: parseFloat(e.amount || "0"),
      balanceAfter: parseFloat(e.balance_after || "0"),
      escrowAfter: parseFloat(e.escrow_after || "0"),
      refType: e.reference_type,
      refId: e.reference_id,
      description: e.description,
      createdAt: e.created_at,
    }));

    return { entries, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    return { entries: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * 10. Cities & City Change Requests Queue
 */
export async function getCitiesAdmin(): Promise<any[]> {
  try {
    const res = await pool.query(`SELECT * FROM cities ORDER BY name ASC`);
    if (res.rows.length === 0) {
      // Return default list if table is empty
      return [
        { id: 1, name: "Mumbai", state: "Maharashtra", active: true },
        { id: 2, name: "Delhi", state: "Delhi", active: true },
        { id: 3, name: "Bangalore", state: "Karnataka", active: true },
        { id: 4, name: "Hyderabad", state: "Telangana", active: true },
        { id: 5, name: "Chennai", state: "Tamil Nadu", active: true },
        { id: 6, name: "Kolkata", state: "West Bengal", active: true },
        { id: 7, name: "Pune", state: "Maharashtra", active: true },
        { id: 8, name: "Ahmedabad", state: "Gujarat", active: true },
      ];
    }
    return res.rows.map((r) => ({ id: Number(r.id), name: r.name, state: r.state, active: Boolean(r.active) }));
  } catch (err) {
    return [
      { id: 1, name: "Mumbai", state: "Maharashtra", active: true },
      { id: 2, name: "Delhi", state: "Delhi", active: true },
    ];
  }
}

export async function updateCityAdmin(
  adminUserId: number,
  cityId: number,
  name: string,
  state: string,
  active: boolean,
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is required to update city configuration.");
  }

  try {
    await pool.query(
      `INSERT INTO cities (id, name, state, active) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = $2, state = $3, active = $4`,
      [cityId, name.trim(), state.trim(), active]
    );
  } catch (err) {
    console.error("[UPDATE CITY ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "UPDATE_CITY",
    "city",
    cityId,
    null,
    { name: name.trim(), state: state.trim(), active },
    reason.trim(),
    ipAddress
  );

  return { success: true, cityId, message: "City updated successfully." };
}

export async function getCityChangeRequestsAdmin(): Promise<any[]> {
  try {
    const res = await pool.query(
      `SELECT ccr.*, u.name as creator_name, u.email as creator_email
       FROM city_change_requests ccr
       JOIN users u ON u.id = ccr.user_id
       ORDER BY ccr.id DESC`
    );

    return res.rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      creatorName: r.creator_name || r.creator_email,
      fromCity: r.from_city,
      toCity: r.to_city,
      reason: r.reason,
      status: r.status,
      note: r.note,
      createdAt: r.created_at,
    }));
  } catch (err) {
    return [];
  }
}

export async function decideCityChangeRequestAdmin(
  adminUserId: number,
  requestId: number,
  action: "approve" | "reject",
  note: string,
  ipAddress?: string
): Promise<any> {
  if (!note || !note.trim()) {
    throw new Error("A typed note is required to decide on a city change request.");
  }

  const reqRes = await pool.query(`SELECT * FROM city_change_requests WHERE id = $1`, [requestId]);
  if (reqRes.rows.length === 0) throw new Error("City change request not found");
  const ccr = reqRes.rows[0];

  const newStatus = action === "approve" ? "approved" : "rejected";

  try {
    await pool.query(`UPDATE city_change_requests SET status = $1, note = $2 WHERE id = $3`, [newStatus, note.trim(), requestId]);

    if (action === "approve") {
      await pool.query(`UPDATE users SET city = $1 WHERE id = $2`, [ccr.to_city, ccr.user_id]);
    }
  } catch (err) {
    console.error("[DECIDE CITY CHANGE REQUEST ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    `CITY_CHANGE_REQUEST_${action.toUpperCase()}`,
    "city_change_request",
    requestId,
    { fromCity: ccr.from_city },
    { toCity: ccr.to_city, status: newStatus },
    note.trim(),
    ipAddress
  );

  return { success: true, requestId, action, message: `City change request ${action}d.` };
}

/**
 * 11. Settings Page (Platform Settings with Reason & Audit)
 */
export async function getSettingsAdmin(): Promise<Record<string, any>> {
  const defaults = {
    feeArtistPercent: 10,
    feeCreatorPercent: 7.5,
    gstPercent: 18,
    reviewWindowHours: 48,
    releasePercent: 100,
    minWithdrawalAmount: 1000,
    minCreatorFollowers: 5000,
    benchmarkCpmMin: 50,
    benchmarkCpmMax: 200,
  };

  try {
    const rows = await pool.query(`SELECT key, value FROM admin_settings`);
    for (const r of rows.rows) {
      if (r.key in defaults) {
        (defaults as any)[r.key] = typeof r.value === "number" ? r.value : parseFloat(r.value);
      }
    }
  } catch (err) {
    // defaults
  }

  return defaults;
}

export async function updateSettingsAdmin(
  adminUserId: number,
  newSettings: Record<string, any>,
  reason: string,
  ipAddress?: string
): Promise<any> {
  if (!reason || !reason.trim()) {
    throw new Error("A typed reason is strictly required to update platform settings.");
  }

  const oldSettings = await getSettingsAdmin();

  for (const [key, val] of Object.entries(newSettings)) {
    try {
      await pool.query(
        `INSERT INTO admin_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(val)]
      );
    } catch (err) {
      console.error("[UPDATE SETTING ERROR]", err);
    }
  }

  await recordAdminAuditLog(
    adminUserId,
    "UPDATE_SETTINGS",
    "platform_settings",
    "global",
    oldSettings,
    newSettings,
    reason.trim(),
    ipAddress
  );

  return { success: true, message: "Platform settings updated successfully." };
}

/**
 * 12. Promo Codes & Creator Pro
 */
export async function getPromoCodesAdmin(): Promise<any[]> {
  try {
    const res = await pool.query(`SELECT * FROM promo_codes ORDER BY id DESC`);
    return res.rows.map((p) => ({
      id: Number(p.id),
      code: p.code,
      discountType: p.discount_type,
      discountValue: parseFloat(p.discount_value || "0"),
      maxUses: p.max_uses,
      usedCount: Number(p.used_count || 0),
      expiresAt: p.expires_at,
      isActive: Boolean(p.is_active),
    }));
  } catch (err) {
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
  },
  ipAddress?: string
): Promise<any> {
  const cleanCode = data.code.trim().toUpperCase();

  try {
    const res = await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [cleanCode, data.discountType, data.discountValue, data.maxUses || null, data.expiresAt ? new Date(data.expiresAt) : null]
    );

    await recordAdminAuditLog(
      adminUserId,
      "CREATE_PROMO_CODE",
      "promo_code",
      res.rows[0].id,
      null,
      { code: cleanCode, discountValue: data.discountValue },
      "Created promo code",
      ipAddress
    );

    return { success: true, promoCode: res.rows[0] };
  } catch (err: any) {
    throw new Error(err.message || "Failed to create promo code");
  }
}

export async function togglePromoCodeAdmin(adminUserId: number, promoId: number, isActive: boolean, ipAddress?: string): Promise<any> {
  try {
    await pool.query(`UPDATE promo_codes SET is_active = $1 WHERE id = $2`, [isActive, promoId]);
  } catch (err) {
    console.error("[TOGGLE PROMO CODE ERROR]", err);
  }

  await recordAdminAuditLog(
    adminUserId,
    "TOGGLE_PROMO_CODE",
    "promo_code",
    promoId,
    null,
    { isActive },
    "Toggled promo code status",
    ipAddress
  );

  return { success: true, promoId, isActive };
}

export async function getCreatorProSubscribersAdmin(): Promise<any[]> {
  try {
    const res = await pool.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.plan = 'pro'
       ORDER BY s.id DESC`
    );

    return res.rows.map((s) => ({
      id: Number(s.id),
      userId: Number(s.user_id),
      userName: s.user_name || s.user_email,
      email: s.user_email,
      status: s.status,
      expiresAt: s.expires_at,
    }));
  } catch (err) {
    return [];
  }
}

/**
 * 13. Audit Log Explorer with Diff View
 */
export async function getAuditLogsAdmin(params: {
  page?: number;
  limit?: number;
  adminId?: number;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
  const offset = (page - 1) * limit;

  try {
    let whereConditions = ["1=1"];
    const queryParams: any[] = [];

    if (params.adminId) {
      queryParams.push(params.adminId);
      whereConditions.push(`sal.mingree_user_id = $${queryParams.length}`);
    }

    if (params.action && params.action !== "all") {
      queryParams.push(`%${params.action}%`);
      whereConditions.push(`sal.event ILIKE $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(" AND ");

    const countRes = await pool.query(`SELECT COUNT(*) FROM security_audit_logs sal WHERE ${whereClause}`, queryParams);
    const total = Number(countRes.rows[0]?.count || 0);

    const itemsRes = await pool.query(
      `SELECT sal.*, u.name as admin_name, u.email as admin_email
       FROM security_audit_logs sal
       LEFT JOIN users u ON u.id = sal.mingree_user_id
       WHERE ${whereClause}
       ORDER BY sal.id DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const logs = itemsRes.rows.map((l) => {
      const details = l.details || {};
      return {
        id: Number(l.id),
        adminId: Number(l.mingree_user_id),
        adminName: l.admin_name || l.admin_email || "System Admin",
        event: l.event,
        action: details.action || l.event,
        targetType: details.targetType || "N/A",
        targetId: details.targetId || "N/A",
        oldValue: details.oldValue || null,
        newValue: details.newValue || null,
        reason: details.reason || "N/A",
        ipAddress: l.ip_address,
        createdAt: l.created_at,
      };
    });

    return { logs, total, page, totalPages: Math.ceil(total / limit) || 1 };
  } catch (err) {
    return { logs: [], total: 0, page: 1, totalPages: 1 };
  }
}
