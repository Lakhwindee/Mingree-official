import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  Search,
  MapPin,
  BadgeCheck,
  TrendingUp,
  ArrowRight,
  Filter,
  SlidersHorizontal,
  Instagram,
  ShieldCheck,
  Clock,
  CheckCircle2,
  X,
  Layers,
  PhoneCall,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreatorAvatar } from "@/components/CreatorAvatar";

interface PublicCreator {
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
  pricePerSimplePost: number;
  pricePerCollab: number;
  completedDeals: number;
  onTimeRate: number;
  category: string;
  badge?: string;
}

const DEFAULT_CREATORS: PublicCreator[] = [
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
    pricePerSimplePost: 2000,
    pricePerCollab: 3900,
    completedDeals: 24,
    onTimeRate: 100,
    category: "Fashion & Lifestyle",
    badge: "⭐ Trending #1",
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
    pricePerSimplePost: 4500,
    pricePerCollab: 9100,
    completedDeals: 31,
    onTimeRate: 98,
    category: "Dance & Music",
    badge: "🔥 High Engagement",
  },
  {
    id: 9,
    username: "gurindersingh_punjab",
    displayName: "Gurinder Singh",
    handle: "@gurindersingh_punjab",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
    city: "Punjab",
    tier: "upper_mid",
    followers: 165000,
    medianViews: 98000,
    reach: 410000,
    engagementRate: 5.8,
    indiaAudiencePct: 98,
    pricePerReel: 6500,
    pricePerStory: 3250,
    pricePerSimplePost: 4500,
    pricePerCollab: 9100,
    completedDeals: 39,
    onTimeRate: 100,
    category: "Comedy & Entertainment",
    badge: "🔥 Punjab Viral",
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
    pricePerSimplePost: 2000,
    pricePerCollab: 3900,
    completedDeals: 19,
    onTimeRate: 100,
    category: "Wellness & Fitness",
    badge: "⚡ Viral Reach",
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
    pricePerSimplePost: 4500,
    pricePerCollab: 9100,
    completedDeals: 42,
    onTimeRate: 100,
    category: "Comedy & Entertainment",
    badge: "🔥 Viral Reach",
  },
  {
    id: 5,
    username: "kavyanair_daily",
    displayName: "Kavya Nair",
    handle: "@kavyanair_daily",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
    city: "Kochi",
    tier: "micro",
    followers: 32400,
    medianViews: 19800,
    reach: 88000,
    engagementRate: 6.8,
    indiaAudiencePct: 98,
    pricePerReel: 1200,
    pricePerStory: 600,
    pricePerSimplePost: 900,
    pricePerCollab: 1700,
    completedDeals: 15,
    onTimeRate: 100,
    category: "Food & Cafes",
    badge: "⚡ High Engagement",
  },
  {
    id: 6,
    username: "ananyasharma_travel",
    displayName: "Ananya Sharma",
    handle: "@ananyasharma_travel",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300",
    city: "Jaipur",
    tier: "upper_mid",
    followers: 168000,
    medianViews: 96000,
    reach: 420000,
    engagementRate: 5.4,
    indiaAudiencePct: 93,
    pricePerReel: 6500,
    pricePerStory: 3250,
    pricePerSimplePost: 4500,
    pricePerCollab: 9100,
    completedDeals: 27,
    onTimeRate: 100,
    category: "Travel & Cafes",
    badge: "⭐ Top Converting",
  },
  {
    id: 7,
    username: "nehadixit_glam",
    displayName: "Neha Dixit",
    handle: "@nehadixit_glam",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300",
    city: "Mumbai",
    tier: "mid",
    followers: 86000,
    medianViews: 48000,
    reach: 220000,
    engagementRate: 5.1,
    indiaAudiencePct: 95,
    pricePerReel: 2800,
    pricePerStory: 1400,
    pricePerSimplePost: 2000,
    pricePerCollab: 3900,
    completedDeals: 18,
    onTimeRate: 100,
    category: "Beauty & Skincare",
    badge: "💎 Premium Pick",
  },
  {
    id: 8,
    username: "priyasingh_tech",
    displayName: "Priya Singh",
    handle: "@priyasingh_tech",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300",
    city: "Hyderabad",
    tier: "mid",
    followers: 65000,
    medianViews: 39000,
    reach: 175000,
    engagementRate: 4.8,
    indiaAudiencePct: 96,
    pricePerReel: 2800,
    pricePerStory: 1400,
    pricePerSimplePost: 2000,
    pricePerCollab: 3900,
    completedDeals: 21,
    onTimeRate: 100,
    category: "Tech & Gadgets",
    badge: "⚡ High Engagement",
  },
];

const CATEGORIES = [
  "All",
  "Fashion & Lifestyle",
  "Dance & Music",
  "Wellness & Fitness",
  "Comedy & Entertainment",
  "Food & Cafes",
  "Travel & Cafes",
  "Beauty & Skincare",
  "Tech & Gadgets",
];

