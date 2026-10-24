// DEV PREVIEW ONLY. Do not import this from production code.
import { TIERS } from "./tiers";
import type { Bill, City, CreatorCard, ManualCampaignApi } from "./types";

const CITIES: City[] = [
  { id: 1, name: "Chandigarh", state: "Chandigarh" }, { id: 2, name: "Mohali", state: "Punjab" },
  { id: 3, name: "Panchkula", state: "Haryana" }, { id: 4, name: "Delhi", state: "Delhi" },
  { id: 5, name: "Mumbai", state: "Maharashtra" }, { id: 6, name: "Pune", state: "Maharashtra" },
  { id: 7, name: "Bengaluru", state: "Karnataka" }, { id: 8, name: "Ludhiana", state: "Punjab" },
];
const NAMES = ["Aisha Khan", "Riya Sharma", "Ankit Verma", "Meera Nair", "Arjun Malhotra", "Priya Sethi", "Karan Gill", "Simran Kaur", "Rohan Bedi", "Tanya Arora", "Jaspreet Singh", "Neha Bansal"];
const NICHES = ["Music", "Fashion", "Lifestyle", "Dance", "Fitness", "Comedy", "Travel", "Food"];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const ALL: CreatorCard[] = [];
for (let i = 0; i < 400; i++) {
  const tier = TIERS[Math.min(TIERS.length - 1, Math.floor(rnd() * rnd() * 5))];
  const hi = tier.max === Infinity ? tier.min * 2 : tier.max;
  const followers = Math.round(tier.min + rnd() * (hi - tier.min - 1));
  const name = NAMES[i % NAMES.length];
  const medianViews = Math.round(followers * (0.6 + rnd() * 1.6));
  const price = Math.round((medianViews / 1000) * (28 + rnd() * 40) / 50) * 50 || 500;
  ALL.push({
    id: 100 + i, username: `${name.split(" ")[0].toLowerCase()}${i}`, displayName: name, igVerifiedBadge: i % 6 === 0,
    city: CITIES[Math.floor(rnd() * CITIES.length)], tier: tier.id, followers,
    engagementRate: +(2.5 + rnd() * 4).toFixed(1), medianViews, indiaAudiencePct: Math.round(70 + rnd() * 28),
    metricsSource: i % 3 === 0 ? "api_verified" : "creator_reported", completedDeals: Math.floor(rnd() * 20), onTimeRate: 90,
    genres: [NICHES[i % NICHES.length]], recentReels: [{}, {}, {}], price, pricePer1kViews: +(price / medianViews * 1000).toFixed(1),
  });
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const byId = new Map(ALL.map((c) => [c.id, c]));

function makeBill(ids: number[]): Bill {
  const lines = ids.map((id) => {
    const p = byId.get(id)!.price;
    const fee = Math.round(p * 0.075);
    return { creatorId: id, price: p, feeArtist: fee, gstInFee: Math.round((fee * 18) / 118), artistCost: p + fee };
  });
  const total = lines.reduce((s, l) => s + l.artistCost, 0);
  const walletBalance = 25000;
  return {
    lines, subtotal: lines.reduce((s, l) => s + l.price, 0), feeTotal: lines.reduce((s, l) => s + l.feeArtist, 0),
    gstInFee: lines.reduce((s, l) => s + l.gstInFee, 0), total, walletBalance, shortfall: Math.max(0, total - walletBalance), billId: "mock-" + ids.join("-"),
  };
}

export const mockApi: ManualCampaignApi = {
  async listCities() { await wait(80); return CITIES; },
  async searchCreators(p) {
    await wait();
    let list = ALL.filter((c) => c.tier === p.tierId && p.cityIds.includes(c.city.id));
    if (p.q) list = list.filter((c) => (c.username + c.displayName).toLowerCase().includes(p.q!.toLowerCase()));
    if (p.minEngagement) list = list.filter((c) => (c.engagementRate ?? 0) >= p.minEngagement!);
    if (p.genres?.length) list = list.filter((c) => c.genres.some((g) => p.genres!.includes(g)));
    const s = p.sort;
    if (s === "price_asc") list.sort((a, b) => a.price - b.price);
    if (s === "price_desc") list.sort((a, b) => b.price - a.price);
    if (s === "views_desc") list.sort((a, b) => (b.medianViews ?? 0) - (a.medianViews ?? 0));
    if (s === "followers_desc") list.sort((a, b) => b.followers - a.followers);
    const start = p.cursor ? Number(p.cursor) : 0;
    const items = list.slice(start, start + 12);
    return { items, total: list.length, nextCursor: start + 12 < list.length ? String(start + 12) : null };
  },
  async previewBill({ creatorIds }) { await wait(150); return makeBill(creatorIds); },
  async submit({ creatorIds }) {
    await wait(400);
    const b = makeBill(creatorIds);
    return b.shortfall > 0 ? { ok: false, reason: "insufficient_funds", bill: b } : { ok: true, campaignId: 1 };
  },
};
