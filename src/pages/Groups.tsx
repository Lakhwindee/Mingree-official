import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api, ApiCategorySubscription } from "@/lib/api";
import { PROMOTION_CATEGORIES } from "@shared/schema";
import { TIERS, formatFollowers, getTierByFollowers } from "@shared/tiers";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;



export default function Groups() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [loadingGroup, setLoadingGroup] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
    staleTime: 0,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["categorySubscriptions", user?.id],
    queryFn: () => api.getUserCategorySubscriptions(user!.id),
    enabled: !!user?.id,
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ category, tier }: { category: string; tier: string }) =>
      api.subscribeToCategoryGroup(user!.id, category, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySubscriptions"] });
      toast.success("Group joined successfully!");
      setLoadingGroup(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLoadingGroup(null);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: ({ category, tier }: { category: string; tier: string }) =>
      api.unsubscribeFromCategoryGroup(user!.id, category, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorySubscriptions"] });
      toast.success("Left group successfully!");
      setLoadingGroup(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLoadingGroup(null);
    },
  });

  const getUserTierId = (): number => {
    if (user?.followers && user.followers >= 500) {
      const calculatedTier = getTierByFollowers(user.followers);
      if (calculatedTier) return calculatedTier.id;
    }
    if (!user?.tier) return 1;
    const tier = TIERS.find(t => t.name === user.tier);
    return tier?.id || 1;
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      
      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">Campaign Groups</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground whitespace-nowrap">Tier Groups</span>
        </div>
        {user && <NotificationDropdown userId={user.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="w-full max-w-5xl mx-auto px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-page-title">Category Groups</h1>
                <Badge variant="outline" className="text-xs font-semibold">
                  Fixed Price Model
                </Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Join groups for your category and tier to access guaranteed fixed-payout campaigns.
              </p>
            </div>
            <Button
              onClick={() => navigate("/campaigns")}
              className="text-xs self-start md:self-center"
            >
              Browse Fixed Price Ads
            </Button>
          </div>

          <div className="mb-6 rounded-lg bg-muted/40 p-4 border border-border">
            <p className="font-semibold text-sm text-foreground">You have joined {subscriptions.length} category groups</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You can now claim matching fixed-payout campaigns in the Fixed Price Ads tab.
            </p>
          </div>

          {user?.instagramUsername && user?.followers && user.followers >= 500 && (
            <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4" data-testid="tier-info-banner">
              <p className="font-semibold text-xs sm:text-sm text-foreground">
                Your Current Audience Tier: {TIERS.find(t => t.id === getUserTierId())?.name || "Starter"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can reserve campaigns matching your audience tier and all accessible tiers below.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {PROMOTION_CATEGORIES.map((category) => {
              const subCount = getSubscriptionCount(category.id);
              
              return (
                <Accordion key={category.id} type="single" collapsible>
                  <AccordionItem value={category.id} className="border rounded-lg overflow-hidden bg-card">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30" data-testid={`accordion-${category.id}`}>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{category.name}</span>
                          {subCount > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {subCount} joined
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
                        {TIERS.map((tier) => {
                          const subscribed = isSubscribed(category.id, tier.name);
                          const groupKey = `${category.id}-${tier.name}`;
                          const isLoading = loadingGroup === groupKey;
                          const eligible = canJoinTier(tier.id);
                          
                          return (
                            <Card 
                              key={tier.name} 
                              className={`transition-all ${subscribed ? "border-foreground bg-muted/20" : ""} ${!eligible && !subscribed ? "opacity-60" : ""}`}
                              data-testid={`card-group-${category.id}-${tier.id}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-xs text-foreground">{tier.name}</span>
                                      {subscribed && (
                                        <span className="text-[10px] text-foreground font-semibold px-1 py-0.2 bg-muted rounded">Joined</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {formatFollowers(tier.minFollowers)} - {formatFollowers(tier.maxFollowers)}
                                    </p>
                                  </div>
                                  {eligible || subscribed ? (
                                    <Button
                                      size="sm"
                                      variant={subscribed ? "outline" : "default"}
                                      disabled={isLoading}
                                      onClick={() => handleToggleSubscription(category.id, tier.name, tier.id)}
                                      className="text-xs h-8"
                                      data-testid={`button-toggle-${category.id}-${tier.id}`}
                                    >
                                      {isLoading ? "..." : subscribed ? "Leave" : "Join"}
                                    </Button>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled
                                            className="text-xs h-8"
                                            data-testid={`button-locked-${category.id}-${tier.id}`}
                                          >
                                            Locked
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Requires {formatFollowers(tier.minFollowers)}+ followers</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
