export interface Tier {
  id: number;
  name: string;
  label: string;
  minFollowers: number;
  maxFollowers: number;
  basePayment: number;
  rangeLabel?: string;
}

// 20 Influencer tiers covering 500 up to 500,000 followers (Fixed Price List)
export const TIERS: Tier[] = [
  { id: 1, name: "Tier 1", label: "Tier 1", minFollowers: 500, maxFollowers: 1001, basePayment: 22, rangeLabel: "500–1,000" },
  { id: 2, name: "Tier 2", label: "Tier 2", minFollowers: 1001, maxFollowers: 2001, basePayment: 30, rangeLabel: "1,001–2,000" },
  { id: 3, name: "Tier 3", label: "Tier 3", minFollowers: 2001, maxFollowers: 3001, basePayment: 42, rangeLabel: "2,001–3,000" },
  { id: 4, name: "Tier 4", label: "Tier 4", minFollowers: 3001, maxFollowers: 5001, basePayment: 60, rangeLabel: "3,001–5,000" },
  { id: 5, name: "Tier 5", label: "Tier 5", minFollowers: 5001, maxFollowers: 7501, basePayment: 75, rangeLabel: "5,001–7,500" },
  { id: 6, name: "Tier 6", label: "Tier 6", minFollowers: 7501, maxFollowers: 10001, basePayment: 90, rangeLabel: "7,501–10,000" },
  { id: 7, name: "Tier 7", label: "Tier 7", minFollowers: 10001, maxFollowers: 12501, basePayment: 105, rangeLabel: "10,001–12,500" },
  { id: 8, name: "Tier 8", label: "Tier 8", minFollowers: 12501, maxFollowers: 15001, basePayment: 120, rangeLabel: "12,501–15,000" },
  { id: 9, name: "Tier 9", label: "Tier 9", minFollowers: 15001, maxFollowers: 20001, basePayment: 180, rangeLabel: "15,001–20,000" },
  { id: 10, name: "Tier 10", label: "Tier 10", minFollowers: 20001, maxFollowers: 25001, basePayment: 210, rangeLabel: "20,001–25,000" },
  { id: 11, name: "Tier 11", label: "Tier 11", minFollowers: 25001, maxFollowers: 30001, basePayment: 240, rangeLabel: "25,001–30,000" },
  { id: 12, name: "Tier 12", label: "Tier 12", minFollowers: 30001, maxFollowers: 40001, basePayment: 300, rangeLabel: "30,001–40,000" },
  { id: 13, name: "Tier 13", label: "Tier 13", minFollowers: 40001, maxFollowers: 50001, basePayment: 360, rangeLabel: "40,001–50,000" },
  { id: 14, name: "Tier 14", label: "Tier 14", minFollowers: 50001, maxFollowers: 75001, basePayment: 480, rangeLabel: "50,001–75,000" },
  { id: 15, name: "Tier 15", label: "Tier 15", minFollowers: 75001, maxFollowers: 100001, basePayment: 600, rangeLabel: "75,001–100,000" },
  { id: 16, name: "Tier 16", label: "Tier 16", minFollowers: 100001, maxFollowers: 150001, basePayment: 840, rangeLabel: "100,001–150,000" },
  { id: 17, name: "Tier 17", label: "Tier 17", minFollowers: 150001, maxFollowers: 200001, basePayment: 1080, rangeLabel: "150,001–200,000" },
  { id: 18, name: "Tier 18", label: "Tier 18", minFollowers: 200001, maxFollowers: 300001, basePayment: 1440, rangeLabel: "200,001–300,000" },
  { id: 19, name: "Tier 19", label: "Tier 19", minFollowers: 300001, maxFollowers: 400001, basePayment: 1800, rangeLabel: "300,001–400,000" },
  { id: 20, name: "Tier 20", label: "Tier 20", minFollowers: 400001, maxFollowers: 500001, basePayment: 2160, rangeLabel: "400,001–500,000" },
];

export const FIXED_TIERS = TIERS;

