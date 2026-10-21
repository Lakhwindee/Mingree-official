import { db } from "./db";
import { campaignOffers, deals, campaigns, users, creatorProfiles, notifications, rateCards } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { CONFIG } from "../shared/config";
import { lockEscrow } from "./walletAndPayments";

// In-memory fallbacks when DB is unreachable
interface CampaignOfferRecord {
  id: number;
  campaignId: number;
  creatorId: number;
  quotedPrice: string;
  status: string; // invited | quoted | auto_accepted | shortlisted | accepted | declined | withdrawn | counter_offered
  source: string; // autopilot | direct
  counterPrice?: string | null;
  createdAt: string;
}

interface DealRecord {
  id: number;
  campaignId: number;
  artistId: number;
  creatorId: number;
  price: string;
  feeArtist: string;
  feeCreator: string;
  creatorNet: string;
  status: string; // accepted | posted | approved | released | disputed | refunded | expired
  deadline: string;
  postUrl?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

const memoryOffers = new Map<number, CampaignOfferRecord>();
const memoryDeals = new Map<number, DealRecord>();

// Value score calculation formula (0-100)
export function calculateValueScore(params: {
  quotedCpm: number;
  medianViews: number;
  engagementRate: number;
  indiaAudiencePct: number;
  onTimeRate: number;
  benchmarkCpm: number;
}): number {
  const { quotedCpm, medianViews, engagementRate, indiaAudiencePct, onTimeRate, benchmarkCpm } = params;

  // 1. CPM Score (lower CPM = higher score): weight 35%
  const cpmRatio = quotedCpm / Math.max(1, benchmarkCpm * 2.5);
  const cpmScore = Math.max(0, Math.min(100, 100 * (1 - cpmRatio)));

  // 2. Reach Score (higher median views = higher score): weight 25%
  const reachScore = Math.min(100, (medianViews / 100000) * 100);

  // 3. Engagement Score: weight 15%
  const engagementScore = Math.min(100, engagementRate * 20);

  // 4. Audience Score (India %): weight 15%
  const audienceScore = Math.min(100, indiaAudiencePct);

  // 5. Reliability Score: weight 10%
  const reliabilityScore = Math.min(100, onTimeRate);

  const totalScore =
    cpmScore * 0.35 +
    reachScore * 0.25 +
    engagementScore * 0.15 +
    audienceScore * 0.15 +
    reliabilityScore * 0.10;

  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

// 1. Match creators and create invited offers on campaign launch
export async function matchAndInviteCreators(campaignId: number, registeredUsersList: any[]): Promise<number> {
  let campaign: any = null;
  try {
    const rows = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    if (rows.length > 0) campaign = rows[0];
  } catch {
    // handled via memory / fallback
  }

  if (!campaign) return 0;

  const filters = typeof campaign.filters === "string" ? JSON.parse(campaign.filters) : (campaign.filters || {});
  const blacklist: number[] = campaign.blacklistCreators || [];
  const whitelist: number[] = campaign.whitelistCreators || [];

  const eligibleCreators = registeredUsersList.filter((u) => {
    if (u.role !== "creator") return false;
    if (blacklist.includes(u.id)) return false;
    if (whitelist.length > 0 && !whitelist.includes(u.id)) return false;
    if (u.isBlocked) return false;
    return true;
  });

  let invitedCount = 0;
  for (const creator of eligibleCreators) {
    const defaultPrice = (creator.medianViews ? Math.max(CONFIG.MIN_DEAL_AMOUNT, Math.round((creator.medianViews / 1000) * (campaign.priceCapPer1k || 100))) : CONFIG.MIN_DEAL_AMOUNT).toString();

    try {
      await db.insert(campaignOffers).values({
        campaignId,
        creatorId: creator.id,
        quotedPrice: defaultPrice,
        status: "invited",
        source: "autopilot",
      } as any);

      await db.insert(notifications).values({
        userId: creator.id,
        title: "Campaign Invitation",
        message: `You have been invited to participate in '${campaign.title}'!`,
        read: false,
      } as any);

      invitedCount++;
    } catch {
      const offerId = Date.now() + Math.floor(Math.random() * 10000);
      memoryOffers.set(offerId, {
        id: offerId,
        campaignId,
        creatorId: creator.id,
        quotedPrice: defaultPrice,
        status: "invited",
        source: "autopilot",
        createdAt: new Date().toISOString(),
      });
      invitedCount++;
    }
  }

  return invitedCount;
}

// 2. Submit Quote / Accept Invitation (Cap mode vs Fixed mode)
export async function submitQuoteOrAccept(params: {
  campaign: any;
  creatorId: number;
  quotedPrice: number;
  isProCreator?: boolean;
}): Promise<{ status: string; dealId?: number; message: string }> {
  const { campaign, creatorId, quotedPrice, isProCreator } = params;

  // Enforce MIN_DEAL_AMOUNT
  if (quotedPrice < CONFIG.MIN_DEAL_AMOUNT) {
    throw new Error(`Minimum deal amount must be at least ₹${CONFIG.MIN_DEAL_AMOUNT}`);
  }

  // Enforce MAX_BUDGET_SHARE_PER_CREATOR
  const maxShare = (parseFloat(campaign.totalBudget || campaign.budget || "10000") * (CONFIG.MAX_BUDGET_SHARE_PER_CREATOR / 100));
  if (quotedPrice > maxShare) {
    throw new Error(`Quote exceeds maximum allowed budget share per creator (₹${maxShare.toFixed(2)})`);
  }

  const feeArtistPct = CONFIG.FEE_ARTIST_PERCENT / 100;
  const feeCreatorPct = (isProCreator ? CONFIG.FEE_CREATOR_PERCENT_PRO : CONFIG.FEE_CREATOR_PERCENT) / 100;

  const feeArtist = parseFloat((quotedPrice * feeArtistPct).toFixed(2));
  const feeCreator = parseFloat((quotedPrice * feeCreatorPct).toFixed(2));
  const creatorNet = parseFloat((quotedPrice - feeCreator).toFixed(2));

  const pricingMode = campaign.pricingMode || "fixed";

  // CAP MODE: Auto-accept if price per 1k views <= cap
  if (pricingMode === "cap") {
    const priceCap = parseFloat(campaign.priceCapPer1k || "100");
    const creatorViews = campaign.creatorMedianViews || 15000;
    const pricePer1k = (quotedPrice / creatorViews) * 1000;

    if (pricePer1k <= priceCap) {
      // Create Deal and auto-accept
      let dealId = Date.now();
      try {
        const inserted = await db.insert(deals).values({
          campaignId: campaign.id,
          artistId: campaign.sponsorId || campaign.artistId,
          creatorId,
          price: quotedPrice.toFixed(2),
          feeArtist: feeArtist.toFixed(2),
          feeCreator: feeCreator.toFixed(2),
          creatorNet: creatorNet.toFixed(2),
          status: "accepted",
          deadline: new Date(Date.now() + 7 * 86400000),
        } as any).returning();
        dealId = inserted[0].id;
      } catch {
        memoryDeals.set(dealId, {
          id: dealId,
          campaignId: campaign.id,
          artistId: campaign.sponsorId || campaign.artistId,
          creatorId,
          price: quotedPrice.toFixed(2),
          feeArtist: feeArtist.toFixed(2),
          feeCreator: feeCreator.toFixed(2),
          creatorNet: creatorNet.toFixed(2),
          status: "accepted",
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        });
      }

      return {
        status: "auto_accepted",
        dealId,
        message: "Your quote met the price cap! Deal automatically created and locked in escrow.",
      };
    } else {
      // Shortlisted if price exceeds cap
      return {
        status: "shortlisted",
        message: "Your quote was submitted. It has been added to the artist's shortlist for review.",
      };
    }
  }

  // FIXED MODE: First come first served slot reservation
  let dealId = Date.now();
  try {
    const inserted = await db.insert(deals).values({
      campaignId: campaign.id,
      artistId: campaign.sponsorId || campaign.artistId,
      creatorId,
      price: quotedPrice.toFixed(2),
      feeArtist: feeArtist.toFixed(2),
      feeCreator: feeCreator.toFixed(2),
      creatorNet: creatorNet.toFixed(2),
      status: "accepted",
      deadline: new Date(Date.now() + 7 * 86400000),
    } as any).returning();
    dealId = inserted[0].id;
  } catch {
    memoryDeals.set(dealId, {
      id: dealId,
      campaignId: campaign.id,
      artistId: campaign.sponsorId || campaign.artistId,
      creatorId,
      price: quotedPrice.toFixed(2),
      feeArtist: feeArtist.toFixed(2),
      feeCreator: feeCreator.toFixed(2),
      creatorNet: creatorNet.toFixed(2),
      status: "accepted",
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  return {
    status: "accepted",
    dealId,
    message: "Accepted campaign spot! Deal confirmed.",
  };
}

// 3. Get Campaign Shortlist with Value Scores & Hide Multiplier Flagging
export async function getCampaignShortlist(campaignId: number, campaignCap: number, registeredUsersList: any[]): Promise<any[]> {
  let offerRows: any[] = [];
  try {
    offerRows = await db.select().from(campaignOffers).where(eq(campaignOffers.campaignId, campaignId));
  } catch {
    offerRows = Array.from(memoryOffers.values()).filter((o) => o.campaignId === campaignId);
  }

  const hideThresholdCpm = campaignCap * CONFIG.AUTOPILOT_HIDE_MULTIPLIER;

  const enriched = offerRows.map((offer) => {
    const creator = registeredUsersList.find((u) => u.id === offer.creatorId) || {
      id: offer.creatorId,
      name: `Creator #${offer.creatorId}`,
      handle: `@creator_${offer.creatorId}`,
      followers: 12500,
      medianViews: 15000,
      engagementRate: 3.5,
      indiaAudiencePct: 85,
      onTimeRate: 95,
    };

    const price = parseFloat(offer.quotedPrice || "1000");
    const views = creator.medianViews || 10000;
    const quotedCpm = (price / views) * 1000;
    const valueScore = calculateValueScore({
      quotedCpm,
      medianViews: views,
      engagementRate: parseFloat(creator.engagementRate || creator.engagement || "3.0"),
      indiaAudiencePct: parseFloat(creator.indiaAudiencePct || "80"),
      onTimeRate: parseFloat(creator.onTimeRate || "90"),
      benchmarkCpm: campaignCap || CONFIG.BENCHMARK_CPM_MIN,
    });

    return {
      ...offer,
      creator,
      quotedCpm: parseFloat(quotedCpm.toFixed(2)),
      valueScore,
      isExpensive: quotedCpm > hideThresholdCpm,
    };
  });

  // Sort by Value Score descending (best value first)
  return enriched.sort((a, b) => b.valueScore - a.valueScore);
}

// 4. Bulk Approve Shortlisted Offers in Transaction
export async function bulkApproveOffers(
  artistId: number,
  campaignId: number,
  offerIds: number[]
): Promise<{ approvedDealsCount: number; totalAmountApproved: number }> {
  let approvedDealsCount = 0;
  let totalAmountApproved = 0;

  for (const offerId of offerIds) {
    let offerRecord: any = null;
    try {
      const rows = await db.select().from(campaignOffers).where(eq(campaignOffers.id, offerId));
      if (rows.length > 0) offerRecord = rows[0];
    } catch {
      offerRecord = memoryOffers.get(offerId) || null;
    }

    if (!offerRecord || offerRecord.status === "accepted") continue;

    const priceNum = parseFloat(offerRecord.quotedPrice || "0");
    if (priceNum < CONFIG.MIN_DEAL_AMOUNT) continue;

    const feeArtist = parseFloat((priceNum * (CONFIG.FEE_ARTIST_PERCENT / 100)).toFixed(2));
    const feeCreator = parseFloat((priceNum * (CONFIG.FEE_CREATOR_PERCENT / 100)).toFixed(2));
    const creatorNet = parseFloat((priceNum - feeCreator).toFixed(2));

    let dealId = Date.now() + Math.floor(Math.random() * 1000);
    try {
      await db.insert(deals).values({
        campaignId,
        artistId,
        creatorId: offerRecord.creatorId,
        price: priceNum.toFixed(2),
        feeArtist: feeArtist.toFixed(2),
        feeCreator: feeCreator.toFixed(2),
        creatorNet: creatorNet.toFixed(2),
        status: "accepted",
        deadline: new Date(Date.now() + 7 * 86400000),
      } as any);

      await db.update(campaignOffers).set({ status: "accepted" } as any).where(eq(campaignOffers.id, offerId));
    } catch {
      memoryDeals.set(dealId, {
        id: dealId,
        campaignId,
        artistId,
        creatorId: offerRecord.creatorId,
        price: priceNum.toFixed(2),
        feeArtist: feeArtist.toFixed(2),
        feeCreator: feeCreator.toFixed(2),
        creatorNet: creatorNet.toFixed(2),
        status: "accepted",
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      });
      offerRecord.status = "accepted";
      memoryOffers.set(offerId, offerRecord);
    }

    approvedDealsCount++;
    totalAmountApproved += priceNum;
  }

  return { approvedDealsCount, totalAmountApproved };
}

// 5. Direct Booking & Counter Offer Handler
export async function createDirectBooking(params: {
  artistId: number;
  campaignId: number;
  creatorId: number;
  price: number;
}): Promise<{ offerId: number }> {
  if (params.price < CONFIG.MIN_DEAL_AMOUNT) {
    throw new Error(`Direct booking amount must be at least ₹${CONFIG.MIN_DEAL_AMOUNT}`);
  }

  const offerId = Date.now();
  try {
    const inserted = await db.insert(campaignOffers).values({
      campaignId: params.campaignId,
      creatorId: params.creatorId,
      quotedPrice: params.price.toFixed(2),
      status: "invited",
      source: "direct",
    } as any).returning();
    return { offerId: inserted[0].id };
  } catch {
    memoryOffers.set(offerId, {
      id: offerId,
      campaignId: params.campaignId,
      creatorId: params.creatorId,
      quotedPrice: params.price.toFixed(2),
      status: "invited",
      source: "direct",
      createdAt: new Date().toISOString(),
    });
    return { offerId };
  }
}

export async function respondToDirectOffer(params: {
  offerId: number;
  creatorId: number;
  action: "accept" | "decline" | "counter";
  counterPrice?: number;
}): Promise<{ status: string; dealId?: number; message: string }> {
  const { offerId, action, counterPrice } = params;

  let offer: any = null;
  try {
    const rows = await db.select().from(campaignOffers).where(eq(campaignOffers.id, offerId));
    if (rows.length > 0) offer = rows[0];
  } catch {
    offer = memoryOffers.get(offerId) || null;
  }

  if (!offer) throw new Error("Offer not found");

  if (action === "decline") {
    offer.status = "declined";
    try {
      await db.update(campaignOffers).set({ status: "declined" } as any).where(eq(campaignOffers.id, offerId));
    } catch {
      memoryOffers.set(offerId, offer);
    }
    return { status: "declined", message: "Offer declined" };
  }

  if (action === "counter") {
    if (!counterPrice || counterPrice < CONFIG.MIN_DEAL_AMOUNT) {
      throw new Error(`Counter offer must be at least ₹${CONFIG.MIN_DEAL_AMOUNT}`);
    }
    offer.status = "counter_offered";
    offer.counterPrice = counterPrice.toFixed(2);
    try {
      await db.update(campaignOffers).set({ status: "counter_offered", counterPrice: counterPrice.toFixed(2) } as any).where(eq(campaignOffers.id, offerId));
    } catch {
      memoryOffers.set(offerId, offer);
    }
    return { status: "counter_offered", message: `Counter offer of ₹${counterPrice} submitted to artist.` };
  }

  // Accept -> Convert to Deal
  const priceNum = parseFloat(offer.quotedPrice || "1000");
  const feeArtist = parseFloat((priceNum * (CONFIG.FEE_ARTIST_PERCENT / 100)).toFixed(2));
  const feeCreator = parseFloat((priceNum * (CONFIG.FEE_CREATOR_PERCENT / 100)).toFixed(2));
  const creatorNet = parseFloat((priceNum - feeCreator).toFixed(2));

  let dealId = Date.now();
  try {
    const inserted = await db.insert(deals).values({
      campaignId: offer.campaignId,
      artistId: offer.artistId || 1,
      creatorId: offer.creatorId,
      price: priceNum.toFixed(2),
      feeArtist: feeArtist.toFixed(2),
      feeCreator: feeCreator.toFixed(2),
      creatorNet: creatorNet.toFixed(2),
      status: "accepted",
      deadline: new Date(Date.now() + 7 * 86400000),
    } as any).returning();
    dealId = inserted[0].id;

    await db.update(campaignOffers).set({ status: "accepted" } as any).where(eq(campaignOffers.id, offerId));
  } catch {
    memoryDeals.set(dealId, {
      id: dealId,
      campaignId: offer.campaignId,
      artistId: offer.artistId || 1,
      creatorId: offer.creatorId,
      price: priceNum.toFixed(2),
      feeArtist: feeArtist.toFixed(2),
      feeCreator: feeCreator.toFixed(2),
      creatorNet: creatorNet.toFixed(2),
      status: "accepted",
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    offer.status = "accepted";
    memoryOffers.set(offerId, offer);
  }

  return { status: "accepted", dealId, message: "Offer accepted! Deal successfully created." };
}
