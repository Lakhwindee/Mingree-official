// Tier labels are filters only. They are never prices. Half-open ranges [min, max).
// Must match the backend (src/util.ts TIERS) and shared/tiers.ts after Step 1 of the pack.
export const TIERS = [
  { id: "nano", label: "Nano", min: 5_000, max: 10_000 },
  { id: "micro", label: "Micro", min: 10_000, max: 50_000 },
  { id: "mid", label: "Mid", min: 50_000, max: 100_000 },
  { id: "upper_mid", label: "Upper-Mid", min: 100_000, max: 250_000 },
  { id: "macro", label: "Macro", min: 250_000, max: 500_000 },
  { id: "large", label: "Large", min: 500_000, max: 1_000_000 },
  { id: "mega", label: "Mega", min: 1_000_000, max: 2_500_000 },
  { id: "elite", label: "Elite", min: 2_500_000, max: Infinity },
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
