export interface Tier {
  id: number;
  name: string;
  label: string;
  minFollowers: number;
  maxFollowers: number;
  basePayment?: number; // optional, tiers are used only as filters never as prices
}

// Exactly six creator tiers used ONLY as filters, never as fixed prices.
// Half-open ranges: [minFollowers, maxFollowers)
export const TIERS: Tier[] = [
  { id: 1, name: "Starter", label: "Starter", minFollowers: 500, maxFollowers: 2000, basePayment: 0 },
  { id: 2, name: "Nano", label: "Nano", minFollowers: 2000, maxFollowers: 10000, basePayment: 0 },
  { id: 3, name: "Micro", label: "Micro", minFollowers: 10000, maxFollowers: 50000, basePayment: 0 },
  { id: 4, name: "Mid", label: "Mid", minFollowers: 50000, maxFollowers: 250000, basePayment: 0 },
  { id: 5, name: "Macro", label: "Macro", minFollowers: 250000, maxFollowers: 1000000, basePayment: 0 },
  { id: 6, name: "Mega", label: "Mega", minFollowers: 1000000, maxFollowers: Infinity, basePayment: 0 },
];

export const MIN_FOLLOWERS = 500;

export function getTierByFollowers(followers: number): Tier | null {
  if (followers < MIN_FOLLOWERS) return null;
  return TIERS.find(t => followers >= t.minFollowers && followers < t.maxFollowers) || TIERS[TIERS.length - 1];
}

export function getTierById(id: number): Tier | undefined {
  return TIERS.find(t => t.id === id);
}

export function formatFollowers(count: number): string {
  if (count === Infinity || count >= 100000000) return "1M+";
  if (count >= 1000000) {
    const millions = count / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  if (count >= 500) return `500`;
  return count.toString();
}

export function formatTierRange(minFollowers: number, maxFollowers: number): string {
  if (maxFollowers === Infinity || maxFollowers >= 100000000) {
    return `${formatFollowers(minFollowers)}+`;
  }
  return `${formatFollowers(minFollowers)}-${formatFollowers(maxFollowers)}`;
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
  PLATFORM_FEE_PERCENT: 10,
  GST_PERCENT: 18,
  INTERNATIONAL_FEE_PERCENT: 5,
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
  const processingFee = Math.round(baseAmount * TAX_RATES.INTERNATIONAL_FEE_PERCENT) / 100;
  const totalPayable = baseAmount + processingFee;
  return {
    baseAmount,
    processingFee: Math.round(processingFee * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}