export const MIN_FOLLOWERS = 500;
export const MAX_FOLLOWERS = 500000;
export const INELIGIBLE_TIER_LABEL = "Not eligible yet (needs 500 followers)";

export function getTierByFollowers(followers: number): Tier | null {
  if (followers < MIN_FOLLOWERS || followers > MAX_FOLLOWERS) return null;
  return TIERS.find(t => followers >= t.minFollowers && followers < t.maxFollowers) || null;
}

export function getTierNameByFollowers(followers: number, isConnected = true): string {
  if (!isConnected || followers <= 0) return "Unlinked";
  if (followers < MIN_FOLLOWERS) return INELIGIBLE_TIER_LABEL;
  if (followers > MAX_FOLLOWERS) return "Above 500K (Not eligible for fixed tiers)";
  const tier = getTierByFollowers(followers);
  return tier ? tier.name : INELIGIBLE_TIER_LABEL;
}

export function getTierBannerText(followers: number, isConnected = true): string {
  if (!isConnected || followers <= 0) return "Tier: Not Connected";
  if (followers < MIN_FOLLOWERS) return `Tier: ${INELIGIBLE_TIER_LABEL}`;
  if (followers > MAX_FOLLOWERS) return "Tier: Above 500K";
  const tier = getTierByFollowers(followers);
  if (!tier) return `Tier: ${INELIGIBLE_TIER_LABEL}`;
  return `Tier: ${tier.name} (${tier.rangeLabel || formatTierRange(tier.minFollowers, tier.maxFollowers)})`;
}

export function getTierById(id: number): Tier | undefined {
  return TIERS.find(t => t.id === id);
}

export function formatFollowers(count: number): string {
  if (count >= 1000000) {
    const millions = count / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (count >= 1000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return count.toString();
}

export function formatTierRange(minFollowers: number, maxFollowers: number): string {
  const tier = TIERS.find(t => t.minFollowers === minFollowers);
  if (tier && tier.rangeLabel) return tier.rangeLabel;
  const displayMax = maxFollowers > 500000 ? 500000 : maxFollowers - 1;
  return `${minFollowers.toLocaleString()} - ${displayMax.toLocaleString()}`;
}

export const PROMOTION_STYLE_MULTIPLIERS: Record<string, number> = {
  face_ad: 1.0,
  share_only: 0.90,
  lyricals: 0.60,
};

export function getPaymentByStyle(basePayment: number, promotionStyle: string): number {
  const multiplier = PROMOTION_STYLE_MULTIPLIERS[promotionStyle] || 1.0;
  return Math.round(basePayment * multiplier);
}

// Tax and Fee Constants
export const TAX_RATES = {
  PLATFORM_FEE_PERCENT: 7.5,
  GST_PERCENT: 18,
};

export interface SponsorPaymentBreakdown {
  creatorPayment: number;
  platformFee: number;
  totalPayable: number;
}

export function calculateSponsorPayment(creatorPayment: number): SponsorPaymentBreakdown {
  const platformFee = Math.round(creatorPayment * TAX_RATES.PLATFORM_FEE_PERCENT / 100);
  const totalPayable = creatorPayment + platformFee;
  return {
    creatorPayment,
    platformFee,
    totalPayable,
  };
}

export interface DepositBreakdown {
  baseAmount: number;
  gstAmount: number;
  totalPayable: number;
}

export function calculateDepositWithGST(baseAmount: number): DepositBreakdown {
  const gstAmount = Math.round(baseAmount * TAX_RATES.GST_PERCENT / 100);
  const totalPayable = baseAmount + gstAmount;
  return {
    baseAmount,
    gstAmount,
    totalPayable,
  };
}

export interface InternationalDepositBreakdown {
  baseAmount: number;
  processingFee: number;
  totalPayable: number;
}

export function calculateInternationalDeposit(baseAmount: number): InternationalDepositBreakdown {
  const processingFee = Math.round(baseAmount * 5) / 100;
  const totalPayable = baseAmount + processingFee;
  return {
    baseAmount,
    processingFee: Math.round(processingFee * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}
