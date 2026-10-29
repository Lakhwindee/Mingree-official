// Tier labels are filters only. They are never prices. Half-open ranges [min, max).
export const TIERS = [
  { id: "tier_1", label: "Tier 1", min: 500, max: 1001 },
  { id: "tier_2", label: "Tier 2", min: 1001, max: 2001 },
  { id: "tier_3", label: "Tier 3", min: 2001, max: 3001 },
  { id: "tier_4", label: "Tier 4", min: 3001, max: 5001 },
  { id: "tier_5", label: "Tier 5", min: 5001, max: 7501 },
  { id: "tier_6", label: "Tier 6", min: 7501, max: 10001 },
  { id: "tier_7", label: "Tier 7", min: 10001, max: 12501 },
  { id: "tier_8", label: "Tier 8", min: 12501, max: 15001 },
  { id: "tier_9", label: "Tier 9", min: 15001, max: 20001 },
  { id: "tier_10", label: "Tier 10", min: 20001, max: 25001 },
  { id: "tier_11", label: "Tier 11", min: 25001, max: 30001 },
  { id: "tier_12", label: "Tier 12", min: 30001, max: 40001 },
  { id: "tier_13", label: "Tier 13", min: 40001, max: 50001 },
  { id: "tier_14", label: "Tier 14", min: 50001, max: 75001 },
  { id: "tier_15", label: "Tier 15", min: 75001, max: 100001 },
  { id: "tier_16", label: "Tier 16", min: 100001, max: 150001 },
  { id: "tier_17", label: "Tier 17", min: 150001, max: 200001 },
  { id: "tier_18", label: "Tier 18", min: 200001, max: 300001 },
  { id: "tier_19", label: "Tier 19", min: 300001, max: 400001 },
  { id: "tier_20", label: "Tier 20", min: 400001, max: 500001 },
] as const;

export const compact = (n: number): string => {
  if (!isFinite(n)) return "+";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`.replace(/\.0+M$/, "M");
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`.replace(/\.0K$/, "K");
  return String(n);
};

export const tierRange = (t: (typeof TIERS)[number]): string => {
  const displayMax = t.max > 500000 ? 500000 : t.max - 1;
  return `${t.min.toLocaleString()} - ${displayMax.toLocaleString()}`;
};

export const inr = (n: number): string =>
  "₹" + Math.round(n).toLocaleString("en-IN");
