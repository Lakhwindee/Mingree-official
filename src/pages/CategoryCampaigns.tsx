import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CampaignDetailsModal } from "@/components/CampaignDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api, type ApiCampaign, type ApiReservation, type ApiCategorySubscription, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Search, CheckCircle, Clock, AlertCircle, ArrowLeft, XCircle, Lock, Star, Info, Gift, TrendingUp, Sparkles, Award, Ticket, Crown } from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { PROMOTION_CATEGORIES } from "@shared/schema";
import { TIERS } from "@shared/tiers";
import { 
  Music, 
  Heart, 
  Smartphone, 
  Utensils, 
  Gamepad2, 
  Dumbbell, 
  GraduationCap, 
  Plane, 
  Wallet, 
  ShoppingBag 
} from "lucide-react";

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

export default function CategoryCampaignsPage() {
  const params = useParams();
  const categoryId = (params as any)?.categoryId as string;
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  
  // Submit functionality moved to MyCampaigns page
  const [selectedCampaign, setSelectedCampaign] = useState<ApiCampaign | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStarGuideOpen, setIsStarGuideOpen] = useState(false);

  const category = PROMOTION_CATEGORIES.find(c => c.id === categoryId);
  const Icon = category ? iconMap[category.icon] || Music : Music;

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["categorySubscriptions", user?.id],
    queryFn: () => api.getUserCategorySubscriptions(user!.id),
    enabled: !!user?.id,
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaignsByCategory", categoryId],
    queryFn: () => api.getCampaignsByCategory(categoryId),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", user?.id],
    queryFn: () => user ? api.getUserReservations(user.id) : [],
    enabled: !!user,
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

  const joinedTiers = subscriptions
    .filter((s: ApiCategorySubscription) => s.category === categoryId)
    .map((s: ApiCategorySubscription) => s.tier);

  const getMaxJoinedTierNumber = (): number => {
    let maxTier = 0;
    joinedTiers.forEach((tierName: string) => {
      const tier = TIERS.find(t => t.name === tierName);
      if (tier && tier.id > maxTier) {
        maxTier = tier.id;
      }
    });
    return maxTier;
  };

  const maxJoinedTier = getMaxJoinedTierNumber();
  const maxTierName = TIERS.find(t => t.id === maxJoinedTier)?.name || "Tier 1";

  // Get user's tier based on their Instagram followers
  const userTier = user?.tier ? TIERS.find(t => t.name === user.tier) : null;
  const userTierId = userTier?.id || 1;

  // Helper to determine if a reservation is actively holding a campaign
  const isReservationActive = (r?: ApiReservation | null): boolean => {
    if (!r) return false;
    if (r.status === "expired" || r.status === "rejected") return false;
    if (r.status === "reserved" && r.expiresAt) {
      const isExpired = new Date(r.expiresAt).getTime() <= Date.now();
      if (isExpired) return false;
    }
    return true;
  };

  const isCampaignReservedByUser = (campaignId: number): boolean => {
    const r = reservations.find((res: ApiReservation) => res.campaignId === campaignId);
    return isReservationActive(r);
  };

  const filteredCampaigns = campaigns.filter((c: ApiCampaign) => {
    // Don't show campaigns with 0 spots remaining or currently reserved by user
    if (c.spotsRemaining <= 0) return false;
    if (isCampaignReservedByUser(c.id)) return false;
    
    const matchesSearch = searchTerm === "" || 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.brand.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Show campaigns where user's tier >= campaign tier (higher tier creators can do lower tier campaigns)
    const campaignTier = TIERS.find(t => t.name === c.tier);
    const campaignTierId = campaignTier?.id || 1;
    const matchesTier = userTierId >= campaignTierId;
    
    return matchesSearch && matchesTier;
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
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignsByCategory"] });
      setIsDetailsModalOpen(false);
      setSelectedCampaign(null);
      toast.success("Campaign reserved! Submit within 48 hours.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not reserve campaign");
    },
  });

  const handleOpenDetails = (campaign: ApiCampaign) => {
    setSelectedCampaign(campaign);
    setIsDetailsModalOpen(true);
  };

  const handleReserveFromModal = (campaign: ApiCampaign) => {
    if (!hasActiveSubscription) {
      toast.error("Upgrade Required: Aapko campaign reserve karne ke liye Pro plan par upgrade karna padega.");
      return;
    }
    reserveMutation.mutate({ campaignId: campaign.id });
  };

  const getReservationForCampaign = (campaignId: number): ApiReservation | undefined => {
    // Only return active reservations (not rejected) - rejected campaigns can be reserved again
    return reservations.find(r => r.campaignId === campaignId && r.status !== 'rejected');
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'reserved': return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1"/> Reserved</Badge>;
      case 'submitted': return <Badge className="bg-blue-500 hover:bg-blue-600"><CheckCircle className="w-3 h-3 mr-1"/> Under Review</Badge>;
      case 'approved': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> Approved</Badge>;
      default: return null;
    }
  };

  if (!category) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-6">
          <p>Category not found</p>
        </main>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />

      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/campaigns")}
            className="h-8 w-8 -ml-2 text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground truncate">{category.name}</h1>
        </div>
        {user && <NotificationDropdown userId={user.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="mx-auto max-w-6xl px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate("/campaigns")}
              className="hidden md:inline-flex mb-4 -ml-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>

            <div className="flex items-center gap-4 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">{category.name}</h1>
                <p className="text-muted-foreground">{category.description}</p>
              </div>
            </div>

            {subscriptions.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-sm px-3 py-1">
                  Tier 1 - {maxTierName} campaigns
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {filteredCampaigns.length} campaigns available
                </span>
              </div>
            )}
          </motion.div>

          <div className="mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaign or brand..."
                className="pl-9 rounded-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Star Guide Modal */}
          <Dialog open={isStarGuideOpen} onOpenChange={setIsStarGuideOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    <Star className="h-5 w-5 text-white fill-white" />
                  </div>
                  Star Rewards System
                </DialogTitle>
                <DialogDescription>
                  Complete promotional campaigns to earn stars and unlock exclusive rewards!
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {/* What are Stars */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800"
                >
                  <h4 className="font-semibold flex items-center gap-2 text-yellow-800 dark:text-yellow-300 mb-2">
                    <Award className="h-5 w-5" /> What are Stars?
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Stars are special rewards you earn by completing promotional campaigns. Unlike regular campaigns that pay cash, promotional campaigns (shown with yellow border) reward you with stars.
                  </p>
                </motion.div>

                {/* How to Earn */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-muted/50 rounded-xl p-4 border"
                >
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Gift className="h-5 w-5 text-purple-500" /> How to Earn Stars
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Reserve a promotional campaign (yellow border)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Complete and submit your content
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Get approved by admin to receive stars
                    </li>
                  </ul>
                </motion.div>

                {/* 5 Stars Reward */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800"
                >
                  <h4 className="font-semibold flex items-center gap-2 text-purple-800 dark:text-purple-300 mb-2">
                    <Crown className="h-5 w-5" /> 5 Stars = FREE Pro Subscription!
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                    When you collect 5 stars, you'll automatically receive a promo code for 1 month FREE Pro subscription!
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-purple-500">
                      <Star className="h-3 w-3 mr-1 fill-white" /> 5 Stars
                    </Badge>
                    <span className="text-purple-600">=</span>
                    <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500">
                      <Ticket className="h-3 w-3 mr-1" /> Promo Code
                    </Badge>
                    <span className="text-purple-600">=</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      1 Month FREE
                    </Badge>
                  </div>
                </motion.div>

                {/* How to Use Promo */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-muted/50 rounded-xl p-4 border"
                >
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Ticket className="h-5 w-5 text-amber-500" /> How to Use Your Promo Code
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                      Check your notifications for the promo code
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                      Go to Subscription page
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                      Enter promo code and activate your FREE month!
                    </li>
                  </ul>
                </motion.div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={() => setIsStarGuideOpen(false)} 
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white"
                >
                  Got it!
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading || !subscriptions.length ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-base">No campaigns available for your tier in this category right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {filteredCampaigns.map((campaign: ApiCampaign, i: number) => {
                const reservation = getReservationForCampaign(campaign.id);
                const status = reservation?.status || 'available';
                const isAvailable = status === 'available';
                
                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="h-full"
                  >
                    <Card 
                      className={`group relative flex flex-col h-full overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-md cursor-pointer active:scale-[0.98] ${
                        campaign.isPromotional ? 'border-amber-400/60' : ''
                      } ${!isAvailable ? 'border-green-500/50' : ''} ${!hasActiveSubscription && isAvailable ? 'opacity-90' : ''}`} 
                      onClick={() => handleOpenDetails(campaign)}
                      data-testid={`card-campaign-${campaign.id}`}
                    >
                      {/* Top Banner Image / Logo */}
                      <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-zinc-900">
                        {campaign.brandLogo ? (
                          <img 
                            src={campaign.brandLogo} 
                            alt={campaign.brand} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center">
                            <span className="text-3xl sm:text-4xl font-bold text-white/90">{campaign.brand.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                        
                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 z-10">
                          {status === 'reserved' ? (
                            <Badge className="bg-green-600/90 text-[10px] sm:text-xs py-0.5 px-1.5 shadow-xs font-semibold">
                              ✓ Reserved
                            </Badge>
                          ) : !hasActiveSubscription ? (
                            <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] py-0.5 px-1.5 font-semibold flex items-center gap-1 border-0">
                              <XCircle className="h-2.5 w-2.5 text-white" /> Upgrade Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] py-0.5 px-1.5">
                              {campaign.tier}
                            </Badge>
                          )}

                          <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] py-0.5 px-1.5 font-medium ml-auto">
                            {campaign.type}
                          </Badge>
                        </div>

                        {/* Title & Brand on Banner */}
                        <div className="absolute bottom-1.5 sm:bottom-2 left-2 right-2 z-10">
                          <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1 leading-snug drop-shadow-md">
                            {campaign.title}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-white/80 line-clamp-1">
                            {campaign.brand}
                          </p>
                        </div>

                        {/* Free Plan Upgrade Hover Banner */}
                        {!hasActiveSubscription && (
                          <div className="absolute inset-x-0 bottom-0 bg-red-600/95 text-white text-[11px] font-semibold py-1 px-2 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-md">
                            <XCircle className="h-3.5 w-3.5 text-white shrink-0" />
                            <span>Upgrade to Pro required to reserve</span>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-2 sm:p-3 flex-1 flex flex-col justify-between gap-2 bg-card">
                        {/* Payout & Reward */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          {campaign.campaignType === "product" ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-semibold">
                              <Gift className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                              Free Product
                            </Badge>
                          ) : campaign.isPromotional ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-semibold">
                              <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-500 shrink-0" />
                              {campaign.starReward || 1} Stars
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-bold">
                              {formatINR(campaign.payAmount)}
                            </Badge>
                          )}

                          <span className="text-[10px] font-medium text-foreground">
                            {campaign.spotsRemaining} spots
                          </span>
                        </div>

                        {/* Footer Deadline */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                          <span className="flex items-center gap-1 truncate">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {new Date(campaign.deadline).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </span>
                          <span className="text-primary font-medium text-[10px] group-hover:underline">
                            View details &rarr;
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <CampaignDetailsModal
        campaign={selectedCampaign}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedCampaign(null);
        }}
        onReserve={handleReserveFromModal}
        isReserving={reserveMutation.isPending}
        hasActiveSubscription={hasActiveSubscription}
      />
    </div>
    </TooltipProvider>
  );
}
