import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  IndianRupee,
  Music2,
  Sparkles,
  Video,
} from "lucide-react";

export default function CreatorRequests() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<"deals" | "rate-card">("deals");
  const [filterTab, setFilterTab] = useState<string>("all");

  // Popup Modal State for Deal Details, File Download, Price Negotiator & Reel Submission
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [popupTab, setPopupTab] = useState<string>("info");
  const [counterOfferInput, setCounterOfferInput] = useState<string>("");
  const [liveReelUrl, setLiveReelUrl] = useState<string>("");

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
    retry: 2,
  });

  const selectedDeal = workspaces.find((w: any) => Number(w.campaignId) === Number(selectedCampaignId)) || null;

  const acceptInvitationMutation = useMutation({
    mutationFn: (campaignId: number) => api.acceptCampaignInvitation(campaignId),
    onSuccess: (data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Ad slot reserved! Campaign details and files are ready.");
      setSelectedCampaignId(campaignId);
      setPopupTab("info");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reserve ad slot");
    },
  });

  const negotiatePriceMutation = useMutation({
    mutationFn: (params: { campaignId: number; action: "offer" | "counter_offer" | "accept" | "decline"; amount: number }) =>
      api.negotiateCampaignPrice(params.campaignId, {
        creatorId: user?.id,
        action: params.action,
        amount: params.amount,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", variables.campaignId] });
      setCounterOfferInput("");
      if (variables.action === "accept") {
        toast.success(`Price offer of ${formatINR(variables.amount)} accepted!`);
      } else if (variables.action === "counter_offer") {
        toast.success(`Counter-offer of ${formatINR(variables.amount)} sent to brand!`);
      } else {
        toast.success("Price negotiation updated!");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send price proposal");
    },
  });

  const submitReelMutation = useMutation({
    mutationFn: (params: { campaignId: number; postUrl: string }) =>
      api.submitCreatorReel(params.campaignId, { postUrl: params.postUrl, audioConfirmed: true }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", variables.campaignId] });
      toast.success("Published Instagram Reel link submitted for brand review & payout!");
      setLiveReelUrl("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit Reel URL");
    },
  });

  const handleDownloadBriefAndAssets = (deal: any) => {
    if (!deal) return;

    // 1. Download a complete Campaign Brief & Asset Pack (.txt) immediately
    const briefContent = [
      `========================================================`,
      `MINGREE CAMPAIGN BRIEF & OFFICIAL DEAL PACK`,
      `========================================================`,
      `Campaign Title       : ${deal.title || "Brand Promo Campaign"}`,
      `Brand / Sponsor      : ${deal.brand || "Sponsor"}`,
      `Category / Genre     : ${deal.genre || "Music & Lifestyle"}`,
      `Language             : ${deal.language || "Hindi & English"}`,
      `Deliverable Type     : ${Array.isArray(deal.contentTypes) ? deal.contentTypes.join(", ") : "Instagram Reel"}`,
      `Promotion Style      : ${deal.promotionStyle || "Lyrics / Page promotion"}`,
      `Deal Compensation    : ${formatINR(deal.payAmount)}`,
      `Submission Deadline  : ${deal.deadline || "48 Hours from Reservation"}`,
      `--------------------------------------------------------`,
      `CREATIVE BRIEF & INSTRUCTIONS:`,
      `${deal.description || "Promote brand audio / product on Instagram Reels across your creator channel."}`,
      `--------------------------------------------------------`,
      `MANDATORY CAPTION NOTE:`,
      `${deal.requiredCaptionNote || deal.description || ""}`,
      `--------------------------------------------------------`,
      `REQUIRED HASHTAGS    : ${(deal.requiredTags || ["#MingreePromotions"]).join(" ")}`,
      `REQUIRED MENTIONS    : ${(deal.requiredMentions || []).join(" ") || "None specified"}`,
      `DISCLOSURE RULE      : ${deal.disclosureInstructions || "Include #ad #collab in caption"}`,
      `--------------------------------------------------------`,
      `OFFICIAL AUDIO / ASSET LINKS:`,
      `Audio Track URL      : ${deal.audioUrl || "Included in brief"}`,
      `Media Asset URL      : ${deal.assetUrl || deal.audioUrl || "N/A"}`,
      `========================================================`,
    ].join("\n");

    const blob = new Blob([briefContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanTitle = String(deal.title || "Campaign_Deal").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `${cleanTitle}_Brief_and_Assets.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Campaign Brief & Asset Pack downloaded!");
  };

  const handleDownloadAssetFile = (assetUrl: string, fileName?: string, deal?: any) => {
    if (!assetUrl) {
      if (deal) handleDownloadBriefAndAssets(deal);
      return;
    }
    const a = document.createElement("a");
    a.href = assetUrl;
    a.download = fileName || "Campaign_Media_Asset";
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${fileName || "campaign file"}...`);
  };

  const pendingRequests = workspaces.filter(
    (ws: any) => ws.status === "invited" || ws.status === "applied" || ws.status === "pending"
  );
  const activeDeals = workspaces.filter(
    (ws: any) => ws.status === "reserved" || ws.status === "in_progress" || ws.status === "submitted" || ws.status === "content_submitted" || ws.status === "revision_requested"
  );
  const completedDeals = workspaces.filter(
    (ws: any) => ws.status === "approved" || ws.status === "completed"
  );

  const filteredWorkspaces = workspaces.filter((ws: any) => {
    if (filterTab === "pending") return ws.status === "invited" || ws.status === "applied" || ws.status === "pending";
    if (filterTab === "active") return ws.status === "reserved" || ws.status === "in_progress" || ws.status === "submitted" || ws.status === "content_submitted" || ws.status === "revision_requested";
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
                Deals and Requests{" "}
                {pendingRequests.length > 0 && (
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
                        <Card className="overflow-hidden border border-border/80 shadow-xs hover:border-primary/40 transition-all">
                          <div className="p-4 border-b flex items-center justify-between bg-muted/15">
                            <div className="flex items-center gap-3 min-w-0">
                              {ws.brandLogo && (
                                <img
                                  src={ws.brandLogo}
                                  alt={ws.brand}
                                  className="h-9 w-9 rounded-lg object-cover border border-border shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm truncate text-foreground">{ws.brand}</h4>
                                <span className="text-xs text-muted-foreground truncate block">
                                  {ws.genre || "Brand Sponsorship"}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={isCompleted ? "secondary" : isInvited ? "outline" : "default"}
                              className="capitalize shrink-0 text-[11px]"
                            >
                              {ws.status === "invited" || ws.status === "pending"
                                ? "Pending Reservation"
                                : ws.status.replace("_", " ")}
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
                                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                                  Deal Compensation
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                    {formatINR(ws.payAmount)}
                                  </span>
                                  {ws.negotiationStatus === "creator_countered" && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-600">
                                      Counter: {formatINR(ws.lastOfferedPrice)}
                                    </Badge>
                                  )}
                                  {ws.negotiationStatus === "accepted" && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-600">
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
                                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                                  Submission Deadline
                                </span>
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

                            {/* Action Buttons — Opens Deal & File Download Popup Window */}
                            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              {isInvited ? (
                                <>
                                  <Button
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-bold text-xs h-9"
                                    disabled={acceptInvitationMutation.isPending}
                                    onClick={() => acceptInvitationMutation.mutate(ws.campaignId)}
                                  >
                                    {acceptInvitationMutation.isPending
                                      ? "Reserving..."
                                      : "Reserve Ad & Open Deal Info"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="flex-1 shadow-xs font-semibold text-xs h-9"
                                    onClick={() => {
                                      setSelectedCampaignId(ws.campaignId);
                                      setPopupTab("info");
                                    }}
                                  >
                                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                                    View Brief & Negotiate
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    className="flex-1 shadow-xs font-semibold text-xs h-9"
                                    onClick={() => {
                                      setSelectedCampaignId(ws.campaignId);
                                      setPopupTab("info");
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    View Deal Info & Download Files
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="shadow-xs font-semibold text-xs h-9 px-3"
                                    onClick={() => {
                                      setSelectedCampaignId(ws.campaignId);
                                      setPopupTab("negotiate");
                                    }}
                                  >
                                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                                    Negotiate Price
                                  </Button>
                                </>
                              )}
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
                      <li>You can review the brand's creative brief, download campaign files, and negotiate pricing in the Deal Popup.</li>
                      <li>All agreed funds are secured in Mingree Escrow before you produce any content.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* ================= DEAL INFORMATION, FILE DOWNLOAD & PRICE NEGOTIATOR POPUP WINDOW ================= */}
      <Dialog
        open={selectedCampaignId !== null && !!selectedDeal}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaignId(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {selectedDeal && (() => {
            const isDealPending =
              selectedDeal.status === "pending" ||
              selectedDeal.status === "invited" ||
              selectedDeal.status === "applied";
            const negotiationMessages = Array.isArray(selectedDeal.messages)
              ? selectedDeal.messages.filter((m: any) => m.negotiationOffer || m.content?.includes("₹"))
              : [];

            return (
              <div className="space-y-0">
                {/* Sticky Top Header inside Popup */}
                <DialogHeader className="p-5 border-b border-border bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedDeal.brandLogo && (
                        <img
                          src={selectedDeal.brandLogo}
                          alt={selectedDeal.brand}
                          className="h-11 w-11 rounded-xl object-cover border border-border shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            {selectedDeal.brand}
                          </span>
                          <Badge variant={isDealPending ? "outline" : "default"} className="text-[10px] capitalize">
                            {isDealPending ? "Pending Ad Reservation" : selectedDeal.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate mt-0.5">
                          {selectedDeal.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          {selectedDeal.genre || "Music & Lifestyle"} • {selectedDeal.language || "Hindi & English"}
                        </DialogDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                          Deal Compensation
                        </span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatINR(selectedDeal.payAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-5 space-y-5">
                  {/* Reservation Call-to-Action Banner if Not Reserved Yet */}
                  {isDealPending && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-amber-600" />
                          Ad Slot Awaiting Your Reservation
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Click Reserve Ad Slot below to lock your {formatINR(selectedDeal.payAmount)} escrow payout and start your 48-hour delivery timer.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={acceptInvitationMutation.isPending}
                        onClick={() => acceptInvitationMutation.mutate(selectedDeal.campaignId)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shrink-0"
                      >
                        {acceptInvitationMutation.isPending ? "Reserving..." : "Accept & Reserve Ad Slot"}
                      </Button>
                    </div>
                  )}

                  {/* Popup Navigation Tabs */}
                  <Tabs value={popupTab} onValueChange={setPopupTab} className="w-full">
                    <TabsList className="w-full justify-start bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1">
                      <TabsTrigger value="info" className="text-xs font-semibold rounded-lg py-2 px-3.5 flex-1">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        1. Deal Info & File Download
                      </TabsTrigger>
                      <TabsTrigger value="negotiate" className="text-xs font-semibold rounded-lg py-2 px-3.5 flex-1">
                        <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
                        2. Price Negotiator
                      </TabsTrigger>
                      <TabsTrigger value="submit" className="text-xs font-semibold rounded-lg py-2 px-3.5 flex-1">
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        3. Submit Reel Link
                      </TabsTrigger>
                    </TabsList>

                    {/* ================= POPUP TAB 1: FULL DEAL INFO & FILE DOWNLOAD ================= */}
                    <TabsContent value="info" className="space-y-4 mt-4">
                      {/* Prominent Campaign Files & Audio Download Card */}
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/25 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                              <Download className="h-4 w-4" />
                              Official Campaign Files & Audio Assets
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Download the brand's promotional media file, official audio track, and complete campaign brief.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadBriefAndAssets(selectedDeal)}
                            className="text-xs font-bold rounded-xl h-9 px-4 shrink-0"
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download Complete Brief (.txt)
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Media / Product Asset File */}
                          <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Campaign Media File
                              </span>
                              <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                                {selectedDeal.assetFileName ||
                                  (selectedDeal.productAssets && selectedDeal.productAssets[0]?.name) ||
                                  `${selectedDeal.brand || "Brand"}_Promo_Asset`}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const fileUrl =
                                  (selectedDeal.productAssets && selectedDeal.productAssets[0]?.url) ||
                                  selectedDeal.assetUrl ||
                                  selectedDeal.audioUrl;
                                handleDownloadAssetFile(
                                  fileUrl,
                                  selectedDeal.assetFileName || "Campaign_Asset",
                                  selectedDeal
                                );
                              }}
                              className="h-8 px-3 text-xs font-semibold rounded-lg shrink-0"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download File
                            </Button>
                          </div>

                          {/* Official Audio / Song Link */}
                          <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Official Audio / Song Track
                              </span>
                              <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                                {selectedDeal.audioUrl || "Official Campaign Sound"}
                              </p>
                            </div>
                            {selectedDeal.audioUrl ? (
                              <a
                                href={selectedDeal.audioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shrink-0"
                              >
                                <Music2 className="h-3.5 w-3.5 mr-1.5" />
                                Open Audio
                              </a>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadBriefAndAssets(selectedDeal)}
                                className="h-8 px-3 text-xs font-semibold rounded-lg shrink-0"
                              >
                                Download Info
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Key Deal Parameters Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-muted/30 border border-border">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                            Deliverable
                          </span>
                          <span className="font-bold text-foreground mt-0.5 block">
                            {Array.isArray(selectedDeal.contentTypes)
                              ? selectedDeal.contentTypes.join(", ")
                              : "Instagram Reel"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                            Promotion Style
                          </span>
                          <span className="font-bold text-foreground mt-0.5 block truncate">
                            {selectedDeal.promotionStyle || "Lyrics / Page Promo"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                            Min. Duration
                          </span>
                          <span className="font-bold text-foreground mt-0.5 block">
                            {selectedDeal.minDurationSecs || 15} Seconds
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                            Deadline
                          </span>
                          <span className="font-bold text-foreground mt-0.5 block">
                            {selectedDeal.deadline
                              ? new Date(selectedDeal.deadline).toLocaleDateString()
                              : "48 Hours"}
                          </span>
                        </div>
                      </div>

                      {/* Campaign Creative Brief & Description */}
                      <div className="p-4 rounded-xl bg-muted/25 border border-border space-y-2">
                        <Label className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                          Campaign Brief & Creative Instructions
                        </Label>
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {selectedDeal.description ||
                            "Promote the brand's audio or product creatively on your Instagram Reels channel following the caption and tag guidelines below."}
                        </p>
                      </div>

                      {/* Mandatory Caption Note + Hashtags + Mentions */}
                      <div className="p-4 rounded-xl bg-muted/25 border border-border space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                            Mandatory Reel Caption Note
                          </Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedDeal.requiredCaptionNote || selectedDeal.description || ""
                              );
                              toast.success("Caption note copied to clipboard!");
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-lg"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Caption
                          </Button>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border text-xs font-mono text-foreground">
                          {selectedDeal.requiredCaptionNote || selectedDeal.description || "#ad | Paid Partnership"}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                          <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                            Required Hashtags & Mentions
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const combined = [
                                ...(selectedDeal.requiredTags || ["#MingreePromotions"]),
                                ...(selectedDeal.requiredMentions || []),
                              ].join(" ");
                              navigator.clipboard.writeText(combined);
                              toast.success("Hashtags & mentions copied!");
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-lg"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Tags
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {(selectedDeal.requiredTags && selectedDeal.requiredTags.length > 0
                            ? selectedDeal.requiredTags
                            : ["#MingreePromotions"]
                          ).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs font-mono">
                              {tag}
                            </Badge>
                          ))}
                          {(selectedDeal.requiredMentions || []).map((mention: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs font-mono text-primary border-primary/30">
                              {mention}
                            </Badge>
                          ))}
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                          <strong>Mandatory Disclosure:</strong>{" "}
                          {selectedDeal.disclosureInstructions || "Include #ad #collab in caption"}
                        </div>
                      </div>
                    </TabsContent>

                    {/* ================= POPUP TAB 2: PRICE NEGOTIATOR (NO FREE-TEXT CHAT) ================= */}
                    <TabsContent value="negotiate" className="space-y-4 mt-4">
                      <div className="p-4 rounded-xl bg-muted/25 border border-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                          <div>
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <IndianRupee className="h-4 w-4 text-primary" />
                              Direct Price Negotiator
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Propose your price or accept the brand's offer directly. Free-text chat is disabled for platform safety.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-background border border-border text-right">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold block">
                                Current Brand Offer
                              </span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatINR(selectedDeal.payAmount)}
                              </span>
                            </div>
                            {selectedDeal.negotiationStatus === "creator_countered" && (
                              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
                                <span className="text-[10px] uppercase text-amber-700 dark:text-amber-400 font-semibold block">
                                  Your Counter-Offer
                                </span>
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                  {formatINR(selectedDeal.lastOfferedPrice)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Accept Brand's Current Price Offer */}
                        {selectedDeal.negotiationStatus !== "accepted" && (
                          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                Happy with the Brand's Offer of {formatINR(selectedDeal.payAmount)}?
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Lock this payout rate immediately for your deliverable.
                              </p>
                            </div>
                            <Button
                              size="sm"
                              disabled={negotiatePriceMutation.isPending}
                              onClick={() =>
                                negotiatePriceMutation.mutate({
                                  campaignId: selectedDeal.campaignId,
                                  action: "accept",
                                  amount: Number(selectedDeal.payAmount) || 1200,
                                })
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shrink-0"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Accept {formatINR(selectedDeal.payAmount)}
                            </Button>
                          </div>
                        )}

                        {/* Propose Counter-Offer Price in ₹ */}
                        <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                          <Label className="text-xs font-bold text-foreground block">
                            Propose Counter-Offer Price (₹)
                          </Label>

                          {/* Quick Preset Price Chips */}
                          <div className="flex flex-wrap gap-2">
                            {[1500, 2000, 2500, 3500, 5000, 7500].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCounterOfferInput(String(preset))}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                  Number(counterOfferInput) === preset
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/40 hover:bg-muted border-border text-foreground"
                                )}
                              >
                                ₹{preset.toLocaleString("en-IN")}
                              </button>
                            ))}
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                            <div className="relative flex-1">
                              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-muted-foreground">
                                ₹
                              </span>
                              <Input
                                type="number"
                                min={100}
                                step={50}
                                value={counterOfferInput}
                                onChange={(e) => setCounterOfferInput(e.target.value.replace(/[^0-9]/g, ""))}
                                placeholder="Enter your counter-offer amount (e.g. 1800)"
                                className="pl-8 h-10 rounded-xl text-xs font-bold"
                              />
                            </div>
                            <Button
                              type="button"
                              disabled={!counterOfferInput || Number(counterOfferInput) <= 0 || negotiatePriceMutation.isPending}
                              onClick={() =>
                                negotiatePriceMutation.mutate({
                                  campaignId: selectedDeal.campaignId,
                                  action: "counter_offer",
                                  amount: Number(counterOfferInput),
                                })
                              }
                              className="h-10 px-5 rounded-xl text-xs font-bold shrink-0"
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              {negotiatePriceMutation.isPending ? "Sending..." : "Send Counter-Offer Price"}
                            </Button>
                          </div>
                        </div>

                        {/* Negotiation History Log */}
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Price Offer History
                          </span>
                          {negotiationMessages.length === 0 ? (
                            <div className="p-4 rounded-xl bg-background border border-border text-center text-xs text-muted-foreground">
                              Initial Brand Offer: <strong className="text-foreground">{formatINR(selectedDeal.payAmount)}</strong>. Use the controls above to accept or propose your counter price.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {negotiationMessages.map((msg: any) => (
                                <div
                                  key={msg.id}
                                  className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Badge
                                      variant={msg.senderRole === "sponsor" ? "default" : "secondary"}
                                      className="text-[10px] uppercase"
                                    >
                                      {msg.senderRole === "sponsor" ? "Brand" : "You"}
                                    </Badge>
                                    <span className="font-semibold text-foreground">{msg.content}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* ================= POPUP TAB 3: SUBMIT PUBLISHED REEL LINK ================= */}
                    <TabsContent value="submit" className="space-y-4 mt-4">
                      <div className="p-4 rounded-xl bg-muted/25 border border-border space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">
                            Submit Published Instagram Reel URL
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Once you have published your Reel using the campaign audio and caption, paste the public Instagram Reel link below to claim your {formatINR(selectedDeal.payAmount)} payout.
                          </p>
                        </div>

                        {selectedDeal.submission?.postUrl ? (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Reel Link Submitted
                              </span>
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                {selectedDeal.status === "approved" ? "Approved & Paid" : "In Review"}
                              </Badge>
                            </div>
                            <a
                              href={selectedDeal.submission.postUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-mono text-primary hover:underline flex items-center gap-1.5 break-all"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              {selectedDeal.submission.postUrl}
                            </a>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!liveReelUrl.trim()) {
                                toast.error("Please paste your Instagram Reel URL");
                                return;
                              }
                              submitReelMutation.mutate({
                                campaignId: selectedDeal.campaignId,
                                postUrl: liveReelUrl.trim(),
                              });
                            }}
                            className="space-y-3"
                          >
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Instagram Reel Share Link *</Label>
                              <Input
                                value={liveReelUrl}
                                onChange={(e) => setLiveReelUrl(e.target.value)}
                                placeholder="https://www.instagram.com/reel/Cxxxxxx/"
                                className="h-10 rounded-xl text-xs font-mono"
                              />
                            </div>
                            <Button
                              type="submit"
                              disabled={submitReelMutation.isPending || isDealPending}
                              className="w-full sm:w-auto h-10 px-6 rounded-xl text-xs font-bold"
                            >
                              {isDealPending
                                ? "Reserve Ad Slot First to Submit"
                                : submitReelMutation.isPending
                                ? "Submitting Reel..."
                                : `Submit Reel & Claim ${formatINR(selectedDeal.payAmount)}`}
                            </Button>
                          </form>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Footer Actions inside Popup */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/campaigns/${selectedDeal.campaignId}/workspace`)}
                      className="text-xs font-semibold rounded-xl"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Full Page View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedCampaignId(null)}
                      className="text-xs font-semibold rounded-xl px-5"
                    >
                      Close Popup
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
