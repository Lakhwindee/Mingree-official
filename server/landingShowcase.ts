import path from "path";
import fs from "fs";
import { pool, isDatabaseConfigured } from "./db";

export interface ShowcaseCreator {
  id: number;
  username: string;
  displayName: string;
  handle: string;
  avatar: string;
  city: string;
  tier: string;
  followers: number;
  medianViews: number;
  reach: number;
  engagementRate: number;
  indiaAudiencePct: number;
  pricePerReel: number;
  pricePerStory: number;
  pricePerCollab: number;
  category: string;
  badge?: string;
  isHero?: boolean;
  isPinned?: boolean;
  order?: number;
  completedDeals?: number;
  onTimeRate?: number;
}

export interface TickerAnnouncement {
  id: number;
  text: string;
  icon: "check" | "instagram" | "zap" | "star";
  isActive: boolean;
}

export interface LandingShowcaseConfig {
  heroCreatorId: number;
  trendingCreatorIds: number[];
  customCreators: ShowcaseCreator[];
  creatorOverrides: Record<number, {
    badge?: string;
    category?: string;
    isHero?: boolean;
    isPinned?: boolean;
    order?: number;
  }>;
  tickerAnnouncements: TickerAnnouncement[];
  platformFeePercent: number;
  gstPercent: number;
  lastUpdated?: string;
}

const SHOWCASE_FILE = path.join(process.cwd(), "data", "landing_showcase.json");

export const DEFAULT_SHOWCASE_CREATORS: ShowcaseCreator[] = [
  {
    id: 1,
    username: "riyasen.official",
    displayName: "Riya Sen",
    handle: "@riyasen.official",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
    city: "Mumbai",
    tier: "mid",
    followers: 94200,
    medianViews: 52400,
    reach: 248500,
    engagementRate: 5.2,
    indiaAudiencePct: 96,
    pricePerReel: 2800,
    pricePerStory: 1400,
    pricePerCollab: 3900,
    category: "Fashion & Lifestyle",
    badge: "Featured Star",
    isHero: true,
    isPinned: true,
    order: 1,
    completedDeals: 24,
    onTimeRate: 100,
  },
  {
    id: 2,
    username: "aarohimehta_",
    displayName: "Aarohi Mehta",
    handle: "@aarohimehta_",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300",
    city: "Delhi",
    tier: "upper_mid",
    followers: 142000,
    medianViews: 89000,
    reach: 380000,
    engagementRate: 4.9,
    indiaAudiencePct: 94,
    pricePerReel: 6500,
    pricePerStory: 3250,
    pricePerCollab: 9100,
    category: "Dance & Music",
    badge: "Trending #1",
    isHero: false,
    isPinned: true,
    order: 2,
    completedDeals: 31,
    onTimeRate: 98,
  },
  {
    id: 3,
    username: "tanvikapoor.fit",
    displayName: "Tanvi Kapoor",
    handle: "@tanvikapoor.fit",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    city: "Bangalore",
    tier: "mid",
    followers: 78500,
    medianViews: 44200,
    reach: 195000,
    engagementRate: 5.6,
    indiaAudiencePct: 95,
    pricePerReel: 2800,
    pricePerStory: 1400,
    pricePerCollab: 3900,
    category: "Wellness & Fitness",
    badge: "High ROI",
    isHero: false,
    isPinned: false,
    order: 3,
    completedDeals: 19,
    onTimeRate: 100,
  },
  {
    id: 4,
    username: "simrankaur_vibes",
    displayName: "Simran Kaur",
    handle: "@simrankaur_vibes",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    city: "Chandigarh",
    tier: "upper_mid",
    followers: 185000,
    medianViews: 112000,
    reach: 490000,
    engagementRate: 6.1,
    indiaAudiencePct: 97,
    pricePerReel: 6500,
    pricePerStory: 3250,
    pricePerCollab: 9100,
    category: "Comedy & Entertainment",
    badge: "Viral Reach",
    isHero: false,
    isPinned: false,
    order: 4,
    completedDeals: 42,
    onTimeRate: 100,
  },
  {
    id: 5,
    username: "kavyanair_daily",
    displayName: "Kavya Nair",
    handle: "@kavyanair_daily",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
    city: "Kochi",
    tier: "mid",
    followers: 62000,
    medianViews: 38500,
    reach: 160000,
    engagementRate: 5.4,
    indiaAudiencePct: 95,
    pricePerReel: 2800,
    pricePerStory: 1400,
    pricePerCollab: 3900,
    category: "Beauty & Skincare",
    badge: "Rising Star",
    isHero: false,
    isPinned: false,
    order: 5,
    completedDeals: 16,
    onTimeRate: 100,
  },
  {
    id: 6,
    username: "sneharoy.travels",
    displayName: "Sneha Roy",
    handle: "@sneharoy.travels",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300",
    city: "Kolkata",
    tier: "upper_mid",
    followers: 118000,
    medianViews: 76000,
    reach: 310000,
    engagementRate: 5.1,
    indiaAudiencePct: 95,
    pricePerReel: 6500,
    pricePerStory: 3250,
    pricePerCollab: 9100,
    category: "Travel & Cafes",
    badge: "Top Engagement",
    isHero: false,
    isPinned: false,
    order: 6,
    completedDeals: 27,
    onTimeRate: 100,
  },
];

