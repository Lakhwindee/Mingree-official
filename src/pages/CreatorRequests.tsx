import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RateNegotiationChat } from "@/components/RateNegotiationChat";
import { api, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AtSign,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Film,
  Hash,
  IndianRupee,
  Layers,
  Music2,
  Sparkles,
  Video,
} from "lucide-react";

export default function CreatorRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<"deals" | "rate-card">("deals");

  // Popup 1: Simple Deal Info, File Download & Submit Reel Link ONLY
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [liveReelUrl, setLiveReelUrl] = useState<string>("");

  // Popup 2: Separate 2-Way Rate Negotiation Chat Bar ONLY
  const [negotiatingCampaignId, setNegotiatingCampaignId] = useState<number | null>(null);

  // Rate Card State
  const [reelPrice, setReelPrice] = useState("2500");
  const [storyPrice, setStoryPrice] = useState("800");
  const [collabPrice, setCollabPrice] = useState("5000");
  const [bioLinkPrice, setBioLinkPrice] = useState("1200");
  const [isSavingRates, setIsSavingRates] = useState(false);

  useEffect(() => {
    if (user?.id) {
      api
        .getRateCards(user.id)
        .then((cards) => {
          if (Array.isArray(cards)) {
            cards.forEach((c) => {
              if (c.deliverableType === "Instagram Reel") setReelPrice(String(c.price));
              if (c.deliverableType === "Instagram Story") setStoryPrice(String(c.price));
              if (c.deliverableType === "Collab Package") setCollabPrice(String(c.price));
              if (c.deliverableType === "Bio Link & Story") setBioLinkPrice(String(c.price));
            });
          }
        })
        .catch(() => {});
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
      toast.success("Rate card saved!");
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
    refetchInterval: 3000,
    retry: 2,
  });

  const selectedDeal =
    workspaces.find((w: any) => Number(w.campaignId) === Number(selectedCampaignId)) || null;
  const negotiatingDeal =
    workspaces.find((w: any) => Number(w.campaignId) === Number(negotiatingCampaignId)) || null;

  const acceptInvitationMutation = useMutation({
    mutationFn: (campaignId: number) => api.acceptCampaignInvitation(campaignId),
    onSuccess: (data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Ad slot reserved! You can now download files and submit your Reel.");
      setSelectedCampaignId(campaignId);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reserve ad slot");
    },
  });

  const submitReelMutation = useMutation({
    mutationFn: (params: { campaignId: number; postUrl: string }) =>
      api.submitCreatorReel(params.campaignId, { postUrl: params.postUrl, audioConfirmed: true }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", variables.campaignId] });
      toast.success("Instagram Reel link submitted for payout!");
      setLiveReelUrl("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit Reel URL");
    },
  });

  const handleDownloadBriefAndAssets = (deal: any) => {
    if (!deal) return;

    const mentionsList =
      Array.isArray(deal.requiredMentions) && deal.requiredMentions.length > 0
        ? deal.requiredMentions
        : [`@${(deal.brand || "brand").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()}`];
    const tagsList =
      Array.isArray(deal.requiredTags) && deal.requiredTags.length > 0
        ? deal.requiredTags
        : ["#MingreePromotions"];

    const briefContent = [
      `========================================================`,
      `MINGREE CAMPAIGN BRIEF & OFFICIAL DEAL PACK`,
      `========================================================`,
      `Campaign Title       : ${deal.title || "Brand Promo Campaign"}`,
      `Brand / Sponsor      : ${deal.brand || "Sponsor"}`,
      `Category / Genre     : ${deal.genre || "Music & Lifestyle"}`,
      `Language             : ${deal.language || "Hindi & English"}`,
      `Deliverable Type     : ${deal.contentTypes?.[0] || "Instagram Reel"}`,
      `Promotion Style      : ${deal.promotionStyle || "Lyrics / Page promotion"}`,
      `Deal Compensation    : ${formatINR(deal.payAmount)}`,
      `Submission Deadline  : ${deal.deadline || "48 Hours from Reservation"}`,
      `--------------------------------------------------------`,
      `CREATIVE BRIEF & INSTRUCTIONS:`,
      `${deal.description || deal.requiredCaptionNote || "Promote brand audio / product on Instagram Reels."}`,
      `--------------------------------------------------------`,
      `MANDATORY CAPTION NOTE:`,
      `${deal.requiredCaptionNote || deal.description || ""}`,
      `--------------------------------------------------------`,
      `REQUIRED MENTIONS    : ${mentionsList.join(" ")}`,
      `REQUIRED HASHTAGS    : ${tagsList.join(" ")}`,
      `DISCLOSURE RULE      : ${deal.disclosureInstructions || "#ad | Paid Partnership"}`,
      `--------------------------------------------------------`,
      `AUDIO / ASSET LINKS:`,
      `Official Audio URL   : ${deal.audioUrl || "Included in brief"}`,
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

    toast.success("Campaign Brief (.txt) downloaded!");
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

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 pt-14 md:pt-0 pb-10 overflow-x-hidden">
        {/* Clean Header */}
        <header className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur-md">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Direct Brand Deals</h1>
            <p className="text-xs text-muted-foreground">
              Download campaign files, submit Reel links, or negotiate rates in ₹
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && <NotificationDropdown userId={user.id} />}
          </div>
        </header>

        <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-5">
          {/* Simple 2-Button Switcher */}
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={mainTab === "deals" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainTab("deals")}
                className="text-xs rounded-xl font-semibold h-9 px-4 cursor-pointer"
              >
                Brand Deals ({workspaces.length})
              </Button>
              <Button
                variant={mainTab === "rate-card" ? "default" : "outline"}
                size="sm"
                onClick={() => setMainTab("rate-card")}
                className="text-xs rounded-xl font-semibold h-9 px-4 cursor-pointer"
              >
                My Rate Card
              </Button>
            </div>
          </div>

          {/* ================= TAB 1: SIMPLE BRAND DEALS LIST ================= */}
          {mainTab === "deals" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : workspaces.length === 0 ? (
                <Card className="border-dashed border bg-card/40">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center px-4">
                    <h3 className="text-base font-semibold text-foreground">No Brand Deals Yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                      When a brand selects you for a campaign, it will appear here.
                    </p>
                    <Button
                      onClick={() => setMainTab("rate-card")}
                      className="font-semibold text-xs rounded-xl h-9 px-4"
                    >
                      Set My Rate Card
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaces.map((ws: any) => {
                    const isInvited =
                      ws.status === "invited" || ws.status === "applied" || ws.status === "pending";
                    const isCompleted = ws.status === "approved" || ws.status === "completed";

                    return (
                      <Card
                        key={ws.campaignId}
                        className="overflow-hidden border border-border shadow-xs hover:border-primary/40 transition-all"
                      >
                        {/* Card Top Bar */}
                        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                          <div className="flex items-center gap-3 min-w-0">
                            {ws.brandLogo ? (
                              <img
                                src={ws.brandLogo}
                                alt={ws.brand}
                                className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                                {(ws.brand || "B").charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block truncate">
                                {ws.brand}
                              </span>
                              <h3 className="font-bold text-sm text-foreground truncate">{ws.title}</h3>
                            </div>
                          </div>

                          <Badge
                            variant={isCompleted ? "secondary" : isInvited ? "outline" : "default"}
                            className="capitalize shrink-0 text-[11px]"
                          >
                            {isInvited ? "Pending Reserve" : ws.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <CardContent className="p-4 space-y-4">
                          {/* Rate & Status Strip */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Deal Rate
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  {formatINR(ws.payAmount)}
                                </span>
                                {ws.negotiationStatus === "creator_countered" && ws.lastOfferedPrice && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  >
                                    Your Ask: {formatINR(ws.lastOfferedPrice)}
                                  </Badge>
                                )}
                                {ws.negotiationStatus === "accepted" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  >
                                    Rate Locked
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Deadline
                              </span>
                              <span className="text-xs font-semibold text-foreground mt-0.5 block">
                                {ws.deadline
                                  ? new Date(ws.deadline).toLocaleDateString()
                                  : "48 Hours"}
                              </span>
                            </div>
                          </div>

                          {/* Two Separate Action Buttons: 1) Files & Submit Reel  2) Rate Chat (₹) */}
                          <div className="flex items-center gap-2">
                            {isInvited ? (
                              <Button
                                className="flex-1 font-bold text-xs h-10 rounded-xl cursor-pointer"
                                disabled={acceptInvitationMutation.isPending}
                                onClick={() => acceptInvitationMutation.mutate(ws.campaignId)}
                              >
                                {acceptInvitationMutation.isPending
                                  ? "Reserving..."
                                  : "Reserve & Open Files"}
                              </Button>
                            ) : (
                              <Button
                                className="flex-1 font-bold text-xs h-10 rounded-xl cursor-pointer"
                                onClick={() => setSelectedCampaignId(ws.campaignId)}
                              >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Files & Submit Reel
                              </Button>
                            )}

                            {isInvited && (
                              <Button
                                variant="outline"
                                className="font-semibold text-xs h-10 px-3 rounded-xl cursor-pointer"
                                onClick={() => setSelectedCampaignId(ws.campaignId)}
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Files
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              className={cn(
                                "font-bold text-xs h-10 px-3.5 rounded-xl cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                              )}
                              onClick={() => setNegotiatingCampaignId(ws.campaignId)}
                            >
                              <IndianRupee className="h-3.5 w-3.5 mr-1" />
                              Rate Chat (₹)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: MY RATE CARD ================= */}
          {mainTab === "rate-card" && (
            <Card className="border-border shadow-xs">
              <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">My Standard Rate Card</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Default prices shown to brands when booking you directly.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveRateCard}
                  disabled={isSavingRates}
                  size="sm"
                  className="rounded-xl font-bold text-xs h-9 px-4 cursor-pointer"
                >
                  {isSavingRates ? "Saving..." : "Save Rates"}
                </Button>
              </CardHeader>
              <CardContent className="p-5 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Label className="text-xs font-semibold">Instagram Reel (₹)</Label>
                  <Input
                    type="number"
                    value={reelPrice}
                    onChange={(e) => setReelPrice(e.target.value)}
                    className="text-xs font-bold h-9"
                  />
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Label className="text-xs font-semibold">Instagram Story (₹)</Label>
                  <Input
                    type="number"
                    value={storyPrice}
                    onChange={(e) => setStoryPrice(e.target.value)}
                    className="text-xs font-bold h-9"
                  />
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Label className="text-xs font-semibold">Collab Package (₹)</Label>
                  <Input
                    type="number"
                    value={collabPrice}
                    onChange={(e) => setCollabPrice(e.target.value)}
                    className="text-xs font-bold h-9"
                  />
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <Label className="text-xs font-semibold">Bio Link & Story (₹)</Label>
                  <Input
                    type="number"
                    value={bioLinkPrice}
                    onChange={(e) => setBioLinkPrice(e.target.value)}
                    className="text-xs font-bold h-9"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* ================= POPUP 1: COMPREHENSIVE DEAL INFO, BRAND GUIDELINES, MENTIONS, FILES & REEL SUBMIT ================= */}
      <Dialog
        open={selectedCampaignId !== null && !!selectedDeal}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaignId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-0 rounded-2xl border-border bg-card shadow-lg">
          {selectedDeal && (() => {
            const isDealPending =
              selectedDeal.status === "pending" ||
              selectedDeal.status === "invited" ||
              selectedDeal.status === "applied";

            const mentionsList =
              Array.isArray(selectedDeal.requiredMentions) && selectedDeal.requiredMentions.length > 0
                ? selectedDeal.requiredMentions
                : [`@${(selectedDeal.brand || "brand").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()}`];

            const tagsList =
              Array.isArray(selectedDeal.requiredTags) && selectedDeal.requiredTags.length > 0
                ? selectedDeal.requiredTags
                : ["#MingreePromotions"];

            const captionNoteText =
              selectedDeal.requiredCaptionNote ||
              selectedDeal.description ||
              "Check out this official release! Use official audio.";

            const disclosureText =
              selectedDeal.disclosureInstructions || "#ad | Paid Partnership";

            const fullCaptionPack = [
              captionNoteText,
              mentionsList.length > 0 ? mentionsList.join(" ") : "",
              tagsList.length > 0 ? tagsList.join(" ") : "",
              disclosureText,
            ]
              .filter(Boolean)
              .join("\n\n");

            return (
              <div>
                {/* 1. Top Header with Brand, Title, and Compensation */}
                <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-3 pr-6">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedDeal.brandLogo ? (
                        <img
                          src={selectedDeal.brandLogo}
                          alt={selectedDeal.brand}
                          className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                          {(selectedDeal.brand || "B").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary block truncate">
                          {selectedDeal.brand}
                        </span>
                        <DialogTitle className="text-base font-bold text-foreground truncate">
                          {selectedDeal.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground truncate">
                          Campaign deliverable instructions, audio & official submission
                        </DialogDescription>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                        Payout
                      </span>
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatINR(selectedDeal.payAmount)}
                      </span>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Reserve Alert Banner if Pending */}
                  {isDealPending && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          Reserve Slot to Lock Payout
                        </p>
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          Click below to confirm your spot and activate the 48-hour submission window.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={acceptInvitationMutation.isPending}
                        onClick={() => acceptInvitationMutation.mutate(selectedDeal.campaignId)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer"
                      >
                        {acceptInvitationMutation.isPending ? "Reserving..." : "Reserve Slot"}
                      </Button>
                    </div>
                  )}

                  {/* 2. Key Deliverable Specs Strip (Horizontal, Clean, Minimal) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Deliverable
                      </span>
                      <span className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Film className="h-3 w-3 text-primary shrink-0" />
                        {selectedDeal.contentTypes?.[0] || "Instagram Reel"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Promotion Style
                      </span>
                      <span className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        {selectedDeal.promotionStyle || "Lyrics / Page Promo"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Category & Lang
                      </span>
                      <span className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Layers className="h-3 w-3 text-blue-500 shrink-0" />
                        {selectedDeal.genre || "Music"} • {selectedDeal.language || "Hindi"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Deadline
                      </span>
                      <span className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        {selectedDeal.deadline ? new Date(selectedDeal.deadline).toLocaleDateString() : "48 Hours"}
                      </span>
                    </div>
                  </div>

                  {/* 3. Campaign Description & Creative Brief (What Brand Entered) */}
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Campaign Brief & Creative Instructions
                    </span>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                      {selectedDeal.description || selectedDeal.requiredCaptionNote || "Promote brand audio / product on Instagram Reels across top creator channels."}
                    </p>
                  </div>

                  {/* 4. Mandatory Mentions & Hashtags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mentions */}
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <AtSign className="h-3 w-3 text-primary" />
                          Accounts to Mention
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(mentionsList.join(" "));
                            toast.success("Mentions copied!");
                          }}
                          className="h-6 px-2 text-[10px] font-semibold text-primary hover:text-primary cursor-pointer"
                        >
                          <Copy className="h-2.5 w-2.5 mr-1" />
                          Copy All
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {mentionsList.map((m: string) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(m);
                              toast.success(`Copied ${m}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            <span>{m}</span>
                            <Copy className="h-2.5 w-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hashtags */}
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3 text-primary" />
                          Required Hashtags
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(tagsList.join(" "));
                            toast.success("Hashtags copied!");
                          }}
                          className="h-6 px-2 text-[10px] font-semibold text-primary hover:text-primary cursor-pointer"
                        >
                          <Copy className="h-2.5 w-2.5 mr-1" />
                          Copy All
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {tagsList.map((tag: string) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tag);
                              toast.success(`Copied ${tag}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors cursor-pointer"
                          >
                            <span>{tag}</span>
                            <Copy className="h-2.5 w-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. Complete Ready-to-Paste Caption Note & One-Click Copy */}
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ready-to-Paste Caption & Disclosure
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(fullCaptionPack);
                          toast.success("Complete caption, mentions & tags copied!");
                        }}
                        className="h-7 px-3 text-[11px] font-bold rounded-lg cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Full Caption Pack
                      </Button>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border text-xs text-foreground/90 font-mono space-y-1.5 leading-relaxed">
                      <p className="font-sans font-medium text-foreground">{captionNoteText}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-primary pt-1 border-t border-border/50 text-[11px]">
                        <span>{mentionsList.join(" ")}</span>
                        <span>{tagsList.join(" ")}</span>
                        <span className="text-muted-foreground font-semibold">{disclosureText}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Campaign Audio, Media Assets & Brief Download */}
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Campaign Audio & Deliverable Files
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedDeal.audioUrl ? (
                        <a
                          href={selectedDeal.audioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-9 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold cursor-pointer"
                        >
                          <Music2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Open Official Audio</span>
                        </a>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadBriefAndAssets(selectedDeal)}
                          className="h-9 text-xs font-semibold rounded-xl justify-center cursor-pointer"
                        >
                          <Music2 className="h-3.5 w-3.5 mr-1.5" />
                          Audio in Brief
                        </Button>
                      )}

                      <Button
                        variant="secondary"
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
                        className="h-9 text-xs font-semibold rounded-xl justify-center cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        <span className="truncate">Download Media File</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDownloadBriefAndAssets(selectedDeal)}
                        className="h-9 text-xs font-semibold rounded-xl justify-center cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download Brief (.txt)
                      </Button>
                    </div>
                  </div>

                  {/* 7. Submit Published Instagram Reel Link */}
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-primary" />
                      Submit Published Instagram Reel Link
                    </span>

                    {selectedDeal.submission?.postUrl ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                        <a
                          href={selectedDeal.submission.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-primary hover:underline flex items-center gap-1.5 truncate"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{selectedDeal.submission.postUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">
                          {selectedDeal.status === "approved" ? "Approved" : "Submitted"}
                        </Badge>
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
                        className="flex items-center gap-2"
                      >
                        <Input
                          value={liveReelUrl}
                          onChange={(e) => setLiveReelUrl(e.target.value)}
                          placeholder="https://www.instagram.com/reel/..."
                          className="h-10 rounded-xl text-xs font-mono flex-1 bg-background"
                        />
                        <Button
                          type="submit"
                          disabled={submitReelMutation.isPending || isDealPending}
                          className="h-10 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                        >
                          {isDealPending
                            ? "Reserve First"
                            : submitReelMutation.isPending
                            ? "Submitting..."
                            : "Submit Reel"}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ================= POPUP 2: 2-WAY RATE NEGOTIATION CHAT BAR (SEPARATE FROM FILE DOWNLOAD) ================= */}
      <Dialog
        open={negotiatingCampaignId !== null && !!negotiatingDeal}
        onOpenChange={(open) => {
          if (!open) setNegotiatingCampaignId(null);
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
          {negotiatingDeal && (
            <div>
              <DialogHeader className="sr-only">
                <DialogTitle>Rate Negotiation Chat</DialogTitle>
                <DialogDescription>Two-way rate negotiation chat bar in INR</DialogDescription>
              </DialogHeader>
              <RateNegotiationChat
                campaignId={negotiatingDeal.campaignId}
                viewerRole="creator"
                brandName={negotiatingDeal.brand || "Brand"}
                brandLogo={negotiatingDeal.brandLogo}
                creatorId={Number(negotiatingDeal.creatorId || user?.id || 1)}
                creatorName={user?.name || "Creator"}
                creatorHandle={user?.handle}
                creatorAvatar={user?.avatar}
                currentPayoutAmount={Number(negotiatingDeal.payAmount || 1200)}
                basePayAmount={Number(negotiatingDeal.basePayAmount || negotiatingDeal.payAmount || 1200)}
                lastOfferedPrice={Number(negotiatingDeal.lastOfferedPrice || negotiatingDeal.payAmount || 1200)}
                lastOfferBy={negotiatingDeal.lastOfferBy}
                negotiationStatus={negotiatingDeal.negotiationStatus}
                messages={negotiatingDeal.messages || []}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
