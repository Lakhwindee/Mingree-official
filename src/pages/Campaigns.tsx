import { copyToClipboard } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";

import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiCategorySubscription, type ApiCampaign, type ApiReservation, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocation } from "wouter";
import { PROMOTION_CATEGORIES } from "@shared/schema";
import { TIERS, formatFollowers, getTierByFollowers } from "@shared/tiers";
import { COUNTRIES, getCountryByCode } from "@shared/countries";
import { getCitiesByCountry } from "@shared/cities";
import { useState, useMemo } from "react";

// Dummy icon fallbacks for removed icons
const __DummyIcon = (_props?: any) => null;
const Instagram = __DummyIcon;
const Camera = __DummyIcon;
const Send = __DummyIcon;
const Info = __DummyIcon;
const File = __DummyIcon;
const Check = __DummyIcon;
const User = __DummyIcon;



const PROMOTION_STYLE_LABELS: Record<string, { label: string; description: string }> = {
  lyricals: { label: "Lyricals / Page Promotion", description: "Use provided content/audio only" },
  face_ad: { label: "Face on Camera", description: "Appear in video for the ad" },
  share_only: { label: "Direct Share", description: "Share sponsor's provided file" },
};

const CONTENT_TYPE_LABELS: Record<string, { label: string }> = {
  reel: { label: "Reel" },
  story: { label: "Story" },
  post: { label: "Post" },
  carousel: { label: "Carousel" },
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
  songUrl?: string;
  audioUrl?: string;
  requiredTags?: string[];
  requiredCaptionNote?: string;
  targetCities?: string[];
  targetCountries?: string[];
  assetUrl?: string;
  assetFileName?: string;
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
  const [customQuotePrice, setCustomQuotePrice] = useState("");

  const applyQuoteMutation = useMutation({
    mutationFn: ({ campaignId, quotedPrice }: { campaignId: number; quotedPrice: number }) => {
      if (!user) throw new Error("User not found");
      return api.applyWithQuote(campaignId, quotedPrice);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSelectedGroup(null);
      setSelectedTierCampaign(null);
      setCustomQuotePrice("");
      toast.success("Custom quote proposal submitted successfully! Workspace opened.");
      navigate(`/campaigns/${variables.campaignId}/workspace`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit custom quote proposal");
    },
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const [loadingGroup, setLoadingGroup] = useState<string | null>(null);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["categorySubscriptions", user?.id],
    queryFn: () => (user?.id ? api.getUserCategorySubscriptions(user.id) : []),
    enabled: !!user?.id,
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ category, tier }: { category: string; tier: string }) => {
      if (!user) throw new Error("Please log in first");
      return api.subscribeToCategoryGroup(user.id, category, tier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySubscriptions"] });
      toast.success("Joined category group successfully!");
      setLoadingGroup(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to join group");
      setLoadingGroup(null);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: ({ category, tier }: { category: string; tier: string }) => {
      if (!user) throw new Error("Please log in first");
      return api.unsubscribeFromCategoryGroup(user.id, category, tier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySubscriptions"] });
      toast.success("Left category group");
      setLoadingGroup(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to leave group");
      setLoadingGroup(null);
    },
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
      return api.applyOrReserveSlot(campaignId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["creatorCampaignWorkspaces"] });
      setSelectedGroup(null);
      setSelectedTierCampaign(null);
      toast.success(data.message || "Slot confirmed! Opening My Campaigns...");
      navigate("/my-campaigns");
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

  const getLowestCampaignTierId = (tierString?: string | null): number => {
    if (!tierString || typeof tierString !== 'string') return 1;
    const tierNames = tierString.split(",").map(t => t.trim());
    let lowestId = 20;
    tierNames.forEach(name => {
      const tier = TIERS.find(t => t.name === name);
      if (tier && tier.id < lowestId) {
        lowestId = tier.id;
      }
    });
    return lowestId === 20 ? 1 : lowestId;
  };

  const isCampaignLocked = (campaign?: ApiCampaign | null): boolean => {
    if (!campaign) return false;
    const userTierId = getUserTierId();
    const lowestCampaignTierId = getLowestCampaignTierId(campaign.tier);
    return lowestCampaignTierId > userTierId;
  };

  const canJoinTier = (tierId: number): boolean => {
    const userTierId = getUserTierId();
    return tierId <= userTierId;
  };

  const isSubscribed = (category: string, tier: string): boolean => {
    return subscriptions.some(
      (sub: ApiCategorySubscription) => sub.category === category && sub.tier === tier
    );
  };

  const isInstagramConnected = !!user?.instagramUsername;

  const handleToggleSubscription = (category: string, tierName: string, tierId: number) => {
    const groupKey = `${category}-${tierName}`;
    
    if (isSubscribed(category, tierName)) {
      setLoadingGroup(groupKey);
      unsubscribeMutation.mutate({ category, tier: tierName });
    } else {
      if (!isInstagramConnected) {
        toast.error("Please connect your Instagram account first from Profile page");
        return;
      }
      if (!canJoinTier(tierId)) {
        const tier = TIERS.find(t => t.id === tierId);
        toast.error(`You need ${tier ? formatFollowers(tier.minFollowers) : tierName}+ followers to join this group`);
        return;
      }
      setLoadingGroup(groupKey);
      subscribeMutation.mutate({ category, tier: tierName });
    }
  };

  const getSubscriptionCount = (category: string): number => {
    return subscriptions.filter((sub: ApiCategorySubscription) => sub.category === category).length;
  };

  // Filter out campaigns that the user currently has actively reserved.
  // They only show in My Campaigns, unless the submission window expires or reservation is released.
  const activeCampaigns = allCampaigns.filter((c: ApiCampaign) => {
    if (c.status !== "published" && c.status !== "filling_slots" && c.status !== "in_progress" || c.spotsRemaining <= 0) return false;
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
          mentions: campaign.mentions || (campaign as any).requiredMentions || [],
          songUrl: (campaign as any).songUrl || (campaign as any).audioUrl,
          audioUrl: (campaign as any).audioUrl || (campaign as any).songUrl,
          requiredTags: (campaign as any).requiredTags || (campaign as any).hashtags || [],
          requiredCaptionNote: (campaign as any).requiredCaptionNote || (campaign as any).disclosureInstructions,
          targetCities: campaign.targetCities || [],
          targetCountries: campaign.targetCountries || [],
          assetUrl: campaign.assetUrl,
          assetFileName: campaign.assetFileName,
        });
      }
      
      const group = groups.get(baseTitle);
      if (group) {
        group.campaigns.push(campaign);
        group.totalSpots += campaign.spotsRemaining;
      }
    });

    groups.forEach(group => {
      group.campaigns.sort((a, b) => {
        const strA = typeof a?.tier === 'string' ? a.tier : String(a?.tier || '');
        const strB = typeof b?.tier === 'string' ? b.tier : String(b?.tier || '');
        const tierA = parseInt(strA.replace(/\D/g, '')) || 0;
        const tierB = parseInt(strB.replace(/\D/g, '')) || 0;
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
  const requiresDownload = true;
  const canReserveActiveTarget = hasDownloadedAsset;

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
        <Sidebar />

        {/* Mobile Sticky Top Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">Fixed Price Campaigns</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">Tier Model</span>
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
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">Fixed Price Campaigns</h1>
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold">
                      Tier-Based Model
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Join category groups matching your follower tier to unlock guaranteed fixed-payout promotional ads.
                  </p>
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
                          <SelectValue placeholder="All Countries" />
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
                          <SelectValue placeholder="All Cities" />
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
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3 sm:mb-5 h-9 sm:h-10 p-1 bg-muted/70 rounded-xl">
                <TabsTrigger value="all-campaigns" className="rounded-lg text-xs sm:text-sm font-semibold" data-testid="tab-all-campaigns">
                  Fixed Price Ads
                </TabsTrigger>
                <TabsTrigger value="join-groups" className="rounded-lg text-xs sm:text-sm font-semibold" data-testid="tab-join-groups">
                  Join Groups {subscriptions.length > 0 && `(${subscriptions.length})`}
                </TabsTrigger>
                <TabsTrigger value="my-campaigns" className="rounded-lg text-xs sm:text-sm font-semibold" data-testid="tab-my-campaigns">
                  Joined Categories {joinedCategories.length > 0 && `(${joinedCategories.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all-campaigns">
                {user?.instagramUsername && user?.tier ? (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-foreground font-semibold shrink-0 border border-border/60">
                        {user.tier.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground">Tier: {user.tier}</span>
                        <span className="text-muted-foreground ml-1.5">
                          ({formatFollowers(TIERS.find(t => t.name === user.tier)?.minFollowers || 500)}+ followers verified)
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                      Click any card to reserve your slot
                    </span>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 sm:p-4 text-xs sm:text-sm">
                    <div>
                      <span className="font-medium text-foreground">Connect Instagram in Profile to sync audience tier</span>
                    </div>
                  </div>
                )}

                {campaignGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-card/40">
                    <h2 className="text-base font-bold mb-1 text-foreground">No campaigns available</h2>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Check back soon or adjust your country and city filters above
                    </p>
                  </div>
                ) : (
                  /* Responsive Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {campaignGroups.map((group, index: number) => {
                      const isLocked = isGroupLocked(group);
                      const isReserved = isAnyReservedInGroup(group);
                      const bestCampaign = getBestCampaignForUser(group);
                      const lowestTier = group.campaigns[0];
                      
                      const allPromotional = group.campaigns.every(c => c.isPromotional);
                      
                      const payments = group.campaigns.map(c => parseFloat(c.payAmount));
                      const minPay = Math.min(...payments);
                      const maxPay = Math.max(...payments);
                      const paymentDisplay = minPay === maxPay 
                        ? formatINR(minPay.toString()) 
                        : `${formatINR(minPay.toString())} - ${formatINR(maxPay.toString())}`;
                      
                      return (
                        <motion.div
                          key={group.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="h-full"
                        >
                          <Card 
                            className={`group relative flex flex-col h-full overflow-hidden rounded-xl border border-border/80 bg-card hover:border-border transition-all duration-150 hover:shadow-xs cursor-pointer active:scale-[0.99] ${
                              isReserved ? 'ring-1 ring-emerald-500/40 border-emerald-500/40' : ''
                            } ${isLocked ? 'opacity-85' : ''}`}
                            onClick={() => handleOpenGroupDetails(group)}
                            data-testid={`card-campaign-grid-${index}`}
                          >
                            {/* Card Header (Pure Typographic Precision) */}
                            <div className="p-3.5 border-b border-border/70 flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-1 mb-2">
                                {isReserved ? (
                                  <span className="bg-emerald-600 text-white text-[10px] font-semibold py-0.5 px-2 rounded">
                                    Reserved
                                  </span>
                                ) : isLocked ? (
                                  <span className="bg-muted text-muted-foreground text-[10px] font-medium py-0.5 px-1.5 rounded border border-border">
                                    Locked
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Fixed Ad
                                  </span>
                                )}

                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {group.campaigns.length} {group.campaigns.length === 1 ? 'tier' : 'tiers'}
                                </span>
                              </div>

                              <div>
                                <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 leading-snug">
                                  {group.title}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {group.brand}
                                </p>
                              </div>
                            </div>

                            {/* Card Body */}
                            <CardContent className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5 bg-card">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums">
                                  {bestCampaign && !isLocked ? formatINR(bestCampaign.payAmount) : paymentDisplay}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {bestCampaign?.tier || lowestTier?.tier || "Starter"}
                                </span>
                              </div>

                              {/* Footer metadata: Deadline & spots */}
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                                <span className="truncate">
                                  Due {new Date(group.deadline).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="font-medium text-foreground whitespace-nowrap tabular-nums">
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

              <TabsContent value="join-groups" className="space-y-4">
                {/* Follower Tier Status Banner */}
                {user?.instagramUsername && user?.followers && user.followers >= 500 ? (
                  <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs" data-testid="tier-info-banner">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground font-bold text-sm border border-border/60">
                          {(TIERS.find(t => t.id === getUserTierId())?.name || "Starter").slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm sm:text-base">
                              @{user.instagramUsername}
                            </span>
                            <span className="text-[11px] font-semibold text-foreground bg-muted px-2 py-0.5 rounded border border-border/50">
                              {TIERS.find(t => t.id === getUserTierId())?.name || "Starter"} Tier
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Audience: <strong className="text-foreground tabular-nums">{user.followers?.toLocaleString()} followers</strong> &bull; Eligible for groups up to {TIERS.find(t => t.id === getUserTierId())?.name} tier
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("all-campaigns")}
                        className="rounded-xl bg-primary text-primary-foreground text-xs h-8.5 px-4 self-start sm:self-center shadow-xs"
                      >
                        Browse Fixed Ads
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 bg-card p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Connect Instagram to Sync Tier</p>
                      <p className="text-xs text-muted-foreground">Go to Profile to link your creator account and sync your verified follower tier.</p>
                    </div>
                  </div>
                )}

                {/* Category Groups Accordion */}
                <div className="space-y-3">
                  {PROMOTION_CATEGORIES.map((category, index) => {
                    const subCount = getSubscriptionCount(category.id);

                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Accordion type="single" collapsible>
                          <AccordionItem value={category.id} className="border border-border/80 rounded-xl overflow-hidden bg-card">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors" data-testid={`accordion-${category.id}`}>
                              <div className="flex items-center gap-3 text-left min-w-0 flex-1 pr-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm sm:text-base text-foreground">{category.name}</span>
                                    {subCount > 0 ? (
                                      <span className="inline-flex items-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        {subCount} Tier{subCount > 1 ? "s" : ""} Joined
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground">
                                        Not Joined
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{category.description}</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-2 border-t border-border/40 bg-muted/20">
                              <p className="text-xs font-medium text-muted-foreground mb-3">
                                Available audience tiers for {category.name} promotions:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {TIERS.map((tier) => {
                                  const eligible = canJoinTier(tier.id);
                                  const subscribed = isSubscribed(category.id, tier.name);
                                  const groupKey = `${category.id}-${tier.name}`;
                                  const isLoading = loadingGroup === groupKey;

                                  return (
                                    <div
                                      key={tier.id}
                                      className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                                        subscribed
                                          ? "border-emerald-500/50 bg-emerald-500/5"
                                          : eligible
                                          ? "border-border/80 bg-card hover:border-border"
                                          : "border-border/40 bg-muted/40 opacity-70"
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1.5 mb-1">
                                          <span className="font-semibold text-xs text-foreground">{tier.name}</span>
                                          {subscribed ? (
                                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Joined</span>
                                          ) : eligible ? (
                                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Eligible</span>
                                          ) : (
                                            <span className="text-[10px] text-muted-foreground">Locked</span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                          {formatFollowers(tier.minFollowers)}+ followers
                                        </p>
                                      </div>

                                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-muted-foreground tabular-nums">
                                          Payout ~{formatINR((tier.id * 800).toString())}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant={subscribed ? "outline" : eligible ? "default" : "secondary"}
                                          disabled={!eligible || isLoading}
                                          onClick={() => handleToggleSubscription(category.id, tier.name, tier.id)}
                                          className={`h-7 px-3 text-xs font-semibold rounded-lg shrink-0 ${
                                            subscribed 
                                              ? "hover:bg-destructive/10 hover:text-destructive border-border"
                                              : eligible 
                                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                              : ""
                                          }`}
                                          data-testid={`button-toggle-${category.id}-${tier.name}`}
                                        >
                                          {isLoading ? (
                                            "Updating..."
                                          ) : subscribed ? (
                                            "Leave"
                                          ) : eligible ? (
                                            "Join Group"
                                          ) : (
                                            "Locked"
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="my-campaigns">
                {joinedCategories.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-card/40"
                  >
                    <h2 className="text-base font-bold mb-1 text-foreground">No groups joined yet</h2>
                    <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                      Join category groups for your tier in the "Join Groups" tab to unlock targeted campaigns.
                    </p>
                    <Button 
                      onClick={() => setActiveTab("join-groups")}
                      className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold h-8.5 px-4 shadow-xs"
                      data-testid="button-go-to-groups"
                    >
                      Browse & Join Groups
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4">
                      <div>
                        <p className="font-semibold text-xs sm:text-sm text-foreground">{joinedCategories.length} Categories Joined</p>
                        <p className="text-[11px] text-muted-foreground">
                          Click any category card to view its active campaigns
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setActiveTab("join-groups")}
                        className="h-8 text-xs font-semibold rounded-lg shrink-0"
                      >
                        Manage Groups
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                      {joinedCategories.map((categoryId, index) => {
                        const category = getCategoryDetails(categoryId);
                        if (!category) return null;
                        
                        const maxTier = getMaxTierForCategory(categoryId);
                        
                        return (
                          <motion.div
                            key={categoryId}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Card 
                              className="cursor-pointer transition-all hover:border-border active:scale-[0.99] rounded-xl border border-border/80 bg-card hover:shadow-xs overflow-hidden"
                              onClick={() => navigate(`/campaigns/${categoryId}`)}
                              data-testid={`card-category-${categoryId}`}
                            >
                              <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full min-h-[100px]">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Category</span>
                                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    {maxTier || "Starter"}
                                  </span>
                                </div>
                                
                                <div className="mt-3">
                                  <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">{category.name}</h3>
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
                {/* Modal Header (Pure Typographic Precision) */}
                <div className="p-4 sm:p-5 border-b border-border/80 bg-card shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                      {selectedGroup.brand}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isTargetReserved ? (
                        <span className="bg-emerald-600 text-white font-semibold text-xs py-0.5 px-2.5 rounded">
                          Reserved
                        </span>
                      ) : isTargetLocked ? (
                        <span className="bg-muted text-muted-foreground font-medium text-xs py-0.5 px-2 rounded border border-border">
                          Locked
                        </span>
                      ) : (
                        <span className="bg-muted text-foreground font-semibold text-xs py-0.5 px-2 rounded border border-border/60">
                          Eligible
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-tight">
                      {selectedGroup.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Campaign by <span className="font-medium text-foreground">{selectedGroup.brand}</span>
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
                        <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/80 p-3 text-center">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Reward</span>
                          <span className="text-xs sm:text-sm font-bold text-foreground mt-1">Free Product</span>
                        </div>
                      ) : activeTargetCampaign.isPromotional ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/80 p-3 text-center">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Reward</span>
                          <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums">
                            {activeTargetCampaign.starReward || 1} Stars
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/80 p-3 text-center">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Payout</span>
                          <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums">
                            {formatINR(activeTargetCampaign.payAmount)}
                          </span>
                        </div>
                      )}

                      {/* Spots */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/80 p-3 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Spots Left</span>
                        <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums">
                          {(() => {
                            const rem = activeTargetCampaign.spotsRemaining ?? (activeTargetCampaign as any).remainingSlots ?? Math.max(0, (activeTargetCampaign.totalSpots ?? (activeTargetCampaign as any).totalSlots ?? 10) - ((activeTargetCampaign as any).spotsFilled || 0));
                            const tot = activeTargetCampaign.totalSpots ?? (activeTargetCampaign as any).totalSlots ?? 10;
                            return `${rem} / ${tot}`;
                          })()}
                        </span>
                      </div>

                      {/* Tier / Min Followers */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/80 p-3 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Required Tier</span>
                        <span className="text-xs sm:text-sm font-bold text-foreground mt-1">
                          {(() => {
                            if (activeTargetCampaign.tier) return activeTargetCampaign.tier;
                            if ((activeTargetCampaign as any).tierLabel) return (activeTargetCampaign as any).tierLabel;
                            if (activeTargetCampaign.minFollowers) {
                              const calculated = getTierByFollowers(activeTargetCampaign.minFollowers);
                              if (calculated) return calculated.name;
                            }
                            return "All Tiers";
                          })()}
                        </span>
                      </div>

                      {/* Deadline */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/80 p-3 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Deadline</span>
                        <span className="text-xs sm:text-sm font-bold text-foreground mt-1 tabular-nums">
                          {activeTargetCampaign.deadline ? new Date(activeTargetCampaign.deadline).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : 'Flexible'}
                        </span>
                      </div>
                    </div>

                    {/* Multi-Tier Selector if group has multiple tiers */}
                    {selectedGroup.campaigns.length > 1 && (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            Available Tiers ({selectedGroup.campaigns.length})
                          </h4>
                          <span className="text-[10px] text-muted-foreground">Select tier to preview payout</span>
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
                                    : "bg-background border border-border hover:border-border"
                                }`}
                              >
                                <span>{c.tier || (c as any).tierLabel || "Tier"}</span>
                                <span className="text-[10px] opacity-80 tabular-nums">
                                  ({c.isPromotional ? `${c.starReward || 1} Stars` : formatINR(c.payAmount)})
                                </span>
                                {tierReserved && <span className="text-[10px] text-emerald-500 font-bold ml-1">Reserved</span>}
                                {isLockedTier && <span className="text-[10px] opacity-60 ml-1">Locked</span>}
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
                        {(activeTargetCampaign.contentTypes || (activeTargetCampaign.type ? activeTargetCampaign.type.split(", ") : ["Reel"])).map((type: string) => {
                          const typeLower = type.toLowerCase().trim();
                          const contentType = CONTENT_TYPE_LABELS[typeLower];
                          return (
                            <span key={type} className="inline-flex items-center text-xs py-1 px-2.5 rounded-lg bg-muted text-foreground border border-border/60 font-medium">
                              {contentType?.label || type}
                            </span>
                          );
                        })}

                        {activeTargetCampaign.promotionStyle && PROMOTION_STYLE_LABELS[activeTargetCampaign.promotionStyle] && (
                          <span className="inline-flex items-center text-xs py-1 px-2.5 rounded-lg bg-muted text-foreground border border-border/60 font-medium">
                            {PROMOTION_STYLE_LABELS[activeTargetCampaign.promotionStyle].label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Official Song Track / Audio Link if provided */}
                    {(() => {
                      const songTrack = (activeTargetCampaign as any).songUrl || (activeTargetCampaign as any).audioUrl || selectedGroup.songUrl || selectedGroup.audioUrl;
                      if (!songTrack) return null;
                      return (
                        <div className="space-y-1.5 rounded-xl border border-border/80 bg-card p-3">
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Official Track / Audio Link
                          </h4>
                          <p className="text-xs text-muted-foreground">Sponsor requires using this official audio for the Reel/Video:</p>
                          <div className="flex items-center gap-2 mt-1.5 bg-muted/50 p-2 rounded-lg border border-border/50">
                            <span className="text-xs font-mono text-foreground truncate flex-1">{songTrack}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2.5 shrink-0 rounded-md cursor-pointer"
                              onClick={async () => {
                                await copyToClipboard(songTrack);
                                toast.success("Audio link copied!");
                              }}
                            >
                              Copy
                            </Button>
                            <a
                              href={songTrack}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-7 text-[11px] px-2.5 bg-primary text-primary-foreground font-semibold rounded-md shrink-0 hover:bg-primary/90"
                            >
                              Listen
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Required Mentions & Hashtags */}
                    {(() => {
                      const mentionsList = Array.from(new Set([...(selectedGroup.mentions || []), ...((activeTargetCampaign.mentions as string[]) || []), ...((activeTargetCampaign as any).requiredMentions || [])])).filter(Boolean);
                      const tagsList = Array.from(new Set([...(selectedGroup.requiredTags || []), ...((activeTargetCampaign as any).requiredTags || []), ...((activeTargetCampaign as any).hashtags || [])])).filter(Boolean);

                      if (mentionsList.length === 0 && tagsList.length === 0) return null;

                      return (
                        <div className="space-y-2.5 rounded-xl border border-border/80 bg-card p-3">
                          {mentionsList.length > 0 && (
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Mandatory Mentions
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {mentionsList.map((mention, idx) => {
                                  const cleanMention = mention.startsWith('@') ? mention : `@${mention}`;
                                  return (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center text-xs py-1 px-2.5 rounded-lg bg-muted text-foreground border border-border/60 font-semibold cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                                      onClick={async () => {
                                        await copyToClipboard(cleanMention);
                                        toast.success(`Copied ${cleanMention}`);
                                      }}
                                    >
                                      {cleanMention}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {tagsList.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Mandatory Hashtags
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {tagsList.map((tag, idx) => {
                                  const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
                                  return (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center text-xs py-1 px-2.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-semibold cursor-pointer hover:bg-purple-500/20 transition-colors"
                                      onClick={async () => {
                                        await copyToClipboard(cleanTag);
                                        toast.success(`Copied ${cleanTag}`);
                                      }}
                                    >
                                      {cleanTag}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Target Locations & Cities */}
                    {(() => {
                      const cities = selectedGroup.targetCities || activeTargetCampaign.targetCities || [];
                      const countries = selectedGroup.targetCountries || activeTargetCampaign.targetCountries || [];
                      if (cities.length === 0 && countries.length === 0) return null;

                      return (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Target Location
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {countries.map((c, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-muted font-medium text-foreground border border-border/60">
                                {getCountryByCode(c)?.name || c}
                              </span>
                            ))}
                            {cities.map((city, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-muted/80 font-medium text-foreground border border-border/60">
                                {city}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Product Details (if Product Campaign) */}
                    {activeTargetCampaign.campaignType === "product" && activeTargetCampaign.productName && (
                      <div className="space-y-2 rounded-xl border border-border/80 bg-card p-3">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Free Product Package
                        </h4>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{activeTargetCampaign.productName}</p>
                          {activeTargetCampaign.productValue && (
                            <p className="text-xs text-muted-foreground tabular-nums mt-0.5">Worth: {formatINR(activeTargetCampaign.productValue)}</p>
                          )}
                          {activeTargetCampaign.productDescription && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activeTargetCampaign.productDescription}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Brief & Instructions */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Campaign Brief & Instructions
                      </h4>
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-muted/30 rounded-xl p-3 border border-border/60 whitespace-pre-line">
                        {activeTargetCampaign.description || selectedGroup.description}
                      </p>
                    </div>

                    {/* Mandatory Disclosure / Caption Instructions */}
                    {(() => {
                      const captionNote = (activeTargetCampaign as any).requiredCaptionNote || selectedGroup.requiredCaptionNote || (activeTargetCampaign as any).disclosureInstructions;
                      if (!captionNote) return null;

                      return (
                        <div className="space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                            Caption & Disclosure Requirements
                          </h4>
                          <p className="text-xs text-foreground leading-relaxed">{captionNote}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2.5 mt-1 border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-md cursor-pointer"
                            onClick={async () => {
                              await copyToClipboard(captionNote);
                              toast.success("Caption requirements copied!");
                            }}
                          >
                            Copy Instruction Text
                          </Button>
                        </div>
                      );
                    })()}

                    {/* Mandatory Content Assets Download */}
                    {(() => {
                      const assetUrl = activeTargetCampaign.assetUrl || (activeTargetCampaign as any).fileUrl || selectedGroup.assetUrl || (selectedGroup as any).fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800";
                      const assetName = activeTargetCampaign.assetFileName || selectedGroup.assetFileName || `${selectedGroup.brand}_Brand_Assets.zip`;

                      return (
                        <div className={`rounded-xl border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          hasDownloadedAsset 
                            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10" 
                            : "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        }`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-bold text-foreground">{assetName}</span>
                              {hasDownloadedAsset ? (
                                <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  Downloaded & Unlocked
                                </span>
                              ) : (
                                <span className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  Required Download
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {hasDownloadedAsset 
                                ? "Asset downloaded. You can now reserve this campaign." 
                                : "You must download this sponsor asset file (Audio/Video/Guidelines) to enable the Reserve button."}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant={hasDownloadedAsset ? "outline" : "default"}
                            onClick={() => handleDownloadAsset(assetUrl, assetName)}
                            className={`h-9 text-xs font-semibold shrink-0 rounded-lg cursor-pointer shadow-xs ${
                              hasDownloadedAsset 
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" 
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {hasDownloadedAsset ? "Download Again" : "Download Required File"}
                          </Button>
                        </div>
                      );
                    })()}

                    {/* 48-Hour Reservation Info */}
                    <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span>Once reserved, you have <strong>48 hours</strong> to publish and submit link proof.</span>
                    </div>

                  </div>
                </ScrollArea>



                {/* Modal Footer Actions */}
                <div className="p-3.5 sm:p-4 border-t border-border/80 bg-card flex flex-col gap-2 shrink-0">
                  {!hasDownloadedAsset && !isTargetReserved && !isTargetLocked && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-500/20 text-center">
                      <span>Mandatory Step: Click <strong>"Download Required File"</strong> above to unlock the Reserve button.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    {isTargetReserved ? (
                      <Button
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold h-10 shadow-xs"
                        onClick={() => {
                          setSelectedGroup(null);
                          navigate("/my-campaigns");
                        }}
                      >
                        Already Reserved — View in Workspace
                      </Button>
                    ) : isTargetLocked ? (
                      <Button
                        disabled
                        variant="secondary"
                        className="flex-1 rounded-xl opacity-60 cursor-not-allowed text-xs sm:text-sm font-semibold h-10"
                      >
                        Requires {activeTargetCampaign.tier}+ Followers
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-semibold h-10 shadow-xs cursor-pointer"
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
                          `Reserve This Campaign (${activeTargetCampaign.isPromotional ? `${activeTargetCampaign.starReward || 1} Stars` : formatINR(activeTargetCampaign.payAmount)})`
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