export const DEFAULT_TICKER_ITEMS: TickerAnnouncement[] = [
  { id: 1, text: "₹45,000 Verified Payouts Disbursed to Active Creators", icon: "check", isActive: true },
  { id: 2, text: "New Creator Verified: @simrankaur_vibes (185K Followers · Chandigarh)", icon: "instagram", isActive: true },
  { id: 3, text: "Instant UPI Payout Disbursed in 90 Seconds", icon: "zap", isActive: true },
  { id: 4, text: "Transparent Platform Fee · Direct Creator Deals", icon: "star", isActive: true },
];

export const DEFAULT_CONFIG: LandingShowcaseConfig = {
  heroCreatorId: 1,
  trendingCreatorIds: [1, 2, 3, 4, 5, 6],
  customCreators: DEFAULT_SHOWCASE_CREATORS,
  creatorOverrides: {
    1: { badge: "Featured Star", category: "Fashion & Lifestyle", isHero: true, isPinned: true, order: 1 },
    2: { badge: "Trending #1", category: "Dance & Music", isHero: false, isPinned: true, order: 2 },
    3: { badge: "High ROI", category: "Wellness & Fitness", isHero: false, isPinned: false, order: 3 },
    4: { badge: "Viral Reach", category: "Comedy & Entertainment", isHero: false, isPinned: false, order: 4 },
    5: { badge: "Rising Star", category: "Beauty & Skincare", isHero: false, isPinned: false, order: 5 },
    6: { badge: "Top Engagement", category: "Travel & Cafes", isHero: false, isPinned: false, order: 6 },
  },
  tickerAnnouncements: DEFAULT_TICKER_ITEMS,
  platformFeePercent: 7.5,
  gstPercent: 18,
  lastUpdated: new Date().toISOString(),
};

/**
 * Load Landing Showcase Config with DB first, JSON file fallback
 */
export async function getLandingShowcaseConfig(): Promise<LandingShowcaseConfig> {
  // 1. Try DB first
  if (isDatabaseConfigured) {
    try {
      const res = await pool.query(
        `SELECT value FROM admin_settings WHERE key = 'landing_showcase' LIMIT 1`
      );
      if (res.rows.length > 0 && res.rows[0].value) {
        const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
        return {
          ...DEFAULT_CONFIG,
          ...val,
        };
      }
    } catch (dbErr: any) {
      console.warn("[SHOWCASE DB READ]", dbErr.message);
    }
  }

  // 2. Try file fallback
  try {
    if (fs.existsSync(SHOWCASE_FILE)) {
      const raw = fs.readFileSync(SHOWCASE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
      };
    }
  } catch {}

  // 3. Return defaults
  return DEFAULT_CONFIG;
}

/**
 * Save Landing Showcase Config with DB & JSON file persistence
 */
