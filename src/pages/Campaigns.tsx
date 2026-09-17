import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiCategorySubscription, type ApiCampaign, type ApiReservation, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Users, ChevronRight, X, Lock, Clock, Building2, Gift, Globe, Star, AtSign, MapPin, 
  IndianRupee, Sparkles, FileDown, Download, Film, Smartphone, Image as ImageIcon, 
  LayoutGrid, Share2, Video, CheckCircle, AlertTriangle, ArrowRight, Package, XCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { PROMOTION_CATEGORIES } from "@shared/schema";
import { TIERS, formatFollowers, getTierByFollowers } from "@shared/tiers";
import { COUNTRIES, getCountryByCode } from "@shared/countries";
import { getCitiesByCountry } from "@shared/cities";
import { 
  Music, 
  Heart, 
  Utensils, 
  Gamepad2, 
  Dumbbell, 
  GraduationCap, 
  Plane, 
  Wallet, 
  ShoppingBag 
} from "lucide-react";
import { useState, useMemo } from "react";

const iconMap: Record<string, React.ElementType> = {
  music: Music,
  heart: Heart,
  smartphone: Smartphone,
  utensils: Utensils,
  "gamepad-2": Gamepad2,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  plane: Plane,
  wallet: Wallet,
  "shopping-bag": ShoppingBag,
};

const PROMOTION_STYLE_LABELS: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  lyricals: { label: "Lyricals / Page Promotion", icon: Music, description: "Use provided content/audio only" },
  face_ad: { label: "Face on Camera", icon: Video, description: "Appear in video for the ad" },
  share_only: { label: "Direct Share", icon: Share2, description: "Share sponsor's provided file" },
};

const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  reel: { label: "Reel", icon: Film },
  story: { label: "Story", icon: Smartphone },
  post: { label: "Post", icon: ImageIcon },
  carousel: { label: "Carousel", icon: LayoutGrid },
};

interface CampaignGroup {
  title: string;
  brand: string;
  brandLogo: string;
  campaigns: ApiCampaign[];
  totalSpots: number;
  deadline: string;
  description: string;
  campaignType: string;
  mentions: string[];
}

