import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  TrendingUp,
  Star,
  Pin,
  CheckCircle2,
  Trash2,
  Plus,
  Edit3,
  RotateCw,
  ExternalLink,
  Search,
  Zap,
  Instagram,
  ShieldCheck,
  MapPin,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
  Layers,
  DollarSign,
  Briefcase,
} from "lucide-react";

interface ShowcaseCreator {
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
}

interface TickerAnnouncement {
  id: number;
  text: string;
  icon: "check" | "instagram" | "zap" | "star";
  isActive: boolean;
}

const PRESET_BADGES = [
  "Trending #1",
  "Featured Star",
  "High Reach",
  "Viral Trend",
  "Brand Favorite",
  "Rising Star",
  "Top ROI",
  "Verified Pro",
];

const PRESET_CATEGORIES = [
  "Fashion & Lifestyle",
  "Dance & Music",
  "Wellness & Fitness",
  "Comedy & Entertainment",
  "Beauty & Skincare",
  "Travel & Cafes",
  "Tech & Gaming",
  "Food & Hospitality",
];

export function LandingShowcasePage() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"creators" | "hero" | "ticker" | "fee">("creators");

  // Dialogs
  const [addCreatorOpen, setAddCreatorOpen] = useState(false);
  const [editCreatorDialog, setEditCreatorDialog] = useState<ShowcaseCreator | null>(null);
  const [editBadgeText, setEditBadgeText] = useState("");
  const [editCategoryText, setEditCategoryText] = useState("");

  const [addTickerOpen, setAddTickerOpen] = useState(false);
  const [tickerText, setTickerText] = useState("");
  const [tickerIcon, setTickerIcon] = useState<"check" | "instagram" | "zap" | "star">("check");

  const [searchCreatorText, setSearchCreatorText] = useState("");
  const [platformFeeInput, setPlatformFeeInput] = useState<number>(7.5);

  // Fetch full landing showcase admin config
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/landing-showcase"],
    queryFn: async () => {
      const res = await fetch("/api/admin/landing-showcase");
      if (!res.ok) throw new Error("Failed to load showcase data");
      return res.json();
    },
  });

  const trendingCreators: ShowcaseCreator[] = data?.trendingCreators || [];
  const heroCreator: ShowcaseCreator = data?.heroCreator || trendingCreators[0];
  const tickerAnnouncements: TickerAnnouncement[] = data?.tickerAnnouncements || [];
  const availableCreators: any[] = data?.availableCreators || [];
  const platformFee = data?.platformFeePercent ?? 7.5;

  // Toggle creator trending status
  const toggleTrendingMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      const res = await fetch("/api/admin/landing-showcase/toggle-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) throw new Error("Failed to update creator status");
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.isTrending ? "Creator added to Trending Showcase" : "Creator removed from Trending Showcase");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/creators"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Set hero creator
  const setHeroMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      const res = await fetch("/api/admin/landing-showcase/set-hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) throw new Error("Failed to set hero creator");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Hero Spotlight Creator updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/creators"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update creator badge & category
  const updateCreatorMutation = useMutation({
    mutationFn: async (params: { creatorId: number; badge?: string; category?: string; isPinned?: boolean; order?: number }) => {
      const res = await fetch("/api/admin/landing-showcase/update-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to update creator details");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Showcase details updated");
      setEditCreatorDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/creators"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update ticker announcements
  const updateTickerMutation = useMutation({
    mutationFn: async (announcements: TickerAnnouncement[]) => {
      const res = await fetch("/api/admin/landing-showcase/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcements }),
      });
      if (!res.ok) throw new Error("Failed to update ticker announcements");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Live ticker updated");
      setAddTickerOpen(false);
      setTickerText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/creators"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update Platform Fee %
  const updateFeeMutation = useMutation({
    mutationFn: async (fee: number) => {
      const res = await fetch("/api/admin/landing-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeePercent: fee }),
      });
      if (!res.ok) throw new Error("Failed to update platform fee");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Platform Fee updated to " + platformFeeInput + "%");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/creators"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleOpenEditCreator = (c: ShowcaseCreator) => {
    setEditCreatorDialog(c);
    setEditBadgeText(c.badge || "");
    setEditCategoryText(c.category || "Fashion & Lifestyle");
  };

  const handleSaveEditCreator = () => {
    if (!editCreatorDialog) return;
    updateCreatorMutation.mutate({
      creatorId: editCreatorDialog.id,
      badge: editBadgeText.trim() || undefined,
      category: editCategoryText.trim() || undefined,
    });
  };

  const handleAddTickerItem = () => {
    if (!tickerText.trim()) return;
    const newItems: TickerAnnouncement[] = [
      ...tickerAnnouncements,
      {
        id: Date.now(),
        text: tickerText.trim(),
        icon: tickerIcon,
        isActive: true,
      },
    ];
    updateTickerMutation.mutate(newItems);
  };

  const handleToggleTicker = (id: number) => {
    const newItems = tickerAnnouncements.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t));
    updateTickerMutation.mutate(newItems);
  };

  const handleDeleteTicker = (id: number) => {
    const newItems = tickerAnnouncements.filter((t) => t.id !== id);
    updateTickerMutation.mutate(newItems);
  };

  const formatNumber = (num: number) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return String(num);
  };

  const filteredAvailableCreators = availableCreators.filter((c) => {
    if (!searchCreatorText.trim()) return true;
    const q = searchCreatorText.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* 1. Header with Stats & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-600" />
              Landing Page & Trending Showcase
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Live Curation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Curate creators for the landing page ticker, assign spotlight badges, configure the hero card, and manage the live marquee announcements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition shadow-xs"
          >
            <span>Live Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs font-medium gap-1.5 border-slate-200"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setAddCreatorOpen(true)}
            className="h-8 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Creator to Trending</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Trending on Homepage</span>
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {trendingCreators.length}
          </div>
          <p className="text-[11px] text-slate-400">Creators in auto-scroll ticker</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Hero Spotlight Card</span>
            <Star className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 truncate">
            {heroCreator?.displayName || "None"}
          </div>
          <p className="text-[11px] text-slate-400 truncate">{heroCreator?.handle || "-"}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Live Ticker Announcements</span>
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {tickerAnnouncements.filter((t) => t.isActive).length} / {tickerAnnouncements.length}
          </div>
          <p className="text-[11px] text-slate-400">Active rotating marquee items</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Platform Take Rate</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {platformFee}%
          </div>
          <p className="text-[11px] text-slate-400">Standard percentage fee</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab("creators")}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeSubTab === "creators"
              ? "border-rose-600 text-rose-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Trending Showcase ({trendingCreators.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("hero")}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeSubTab === "hero"
              ? "border-rose-600 text-rose-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Hero Card Spotlight
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ticker")}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeSubTab === "ticker"
              ? "border-rose-600 text-rose-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Live Marquee Ticker ({tickerAnnouncements.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab("fee");
            setPlatformFeeInput(platformFee);
          }}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeSubTab === "fee"
              ? "border-rose-600 text-rose-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Platform Fee Economics
        </button>
      </div>

      {/* 4. Tab 1: Trending Showcase Creators Table */}
      {activeSubTab === "creators" && (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Active Trending Creators Showcase</h2>
              <p className="text-xs text-slate-500">
                These creators automatically appear in the auto-scrolling marquee on the public homepage.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddCreatorOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Select Creators to Feature</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-3">Spotlight Badges</th>
                  <th className="py-3 px-3">City & Category</th>
                  <th className="py-3 px-3">Followers</th>
                  <th className="py-3 px-3">Avg Views</th>
                  <th className="py-3 px-3">Rate (Reel)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trendingCreators.map((c, idx) => {
                  const isHero = heroCreator?.id === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Creator Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.avatar}
                            alt={c.displayName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">{c.displayName}</span>
                              <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">{c.handle}</span>
                          </div>
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isHero && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                              Hero Spotlight
                            </span>
                          )}
                          {c.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <Pin className="w-3 h-3 text-sky-600" />
                              Pinned #1
                            </span>
                          )}
                          {c.badge && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Sparkles className="w-2.5 h-2.5 text-rose-500" />
                              {c.badge}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* City & Category */}
                      <td className="py-3 px-3 text-slate-700">
                        <div className="font-medium">{c.city}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{c.category}</div>
                      </td>

                      {/* Followers */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {formatNumber(c.followers)}
                      </td>

                      {/* Views */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                        {formatNumber(c.medianViews)}
                      </td>

                      {/* Reel Price */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        ₹{c.pricePerReel?.toLocaleString("en-IN")}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!isHero && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHeroMutation.mutate(c.id)}
                              title="Make Hero Creator on homepage banner"
                              className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline ml-1">Set Hero</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditCreator(c)}
                            title="Edit badge and category"
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTrendingMutation.mutate(c.id)}
                            title="Remove from Trending"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Hero Spotlight Preview */}
      {activeSubTab === "hero" && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configure Main Hero Spotlight</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The Hero Creator card is the prominent interactive card rendered directly in the hero banner of mingree.com.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Choose Hero Creator</Label>
                <Select
                  value={String(heroCreator?.id || "")}
                  onValueChange={(val) => setHeroMutation.mutate(Number(val))}
                >
                  <SelectTrigger className="h-10 text-xs bg-white">
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {trendingCreators.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                        {c.displayName} ({c.handle}) - {c.city} · {formatNumber(c.followers)} followers
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="font-bold text-slate-800">Current Hero Creator Details:</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Name: <strong className="text-slate-900">{heroCreator?.displayName}</strong></div>
                  <div>Handle: <strong className="text-slate-900">{heroCreator?.handle}</strong></div>
                  <div>City: <strong className="text-slate-900">{heroCreator?.city}</strong></div>
                  <div>Tier: <strong className="text-slate-900">{heroCreator?.tier}</strong></div>
                  <div>Followers: <strong className="text-slate-900">{formatNumber(heroCreator?.followers)}</strong></div>
                  <div>Median Views: <strong className="text-slate-900">{formatNumber(heroCreator?.medianViews)}</strong></div>
                  <div>Reel Price: <strong className="text-rose-600 font-mono">₹{heroCreator?.pricePerReel}</strong></div>
                  <div>Engagement: <strong className="text-emerald-600 font-mono">{heroCreator?.engagementRate}%</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Live Preview of Hero Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-rose-50/50 to-pink-50/50 border border-rose-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
              <span>Homepage Hero Preview</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={heroCreator?.avatar}
                  alt={heroCreator?.displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-base">{heroCreator?.displayName}</span>
                    <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 font-mono font-medium">{heroCreator?.handle}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>{heroCreator?.city}</span>
                    <span>·</span>
                    <span className="text-rose-600 font-semibold">{heroCreator?.category}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Followers</div>
                  <div className="font-bold text-slate-900 font-mono">{formatNumber(heroCreator?.followers)}</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold">Avg Views</div>
                  <div className="font-bold text-slate-900 font-mono">{formatNumber(heroCreator?.medianViews)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold">Engagement</div>
                  <div className="font-bold text-emerald-600 font-mono">{heroCreator?.engagementRate}%</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Standardized Reel Rate:</span>
                <span className="text-rose-600 font-bold font-mono text-sm">₹{heroCreator?.pricePerReel}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Live Marquee Ticker Announcements */}
      {activeSubTab === "ticker" && (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live Marquee Ticker Announcements</h2>
              <p className="text-xs text-slate-500">
                These short updates scroll continuously in the dark marquee ribbon directly under the hero section.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAddTickerOpen(true)}
              className="h-8 text-xs font-bold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Announcement</span>
            </Button>
          </div>

          <div className="p-4 space-y-2.5">
            {tickerAnnouncements.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
                  item.isActive ? "bg-slate-50/70 border-slate-200" : "bg-slate-100/40 border-slate-200/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    {item.icon === "instagram" ? (
                      <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    ) : item.icon === "zap" ? (
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    ) : item.icon === "star" ? (
                      <Star className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-800 truncate">{item.text}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTicker(item.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                      item.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300"
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTicker(item.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Tab 4: Platform Fee Economics */}
      {activeSubTab === "fee" && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs max-w-2xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Marketplace Platform Fee & Take Rate</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control the transparent platform fee percentage charged per collaboration.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Platform Take Rate Percentage (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={platformFeeInput}
                  onChange={(e) => setPlatformFeeInput(parseFloat(e.target.value) || 0)}
                  className="h-10 text-sm font-mono max-w-[180px] bg-white font-bold"
                />
                <Button
                  onClick={() => updateFeeMutation.mutate(platformFeeInput)}
                  disabled={updateFeeMutation.isPending}
                  className="h-10 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5"
                >
                  {updateFeeMutation.isPending ? "Saving..." : "Save Platform Fee"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Currently set to <strong className="text-slate-900 font-bold">{platformFee}%</strong> across creator campaign bookings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Add Creator to Trending */}
      <Dialog open={addCreatorOpen} onOpenChange={setAddCreatorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Select Creator to Feature</DialogTitle>
            <DialogDescription className="text-xs">
              Search and toggle any registered creator into the Landing Page Trending showcase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Search creator name, handle, or city..."
                value={searchCreatorText}
                onChange={(e) => setSearchCreatorText(e.target.value)}
                className="pl-9 h-10 text-xs bg-slate-50"
              />
            </div>

            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 border rounded-xl">
              {filteredAvailableCreators.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-10 h-10 rounded-xl object-cover border shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs truncate">{c.name}</span>
                        {c.isInstagramVerified && <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{c.handle}</span>
                      <div className="text-[10px] text-slate-400">{c.city} · {formatNumber(c.followers)} followers</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={c.isTrending ? "outline" : "default"}
                    onClick={() => toggleTrendingMutation.mutate(c.id)}
                    className={`h-7 px-3 text-xs font-bold ${
                      c.isTrending
                        ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                        : "bg-rose-600 hover:bg-rose-700 text-white"
                    }`}
                  >
                    {c.isTrending ? "Remove" : "+ Feature"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddCreatorOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Creator Showcase Details */}
      <Dialog open={!!editCreatorDialog} onOpenChange={(open) => !open && setEditCreatorDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Creator Spotlight Details</DialogTitle>
            <DialogDescription className="text-xs">
              Customize the badge and category displayed on this creator's card.
            </DialogDescription>
          </DialogHeader>

          {editCreatorDialog && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border">
                <img
                  src={editCreatorDialog.avatar}
                  alt={editCreatorDialog.displayName}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">{editCreatorDialog.displayName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{editCreatorDialog.handle}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Spotlight Badge Text</Label>
                <Input
                  value={editBadgeText}
                  onChange={(e) => setEditBadgeText(e.target.value)}
                  placeholder="e.g. Trending #1, Viral Star"
                  className="h-9 text-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_BADGES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setEditBadgeText(b)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Display Category</Label>
                <Input
                  value={editCategoryText}
                  onChange={(e) => setEditCategoryText(e.target.value)}
                  placeholder="e.g. Fashion & Lifestyle"
                  className="h-9 text-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategoryText(cat)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditCreatorDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditCreator}
              disabled={updateCreatorMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {updateCreatorMutation.isPending ? "Saving..." : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Ticker Announcement */}
      <Dialog open={addTickerOpen} onOpenChange={setAddTickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Live Ticker Announcement</DialogTitle>
            <DialogDescription className="text-xs">
              This message will be rendered in the marquee ticker across the homepage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Announcement Text</Label>
              <Input
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                placeholder="e.g. Instant UPI Payout Disbursed in 90 Seconds"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Icon Indicator</Label>
              <Select value={tickerIcon} onValueChange={(val: any) => setTickerIcon(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check (Green)</SelectItem>
                  <SelectItem value="zap">Lightning / Speed (Amber)</SelectItem>
                  <SelectItem value="instagram">Instagram (Pink)</SelectItem>
                  <SelectItem value="star">Star / Deal (Rose)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddTickerOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddTickerItem}
              disabled={!tickerText.trim() || updateTickerMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              Add to Marquee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
