export interface Tier {
  id: number;
  name: string;
  label: string;
  minFollowers: number;
  maxFollowers: number;
  basePayment?: number;
}

// Manual & Fixed mode tiers with 8 canonical half-open ranges [min, max)
export const TIERS: Tier[] = [
  { id: 1, name: "Nano", label: "Nano", minFollowers: 5000, maxFollowers: 10000, basePayment: 1000 },
  { id: 2, name: "Micro", label: "Micro", minFollowers: 10000, maxFollowers: 50000, basePayment: 2500 },
  { id: 3, name: "Mid", label: "Mid", minFollowers: 50000, maxFollowers: 100000, basePayment: 5000 },
  { id: 4, name: "Upper-Mid", label: "Upper-Mid", minFollowers: 100000, maxFollowers: 250000, basePayment: 10000 },
  { id: 5, name: "Macro", label: "Macro", minFollowers: 250000, maxFollowers: 500000, basePayment: 20000 },
  { id: 6, name: "Large", label: "Large", minFollowers: 500000, maxFollowers: 1000000, basePayment: 35000 },
  { id: 7, name: "Mega", label: "Mega", minFollowers: 1000000, maxFollowers: 2500000, basePayment: 60000 },
  { id: 8, name: "Elite", label: "Elite", minFollowers: 2500000, maxFollowers: Infinity, basePayment: 100000 },
];

export const FIXED_TIERS = TIERS;

export const MIN_FOLLOWERS = 5000;
export const INELIGIBLE_TIER_LABEL = "Not eligible yet (needs 5,000 followers)";

export function getTierByFollowers(followers: number): Tier | null {
  if (followers < MIN_FOLLOWERS) return null;
  return TIERS.find(t => followers >= t.minFollowers && followers < t.maxFollowers) || TIERS[TIERS.length - 1];
}

export function getTierNameByFollowers(followers: number, isConnected = true): string {
  if (!isConnected || followers <= 0) return "Unlinked";
  if (followers < MIN_FOLLOWERS) return INELIGIBLE_TIER_LABEL;
  const tier = getTierByFollowers(followers);
  return tier ? tier.name : INELIGIBLE_TIER_LABEL;
}

export function getTierBannerText(followers: number, isConnected = true): string {
  if (!isConnected || followers <= 0) return "Tier: Not Connected";
  if (followers < MIN_FOLLOWERS) return `Tier: ${INELIGIBLE_TIER_LABEL}`;
  const tier = getTierByFollowers(followers);
  if (!tier) return `Tier: ${INELIGIBLE_TIER_LABEL}`;
  return `Tier: ${tier.name} (${formatTierRange(tier.minFollowers, tier.maxFollowers)})`;
}

export function getTierById(id: number): Tier | undefined {
  return TIERS.find(t => t.id === id);
}

export function formatFollowers(count: number): string {
  if (count === Infinity || count >= 100000000) return "2.5M+";
  if (count >= 1000000) {
    const millions = count / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export function formatTierRange(minFollowers: number, maxFollowers: number): string {
  if (maxFollowers === Infinity || maxFollowers >= 100000000) {
    return `${formatFollowers(minFollowers)}+`;
  }
  return `${formatFollowers(minFollowers)} - ${formatFollowers(maxFollowers)}`;
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
