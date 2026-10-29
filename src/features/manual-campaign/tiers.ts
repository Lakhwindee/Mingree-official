// Tier labels are filters only. They are never prices. Half-open ranges [min, max).
// Must match the backend (src/util.ts TIERS) and shared/tiers.ts after Step 1 of the pack.
export const TIERS = [
  { id: "tier_1", label: "Tier 1", min: 500, max: 2500 },
  { id: "tier_2", label: "Tier 2", min: 2500, max: 5000 },
  { id: "tier_3", label: "Tier 3", min: 5000, max: 10000 },
  { id: "tier_4", label: "Tier 4", min: 10000, max: 25000 },
  { id: "tier_5", label: "Tier 5", min: 25000, max: 50000 },
  { id: "tier_6", label: "Tier 6", min: 50000, max: 100000 },
  { id: "tier_7", label: "Tier 7", min: 100000, max: 250000 },
  { id: "tier_8", label: "Tier 8", min: 250000, max: 500000 },
  { id: "tier_9", label: "Tier 9", min: 500000, max: Infinity },
] as const;

export const compact = (n: number): string => {
  if (!isFinite(n)) return "+";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`.replace(/\.0+M$/, "M");
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`.replace(/\.0K$/, "K");
  return String(n);
};

export const tierRange = (t: (typeof TIERS)[number]): string =>
  t.max === Infinity ? `${compact(t.min)}+` : `${compact(t.min)} - ${compact(t.max)}`;

export const inr = (n: number): string =>
  "₹" + Math.round(n).toLocaleString("en-IN");
