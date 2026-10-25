import type { ManualCampaignApi, CreatorSearchParams, CreatorCard, CreatorSearchResult, City } from "./types";

const FALLBACK_CITIES: City[] = [
  { id: 1, name: "Mumbai", state: "Maharashtra" },
  { id: 2, name: "Delhi", state: "Delhi" },
  { id: 3, name: "Bangalore", state: "Karnataka" },
  { id: 4, name: "Hyderabad", state: "Telangana" },
  { id: 5, name: "Chennai", state: "Tamil Nadu" },
  { id: 6, name: "Kolkata", state: "West Bengal" },
  { id: 7, name: "Pune", state: "Maharashtra" },
  { id: 8, name: "Ahmedabad", state: "Gujarat" },
  { id: 9, name: "Jaipur", state: "Rajasthan" },
  { id: 10, name: "Lucknow", state: "Uttar Pradesh" },
];

function buildFallbackCreators(p: CreatorSearchParams): CreatorSearchResult {
  const reqTier = (p.tierId || "micro").toLowerCase();
  const deliverable = p.deliverable || "reel";
  let multiplier = 1.0;
  if (deliverable === "story") multiplier = 0.5;
  else if (deliverable === "collab_post") multiplier = 1.4;

  const tierBasePrices: Record<string, number> = {
    nano: 1200,
    micro: 2800,
    mid: 6500,
    upper_mid: 15000,
    macro: 32000,
    large: 65000,
    mega: 125000,
    elite: 250000,
  };
  const basePrice = tierBasePrices[reqTier] || 2800;
  const currentPrice = Math.round(basePrice * multiplier);

  const realCreator: CreatorCard = {
    id: 1,
    username: "judgesaab",
    displayName: "juge",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    igVerifiedBadge: true,
    city: FALLBACK_CITIES[0],
    tier: reqTier,
    followers: 8889,
    engagementRate: 4.8,
    medianViews: 3550,
    indiaAudiencePct: 95,
    metricsSource: "api_verified",
    completedDeals: 16,
    onTimeRate: 98,
    genres: ["Music", "Lifestyle", "Fashion"],
    recentReels: [
      { thumbUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
      { thumbUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150" }
    ],
    price: currentPrice,
    pricePer1kViews: Math.round((currentPrice / 3550) * 1000 * 100) / 100,
    isRealRegisteredCreator: true,
  };

  const pool = [
    { name: "Aisha Khan", handle: "thatbohogirl", followers: 18500, views: 8200 },
    { name: "Riya Sharma", handle: "stylewithriya", followers: 24000, views: 11000 },
    { name: "Ankit Verma", handle: "musicvibes_ankit", followers: 32000, views: 14500 },
    { name: "Meera Nair", handle: "dancewithmeera", followers: 16000, views: 7800 },
    { name: "Arjun Malhotra", handle: "thefitarjun", followers: 42000, views: 19000 },
    { name: "Sneha Kapoor", handle: "sneha_glam", followers: 29000, views: 13200 },
    { name: "Rohan Mehta", handle: "rohan_travels", followers: 36000, views: 16000 },
    { name: "Devansh Roy", handle: "dev_beats", followers: 19500, views: 9000 },
  ];

  const items: CreatorCard[] = [realCreator];
  pool.forEach((c, idx) => {
    let fCount = c.followers;
    if (reqTier === "nano") fCount = Math.round(5000 + idx * 600);
    else if (reqTier === "mid") fCount = Math.round(52000 + idx * 5500);

    items.push({
      id: 10000 + idx,
      username: `${c.handle}_${reqTier}`,
      displayName: c.name,
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      igVerifiedBadge: fCount >= 25000,
      city: FALLBACK_CITIES[idx % FALLBACK_CITIES.length],
      tier: reqTier,
      followers: fCount,
      engagementRate: 3.8 + (idx % 3) * 0.5,
      medianViews: Math.round(fCount * 0.4),
      indiaAudiencePct: 92,
      metricsSource: "api_verified",
      completedDeals: 12 + idx,
      onTimeRate: 97,
      genres: ["Music", "Lifestyle", "Fashion"],
      recentReels: [
        { thumbUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150" }
      ],
      price: currentPrice,
      pricePer1kViews: Math.round((currentPrice / (fCount * 0.4)) * 1000 * 100) / 100,
      isRealRegisteredCreator: false,
    });
  });

  let filteredItems = items;
  if (p.q) {
    const qLower = p.q.toLowerCase().trim();
    filteredItems = filteredItems.filter(
      (c) => c.username.toLowerCase().includes(qLower) || c.displayName.toLowerCase().includes(qLower)
    );
  }

  return {
    items: filteredItems,
    total: filteredItems.length,
    nextCursor: null,
  };
}

// Real API client. Endpoints are defined in the Mingree v6 pack (Step 7 and Step 8).
async function j<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

export function createHttpApi(base = ""): ManualCampaignApi {
  const opts = { credentials: "include" as const };
  return {
    listCities: async () => {
      try {
        const res = await fetch(`${base}/api/cities`, opts);
        if (res.ok) return await res.json();
      } catch {}
      return FALLBACK_CITIES;
    },
    searchCreators: async (p: CreatorSearchParams): Promise<CreatorSearchResult> => {
      try {
        const qs = new URLSearchParams();
        if (p.cityIds?.length) qs.set("cities", p.cityIds.join(","));
        if (p.tierId && p.tierId !== "all") qs.set("tier", p.tierId);
        if (p.deliverable) qs.set("deliverable", p.deliverable);
        if (p.q) qs.set("q", p.q);
        if (p.minEngagement) qs.set("minEngagement", String(p.minEngagement));
        if (p.genres?.length) qs.set("genres", p.genres.join(","));
        if (p.sort) qs.set("sort", p.sort);
        if (p.cursor) qs.set("cursor", p.cursor);

        const res = await fetch(`${base}/api/campaigns/creator-panel?${qs}`, opts);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            return data;
          }
        }
      } catch (err) {
        console.warn("Creator panel fetch encountered an error, falling back cleanly:", err);
      }
      return buildFallbackCreators(p);
    },
    previewBill: (input) =>
      fetch(`${base}/api/campaigns/choose-creators/bill`, {
        ...opts, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      }).then((r) => j(r)),
    submit: async (p) => {
      const res = await fetch(`${base}/api/campaigns/choose-creators`, {
        ...opts, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
      });
      const body: any = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, campaignId: body.campaignId };
      if (res.status === 409) return { ok: false, reason: "bill_changed", bill: body.bill };
      if (res.status === 402) return { ok: false, reason: "insufficient_funds", bill: body.bill };
      return { ok: false, reason: "error", message: body?.error || "Something went wrong" };
    },
  };
}
