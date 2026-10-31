import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;
const Save = __DummyIcon;



export default function CreatorRequests() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<"deals" | "rate-card">("deals");
  const [filterTab, setFilterTab] = useState<string>("all");

  // Rate Card State
  const [reelPrice, setReelPrice] = useState("2500");
  const [storyPrice, setStoryPrice] = useState("800");
  const [collabPrice, setCollabPrice] = useState("5000");
  const [bioLinkPrice, setBioLinkPrice] = useState("1200");
  const [isSavingRates, setIsSavingRates] = useState(false);

  // Load existing rate cards
  useEffect(() => {
    if (user?.id) {
      api.getRateCards(user.id).then((cards) => {
        if (Array.isArray(cards)) {
          cards.forEach((c) => {
            if (c.deliverableType === "Instagram Reel") setReelPrice(String(c.price));
            if (c.deliverableType === "Instagram Story") setStoryPrice(String(c.price));
            if (c.deliverableType === "Collab Package") setCollabPrice(String(c.price));
            if (c.deliverableType === "Bio Link & Story") setBioLinkPrice(String(c.price));
          });
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  const handleSaveRateCard = async () => {
    if (!user) return;
    setIsSavingRates(true);
    try {
      await api.saveRateCards(user.id, [
        { deliverableType: "Instagram Reel", price: parseFloat(reelPrice) || 2500 },
        { deliverableType: "Instagram Story", price: parseFloat(storyPrice) || 800 },
        { deliverableType: "Collab Package", price: parseFloat(collabPrice) || 5000 },
        { deliverableType: "Bio Link & Story", price: parseFloat(bioLinkPrice) || 1200 },
      ]);
      toast.success("Rate card saved successfully! Brands will use these rates for direct deals.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save rate card");
    } finally {
      setIsSavingRates(false);
    }
  };

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["creatorWorkspaces", user?.id],
    queryFn: () => (user ? api.getCreatorWorkspaces(user.id) : []),
    enabled: !!user,
    refetchInterval: 4000,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: (campaignId: number) => api.acceptCampaignInvitation(campaignId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(data.message || "Ad slot reserved! You now have 48 hours to submit your Reel.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reserve ad slot");
    },
  });

  const pendingRequests = workspaces.filter(
    (ws: any) => ws.status === "invited" || ws.status === "applied" || ws.status === "pending"
  );
  const activeDeals = workspaces.filter(
    (ws: any) => ws.status === "reserved" || ws.status === "in_progress" || ws.status === "submitted"
  );
  const completedDeals = workspaces.filter(
    (ws: any) => ws.status === "approved" || ws.status === "completed"
  );

  const filteredWorkspaces = workspaces.filter((ws: any) => {
    if (filterTab === "pending") return ws.status === "invited" || ws.status === "applied" || ws.status === "pending";
    if (filterTab === "active") return ws.status === "reserved" || ws.status === "in_progress" || ws.status === "submitted";
    if (filterTab === "completed") return ws.status === "approved" || ws.status === "completed";
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 pt-14 md:pt-0 pb-8 overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-between border-b bg-background/95 px-4 md:px-6 backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight truncate">Direct Brand Deals</h1>
              <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                Direct Model
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Manage custom sponsorship requests, brand collaboration invites, and your direct rate card
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {user && <NotificationDropdown userId={user.id} />}
          </div>
        </header>

        <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
          {/* Main Sub-Navigation: Deals vs Rate Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={mainTab === "deals" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainTab("deals")}
                className={cn(
                  "text-xs rounded-xl font-semibold h-9 px-4 transition-all",
                  mainTab === "deals" ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted"
                )}
                data-testid="tab-brand-deals"
              >
                Deals and Requests {pendingRequests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-primary-foreground/20 rounded-full text-[10px]">
                    {pendingRequests.length}
                  </span>
                )}
              </Button>
              <Button
                variant={mainTab === "rate-card" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainTab("rate-card")}
                className={cn(
                  "text-xs rounded-xl font-semibold h-9 px-4 transition-all",
                  mainTab === "rate-card" ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted"
                )}
                data-testid="tab-my-rate-card"
              >
                My Rate Card
              </Button>
            </div>

            <p className="text-xs text-muted-foreground hidden sm:block">
              {mainTab === "deals" 
                ? "Direct collaboration requests received from sponsors" 
                : "Your standard direct booking rates for brands"}
            </p>
          </div>

          {/* ================= TAB 1: DEALS & REQUESTS ================= */}
          {mainTab === "deals" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border border-border/80 shadow-xs">
                  <CardContent className="p-3.5 sm:p-4">
                    <span className="text-xs font-medium text-muted-foreground">All Direct Deals</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{workspaces.length}</p>
                    <span className="text-[11px] text-muted-foreground">Lifetime direct invites</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardContent className="p-3.5 sm:p-4">
                    <span className="text-xs font-medium text-muted-foreground">Pending Requests</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{pendingRequests.length}</p>
                    <span className="text-[11px] text-muted-foreground">Awaiting your response</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardContent className="p-3.5 sm:p-4">
                    <span className="text-xs font-medium text-muted-foreground">In Progress</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{activeDeals.length}</p>
                    <span className="text-[11px] text-muted-foreground">Active content delivery</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardContent className="p-3.5 sm:p-4">
                    <span className="text-xs font-medium text-muted-foreground">Completed Deals</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{completedDeals.length}</p>
                    <span className="text-[11px] text-muted-foreground">Delivered and finalized</span>
                  </CardContent>
                </Card>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
                  <TabsList className="bg-muted/70 p-1 rounded-xl h-9 sm:h-10">
                    <TabsTrigger value="all" className="text-xs rounded-lg font-medium">
                      All ({workspaces.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs rounded-lg font-medium">
                      Incoming ({pendingRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-xs rounded-lg font-medium">
                      In Progress ({activeDeals.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs rounded-lg font-medium">
                      Completed ({completedDeals.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <Card className="border-dashed border bg-card/40">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <h3 className="text-base font-semibold text-foreground">
                      {filterTab === "pending"
                        ? "No Pending Brand Requests"
                        : filterTab === "active"
                        ? "No Active Collaborations"
                        : filterTab === "completed"
                        ? "No Completed Deals Yet"
                        : "No Direct Brand Deals Yet"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-1.5 mb-5">
                      {filterTab === "pending"
                        ? "You don't have any pending requests. When a sponsor books you directly, their proposal details will arrive here."
                        : "When brands and sponsors choose your creator channel, their custom proposals, agreed pricing, and deliverables workspace will appear here."}
                    </p>
                    <Button 
                      onClick={() => setMainTab("rate-card")}
                      className="font-semibold text-xs rounded-xl h-9 px-4 shadow-xs"
                      data-testid="button-open-rate-card"
                    >
                      Configure My Rate Card
                    </Button>
                    <div className="mt-5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md border border-border/50">
                      <span>All direct brand deals feature guaranteed escrow milestone protection</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {filteredWorkspaces.map((ws: any) => {
                    const isInvited = ws.status === "invited" || ws.status === "applied" || ws.status === "pending";
                    const isCompleted = ws.status === "approved" || ws.status === "completed";

                    return (
                      <motion.div 
                        key={ws.campaignId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="overflow-hidden border border-border/80 shadow-xs hover:border-border transition-colors">
                          <div className="p-4 border-b flex items-center justify-between">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm truncate text-foreground">{ws.brand}</h4>
                              <span className="text-xs text-muted-foreground truncate block">{ws.genre || "Brand Sponsorship"}</span>
                            </div>
                            <Badge 
                              variant={isCompleted ? "secondary" : isInvited ? "outline" : "default"} 
                              className="capitalize shrink-0 text-[11px]"
                            >
                              {ws.status === "invited" ? "New Request" : ws.status}
                            </Badge>
                          </div>

                          <CardContent className="p-4 sm:p-5 space-y-4">
                            <div>
                              <h3 className="font-bold text-base line-clamp-1">{ws.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {ws.description || "Direct collaboration proposal tailored for your creator channel."}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50 text-xs">
                              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
                                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Deal Compensation</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                                  {formatINR(ws.payAmount)}
                                </span>
                              </div>
                              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
                                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submission Deadline</span>
                                <span className="font-medium text-foreground text-xs mt-0.5 block truncate">
                                  {(() => {
                                    const val = ws.deadline || ws.expiresAt;
                                    if (!val) return "Flexible";
                                    try {
                                      const d = new Date(val);
                                      return !isNaN(d.getTime()) ? d.toLocaleDateString() : "Flexible";
                                    } catch {
                                      return "Flexible";
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>

                            <div className="pt-1 flex items-center gap-2">
                              {isInvited && (
                                <Button
                                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-xs font-bold text-xs h-9"
                                  disabled={acceptInvitationMutation.isPending}
                                  onClick={() => acceptInvitationMutation.mutate(ws.campaignId)}
                                >
                                  {acceptInvitationMutation.isPending ? "Reserving..." : "Accept & Reserve Ad"}
                                </Button>
                              )}
                              <Button 
                                variant={isInvited ? "outline" : "default"}
                                className="flex-1 shadow-xs font-semibold text-xs h-9"
                                onClick={() => navigate(`/campaigns/${ws.campaignId}/workspace`)}
                              >
                                Open Deal Workspace
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: MY RATE CARD ================= */}
          {mainTab === "rate-card" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold">
                        Direct Deal Rate Card
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        Set your standard rates for direct sponsorships. Brands browse these prices when sending custom booking proposals.
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={handleSaveRateCard} 
                      disabled={isSavingRates}
                      size="sm"
                      className="rounded-xl font-bold text-xs h-9 px-4 shadow-xs self-start sm:self-center"
                      data-testid="button-save-rate-card"
                    >
                      {isSavingRates ? "Saving..." : "Save Rate Card"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Deliverable 1: Instagram Reel */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">Instagram Reel</Label>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Video</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        Dedicated or integrated 30-60s reel showcasing sponsor's track or product.
                      </p>
                      <div className="relative pt-1">
                        <span className="absolute left-3 top-3.5 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={reelPrice}
                          onChange={(e) => setReelPrice(e.target.value)}
                          className="pl-7 text-xs font-semibold h-9"
                          placeholder="2500"
                          data-testid="input-rate-reel"
                        />
                      </div>
                    </div>

                    {/* Deliverable 2: Instagram Story */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">Instagram Story</Label>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">24 Hours</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        1-2 story slides with swipe-up/sticker link and sponsor tag.
                      </p>
                      <div className="relative pt-1">
                        <span className="absolute left-3 top-3.5 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={storyPrice}
                          onChange={(e) => setStoryPrice(e.target.value)}
                          className="pl-7 text-xs font-semibold h-9"
                          placeholder="800"
                          data-testid="input-rate-story"
                        />
                      </div>
                    </div>

                    {/* Deliverable 3: Collab Package */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">Collab Package</Label>
                        <Badge className="text-[9px] px-1.5 py-0">Bundle</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        1 Dedicated Reel + 2 Supporting Stories combo for maximum engagement.
                      </p>
                      <div className="relative pt-1">
                        <span className="absolute left-3 top-3.5 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={collabPrice}
                          onChange={(e) => setCollabPrice(e.target.value)}
                          className="pl-7 text-xs font-semibold h-9"
                          placeholder="5000"
                          data-testid="input-rate-collab"
                        />
                      </div>
                    </div>

                    {/* Deliverable 4: Bio Link & Story */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">Bio Link and Story</Label>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Traffic</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        Track/Brand link in Instagram Bio for 48 hours + 1 announcement story.
                      </p>
                      <div className="relative pt-1">
                        <span className="absolute left-3 top-3.5 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={bioLinkPrice}
                          onChange={(e) => setBioLinkPrice(e.target.value)}
                          className="pl-7 text-xs font-semibold h-9"
                          placeholder="1200"
                          data-testid="input-rate-biolink"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informational Guidance Box */}
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">
                      How Rate Cards Power Direct Brand Deals:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1 text-[11px] sm:text-xs">
                      <li>Sponsors explore your channel in the Creator Discovery catalog and see your listed rates.</li>
                      <li>When a sponsor submits a booking request, your rate card is automatically used as the proposal price.</li>
                      <li>You can review the brand's creative brief and accept, decline, or negotiate custom terms in your Deal Workspace.</li>
                      <li>All agreed funds are secured in Mingree Escrow before you produce any content.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