export async function saveLandingShowcaseConfig(config: LandingShowcaseConfig): Promise<LandingShowcaseConfig> {
  config.lastUpdated = new Date().toISOString();

  // 1. Save to JSON file
  try {
    const dir = path.dirname(SHOWCASE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SHOWCASE_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (fileErr: any) {
    console.error("[SHOWCASE FILE WRITE ERROR]", fileErr.message);
  }

  // 2. Save to DB admin_settings
  if (isDatabaseConfigured) {
    try {
      await pool.query(
        `INSERT INTO admin_settings (key, value, description, updated_at)
         VALUES ('landing_showcase', $1, 'Landing page trending creators and ticker settings', NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = $1, updated_at = NOW()`,
        [JSON.stringify(config)]
      );
    } catch (dbErr: any) {
      console.error("[SHOWCASE DB WRITE ERROR]", dbErr.message);
    }
  }

  return config;
}

/**
 * Build public creators payload for Homepage
 */
export async function buildPublicCreatorsResponse(registeredUsers: any[]): Promise<{
  heroCreator: ShowcaseCreator;
  trending: ShowcaseCreator[];
  all: ShowcaseCreator[];
  tickerAnnouncements: TickerAnnouncement[];
  stats: any;
  platformFeePercent: number;
}> {
  const config = await getLandingShowcaseConfig();

  // Merge registered DB creators with curated profiles
  const creatorMap = new Map<number, ShowcaseCreator>();

  // 1. Add all custom/curated creators
  for (const c of config.customCreators || DEFAULT_SHOWCASE_CREATORS) {
    creatorMap.set(c.id, { ...c });
  }

  // 2. Map registered users who are creators
  for (const u of registeredUsers) {
    if (u.role === "creator") {
      const id = Number(u.id);
      const followers = Number(u.instagramFollowers || u.followers) || 0;
      const cleanHandle = (u.instagramUsername || u.handle || "").trim().replace(/^@+/, "");
      if (!cleanHandle) continue;

      const existing = creatorMap.get(id);
      const tier = u.tier || (followers >= 100000 ? "upper_mid" : followers >= 50000 ? "mid" : "micro");
      const baseReel = tier === "upper_mid" ? 6500 : tier === "mid" ? 2800 : 1200;

      const merged: ShowcaseCreator = {
        id,
        username: cleanHandle,
        displayName: u.displayName || u.name || cleanHandle,
        handle: `@${cleanHandle}`,
        avatar: u.avatar || u.avatarUrl || existing?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
        city: u.city || existing?.city || "Mumbai",
        tier,
        followers: followers || existing?.followers || 50000,
        medianViews: Number(u.medianViews || existing?.medianViews || Math.round((followers || 50000) * 0.45)),
        reach: Number(u.reach || u.instagramReach || existing?.reach || Math.round((followers || 50000) * 2.2)),
        engagementRate: Number(u.engagementRate || existing?.engagementRate || 5.0),
        indiaAudiencePct: Number(u.indiaAudiencePct || 95),
        pricePerReel: u.pricePerReel || existing?.pricePerReel || baseReel,
        pricePerStory: u.pricePerStory || existing?.pricePerStory || Math.round(baseReel * 0.5),
        pricePerCollab: u.pricePerCollab || existing?.pricePerCollab || Math.round(baseReel * 1.4),
        category: existing?.category || "Lifestyle & Creator",
        badge: existing?.badge || "Verified Creator",
        isHero: config.heroCreatorId === id,
        isPinned: existing?.isPinned || false,
        order: existing?.order || 99,
        completedDeals: u.completedDeals || existing?.completedDeals || 10,
        onTimeRate: u.onTimeRate || 100,
      };

      creatorMap.set(id, merged);
    }
  }

  // Apply admin overrides
  for (const [idStr, ov] of Object.entries(config.creatorOverrides || {})) {
    const id = Number(idStr);
    const c = creatorMap.get(id);
    if (c) {
      if (ov.badge !== undefined) c.badge = ov.badge;
      if (ov.category !== undefined) c.category = ov.category;
      if (ov.isHero !== undefined) c.isHero = ov.isHero;
      if (ov.isPinned !== undefined) c.isPinned = ov.isPinned;
      if (ov.order !== undefined) c.order = ov.order;
    }
  }

  const allCreators = Array.from(creatorMap.values());

  // Filter trending creators
  const trendingIdsSet = new Set(config.trendingCreatorIds || [1, 2, 3, 4, 5, 6]);
  let trending = allCreators.filter((c) => trendingIdsSet.has(c.id));

  // If none matched, fallback to curated list
  if (trending.length === 0) {
    trending = DEFAULT_SHOWCASE_CREATORS;
  }

  // Sort: hero first, then pinned, then by order, then by reach
  trending.sort((a, b) => {
    if (a.id === config.heroCreatorId) return -1;
    if (b.id === config.heroCreatorId) return 1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if ((a.order || 99) !== (b.order || 99)) return (a.order || 99) - (b.order || 99);
    return b.reach - a.reach;
  });

  // Hero creator
  let heroCreator = allCreators.find((c) => c.id === config.heroCreatorId) || trending[0] || DEFAULT_SHOWCASE_CREATORS[0];

  const totalReach = allCreators.reduce((acc, c) => acc + (c.reach || 0), 0);
  const avgEng = allCreators.length > 0
    ? (allCreators.reduce((acc, c) => acc + (c.engagementRate || 0), 0) / allCreators.length).toFixed(1)
    : "5.2";

  const activeTickers = (config.tickerAnnouncements || DEFAULT_TICKER_ITEMS).filter((t) => t.isActive);

  return {
    heroCreator,
    trending,
    all: allCreators,
    tickerAnnouncements: activeTickers.length > 0 ? activeTickers : DEFAULT_TICKER_ITEMS,
    platformFeePercent: config.platformFeePercent || 7.5,
    stats: {
      totalVerifiedCreators: allCreators.length,
      totalVerifiedReach: totalReach > 0 ? totalReach : 1493000,
      averageEngagementRate: avgEng,
      avgTurnaroundHours: 48,
    },
  };
}
