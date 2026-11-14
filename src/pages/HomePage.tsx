import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Search,
  Users,
  Eye,
  DollarSign,
  Lock,
  Zap,
  Star,
  ChevronRight,
  Instagram,
  MapPin,
  BadgeCheck,
  ArrowUpRight,
  Layers,
  Clock,
  Briefcase,
  Menu,
  X,
  Building2,
  Check,
  Play,
  Share2,
} from "lucide-react";

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
  pricePerCollab: number;
  completedDeals?: number;
  onTimeRate?: number;
  category?: string;
}

// Fallback high-reach verified Indian creators
const CURATED_CREATORS: PublicCreator[] = [
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
    completedDeals: 24,
    onTimeRate: 100,
    category: "Fashion & Lifestyle",
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
    completedDeals: 31,
    onTimeRate: 98,
    category: "Dance & Music",
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
    completedDeals: 19,
    onTimeRate: 100,
    category: "Wellness & Fitness",
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
    completedDeals: 42,
    onTimeRate: 100,
    category: "Comedy & Entertainment",
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
    completedDeals: 16,
    onTimeRate: 100,
    category: "Beauty & Skincare",
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
    completedDeals: 27,
    onTimeRate: 100,
    category: "Travel & Cafes",
  },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [howItWorksTab, setHowItWorksTab] = useState<"brands" | "creators">("brands");
  const [creators, setCreators] = useState<PublicCreator[]>(CURATED_CREATORS);
  const [heroCreator, setHeroCreator] = useState<PublicCreator>(CURATED_CREATORS[0]);
  const [tickerAnnouncements, setTickerAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real creators data from public endpoint
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch("/api/public/creators");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.heroCreator) {
              setHeroCreator(data.heroCreator);
            }
            if (data.trending && data.trending.length > 0) {
              setCreators(data.trending);
            }
            if (data.tickerAnnouncements && data.tickerAnnouncements.length > 0) {
              setTickerAnnouncements(data.tickerAnnouncements);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch public creators:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
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

  // Safe dashboard link for regular users (NO admin)
  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "sponsor") return "/sponsor";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (!user) return "Dashboard";
    if (user.role === "sponsor") return "Brand Dashboard";
    return "Creator Hub";
  };

  // Infinite ticker items
  const marqueeList = useMemo(() => {
    return [...creators, ...creators];
  }, [creators]);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-rose-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* 1. Sticky Navigation Header (Clean White Theme, NO Admin) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
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

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link href="/creators" className="hover:text-rose-600 transition-colors font-bold text-rose-600">
              Creator Directory
            </Link>
            <a href="#trending" className="hover:text-rose-600 transition-colors">
              Trending Creators
            </a>
            <a href="#how-it-works" className="hover:text-rose-600 transition-colors">
              How It Works
            </a>
            <a href="#payment-security" className="hover:text-rose-600 transition-colors">
              Payment Security
            </a>
            <Link href="/about" className="hover:text-rose-600 transition-colors">
              About Mingree
            </Link>
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated && user && user.role !== "admin" ? (
              <div className="flex items-center gap-3">
                <Link
                  href={getDashboardLink()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold transition"
                >
                  <Briefcase className="w-4 h-4 text-rose-600" />
                  {getDashboardLabel()}
                </Link>
                {user.role === "sponsor" && (
                  <Link
                    href="/sponsor/create-campaign/manual"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition shadow-md shadow-rose-600/25"
                  >
                    Post Campaign
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition shadow-md shadow-rose-600/25"
                >
                  Sign Up
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu sheet */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-700">
              <Link
                href="/creators"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-rose-600 font-bold"
              >
                Creator Directory
              </Link>
              <a
                href="#trending"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-rose-600"
              >
                Trending Creators
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-rose-600"
              >
                How It Works
              </a>
              <a
                href="#payment-security"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-rose-600"
              >
                Payment Security
              </a>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-rose-600"
              >
                About Mingree
              </Link>
            </nav>
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold text-sm"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-xl bg-rose-600 text-white font-bold text-sm shadow-md shadow-rose-600/25"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section (Clean White SaaS Theme + Moving Objects / Animations) */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-rose-50/40 via-white to-slate-50/60 overflow-hidden">
        {/* Animated Moving Decorative Gradient Orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-rose-200/35 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute top-36 right-10 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl pointer-events-none animate-float-reverse" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-pink-100/40 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline, Copy & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Book Verified Creators.{" "}
                <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
                  Transparent Platform Fee.
                </span>{" "}
                100% Secure Payments.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Directly collaborate with top Indian creators for Instagram Reels, Stories, and Collab
                posts. Standardized transparent pricing, nominal platform percentage fee, and funds held safely in
                reserve until you review and approve the post.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <a
                  href="#trending"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-xl shadow-rose-600/30 transition transform hover:-translate-y-0.5"
                >
                  <Search className="w-4 h-4" />
                  Explore Trending Creators
                </a>
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-base hover:bg-slate-50 transition shadow-sm"
                >
                  Join as a Creator
                  <ArrowUpRight className="w-4 h-4 text-slate-500" />
                </Link>
              </div>

              {/* Value stats row */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-slate-200">
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    ₹0
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">Middleman Markup</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
                    100%
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">Payment Protected</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    48 Hours
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">Approval Window</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-black text-rose-600 tracking-tight font-mono">
                    100+
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">Indian Cities</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Showcase Card with Floating Objects */}
            <div className="lg:col-span-5 relative">
              {/* Moving Floating Badge 1: Payment Protection */}
              <div className="hidden sm:flex absolute -top-5 -left-6 z-20 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-emerald-200 shadow-xl shadow-emerald-500/10 text-xs font-bold text-emerald-800 animate-float">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Payment Protected ₹15,000</span>
              </div>

              {/* Moving Floating Badge 2: Delivery window */}
              <div className="hidden sm:flex absolute -bottom-5 -right-4 z-20 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-rose-200 shadow-xl shadow-rose-500/10 text-xs font-bold text-rose-800 animate-float-reverse">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>48h Draft Delivery Guarantee</span>
              </div>

              {/* Showcase Card (Clean White Aesthetic, Riya Sen) */}
              <div className="relative rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl shadow-slate-200/80 space-y-5">
                {/* Status bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>{(heroCreator as any)?.badge || "Verified Creator Profile"}</span>
                  </div>
                </div>

                {/* Creator Avatar & Info (Riya Sen) */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src={heroCreator.avatar}
                      alt={heroCreator.displayName}
                      className="w-18 h-18 rounded-2xl object-cover border-2 border-rose-500 shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-md">
                      ✓
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-black text-slate-900 truncate">
                        {heroCreator.displayName}
                      </h3>
                      <BadgeCheck className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 font-mono font-medium">
                      {heroCreator.handle}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{heroCreator.city}, India</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-rose-600 font-semibold">{heroCreator.category}</span>
                    </div>
                  </div>
                </div>

                {/* Real Verified Performance Metrics */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-center">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-500 font-semibold">Followers</div>
                    <div className="text-base font-black text-slate-900 font-mono">
                      {formatNumber(heroCreator.followers)}
                    </div>
                  </div>
                  <div className="space-y-0.5 border-x border-slate-200">
                    <div className="text-[11px] text-slate-500 font-semibold">Avg Views</div>
                    <div className="text-base font-black text-slate-900 font-mono">
                      {formatNumber(heroCreator.medianViews)}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-slate-500 font-semibold">Engagement</div>
                    <div className="text-base font-black text-emerald-600 font-mono">
                      {heroCreator.engagementRate}%
                    </div>
                  </div>
                </div>

                {/* Transparent Rate Card Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Standardized Rates</span>
                    <span className="text-slate-600 font-semibold">Standard Platform Percentage</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
                      <div className="text-slate-600 font-semibold">Reel Post</div>
                      <div className="text-rose-600 font-black text-sm mt-0.5 font-mono">
                        {formatINR(heroCreator.pricePerReel)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-slate-600 font-semibold">Story Post</div>
                      <div className="text-slate-900 font-black text-sm mt-0.5 font-mono">
                        {formatINR(heroCreator.pricePerStory)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-slate-600 font-semibold">Collab Post</div>
                      <div className="text-slate-900 font-black text-sm mt-0.5 font-mono">
                        {formatINR(heroCreator.pricePerCollab)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Protected Booking CTA */}
                <div className="pt-1">
                  <Link
                    href={user && user.role === "sponsor" ? "/sponsor/create-campaign/manual" : "/creators"}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition"
                  >
                    <Lock className="w-4 h-4 text-white" />
                    Book Creator with Payment Protection
                  </Link>
                  <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
                    Funds released strictly after you review and approve the post.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Ticker / Moving Activity Row (Managed via Admin Console) */}
      <div className="w-full bg-slate-900 text-white py-3 overflow-hidden border-y border-slate-800">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          {(tickerAnnouncements.length > 0
            ? [...tickerAnnouncements, ...tickerAnnouncements]
            : [
                { id: "1", text: "⚡ Campaign Completed: 112,000 Views Delivered for Lifestyle Brand", icon: "zap" },
                { id: "2", text: "₹45,000 Verified Payouts Disbursed to Active Creators", icon: "shield" },
                { id: "3", text: "New Creator Verified: @simrankaur_vibes (185K Followers · Chandigarh)", icon: "ig" },
                { id: "4", text: "Instant UPI Payout Disbursed in 90 Seconds", icon: "zap" },
                { id: "5", text: "Transparent Platform Fee · Direct Creator Deals", icon: "check" },
              ]
          ).map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-8">
              <div className="flex items-center gap-2 text-xs font-semibold">
                {item.icon === "zap" && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                {item.icon === "shield" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                {item.icon === "ig" && <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                {item.icon === "check" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {!["zap", "shield", "ig", "check"].includes(item.icon || "") && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span className={item.highlight ? "text-amber-300 font-bold" : "text-slate-100"}>
                  {item.text}
                </span>
              </div>
              <span className="text-slate-600">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Trending Creators Section (Auto-Scrolling Marquee / No Manual Filter) */}
      <section id="trending" className="py-20 bg-slate-50/70 border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                <span>Live High-Reach Creators</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Trending on Mingree
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl font-normal">
                High-reach verified Indian creators actively driving engagement and viral impressions.
                Hover to pause and explore rates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/creators"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 shadow-sm transition"
              >
                View Full Creator Directory
                <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* Continuous Auto-Scrolling Marquee Carousel */}
        <div className="mt-8 pt-2 pb-6 overflow-x-hidden relative">
          <div className="animate-marquee gap-6 px-4">
            {marqueeList.map((c, index) => (
              <div
                key={`${c.id}-${index}`}
                className="w-80 flex-shrink-0 rounded-2xl bg-white border border-slate-200/90 hover:border-rose-400 hover:shadow-xl transition-all duration-300 p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex-shrink-0">
                      <img
                        src={c.avatar}
                        alt={c.displayName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-base truncate">
                          {c.displayName}
                        </h4>
                        <BadgeCheck className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        {(c as any).badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            {(c as any).badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono font-medium truncate">{c.handle}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>{c.city}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-rose-600 font-semibold">{c.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">Followers</div>
                      <div className="font-bold text-slate-900 font-mono mt-0.5">
                        {formatNumber(c.followers)}
                      </div>
                    </div>
                    <div className="border-x border-slate-200">
                      <div className="text-[10px] text-slate-500 font-semibold">Reach</div>
                      <div className="font-bold text-slate-900 font-mono mt-0.5">
                        {formatNumber(c.reach)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">Avg Views</div>
                      <div className="font-bold text-emerald-600 font-mono mt-0.5">
                        {formatNumber(c.medianViews)}
                      </div>
                    </div>
                  </div>

                  {/* Rates */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pt-1 border-t border-slate-100">
                    <span>Reel: <strong className="text-slate-900 font-bold">{formatINR(c.pricePerReel)}</strong></span>
                    <span className="text-emerald-700 font-bold">96% India</span>
                  </div>
                </div>

                {/* Booking Button */}
                <Link
                  href={user && user.role === "sponsor" ? `/sponsor/create-campaign/manual?creatorId=${c.id}` : "/creators"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition"
                >
                  <span>Book Creator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. “How Mingree Works” (Dual-Sided: Brands & Creators) */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-rose-600" />
              <span>Transparent Protocol</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              How Mingree Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal">
              Eliminating endless agency negotiations, delayed creator payments, and fake screenshot
              analytics with automated payment protection.
            </p>

            {/* Persona Switcher Tabs */}
            <div className="pt-4 flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setHowItWorksTab("brands")}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl transition cursor-pointer ${
                    howItWorksTab === "brands"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  For Brands & Sponsors
                </button>
                <button
                  type="button"
                  onClick={() => setHowItWorksTab("creators")}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl transition cursor-pointer ${
                    howItWorksTab === "creators"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  For Creators & Influencers
                </button>
              </div>
            </div>
          </div>

          {/* 4 Steps Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksTab === "brands" ? (
              <>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Pick Creators</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Search verified creators by city, follower tier, and real view counts. Inspect
                    standardized fixed rates per post.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Reserve Payment</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Pre-fund your campaign budget safely into your campaign wallet. Money is allocated
                    exclusively for the creator and never released until your review.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Review Draft</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    The creator uploads draft video or link. You check compliance with brief, hashtags,
                    and audio tags in your 48-hour window.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Approve & Release</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Sign off on the post to release payment. Automatic GST tax invoice and verified
                    campaign report are provided instantly.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Sync Instagram</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Connect your official profile via secure OAuth. Live followers and median views
                    automatically unlock your transparent rate tier.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Receive Funded Offers</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Brands send direct campaign invitations with 100% pre-funded budgets. You never
                    work with risk of non-payment.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Create & Submit</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Shoot your Reel according to instructions and submit draft in your Mingree creator
                    workspace folder.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Instant UPI Payout</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Once the brand approves, funds land in your Mingree wallet. Withdraw directly to
                    UPI or bank account in minutes.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 6. Payment Security & Trust Pillars */}
      <section id="payment-security" className="py-20 bg-slate-50/60 border-b border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Trust & Payment Security</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Complete Protection for Both Sides
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal">
              No financial risk for brands, no payment default or delay for creators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">100% Payment Protection</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Brand funds are safely reserved in your campaign budget before production begins. Creators have
                guaranteed compensation upon delivery, and brands get full refunds if requirements
                aren’t met.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Instagram className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Official Instagram Sync</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Direct OAuth synchronization guarantees real reach, genuine median views, and
                verified Indian audience concentration with zero fake screenshot manipulation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instant UPI Disbursals</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Verified creators can withdraw their earnings instantly to Google Pay, PhonePe, Paytm,
                or direct IMPS bank transfer with zero bureaucratic hold periods.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA Banner */}
      <section className="py-20 bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-600 text-white relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Ready to Launch Your Next Viral Campaign?
            </h2>
            <p className="text-base sm:text-lg text-rose-100 max-w-xl mx-auto font-normal">
              Join leading Indian brands and verified creators collaborating transparently with guaranteed
              payment protection.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sponsor/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white text-rose-600 font-black text-base hover:bg-rose-50 shadow-xl transition transform hover:-translate-y-0.5"
            >
              <Building2 className="w-5 h-5" />
              Start Brand Campaign
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-rose-700/80 border border-white/20 text-white font-bold text-base hover:bg-rose-800 transition"
            >
              <Users className="w-5 h-5" />
              Join as a Creator
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer (Clean White Theme, NO Admin) */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-12 text-sm text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-200">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
                  alt="Mingree Logo"
                  className="w-9 h-9 rounded-xl object-cover shadow-sm"
                />
                <span className="text-xl font-bold tracking-tight text-slate-900">Mingree</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-normal">
                India’s premier influencer marketing and creator earnings marketplace. Safe &amp; verified
                collaborations for Instagram Reels, Stories, and Brand sponsorships.
              </p>
              <div className="text-xs text-slate-400 font-medium">
                100% Payment Protection · GST Compliant Invoices
              </div>
            </div>

            {/* Marketplace */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Marketplace
              </div>
              <ul className="space-y-2 text-xs font-semibold">
                <li>
                  <Link href="/creators" className="hover:text-rose-600 transition font-bold text-slate-900">
                    Creator Directory
                  </Link>
                </li>
                <li>
                  <a href="#trending" className="hover:text-rose-600 transition">
                    Trending Creators
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-rose-600 transition">
                    Standardized Rates
                  </a>
                </li>
                <li>
                  <Link href="/creators" className="hover:text-rose-600 transition">
                    Find Creators
                  </Link>
                </li>
              </ul>
            </div>

            {/* Platform */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Platform
              </div>
              <ul className="space-y-2 text-xs font-semibold">
                <li>
                  <Link href="/about" className="hover:text-rose-600 transition">
                    About Mingree
                  </Link>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-rose-600 transition">
                    How It Works
                  </a>
                </li>
                <li>
                  <Link href="/support" className="hover:text-rose-600 transition">
                    Support Desk
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-rose-600 transition">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Trust & Legal
              </div>
              <ul className="space-y-2 text-xs font-semibold">
                <li>
                  <Link href="/terms" className="hover:text-rose-600 transition">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-rose-600 transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refunds" className="hover:text-rose-600 transition">
                    Refund &amp; Cancellation Policy
                  </Link>
                </li>
                <li>
                  <Link href="/data-deletion" className="hover:text-rose-600 transition">
                    Data Deletion
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <div>© {new Date().getFullYear()} MINGREE (Proprietor: Lakhwinder Singh) · Sole Proprietorship · UDYAM-PB-20-0059364</div>
            <div className="flex items-center gap-4">
              <span>Made with pride in India</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