const CITIES = [
  "All",
  "Punjab",
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Chandigarh",
  "Kochi",
  "Jaipur",
  "Hyderabad",
  "Pune",
  "Kolkata",
];

export default function CreatorDirectory() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [creators, setCreators] = useState<PublicCreator[]>(DEFAULT_CREATORS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedTier, setSelectedTier] = useState<"all" | "nano" | "micro" | "mid" | "macro">("all");
  const [sortBy, setSortBy] = useState<"trending" | "followers_desc" | "views_desc" | "engagement_desc" | "price_asc">("trending");

  // Booking Modal
  const [bookingCreator, setBookingCreator] = useState<PublicCreator | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCreators() {
      try {
        const res = await fetch("/api/public/creators");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list: PublicCreator[] = data.all || data.trending || [];
            if (list.length > 0) {
              setCreators(list);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load creator directory:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCreators();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString("en-IN");
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered & Sorted Creators
  const filteredCreators = useMemo(() => {
    return creators
      .filter((c) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matches =
            c.displayName.toLowerCase().includes(q) ||
            c.username.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Category filter
        if (selectedCategory !== "All") {
          if (!c.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
            return false;
          }
        }

        // City filter
        if (selectedCity !== "All") {
          if (c.city.toLowerCase() !== selectedCity.toLowerCase()) {
            return false;
          }
        }

        // Tier filter
        if (selectedTier === "nano" && c.followers >= 10000) return false;
        if (selectedTier === "micro" && (c.followers < 10000 || c.followers >= 50000)) return false;
        if (selectedTier === "mid" && (c.followers < 50000 || c.followers >= 250000)) return false;
        if (selectedTier === "macro" && c.followers < 250000) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "followers_desc") return b.followers - a.followers;
        if (sortBy === "views_desc") return b.medianViews - a.medianViews;
        if (sortBy === "engagement_desc") return b.engagementRate - a.engagementRate;
        if (sortBy === "price_asc") return a.pricePerReel - b.pricePerReel;
        return a.id - b.id; // default trending order
      });
  }, [creators, search, selectedCategory, selectedCity, selectedTier, sortBy]);

  const handleBookClick = (creator: PublicCreator) => {
    // If authenticated sponsor, go to campaign workflow
    if (isAuthenticated && user?.role === "sponsor") {
      setLocation(`/sponsor/create-campaign/manual?creatorId=${creator.id}`);
      return;
    }
    // Otherwise open clean booking popup (NEVER redirect to admin)
    setBookingCreator(creator);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-rose-500 selection:text-white">
      {/* 1. Header (Clean White Theme, NO Admin) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
              alt="Mingree Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Mingree
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
                Creator Marketplace
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-rose-600 transition">
              Home
            </Link>
            <Link href="/creators" className="text-rose-600 font-bold">
              Creator Directory
            </Link>
            <Link href="/about" className="hover:text-rose-600 transition">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link
                href={user?.role === "sponsor" ? "/sponsor" : "/dashboard"}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-slate-700 hover:text-slate-900 font-bold text-xs hover:bg-slate-100 transition"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Header */}
      <section className="bg-white border-b border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Verified Indian Creators</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Creator Directory
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl mt-1.5 font-normal">
                Browse verified Indian creators with standardized pricing, audited reach, and secure payment protection.
                Filter by city, follower tier, or niche to find the perfect fit for your campaign.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Payment Protected
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600" /> 48h Draft Delivery
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Search & Filter Bar */}
      <section className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8 sticky top-18 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto space-y-3.5">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by creator name, @handle, or city..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* City Dropdown */}
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-rose-500"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Cities" : c}
                  </option>
                ))}
              </select>

              {/* Tier Filter */}
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="all">All Tiers</option>
                <option value="nano">Nano (&lt; 10K)</option>
                <option value="micro">Micro (10K - 50K)</option>
                <option value="mid">Mid (50K - 250K)</option>
                <option value="macro">Macro (250K+)</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="trending">Sort: Trending</option>
                <option value="followers_desc">Most Followers</option>
                <option value="views_desc">Most Reel Views</option>
                <option value="engagement_desc">Best Engagement</option>
                <option value="price_asc">Reel Price: Low to High</option>
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Creator Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="flex items-center justify-between pb-6">
          <p className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-mono font-black">{filteredCreators.length}</span> creators
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
            {selectedCity !== "All" && ` from ${selectedCity}`}
          </p>
        </div>

        {filteredCreators.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No creators found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No creators matched your current filters. Try resetting the filters or searching with a different keyword.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
                setSelectedCity("All");
                setSelectedTier("all");
              }}
              className="text-xs"
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((c) => (
              <div
                key={c.id}
                className="relative rounded-2xl bg-white border border-slate-200 hover:border-rose-300 p-4 shadow-lg shadow-slate-200/60 space-y-3.5 flex flex-col justify-between transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Status bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-400/80 shrink-0" />
                      <span>{c.badge ? c.badge.replace(/^[^\w]+/, "").trim() : "Featured Star"}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Live sync</span>
                  </div>

                  {/* Creator Avatar & Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {c.avatar && !c.avatar.includes("unsplash.com") ? (
                        <CreatorAvatar
                          avatarUrl={c.avatar}
                          displayName={c.displayName}
                          username={c.username}
                          size={56}
                          className="!rounded-xl border-2 border-rose-500 shadow-sm"
                        />
                      ) : (
                        <img
                          src={c.avatar}
                          alt={c.displayName}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border-2 border-rose-500 shadow-sm"
                        />
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                        ✓
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className="text-base font-black text-slate-900 truncate leading-tight">
                          {c.displayName}
                        </h4>
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono font-medium truncate mt-0.5">
                        {c.handle}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 min-w-0">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{c.city}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-rose-600 font-semibold truncate">{c.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Column Verified Performance Metrics (Followers, Reach, Avg Views, Engagement) */}
                  <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/90 text-center">
                    <div className="space-y-0.2">
                      <div className="text-[10px] text-slate-500 font-semibold">Followers</div>
                      <div className="text-xs font-black text-slate-900 font-mono tabular-nums">
                        {formatNumber(c.followers)}
                      </div>
                    </div>
                    <div className="space-y-0.2 border-x border-slate-200">
                      <div className="text-[10px] text-slate-500 font-semibold">Reach</div>
                      <div className="text-xs font-black text-sky-600 font-mono tabular-nums">
                        {c.reach > 0 ? formatNumber(c.reach) : formatNumber(Math.round(c.followers * 2.2))}
                      </div>
                    </div>
                    <div className="space-y-0.2 border-r border-slate-200">
                      <div className="text-[10px] text-slate-500 font-semibold">Views</div>
                      <div className="text-xs font-black text-slate-900 font-mono tabular-nums">
                        {formatNumber(c.medianViews)}
                      </div>
                    </div>
                    <div className="space-y-0.2">
                      <div className="text-[10px] text-slate-500 font-semibold">Eng.</div>
                      <div className="text-xs font-black text-emerald-600 font-mono tabular-nums">
                        {c.engagementRate}%
                      </div>
                    </div>
                  </div>

                  {/* Standardized Rates */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Standardized Rates</span>
                      <span className="text-slate-500 font-medium text-[10px]">Platform Verified</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-300 text-center">
                        <div className="text-[11px] text-slate-600 font-semibold">Reel</div>
                        <div className="text-rose-600 font-black text-xs mt-0.5 font-mono tabular-nums">
                          {formatINR(c.pricePerReel)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 font-semibold">Story</div>
                        <div className="text-slate-900 font-black text-xs mt-0.5 font-mono tabular-nums">
                          {formatINR(c.pricePerStory)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 font-semibold">Post</div>
                        <div className="text-slate-900 font-black text-xs mt-0.5 font-mono tabular-nums">
                          {formatINR(c.pricePerSimplePost || Math.round(c.pricePerReel * 0.7))}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 font-semibold">Collab</div>
                        <div className="text-slate-900 font-black text-xs mt-0.5 font-mono tabular-nums">
                          {formatINR(c.pricePerCollab)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Protected Booking CTA */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleBookClick(c)}
                    className="w-full flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span>Book Creator with Payment Protection</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-1.5 font-medium leading-tight">
                    Funds released strictly after you review and approve the post.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 5. Booking Inquiry Modal (For public/unauthenticated users) */}
      <Dialog open={Boolean(bookingCreator)} onOpenChange={() => setBookingCreator(null)}>
        <DialogContent className="sm:max-w-md">
          {bookingCreator && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-600" />
                  Book {bookingCreator.displayName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Direct brand collaboration with 100% payment protection and guaranteed 48-hour draft delivery.
                </DialogDescription>
              </DialogHeader>

              {/* Creator Snapshot */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={bookingCreator.avatar}
                  alt={bookingCreator.displayName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                    {bookingCreator.displayName}
                    <BadgeCheck className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{bookingCreator.handle}</div>
                  <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    {formatNumber(bookingCreator.followers)} Followers · {bookingCreator.city}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Reel Rate</div>
                  <div className="text-xs font-bold text-rose-600 font-mono">
                    {formatINR(bookingCreator.pricePerReel)}
                  </div>
                </div>
              </div>

              {/* Safeguards */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Payment Protection:</strong> Your funds are securely held and only released after you review and approve the live post.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>48-Hour Turnaround:</strong> Creators submit initial drafts within 48 hours of campaign confirmation.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href="/signup"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Create Free Brand Account to Book
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                >
                  Already have an account? Sign In
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
              alt="Mingree"
              className="w-6 h-6 rounded-md object-cover"
            />
            <span className="font-bold text-slate-900">Mingree</span>
            <span>© {new Date().getFullYear()} MINGREE (Proprietor: Lakhwinder Singh) · UDYAM-PB-20-0059364</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-900 transition">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 transition">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-slate-900 transition">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
