import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CampaignDetailsModal } from "@/components/CampaignDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api, type ApiCampaign, type ApiReservation, type ApiCategorySubscription, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { PROMOTION_CATEGORIES } from "@shared/schema";
import { TIERS } from "@shared/tiers";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Star = __DummyIcon;
const User = __DummyIcon;



export default function CategoryCampaignsPage() {
  const params = useParams();
  const categoryId = (params as any)?.categoryId as string;
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  
  const [selectedCampaign, setSelectedCampaign] = useState<ApiCampaign | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStarGuideOpen, setIsStarGuideOpen] = useState(false);

  const category = PROMOTION_CATEGORIES.find(c => c.id === categoryId);

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

  const hasActiveSubscription = true;

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
  const maxTierName = TIERS.find(t => t.id === maxJoinedTier)?.name || "Starter";

  const userTier = user?.tier ? TIERS.find(t => t.name === user.tier) : null;
  const userTierId = userTier?.id || 1;

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
    if (c.spotsRemaining <= 0) return false;
    if (isCampaignReservedByUser(c.id)) return false;
    
    const matchesSearch = searchTerm === "" || 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.brand.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    return reservations.find(r => r.campaignId === campaignId && r.status !== "rejected");
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
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/campaigns")}
            className="h-8 px-2 -ml-2 text-foreground text-xs"
          >
            Back
          </Button>
          <h1 className="text-base font-bold text-foreground truncate">{category.name}</h1>
        </div>
        {user && <NotificationDropdown userId={user.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="mx-auto max-w-6xl px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/campaigns")}
              className="hidden md:inline-flex mb-4 -ml-2 text-xs font-semibold"
              data-testid="button-back"
            >
              Back to Campaigns
            </Button>

            <div className="mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-page-title">{category.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
            </div>

            {subscriptions.length > 0 && (
              <div className="mt-3 flex items-center gap-2.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
                  Starter to {maxTierName}
                </span>
                <span>&bull;</span>
                <span>
                  {filteredCampaigns.length} campaigns available
                </span>
              </div>
            )}
          </div>

          <div className="mb-5">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search campaign or brand..."
                className="h-9 text-xs rounded-lg"
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
                <DialogTitle className="text-lg font-bold">
                  Star Rewards System
                </DialogTitle>
                <DialogDescription>
                  Complete promotional campaigns to earn stars and unlock exclusive rewards.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4 text-xs">
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-foreground mb-1">
                    What are Stars?
                  </h4>
                  <p className="text-muted-foreground">
                    Stars are special rewards you earn by completing promotional campaigns. Unlike regular campaigns that pay cash, promotional campaigns reward you with stars.
                  </p>
                </div>

                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-foreground mb-2">
                    How to Earn Stars
                  </h4>
                  <ul className="text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Reserve a promotional campaign</li>
                    <li>Complete and submit your content</li>
                    <li>Get approved by admin to receive stars</li>
                  </ul>
                </div>

                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold text-foreground mb-1">
                    5 Stars = FREE Pro Subscription
                  </h4>
                  <p className="text-muted-foreground mb-2">
                    When you collect 5 stars, you will automatically receive a promo code for 1 month FREE Pro subscription.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">5 Stars</Badge>
                    <span>=</span>
                    <Badge variant="outline">Promo Code</Badge>
                    <span>=</span>
                    <Badge variant="secondary">1 Month FREE</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={() => setIsStarGuideOpen(false)} 
                  className="w-full"
                >
                  Got it
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading || !subscriptions.length ? (
            <div className="flex items-center justify-center py-20 text-xs text-muted-foreground">
              Loading campaigns...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-base">No campaigns available for your tier in this category right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {filteredCampaigns.map((campaign: ApiCampaign) => {
                const reservation = getReservationForCampaign(campaign.id);
                const status = reservation?.status || "available";
                
                return (
                  <Card 
                    key={campaign.id}
                    className="group relative flex flex-col h-full overflow-hidden rounded-lg border border-border/80 bg-card hover:border-border transition-all cursor-pointer"
                    onClick={() => handleOpenDetails(campaign)}
                    data-testid={`card-campaign-${campaign.id}`}
                  >
                    <div className="p-3.5 bg-muted/40 border-b border-border flex flex-col justify-between min-h-[90px]">
                      <div className="flex items-center justify-between gap-1">
                        {status === "reserved" ? (
                          <span className="bg-foreground text-background text-[10px] font-semibold py-0.5 px-2 rounded">
                            Reserved
                          </span>
                        ) : (
                          <span className="bg-muted text-foreground text-[10px] py-0.5 px-1.5 rounded font-medium border border-border">
                            {campaign.tier}
                          </span>
                        )}

                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {campaign.type}
                        </span>
                      </div>

                      <div className="mt-2">
                        <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1">
                          {campaign.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5 font-medium">
                          {campaign.brand}
                        </p>
                      </div>
                    </div>

                    <CardContent className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5 bg-card">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        {campaign.campaignType === "product" ? (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Free Product
                          </span>
                        ) : campaign.isPromotional ? (
                          <span className="text-xs font-bold text-foreground tabular-nums">
                            {campaign.starReward || 1} Stars
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums">
                            {formatINR(campaign.payAmount)}
                          </span>
                        )}

                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {campaign.spotsRemaining} spots
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                        <span className="truncate">
                          Due {new Date(campaign.deadline).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                        </span>
                        <span className="text-foreground font-semibold text-xs">
                          Details
                        </span>
                      </div>
                    </CardContent>
                  </Card>
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
