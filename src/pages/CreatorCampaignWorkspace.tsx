import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatINR } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RateNegotiationChat } from "@/components/RateNegotiationChat";
import { IndianRupee } from "lucide-react";
import { toast } from "sonner";

// Live 48-Hour Countdown Timer Component with multiple display variants
function LiveCountdownTimer({ expiresAt, variant = "badge" }: { expiresAt: string; variant?: "badge" | "card" | "banner" }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00 (Expired)");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hh = hours.toString().padStart(2, '0');
      const mm = minutes.toString().padStart(2, '0');
      const ss = seconds.toString().padStart(2, '0');

      setTimeLeft(`${hh}:${mm}:${ss}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (variant === "card") {
    return (
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
        isExpired
          ? "bg-red-500/10 text-red-600 border-red-500/20"
          : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
      }`}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Live Countdown:</span>
        </div>
        <span className="text-sm font-mono font-bold tabular-nums">{timeLeft}</span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isExpired
          ? "bg-red-500/10 text-red-600 border-red-500/20"
          : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">
            <strong>48-Hour Deal Window Active:</strong> Submit your published Reel link before time expires to claim your payout.
          </p>
        </div>
        <div className="px-3 py-1 bg-amber-500/20 rounded-lg text-amber-900 dark:text-amber-200 font-mono font-bold text-xs shrink-0 self-start sm:self-auto tabular-nums">
          ⏱️ {timeLeft}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${
      isExpired
        ? "bg-red-500/10 text-red-600 border border-red-500/20"
        : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-xs"
    }`}>
      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="text-[10px] uppercase font-sans font-semibold text-muted-foreground">Time Left:</span>
      <span className="tabular-nums">{timeLeft}</span>
    </div>
  );
}

export default function CreatorCampaignWorkspace() {
  const [, params] = useRoute("/campaigns/:id/workspace");
  const campaignId = Number((params as any)?.id || 0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("brief");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  // Direct Published Reel Submission Form State
  const [liveReelUrl, setLiveReelUrl] = useState("");
  const [isRateChatOpen, setIsRateChatOpen] = useState(false);

  const {
    data: workspace,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["campaignWorkspace", campaignId],
    queryFn: () => api.getCampaignWorkspace(campaignId),
    enabled: !!campaignId,
    refetchInterval: 10000,
  });

  const matchedParticipant = workspace?.participants?.find(
    (p) => Number(p.creatorId) === Number(user?.id) || String(p.creatorId) === String(user?.id) || p.creatorHandle === user?.handle
  ) || (workspace?.participants && workspace.participants.length > 0 ? workspace.participants[0] : null);

  const participant = matchedParticipant || {
    id: Date.now(),
    campaignId,
    creatorId: user?.id || 1,
    creatorName: user?.name || "Creator",
    creatorHandle: user?.handle || "@creator",
    creatorAvatar: user?.avatar || "",
    creatorFollowers: (user?.isInstagramVerified && user?.followers) ? user.followers : 0,
    creatorMedianViews: (user?.isInstagramVerified && user?.medianViews) ? user.medianViews : 0,
    status: "reserved",
    payoutAmount: workspace?.payAmount || 1000,
    negotiationStatus: "initial" as const,
    lastOfferedPrice: workspace?.payAmount || 1000,
    lastOfferBy: "sponsor" as const,
    reservedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    briefAcknowledgedVersion: workspace?.briefVersions?.length || 1,
    submission: null,
    revisions: [],
  };

  const acceptInvitationMutation = useMutation({
    mutationFn: () => api.acceptCampaignInvitation(campaignId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      toast.success(data.message || "Ad slot reserved! You now have 48 hours to submit your Reel.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reserve ad slot");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (version: number) =>
      api.acknowledgeBriefUpdate(campaignId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success("Brief update acknowledged");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to acknowledge update");
    },
  });

  const submitReelMutation = useMutation({
    mutationFn: (data: { postUrl: string }) =>
      api.submitCreatorReel(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Live Reel submitted! Admin / Brand will review and release payout.");
      setLiveReelUrl("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit Reel URL");
    },
  });

  const negotiatePriceMutation = useMutation({
    mutationFn: (data: {
      creatorId: number | string;
      action: "offer" | "accept" | "decline";
      amount?: number;
    }) => api.negotiateCampaignPrice(campaignId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      toast.success(res.message || "Price negotiation updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update price negotiation");
    },
  });

  const handleDownloadBriefPack = () => {
    if (!workspace) return;
    const content = [
      `==================================================`,
      `MINGREE CAMPAIGN BRIEF & DELIVERABLE PACK`,
      `==================================================`,
      `Campaign Title : ${workspace.title}`,
      `Brand / Sponsor: ${workspace.brand}`,
      `Deal Payout    : ₹${Number(participant.payoutAmount ?? workspace.payAmount ?? 0).toLocaleString("en-IN")}`,
      `Deadline       : ${workspace.deadline || "48 Hours from reservation"}`,
      `Official Audio : ${workspace.audioUrl || "N/A"}`,
      ``,
      `--- CAMPAIGN DESCRIPTION & INSTRUCTIONS ---`,
      `${workspace.description || "Follow campaign instructions."}`,
      ``,
      `--- MANDATORY REEL CAPTION NOTE ---`,
      `${workspace.requiredCaptionNote || "N/A"}`,
      ``,
      `--- REQUIRED MENTIONS & HASHTAGS ---`,
      `${(workspace.requiredMentions || []).join(" ")}`,
      ``,
      `--- MANDATORY DISCLOSURE ---`,
      `${workspace.disclosureInstructions || "Use Instagram Paid Partnership label"}`,
      `==================================================`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(workspace.title || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brief-pack.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Campaign Brief Pack downloaded!");
  };

  const handleCopyCaption = () => {
    if (!workspace) return;
    navigator.clipboard.writeText(workspace.requiredCaptionNote);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    toast.success("Caption copied to clipboard");
  };

  const handleCopyMentions = () => {
    if (!workspace) return;
    const all = (workspace.requiredMentions || []).join(" ");
    navigator.clipboard.writeText(all);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
    toast.success("Mentions copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">Loading Campaign Workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl bg-card border border-border/80 p-8 text-center shadow-lg space-y-4">
          <h2 className="text-lg font-bold text-foreground">Workspace Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You must have an active reservation or application to access this campaign workspace.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/campaigns">
              <Button className="w-full sm:w-auto font-semibold text-xs rounded-xl h-9 px-4 cursor-pointer">
                Browse Campaigns
              </Button>
            </Link>
            <Link href="/my-campaigns">
              <Button variant="outline" className="w-full sm:w-auto text-xs rounded-xl h-9 px-4 cursor-pointer">
                My Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const briefVersions = workspace.briefVersions || [];
  const latestVersion = briefVersions.length > 0 ? briefVersions[briefVersions.length - 1].version : 1;
  const needsBriefAcknowledgement = (participant.briefAcknowledgedVersion || 1) < latestVersion;
  const latestBriefInfo = briefVersions.length > 0 ? briefVersions[briefVersions.length - 1] : null;
  const participantStatus = participant.status || "reserved";
  const payoutAmount = participant.payoutAmount ?? workspace.payAmount ?? 0;
  const expiryTime = participant.expiresAt || new Date(Date.now() + 48 * 3600000).toISOString();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-16">
      {/* Top Sticky Executive Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 md:px-6 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/my-campaigns">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              >
                Back
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {workspace.brand}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] uppercase font-semibold rounded border ${
                    participantStatus === "approved"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : participantStatus === "revision_requested"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : participantStatus === "content_submitted"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}
                >
                  {participantStatus === "pending"
                    ? "Invited — Not Reserved Yet"
                    : participantStatus === "content_submitted"
                    ? "Under Review"
                    : participantStatus.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-sm md:text-base font-bold text-foreground tracking-tight truncate max-w-xs md:max-w-md">
                {workspace.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {/* Prominent Live 48-Hour Countdown Timer Badge */}
            {participantStatus === "reserved" && (
              <LiveCountdownTimer expiresAt={expiryTime} variant="badge" />
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRateChatOpen(true)}
              className="h-9 px-3 rounded-xl text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <IndianRupee className="h-3.5 w-3.5 mr-1" />
              Rate Chat (₹)
            </Button>

            <div className="text-right px-3.5 py-1.5 rounded-xl border border-border/80 bg-card">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">Escrow Payout</span>
              <span className="text-sm md:text-base font-bold text-foreground tabular-nums">
                {formatINR(payoutAmount)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        {/* INVITATION ACCEPTANCE BANNER FOR PENDING CREATORS */}
        {participantStatus === "pending" && (
          <div className="p-4 md:p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                You've Been Selected for This Campaign by {workspace.brand}!
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click <strong>Accept & Reserve Ad Slot</strong> below to lock your{" "}
                <strong className="text-emerald-600 font-bold">{formatINR(payoutAmount)}</strong> payout and start your 48-hour delivery window.
              </p>
            </div>
            <Button
              onClick={() => acceptInvitationMutation.mutate()}
              disabled={acceptInvitationMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 rounded-xl h-10 px-5 shadow-xs cursor-pointer"
            >
              {acceptInvitationMutation.isPending ? "Reserving Ad..." : "Accept & Reserve Ad Slot"}
            </Button>
          </div>
        )}

        {/* BRIEF CHANGE ACKNOWLEDGEMENT BANNER */}
        {needsBriefAcknowledgement && latestBriefInfo && (
          <div className="p-4 md:p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Official Brief Update (Version {latestBriefInfo.version})
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{latestBriefInfo.changesSummary}</p>
              </div>

              <Button
                onClick={() => acknowledgeMutation.mutate(latestVersion)}
                disabled={acknowledgeMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shrink-0 rounded-xl h-9 px-4 shadow-xs cursor-pointer"
              >
                Acknowledge Updates
              </Button>
            </div>
          </div>
        )}

        {/* REVISION REQUESTED ALERT */}
        {participantStatus === "revision_requested" && participant.revisions && participant.revisions.length > 0 && (
          <div className="p-4 md:p-5 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
            <div className="text-destructive font-semibold text-sm">
              Action Required: Brand / Admin Requested a Revision
            </div>
            <div className="text-xs text-foreground p-3 rounded-lg bg-card border border-border/80 space-y-1">
              <p>
                <strong>Reason:</strong> {participant.revisions[0].reason}
              </p>
              <p>
                <strong>Instructions:</strong> {participant.revisions[0].notes}
              </p>
            </div>
          </div>
        )}

        {/* Workspace Navigation Tabs (Brief & File Download, Submit Reel Link, Payout Tracker — Price Negotiation is kept separate) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="h-9 p-1 bg-muted/70 rounded-xl border border-border/60 inline-flex flex-wrap">
            <TabsTrigger
              value="brief"
              className="text-xs font-semibold rounded-lg px-3.5 py-1.5 cursor-pointer"
            >
              Brief & File Download
            </TabsTrigger>
            <TabsTrigger
              value="submit"
              className="text-xs font-semibold rounded-lg px-3.5 py-1.5 cursor-pointer"
            >
              Submit Reel Link
            </TabsTrigger>
            <TabsTrigger
              value="payout"
              className="text-xs font-semibold rounded-lg px-3.5 py-1.5 cursor-pointer"
            >
              Payout Tracker
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CREATIVE BRIEF & ASSETS */}
          <TabsContent value="brief" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                {/* Official Campaign Files & Brief Download Card */}
                <Card className="rounded-xl border-2 border-primary/25 bg-primary/[0.03] p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Campaign Files & Deliverable Pack</h3>
                      <p className="text-xs text-muted-foreground">Download official sponsor assets and the complete brief document</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadBriefPack}
                      className="h-8 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                    >
                      Download Brief Pack (.txt)
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {workspace.productAssets && workspace.productAssets.length > 0 && workspace.productAssets[0] && (
                      <div className="p-3.5 rounded-lg bg-card border border-border/80 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{workspace.productAssets[0].name || "Campaign Media File"}</p>
                          <p className="text-[11px] text-muted-foreground">Official media file uploaded by sponsor</p>
                        </div>
                        <a
                          href={workspace.productAssets[0].url}
                          download={workspace.productAssets[0].name || "campaign-asset"}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center shrink-0 shadow-xs"
                        >
                          Download File
                        </a>
                      </div>
                    )}

                    <div className="p-3.5 rounded-lg bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">Official Campaign Audio Track</h4>
                        <p className="text-[11px] text-muted-foreground">Select this audio on Instagram for your Reel</p>
                      </div>

                      {workspace.audioUrl ? (
                        <a
                          href={workspace.audioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs shrink-0"
                        >
                          Listen / Open Audio
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Audio link included in brief</span>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Description & Instructions */}
                <Card className="rounded-xl border border-border/80 bg-card p-5 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Campaign Brief & Guidelines</h3>
                    <p className="text-xs text-muted-foreground">Instructions provided by sponsor</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{workspace.description}</p>
                  </div>
                </Card>

                {/* Caption, Hashtags & Mentions */}
                <Card className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Mandatory Caption Note</h3>
                      <p className="text-xs text-muted-foreground">Copy and paste into your Reel caption</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyCaption}
                      className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      {copiedCaption ? "Copied" : "Copy Caption"}
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs text-foreground font-mono leading-relaxed">
                    {workspace.requiredCaptionNote}
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Required Mentions
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyMentions}
                        className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {copiedTags ? "Copied" : "Copy Mentions"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(workspace.requiredMentions || []).map((m, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted text-foreground border border-border/60 font-semibold"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Disclosure */}
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground">
                    <strong className="font-semibold text-foreground">Mandatory Disclosure Rule: </strong>
                    Your Reel caption or partnership toggle must state:{" "}
                    <code className="font-mono text-foreground font-semibold">{workspace.disclosureInstructions}</code>
                  </div>
                </Card>
              </div>

              {/* Sidebar: Deadline & Timeline */}
              <div className="space-y-4">
                <Card className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Timeline & Payout</h4>
                  
                  {/* Live Countdown Timer inside Sidebar Card */}
                  {participantStatus === "reserved" && (
                    <LiveCountdownTimer expiresAt={expiryTime} variant="card" />
                  )}

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Deal Window:</span>
                      <span className="font-semibold text-foreground">48 Hours</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">48h Expiry Date:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {expiryTime ? new Date(expiryTime).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '48 Hours'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Locked Escrow:</span>
                      <span className="font-bold text-foreground tabular-nums">
                        {formatINR(payoutAmount)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: DIRECT REEL SUBMISSION */}
          <TabsContent value="submit" className="space-y-4">
            <Card className="rounded-xl border border-border/80 bg-card overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-border/80">
                <CardTitle className="text-base font-bold text-foreground">
                  Submit Published Instagram Reel Link
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Paste your public Instagram Reel URL below. Once submitted, Admin / Brand verifies the video and releases escrow payout to your wallet balance.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {participantStatus === "reserved" && (
                  <LiveCountdownTimer expiresAt={expiryTime} variant="banner" />
                )}

                {participantStatus === "approved" ? (
                  <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs">
                      Approved & Payout Released
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1">Reel Approved</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Submission verified successfully.{" "}
                      <strong className="text-foreground tabular-nums">{formatINR(payoutAmount)}</strong> has been credited to your wallet balance.
                    </p>
                    {participant.submission?.postUrl && (
                      <div className="pt-2">
                        <a
                          href={participant.submission.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
                        >
                          View Published Reel
                        </a>
                      </div>
                    )}
                  </div>
                ) : participantStatus === "content_submitted" ? (
                  <div className="p-6 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-white font-bold text-xs">
                      In Review — Awaiting Admin Approval
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1">Reel Link Submitted</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Your published Instagram Reel link was submitted for review. Admin / Brand verifies the audio track, hashtags, and disclosure before releasing payout.
                    </p>
                    {participant.submission?.postUrl && (
                      <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs font-mono text-foreground break-all max-w-lg mx-auto mt-2">
                        {participant.submission.postUrl}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Direct Submission Form
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Publish your Reel on Instagram, then paste the public share link here within 48 hours.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!liveReelUrl.trim()) {
                          toast.error("Please enter your published Instagram Reel URL");
                          return;
                        }
                        if (!/^https?:\/\/.+/i.test(liveReelUrl.trim())) {
                          toast.error("Please enter a valid link starting with https://");
                          return;
                        }
                        submitReelMutation.mutate({ postUrl: liveReelUrl.trim() });
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-foreground text-xs font-semibold">
                          Published Instagram Reel URL *
                        </Label>
                        <Input
                          value={liveReelUrl}
                          onChange={(e) => setLiveReelUrl(e.target.value)}
                          placeholder="https://www.instagram.com/reel/Cxxxxxx/"
                          className="text-xs h-10 rounded-xl font-mono"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={submitReelMutation.isPending}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-10 rounded-xl px-6 shadow-xs cursor-pointer"
                      >
                        {submitReelMutation.isPending ? "Submitting Link..." : "Submit Reel for Approval & Payout"}
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PAYOUT TRACKER */}
          <TabsContent value="payout" className="space-y-4">
            <Card className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Escrow & Payout Milestones
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compensation is backed by sponsor funds locked in escrow.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-border/80 bg-card text-xs space-y-1.5">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Step 1: Reservation</span>
                  <p className="font-semibold text-foreground text-xs">
                    Slot Reserved
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{formatINR(payoutAmount)} locked in escrow</p>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-card text-xs space-y-1.5">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Step 2: Submission</span>
                  <p className="font-semibold text-foreground text-xs">
                    {participant.submission || participantStatus === "content_submitted" ? "Reel Link Submitted" : "Pending Link Submission"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Published Instagram Reel URL</p>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-card text-xs space-y-1.5">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Step 3: Approval & Payout</span>
                  <p className="font-semibold text-foreground text-xs">
                    {participantStatus === "approved" ? "Funds Released" : "Awaiting Admin Approval"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Withdrawable via UPI / Bank</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* SEPARATE 2-WAY RATE NEGOTIATION CHAT BAR MODAL */}
      <Dialog open={isRateChatOpen} onOpenChange={setIsRateChatOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
          <div>
            <DialogHeader className="sr-only">
              <DialogTitle>Rate Negotiation Chat</DialogTitle>
              <DialogDescription>Two-way rate negotiation chat bar in INR</DialogDescription>
            </DialogHeader>
            <RateNegotiationChat
              campaignId={workspace.id}
              viewerRole="creator"
              brandName={workspace.brand || "Brand"}
              brandLogo={workspace.brandLogo}
              creatorId={Number(participant.creatorId || user?.id || 1)}
              creatorName={participant.creatorName || user?.name || "Creator"}
              creatorHandle={participant.creatorHandle || user?.handle}
              creatorAvatar={participant.creatorAvatar || user?.avatar}
              currentPayoutAmount={Number(payoutAmount || 1200)}
              basePayAmount={Number(workspace.payAmount || payoutAmount || 1200)}
              lastOfferedPrice={Number(participant.lastOfferedPrice || payoutAmount || 1200)}
              lastOfferBy={participant.lastOfferBy}
              negotiationStatus={participant.negotiationStatus}
              messages={workspace.messages || []}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