export default function Campaigns() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all-campaigns");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");

  // Modal State for viewing full details popup
  const [selectedGroup, setSelectedGroup] = useState<CampaignGroup | null>(null);
  const [selectedTierCampaign, setSelectedTierCampaign] = useState<ApiCampaign | null>(null);
  const [hasDownloadedAsset, setHasDownloadedAsset] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => api.getSubscription(user!.id),
    enabled: !!user?.id,
  });
  const hasActiveSubscription = Boolean(
    subscription?.isActive && 
    subscription?.plan && 
    subscription.plan !== "free" &&
    user?.subscriptionPlan !== "free"
  );

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["categorySubscriptions", user?.id],
    queryFn: () => api.getUserCategorySubscriptions(user!.id),
    enabled: !!user?.id,
  });

  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["allCampaigns", countryFilter, cityFilter],
    queryFn: () => api.getCampaigns(
      countryFilter && countryFilter !== "all" ? countryFilter : undefined,
      cityFilter && cityFilter !== "all" ? cityFilter : undefined
    ),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", user?.id],
    queryFn: () => user ? api.getUserReservations(user.id) : [],
    enabled: !!user?.id,
  });

  const reserveMutation = useMutation({
    mutationFn: ({ campaignId }: { campaignId: number }) => {
      if (!user) throw new Error("User not found");
      if (!hasActiveSubscription) {
        throw new Error("Upgrade Required: Aapko campaign reserve karne ke liye Pro plan par upgrade karna padega.");
      }
      return api.reserveCampaign(user.id, campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSelectedGroup(null);
      setSelectedTierCampaign(null);
      toast.success("Campaign reserved successfully! Submit your content within 48 hours.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not reserve campaign");
    },
  });

  // Helper to determine if a reservation is actively holding a campaign
  const isReservationActive = (r?: ApiReservation | null): boolean => {
    if (!r) return false;
    if (r.status === "expired" || r.status === "rejected") return false;
    if (r.status === "reserved" && !r.submittedAt) {
      if (!hasActiveSubscription) return false;
      const isExpired = r.expiresAt ? new Date(r.expiresAt).getTime() <= Date.now() : false;
      if (isExpired) return false; // Time passed without submission -> spot is freed
    }
    return true; // Active reserved (within time), submitted, or approved
  };

  const isAlreadyReserved = (campaignId: number): boolean => {
    const r = reservations.find((res: ApiReservation) => res.campaignId === campaignId);
    return isReservationActive(r);
  };

  const getReservationForCampaign = (campaignId: number): ApiReservation | undefined => {
    return reservations.find((r: ApiReservation) => r.campaignId === campaignId && r.status !== 'rejected');
  };

  const joinedCategories = Array.from(new Set(subscriptions.map((s: ApiCategorySubscription) => s.category)));

  const getCategoryDetails = (categoryId: string) => {
    return PROMOTION_CATEGORIES.find(c => c.id === categoryId);
  };

  const getJoinedTiersForCategory = (categoryId: string): string[] => {
    return subscriptions
      .filter((s: ApiCategorySubscription) => s.category === categoryId)
      .map((s: ApiCategorySubscription) => s.tier);
  };

  const getMaxTierForCategory = (categoryId: string): string => {
    const tiers = getJoinedTiersForCategory(categoryId);
    let maxTierId = 0;
    let maxTierName = "";
    tiers.forEach(tierName => {
      const tier = TIERS.find(t => t.name === tierName);
      if (tier && tier.id > maxTierId) {
        maxTierId = tier.id;
        maxTierName = tierName;
      }
    });
    return maxTierName;
  };

  const getUserTierId = (): number => {
    if (user?.followers && user.followers >= 500) {
      const calculatedTier = getTierByFollowers(user.followers);
      if (calculatedTier) return calculatedTier.id;
    }
    if (!user?.tier) return 1;
    const tier = TIERS.find(t => t.name === user.tier);
    return tier?.id || 1;
  };

  const getLowestCampaignTierId = (tierString: string): number => {
    const tierNames = tierString.split(",").map(t => t.trim());
    let lowestId = 20;
    tierNames.forEach(name => {
      const tier = TIERS.find(t => t.name === name);
      if (tier && tier.id < lowestId) {
        lowestId = tier.id;
      }
    });
    return lowestId;
  };

  const isCampaignLocked = (campaign: ApiCampaign): boolean => {
    const userTierId = getUserTierId();
    const lowestCampaignTierId = getLowestCampaignTierId(campaign.tier);
    return lowestCampaignTierId > userTierId;
  };

  // Filter out campaigns that the user currently has actively reserved.
  // They only show in My Campaigns, unless the submission window expires or reservation is released.
  const activeCampaigns = allCampaigns.filter((c: ApiCampaign) => {
    if (c.status !== "active" || c.spotsRemaining <= 0) return false;
    if (isAlreadyReserved(c.id)) return false;
    return true;
  });

  const getBaseTitle = (title: string) => {
    return title.replace(/\s*\(Tier\s*\d+\)\s*$/i, '').trim();
  };

  const campaignGroups = useMemo(() => {
    const groups: Map<string, CampaignGroup> = new Map();
    
    activeCampaigns.forEach((campaign: ApiCampaign) => {
      const baseTitle = getBaseTitle(campaign.title);
      
      if (!groups.has(baseTitle)) {
        groups.set(baseTitle, {
          title: baseTitle,
          brand: campaign.brand,
          brandLogo: campaign.brandLogo,
          campaigns: [],
          totalSpots: 0,
          deadline: campaign.deadline,
          description: campaign.description,
          campaignType: campaign.campaignType || "cash",
          mentions: campaign.mentions || [],
        });
      }
      
      const group = groups.get(baseTitle)!;
      group.campaigns.push(campaign);
      group.totalSpots += campaign.spotsRemaining;
    });

    groups.forEach(group => {
      group.campaigns.sort((a, b) => {
        const tierA = parseInt(a.tier.replace(/\D/g, '')) || 0;
        const tierB = parseInt(b.tier.replace(/\D/g, '')) || 0;
        return tierA - tierB;
      });
    });

    return Array.from(groups.values());
  }, [activeCampaigns]);

  const getBestCampaignForUser = (group: CampaignGroup): ApiCampaign | null => {
    const userTierId = getUserTierId();
    const accessibleCampaigns = group.campaigns.filter(c => {
      const campaignTierId = getLowestCampaignTierId(c.tier);
      return campaignTierId <= userTierId;
    });
    if (accessibleCampaigns.length === 0) return group.campaigns[0] || null;
    return accessibleCampaigns[accessibleCampaigns.length - 1];
  };

  const isAnyReservedInGroup = (group: CampaignGroup): boolean => {
    return group.campaigns.some(c => isAlreadyReserved(c.id));
  };

  const isGroupLocked = (group: CampaignGroup): boolean => {
    return group.campaigns.every(c => isCampaignLocked(c));
  };

  const getAccessibleCampaigns = (group: CampaignGroup): ApiCampaign[] => {
    return group.campaigns.filter(c => !isCampaignLocked(c));
  };

  const handleOpenGroupDetails = (group: CampaignGroup) => {
    const best = getBestCampaignForUser(group);
    setSelectedGroup(group);
    setSelectedTierCampaign(best || group.campaigns[0]);
    setHasDownloadedAsset(false);
  };

  const handleDownloadAsset = (url: string, fileName?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "campaign-asset";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setHasDownloadedAsset(true);
    toast.success("Asset downloaded successfully!");
  };

  const activeTargetCampaign = selectedTierCampaign || (selectedGroup ? selectedGroup.campaigns[0] : null);
  const activeReservation = activeTargetCampaign ? getReservationForCampaign(activeTargetCampaign.id) : undefined;
  const isTargetLocked = activeTargetCampaign ? isCampaignLocked(activeTargetCampaign) : false;
  const isTargetReserved = !!activeReservation;
  const requiresDownload = !!activeTargetCampaign?.assetUrl;
  const canReserveActiveTarget = !requiresDownload || hasDownloadedAsset;

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
        <Sidebar />

        {/* Mobile Sticky Top Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">Campaigns</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">Grid</span>
          </div>
          {user && <NotificationDropdown userId={user.id} />}
        </header>

        <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          <div className="w-full max-w-6xl mx-auto px-3 py-3.5 sm:px-6 sm:py-6 overflow-x-hidden box-border">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3.5 sm:mb-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="hidden md:block">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">Campaigns</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Browse and discover promotional campaigns in a compact grid view. Click any card for full details.</p>
                </div>
                
                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Select
                        value={countryFilter}
                        onValueChange={(val) => {
                          setCountryFilter(val);
                          setCityFilter("");
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[140px] text-xs h-8 sm:h-9" data-testid="select-country-filter">
                          <div className="flex items-center gap-1.5 truncate">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="All Countries" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all">All Countries</SelectItem>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Select
                        value={cityFilter}
                        onValueChange={setCityFilter}
                      >
                        <SelectTrigger className="w-full sm:w-[140px] text-xs h-8 sm:h-9" data-testid="select-city-filter">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="All Cities" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all">All Cities</SelectItem>
                          {(countryFilter && countryFilter !== "all"
                            ? getCitiesByCountry(countryFilter)
                            : Array.from(new Set(
                                allCampaigns
                                  .flatMap((c: any) => c.targetCities || [])
                                  .filter(Boolean)
                              )).sort()
                          ).map((cityName: string) => (
                            <SelectItem key={cityName} value={cityName}>
                              {cityName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(countryFilter && countryFilter !== "all" || cityFilter && cityFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCountryFilter("");
                        setCityFilter("");
                      }}
                      className="h-8 px-2 text-xs text-muted-foreground self-end sm:self-center"
                      data-testid="button-clear-filter"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-5 h-9 sm:h-10 p-1 bg-muted/70 rounded-xl">
                <TabsTrigger value="all-campaigns" className="rounded-lg text-xs sm:text-sm font-semibold" data-testid="tab-all-campaigns">All Campaigns</TabsTrigger>
                <TabsTrigger value="my-campaigns" className="rounded-lg text-xs sm:text-sm font-semibold" data-testid="tab-my-campaigns">My Groups & Categories</TabsTrigger>
              </TabsList>

              <TabsContent value="all-campaigns">
                {user?.instagramUsername && user?.tier ? (
                  <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-2.5 sm:p-3.5 border border-amber-500/20 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="truncate">
                        <span className="font-semibold text-foreground">Tier: {user.tier}</span> ({formatFollowers(TIERS.find(t => t.name === user.tier)?.minFollowers || 500)}+ followers)
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                      Click any card for full details
                    </span>
                  </div>
                ) : (
                  <div className="mb-3 sm:mb-4 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-2.5 sm:p-3.5 border border-blue-500/20 text-xs sm:text-sm">
                    <Lock className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">Connect Instagram to view eligible tiers</span>
                    </div>
                  </div>
                )}

                {campaignGroups.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-5">
                      <Building2 className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-1">No campaigns available</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                      Check back later or adjust your country/city filters
                    </p>
                  </motion.div>
                ) : (
                  /* Responsive Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {campaignGroups.map((group, index: number) => {
                      const isLocked = isGroupLocked(group);
                      const isReserved = isAnyReservedInGroup(group);
                      const bestCampaign = getBestCampaignForUser(group);
                      const lowestTier = group.campaigns[0];
                      const lowestTierInfo = TIERS.find(t => t.name === lowestTier?.tier);
                      
                      const allPromotional = group.campaigns.every(c => c.isPromotional);
                      
                      const payments = group.campaigns.map(c => parseFloat(c.payAmount));
                      const minPay = Math.min(...payments);
                      const maxPay = Math.max(...payments);
                      const paymentDisplay = minPay === maxPay 
                        ? formatINR(minPay.toString()) 
                        : `${formatINR(minPay.toString())} - ${formatINR(maxPay.toString())}`;
                      
                      const starRewards = group.campaigns.filter(c => c.isPromotional).map(c => c.starReward || 1);
                      const minStars = starRewards.length > 0 ? Math.min(...starRewards) : 0;
                      const maxStars = starRewards.length > 0 ? Math.max(...starRewards) : 0;
                      const starDisplay = minStars === maxStars 
                        ? `${minStars} Star${minStars !== 1 ? 's' : ''}` 
                        : `${minStars}-${maxStars} Stars`;
                      
                      return (
                        <motion.div
                          key={group.title}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="h-full"
                        >
                          <Card 
                            className={`group relative flex flex-col h-full overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-md cursor-pointer active:scale-[0.98] ${
                              isReserved ? 'border-green-500/50 dark:border-green-500/40' : ''
                            } ${isLocked ? 'opacity-90' : ''}`}
                            onClick={() => handleOpenGroupDetails(group)}
                            data-testid={`card-campaign-grid-${index}`}
                          >
                            {/* Card Banner */}
                            <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-zinc-900">
                              {group.brandLogo ? (
                                <img 
                                  src={group.brandLogo} 
                                  alt={group.brand} 
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center">
                                  <span className="text-3xl sm:text-4xl font-bold text-white/90">{group.brand.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                              
                              {/* Top status badges */}
                              <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 z-10">
                                {isReserved ? (
                                  <Badge className="bg-green-600/90 hover:bg-green-600 text-[10px] sm:text-xs py-0.5 px-1.5 sm:px-2 shadow-xs backdrop-blur-xs font-semibold">
                                    ✓ Reserved
                                  </Badge>
                                ) : isLocked ? (
                                  <Badge variant="destructive" className="text-[10px] sm:text-xs py-0.5 px-1.5 sm:px-2 shadow-xs font-semibold">
                                    <Lock className="h-2.5 w-2.5 mr-1" /> Locked
                                  </Badge>
                                ) : !hasActiveSubscription ? (
                                  <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] sm:text-xs py-0.5 px-1.5 sm:px-2 shadow-xs font-semibold flex items-center gap-1 border-0">
                                    <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white shrink-0" /> Upgrade Required
                                  </Badge>
                                ) : (
                                  <span />
                                )}

                                <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] py-0.5 px-1.5 font-medium ml-auto">
                                  {group.campaigns.length} {group.campaigns.length === 1 ? 'tier' : 'tiers'}
                                </Badge>
                              </div>

                              {/* Free Plan Upgrade Required Hover Banner */}
                              {!hasActiveSubscription && (
                                <div className="absolute inset-x-0 bottom-0 bg-red-600/95 text-white text-[11px] font-semibold py-1.5 px-2 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-md">
                                  <XCircle className="h-3.5 w-3.5 text-white shrink-0" />
                                  <span>Upgrade to Pro required to reserve</span>
                                </div>
                              )}

                              {/* Title & Brand overlay at bottom of banner */}
                              <div className="absolute bottom-1.5 sm:bottom-2 left-2 right-2 z-10">
                                <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1 leading-snug drop-shadow-md">
                                  {group.title}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-white/80 line-clamp-1">
                                  {group.brand}
                                </p>
                              </div>
                            </div>

                            {/* Card Body */}
                            <CardContent className="p-2 sm:p-3 flex-1 flex flex-col justify-between gap-2 bg-card">
                              {/* Payout and Tier Pills */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                {group.campaignType === "product" ? (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-semibold">
                                    <Gift className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                                    Free Product
                                  </Badge>
                                ) : allPromotional ? (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-semibold">
                                    <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-500 shrink-0" />
                                    {starDisplay}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-bold">
                                    {bestCampaign && !isLocked ? formatINR(bestCampaign.payAmount) : paymentDisplay}
                                  </Badge>
                                )}

                                {bestCampaign && !isLocked ? (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground border-border/80">
                                    {bestCampaign.tier}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground border-border/80">
                                    {lowestTier?.tier || "Tier 1"}
                                  </Badge>
                                )}
                              </div>

                              {/* Footer metrics: Deadline & spots */}
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                                <span className="flex items-center gap-1 truncate">
                                  <Clock className="h-2.5 w-2.5 shrink-0" />
                                  {new Date(group.deadline).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </span>
                                <span className="font-medium text-foreground whitespace-nowrap">
                                  {group.totalSpots} spots
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-campaigns">
                {joinedCategories.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-5">
                      <Users className="h-10 w-10 text-purple-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-1">No groups joined yet</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-md">
                      Go to the Groups page to join categories for your tier, then your targeted campaigns will appear here.
                    </p>
                    <Button 
                      onClick={() => navigate('/groups')}
                      className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs sm:text-sm"
                      data-testid="button-go-to-groups"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Browse Groups
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3 border border-purple-500/20">
                      <div className="flex items-center gap-2.5">
                        <Users className="h-5 w-5 text-purple-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-xs sm:text-sm">{joinedCategories.length} Categories Joined</p>
                          <p className="text-[11px] text-muted-foreground">
                            Click any category card to view its active campaigns
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate('/groups')}
                        className="h-7 text-xs rounded-full shrink-0"
                      >
                        Manage Groups
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                      {joinedCategories.map((categoryId, index) => {
                        const category = getCategoryDetails(categoryId);
                        if (!category) return null;
                        
                        const Icon = iconMap[category.icon] || Music;
                        const maxTier = getMaxTierForCategory(categoryId);
                        
                        return (
                          <motion.div
                            key={categoryId}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Card 
                              className="cursor-pointer transition-all hover:shadow-md hover:border-purple-400/60 active:scale-[0.98] rounded-xl sm:rounded-2xl border-border/80 overflow-hidden"
                              onClick={() => navigate(`/campaigns/${categoryId}`)}
                              data-testid={`card-category-${categoryId}`}
                            >
                              <CardContent className="p-3 sm:p-4 flex flex-col justify-between h-full min-h-[120px]">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xs">
                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                  </div>
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 text-[10px] px-1.5 py-0.5">
                                    {maxTier || "Tier 1"}
                                  </Badge>
                                </div>
                                
                                <div className="mt-2">
                                  <h3 className="font-bold text-xs sm:text-sm truncate">{category.name}</h3>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{category.description}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* ================= RICH POPUP MODAL (CAMPAIGN DETAILS) ================= */}
        <Dialog open={!!selectedGroup} onOpenChange={(open) => {
          if (!open) {
            setSelectedGroup(null);
            setSelectedTierCampaign(null);
            setHasDownloadedAsset(false);
          }
        }}>
          <DialogContent className="max-w-xl max-h-[92vh] p-0 overflow-hidden rounded-2xl border-border shadow-2xl">
            {selectedGroup && activeTargetCampaign && (
              <div className="flex flex-col max-h-[92vh]">
                {/* Modal Header Banner */}
                <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-zinc-900 shrink-0">
                  {selectedGroup.brandLogo ? (
                    <img 
                      src={selectedGroup.brandLogo} 
                      alt={selectedGroup.brand} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white/90">{selectedGroup.brand.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                  
                  {/* Floating Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-0 text-xs px-2.5 py-1">
                      {selectedGroup.brand}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {isTargetReserved ? (
                        <Badge className="bg-green-600 text-white font-semibold text-xs shadow-md">
                          ✓ Reserved
                        </Badge>
                      ) : isTargetLocked ? (
                        <Badge variant="destructive" className="font-semibold text-xs shadow-md">
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white font-semibold text-xs shadow-md">
                          Eligible
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Title Info */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <DialogTitle className="text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-md">
                      {selectedGroup.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-white/80 mt-0.5">
                      Campaign by <span className="font-medium text-white">{selectedGroup.brand}</span>
                    </DialogDescription>
                  </div>
                </div>

                {/* Modal Body Scroll Area */}
                <ScrollArea className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">
                  <div className="space-y-4">
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Reward / Payout */}
                      {selectedGroup.campaignType === "product" ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 p-2.5 text-center">
                          <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1" />
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Reward</span>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">Free Product</span>
                        </div>
                      ) : activeTargetCampaign.isPromotional ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-2.5 text-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mb-1" />
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Reward</span>
                          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                            {activeTargetCampaign.starReward || 1} ⭐ Stars
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 p-2.5 text-center">
                          <IndianRupee className="h-4 w-4 text-green-600 dark:text-green-400 mb-1" />
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Payout</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatINR(activeTargetCampaign.payAmount)}
                          </span>
                        </div>
                      )}

                      {/* Spots */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-center">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1" />
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Spots Left</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {activeTargetCampaign.spotsRemaining} / {activeTargetCampaign.totalSpots}
                        </span>
                      </div>

                      {/* Tier / Min Followers */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 p-2.5 text-center">
                        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1" />
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Required Tier</span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {activeTargetCampaign.tier}
                        </span>
                      </div>

                      {/* Deadline */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5 text-center">
                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 mb-1" />
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Deadline</span>
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {new Date(activeTargetCampaign.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Multi-Tier Selector if group has multiple tiers */}
                    {selectedGroup.campaigns.length > 1 && (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" /> Available Tiers ({selectedGroup.campaigns.length})
                          </h4>
                          <span className="text-[10px] text-muted-foreground">Select to view payout</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGroup.campaigns.map((c) => {
                            const isSelected = selectedTierCampaign?.id === c.id;
                            const isLockedTier = isCampaignLocked(c);
                            const tierReserved = isAlreadyReserved(c.id);

                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedTierCampaign(c)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : isLockedTier
                                    ? "bg-muted text-muted-foreground/70 border border-transparent"
                                    : "bg-background border border-border hover:border-primary/40"
                                }`}
                              >
                                <span>{c.tier}</span>
                                <span className="text-[10px] opacity-80">
                                  ({c.isPromotional ? `${c.starReward || 1}⭐` : formatINR(c.payAmount)})
                                </span>
                                {tierReserved && <span className="text-[10px] text-green-400">✓</span>}
                                {isLockedTier && <Lock className="h-2.5 w-2.5 opacity-60" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Content Format & Style */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Deliverables & Format
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeTargetCampaign.contentTypes || activeTargetCampaign.type.split(", ")).map((type: string) => {
                          const typeLower = type.toLowerCase().trim();
                          const contentType = CONTENT_TYPE_LABELS[typeLower];
                          const IconComponent = contentType?.icon || Film;
                          return (
                            <Badge key={type} variant="outline" className="text-xs py-1 px-2.5 bg-background gap-1.5">
                              <IconComponent className="h-3.5 w-3.5 text-primary" />
                              {contentType?.label || type}
                            </Badge>
                          );
                        })}

                        {activeTargetCampaign.promotionStyle && PROMOTION_STYLE_LABELS[activeTargetCampaign.promotionStyle] && (
                          <Badge variant="secondary" className="text-xs py-1 px-2.5 gap-1.5 bg-primary/10 text-primary">
                            {(() => {
                              const style = PROMOTION_STYLE_LABELS[activeTargetCampaign.promotionStyle!];
                              const StyleIcon = style.icon;
                              return (
                                <>
                                  <StyleIcon className="h-3.5 w-3.5" />
                                  {style.label}
                                </>
                              );
                            })()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Required Mentions / Tags */}
                    {selectedGroup.mentions && selectedGroup.mentions.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <AtSign className="h-3 w-3" /> Mandatory Mentions
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGroup.mentions.map((mention, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs py-1 px-2 bg-primary/5 text-primary border-primary/20 font-medium cursor-pointer hover:bg-primary/10"
                              onClick={() => {
                                navigator.clipboard.writeText(`@${mention}`);
                                toast.success(`Copied @${mention}`);
                              }}
                            >
                              @{mention}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Product Details (if Product Campaign) */}
                    {activeTargetCampaign.campaignType === "product" && activeTargetCampaign.productName && (
                      <div className="space-y-2 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-3">
                        <h4 className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                          <Package className="h-4 w-4" /> Free Product Package
                        </h4>
                        <div className="flex items-start gap-3">
                          {activeTargetCampaign.productImage && (
                            <img 
                              src={activeTargetCampaign.productImage} 
                              alt={activeTargetCampaign.productName} 
                              className="w-14 h-14 rounded-lg object-cover border" 
                            />
                          )}
                          <div>
                            <p className="font-semibold text-sm">{activeTargetCampaign.productName}</p>
                            {activeTargetCampaign.productValue && (
                              <p className="text-xs text-muted-foreground">Worth: {formatINR(activeTargetCampaign.productValue)}</p>
                            )}
                            {activeTargetCampaign.productDescription && (
                              <p className="text-xs text-muted-foreground mt-1">{activeTargetCampaign.productDescription}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Brief & Instructions */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Campaign Brief & Instructions
                      </h4>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/30 rounded-xl p-3 border border-border/60">
                        {activeTargetCampaign.description || selectedGroup.description}
                      </p>
                    </div>

                    {/* Content Assets Download if provided */}
                    {activeTargetCampaign.assetUrl && (
                      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Download className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{activeTargetCampaign.assetFileName || "Campaign Media Asset"}</p>
                            <p className="text-[10px] text-muted-foreground">Provided by sponsor for direct use</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={hasDownloadedAsset ? "outline" : "default"}
                          onClick={() => handleDownloadAsset(activeTargetCampaign.assetUrl!, activeTargetCampaign.assetFileName)}
                          className="h-8 text-xs shrink-0 rounded-full"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {hasDownloadedAsset ? "Downloaded ✓" : "Download File"}
                        </Button>
                      </div>
                    )}

                    {/* 48-Hour Reservation Info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>Once reserved, you get <strong>48 hours</strong> to post and submit proof in My Campaigns.</span>
                    </div>

                    {!hasActiveSubscription && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <div>
                          <span className="font-semibold block">Upgrade Required</span>
                          <span className="text-red-600/85 dark:text-red-300/85">
                            Aapko campaign reserve karne ke liye Pro plan par upgrade karna padega.
                          </span>
                        </div>
                      </div>
                    )}

                  </div>
                </ScrollArea>

                {/* Modal Footer Actions */}
                <div className="p-3.5 sm:p-4 border-t border-border bg-background/95 backdrop-blur-md flex flex-col gap-2 shrink-0">
                  {requiresDownload && !hasDownloadedAsset && !isTargetReserved && !isTargetLocked && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Please download the campaign asset above before reserving.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    {isTargetReserved ? (
                      <Button
                        className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold h-10"
                        onClick={() => {
                          setSelectedGroup(null);
                          navigate("/my-campaigns");
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Already Reserved — View in My Campaigns
                      </Button>
                    ) : isTargetLocked ? (
                      <Button
                        disabled
                        variant="secondary"
                        className="flex-1 rounded-xl opacity-60 cursor-not-allowed text-xs sm:text-sm font-semibold h-10"
                      >
                        <Lock className="h-3.5 w-3.5 mr-1.5" />
                        Requires {activeTargetCampaign.tier}+ Followers
                      </Button>
                    ) : !hasActiveSubscription ? (
                      <Button
                        className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold h-10 shadow-md flex items-center justify-center gap-1.5"
                        onClick={() => {
                          setSelectedGroup(null);
                          navigate("/subscription");
                        }}
                      >
                        <XCircle className="h-4 w-4 shrink-0" />
                        Upgrade to Pro to Reserve
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 rounded-xl bg-insta-gradient hover:opacity-90 text-white text-xs sm:text-sm font-semibold h-10 shadow-md"
                        disabled={reserveMutation.isPending || activeTargetCampaign.spotsRemaining <= 0 || !canReserveActiveTarget}
                        onClick={() => reserveMutation.mutate({ campaignId: activeTargetCampaign.id })}
                        data-testid="button-modal-reserve-action"
                      >
                        {reserveMutation.isPending ? (
                          "Reserving Campaign..."
                        ) : activeTargetCampaign.spotsRemaining <= 0 ? (
                          "No Spots Remaining"
                        ) : !canReserveActiveTarget ? (
                          "Download File First"
                        ) : (
                          <>
                            Reserve This Campaign ({activeTargetCampaign.isPromotional ? `${activeTargetCampaign.starReward || 1} ⭐` : formatINR(activeTargetCampaign.payAmount)})
                            <ArrowRight className="h-4 w-4 ml-1.5" />
                          </>
                        )}
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      className="rounded-xl h-10 px-4 text-xs font-semibold"
                      onClick={() => {
                        setSelectedGroup(null);
                        setSelectedTierCampaign(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>

              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}

