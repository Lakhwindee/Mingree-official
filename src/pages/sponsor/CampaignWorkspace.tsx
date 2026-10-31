import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatINR, type WorkspaceParticipant } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SponsorSidebar } from "@/components/SponsorSidebar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  IndianRupee,
  Music2,
  RotateCcw,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

export default function CampaignWorkspace() {
  const [, sponsorParams] = useRoute("/sponsor/campaigns/:id/workspace");
  const [, creatorParams] = useRoute("/campaigns/:id/workspace");
  const campaignId = Number((sponsorParams as any)?.id || (creatorParams as any)?.id || 0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active section tab
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Price Negotiator selected creator ID (as string)
  const [chatThread, setChatThread] = useState<string>("group");
  const [offerAmountInput, setOfferAmountInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isBriefEditOpen, setIsBriefEditOpen] = useState(false);
  const [briefFormData, setBriefFormData] = useState({
    title: "",
    description: "",
    requiredCaptionNote: "",
    requiredTags: "",
    requiredMentions: "",
    disclosureInstructions: "",
    audioUrl: "",
    deadline: "",
    changesSummary: "",
  });

  // Review modal state
  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    participant: WorkspaceParticipant | null;
    action: "approve" | "request_revision" | "reject";
    reason: string;
    notes: string;
  }>({
    isOpen: false,
    participant: null,
    action: "approve",
    reason: "",
    notes: "",
  });

  // Draft review modal state
  const [draftReviewState, setDraftReviewState] = useState<{
    isOpen: boolean;
    participant: WorkspaceParticipant | null;
    action: "approve" | "request_revision";
    notes: string;
  }>({
    isOpen: false,
    participant: null,
    action: "approve",
    notes: "",
  });

  const reviewDraftMutation = useMutation({
    mutationFn: (data: { participantId: number; action: "approve" | "request_revision"; notes?: string }) =>
      api.reviewDraftPreview(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success("Draft preview review processed successfully!");
      setDraftReviewState({ isOpen: false, participant: null, action: "approve", notes: "" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to review draft preview");
    },
  });

  // Fetch full workspace data with continuous 3s polling for real-time messages & updates
  const {
    data: workspace,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["campaignWorkspace", campaignId],
    queryFn: () => api.getCampaignWorkspace(campaignId),
    enabled: !isNaN(campaignId),
    refetchInterval: 3000,
  });

  // Populate brief form data when workspace loads
  useEffect(() => {
    if (workspace && !isBriefEditOpen) {
      setBriefFormData({
        title: workspace.title,
        description: workspace.description,
        requiredCaptionNote: workspace.requiredCaptionNote,
        requiredTags: workspace.requiredTags.join(" "),
        requiredMentions: workspace.requiredMentions.join(" "),
        disclosureInstructions: workspace.disclosureInstructions,
        audioUrl: workspace.audioUrl,
        deadline: workspace.deadline,
        changesSummary: "",
      });
    }
  }, [workspace, isBriefEditOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workspace?.messages, chatThread]);

  // Brief update mutation
  const updateBriefMutation = useMutation({
    mutationFn: (data: { updatedBrief: any; changesSummary: string }) =>
      api.updateCampaignBrief(campaignId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Campaign brief updated and broadcast to all creators.");
      setIsBriefEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update brief");
    },
  });

  // Structured Price Negotiator mutation (no free-text chat)
  const negotiatePriceMutation = useMutation({
    mutationFn: (data: { creatorId: number; action: "offer" | "counter_offer" | "accept" | "decline"; amount: number }) =>
      api.negotiateCampaignPrice(campaignId, data),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      setOfferAmountInput("");
      if (vars.action === "accept") {
        toast.success(`Accepted creator price of ${formatINR(vars.amount)}!`);
      } else if (vars.action === "decline") {
        toast.success("Counter-offer declined. Standing offer maintained.");
      } else {
        toast.success(`Price offer of ${formatINR(vars.amount)} sent to creator!`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send price offer");
    },
  });

  // Review submission mutation
  const reviewSubmissionMutation = useMutation({
    mutationFn: (data: {
      participantId: number;
      action: "approve" | "request_revision" | "reject";
      revisionReason?: string;
      revisionNotes?: string;
      rejectionReason?: string;
    }) => api.reviewReelSubmission(campaignId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Review action processed successfully");
      setReviewModalState({ isOpen: false, participant: null, action: "approve", reason: "", notes: "" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit review");
    },
  });

  // Application accept/decline mutation
  const applicationActionMutation = useMutation({
    mutationFn: ({ participantId, action }: { participantId: number; action: "accept" | "decline" }) =>
      api.handleApplicationAction(campaignId, participantId, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Application updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process application");
    },
  });

  // Accept invitation mutation for creators
  const acceptInvitationMutation = useMutation({
    mutationFn: () => api.acceptCampaignInvitation(campaignId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Campaign invitation accepted & ad slot reserved!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept invitation");
    },
  });

  // Default negotiator selection to first creator participant when loaded
  useEffect(() => {
    if (workspace?.participants?.length && (chatThread === "group" || !chatThread)) {
      setChatThread(String(workspace.participants[0].creatorId));
    }
  }, [workspace?.participants, chatThread]);

  const handleSaveBrief = () => {
    if (!briefFormData.changesSummary.trim()) {
      toast.error("Please provide a brief summary of what changed so creators are clearly informed.");
      return;
    }

    const tagsArray = briefFormData.requiredTags
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const mentionsArray = briefFormData.requiredMentions
      .split(/\s+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0)
      .map((m) => (m.startsWith("@") ? m : `@${m}`));

    updateBriefMutation.mutate({
      updatedBrief: {
        title: briefFormData.title,
        description: briefFormData.description,
        requiredCaptionNote: briefFormData.requiredCaptionNote,
        requiredTags: tagsArray,
        requiredMentions: mentionsArray,
        disclosureInstructions: briefFormData.disclosureInstructions,
        audioUrl: briefFormData.audioUrl,
        deadline: briefFormData.deadline,
      },
      changesSummary: briefFormData.changesSummary.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        {user?.role !== "creator" && <SponsorSidebar />}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-3 text-xs text-muted-foreground">Opening Campaign Folder...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        {user?.role !== "creator" && <SponsorSidebar />}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md rounded-2xl bg-card border border-border p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Workspace Unavailable</h2>
            <p className="text-xs text-muted-foreground mt-2">
              {(error as any)?.message || "You do not have access to this campaign workspace or it does not exist."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] })}
                className="text-xs font-semibold rounded-xl"
              >
                Retry
              </Button>
              <Link href={user?.role === "creator" ? "/dashboard" : "/sponsor/campaigns"}>
                <Button className="text-xs font-semibold rounded-xl">Back to Workspaces</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter messages for currently selected chat thread
  const filteredMessages = workspace.messages.filter((m) => {
    if (chatThread === "group") {
      return m.recipientId === null;
    }
    const targetId = Number(chatThread);
    return (
      (m.senderId === targetId && m.recipientId === workspace.sponsorId) ||
      (m.senderId === workspace.sponsorId && m.recipientId === targetId)
    );
  });

  // Calculate metrics
  const allParticipants = workspace.participants.filter((p) => p.status !== "rejected" && p.status !== "withdrawn");
  const pendingCreators = workspace.participants.filter((p) => p.status === "pending");
  const pendingApplications = workspace.participants.filter((p) => p.status === "applied");
  const reservedCreators = workspace.participants.filter(
    (p) => p.status !== "pending" && p.status !== "applied" && p.status !== "rejected" && p.status !== "withdrawn"
  );
  const currentUserParticipant = workspace.participants.find((p) => Number(p.creatorId) === Number(user?.id));
  const submittedReels = workspace.participants.filter((p) => p.submission !== null);
  const pendingReviews = workspace.participants.filter((p) => p.status === "content_submitted");
  const approvedSubmissions = workspace.participants.filter((p) => p.status === "approved" || p.status === "completed");

  const totalVerifiedViews = submittedReels.reduce((sum, p) => sum + (p.submission?.viewsCount || 0), 0);
  const totalVerifiedLikes = submittedReels.reduce((sum, p) => sum + (p.submission?.likesCount || 0), 0);
  const totalVerifiedComments = submittedReels.reduce((sum, p) => sum + (p.submission?.commentsCount || 0), 0);

  const refundableBalance = Math.max(0, workspace.totalBudget - workspace.releasedPayouts - workspace.committedPayouts);

  const renderCreatorStatusBadge = (status: string) => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          Pending (Ad Not Reserved Yet)
        </span>
      );
    }
    if (status === "applied") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
          Applied — Needs Approval
        </span>
      );
    }
    if (status === "approved" || status === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3" />
          Approved & Paid
        </span>
      );
    }
    if (status === "content_submitted") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30">
          <Video className="h-3 w-3" />
          Reel Submitted — In Review
        </span>
      );
    }
    if (status === "revision_requested") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
          <RotateCcw className="h-3 w-3" />
          Revision Requested
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" />
        Reserved — Active
      </span>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SponsorSidebar />

      <main className="flex-1 w-full min-w-0 overflow-y-auto pb-24 md:pb-10">
        {/* Workspace Top Navigation Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-4 py-3.5 md:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/sponsor/campaigns">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-primary">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Campaign Folder
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-bold ${
                    workspace.status === "filling_slots"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : workspace.status === "under_review"
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
                      : workspace.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                  }`}
                >
                  {workspace.status.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate max-w-md md:max-w-xl">
                {workspace.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => setIsBriefEditOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Update Brief
            </Button>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          {/* Quick Metrics Header Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card className="bg-card border-border p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ad Slots Reserved</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {reservedCreators.length} / {workspace.totalSlots}
                </span>
                {pendingCreators.length > 0 ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    {pendingCreators.length} Pending
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {workspace.remainingSlots} open
                  </span>
                )}
              </div>
            </Card>

            <Card className="bg-card border-border p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Selected Creators</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {allParticipants.length}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {pendingCreators.length} Not Reserved
                </span>
              </div>
            </Card>

            <Card className="bg-card border-border p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Committed Escrow</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-foreground tabular-nums">{formatINR(workspace.committedPayouts)}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total budget: {formatINR(workspace.totalBudget)}</p>
              </div>
            </Card>

            <Card className="bg-card border-border p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-xl font-bold tabular-nums ${pendingReviews.length > 0 ? "text-amber-600" : "text-foreground"}`}>
                  {pendingReviews.length}
                </span>
                {pendingReviews.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
              </div>
            </Card>

            <Card className="bg-card border-border p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Approved Reels</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{approvedSubmissions.length}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Paid: {formatINR(workspace.releasedPayouts)}</p>
              </div>
            </Card>

            <Card className="bg-card border-border p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Verified Views</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-primary tabular-nums">
                  {totalVerifiedViews > 0 ? totalVerifiedViews.toLocaleString() : "0"}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Likes: {totalVerifiedLikes.toLocaleString()}</p>
              </div>
            </Card>
          </div>

          {/* Invitation Acceptance Banner if Logged-in User is Creator */}
          {currentUserParticipant?.status === "pending" && (
            <Card className="bg-amber-500/10 border-amber-500/30 p-4 shadow-xs">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">You've Been Selected for This Campaign!</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {workspace.brand} selected you for this campaign with a payout of{" "}
                    <strong className="text-emerald-600 font-bold">{formatINR(currentUserParticipant.payoutAmount)}</strong>.
                    Accept & reserve your slot now to start creating.
                  </p>
                </div>
                <Button
                  onClick={() => acceptInvitationMutation.mutate()}
                  disabled={acceptInvitationMutation.isPending}
                  className="font-bold text-xs whitespace-nowrap px-6 py-2 rounded-xl shrink-0"
                >
                  {acceptInvitationMutation.isPending ? "Reserving Slot..." : "Accept & Reserve Ad Slot"}
                </Button>
              </div>
            </Card>
          )}

          {/* ================= CAMPAIGN CREATORS & RESERVATION STATUS FOLDER LIST (ALWAYS VISIBLE AT TOP) ================= */}
          <Card className="bg-card border-border shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">
                    Campaign Creators & Ad Reservation Status ({allParticipants.length})
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  All creators selected or participating in <strong className="text-foreground">{workspace.title}</strong> and whether they have reserved their ad slot yet.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Pending: {pendingCreators.length}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Reserved: {reservedCreators.length}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {allParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground text-sm">No Creators in This Campaign Folder Yet</p>
                  <p>As soon as creators reserve slots or are selected for this campaign, they will appear in this list.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allParticipants.map((p, index) => (
                    <div
                      key={p.id || p.creatorId}
                      className="p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                          #{index + 1}
                        </div>
                        <img
                          src={p.creatorAvatar}
                          alt={p.creatorName}
                          className="h-11 w-11 rounded-full object-cover border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-foreground text-sm truncate">{p.creatorName}</h4>
                            <span className="text-xs text-primary font-mono font-medium">{p.creatorHandle}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>
                              Followers: <strong className="text-foreground">{p.creatorFollowers.toLocaleString()}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Payout: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(p.payoutAmount)}</strong>
                            </span>
                            {p.negotiationStatus === "creator_countered" && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  Creator Counter-Offer: {formatINR(p.lastOfferedPrice)}
                                </span>
                              </>
                            )}
                            {p.status !== "pending" && p.reservedAt && (
                              <>
                                <span>•</span>
                                <span>Reserved: {new Date(p.reservedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-border/60">
                        {renderCreatorStatusBadge(p.status)}

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChatThread(String(p.creatorId));
                              setActiveTab("chat");
                            }}
                            className="h-8 px-3 text-xs font-semibold rounded-lg"
                          >
                            <IndianRupee className="mr-1 h-3.5 w-3.5 text-primary" />
                            Negotiate Price
                          </Button>

                          {p.status === "content_submitted" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setReviewModalState({
                                  isOpen: true,
                                  participant: p,
                                  action: "approve",
                                  reason: "",
                                  notes: "",
                                });
                              }}
                              className="h-8 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Review Reel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workspace Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto bg-muted/70 border border-border p-1 rounded-xl h-auto flex flex-nowrap scrollbar-none">
              <TabsTrigger value="overview" className="text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0 font-semibold">
                1. Overview & Brief
              </TabsTrigger>
              <TabsTrigger value="creators" className="text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0 font-semibold">
                2. Creators List ({allParticipants.length})
                {pendingCreators.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold">
                    {pendingCreators.length} Pending
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0 font-semibold">
                3. Price Negotiator (₹)
              </TabsTrigger>
              <TabsTrigger value="submissions" className="text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0 font-semibold">
                4. Reels & Reviews
                {pendingReviews.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold">
                    {pendingReviews.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0 font-semibold">
                5. Performance Analytics
              </TabsTrigger>
              <TabsTrigger value="financials" className="text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0 font-semibold">
                6. Escrow & Ledger
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & BRIEF */}
            <TabsContent value="overview" className="space-y-6 mt-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Campaign Brief Card */}
                  <Card className="bg-card border-border shadow-2xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">Campaign Creative Brief</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Current instructions visible to all participating creators (Version {workspace.briefVersions.length})
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsBriefEditOpen(true)}
                        className="text-xs font-semibold rounded-lg"
                      >
                        Edit Brief
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border">
                        <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
                          Description & Creative Angle
                        </Label>
                        <p className="mt-1.5 text-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {workspace.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                          <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
                            Required Audio Track
                          </Label>
                          {workspace.audioUrl ? (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={workspace.audioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 truncate font-medium"
                              >
                                <Music2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{workspace.audioUrl}</span>
                              </a>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">No audio file specified</p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                          <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
                            Mandatory Disclosure
                          </Label>
                          <div className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-mono">
                            {workspace.disclosureInstructions}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                        <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
                          Required Caption & Mentions
                        </Label>
                        <div className="bg-background p-3 rounded-lg border border-border text-xs text-foreground font-mono">
                          {workspace.requiredCaptionNote}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {workspace.requiredTags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-mono">
                              {tag}
                            </Badge>
                          ))}
                          {workspace.requiredMentions.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-primary border-primary/30 font-mono">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Single Brand Promotional File */}
                      {workspace.productAssets && workspace.productAssets.length > 0 && workspace.productAssets[0] && (
                        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                          <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wider">
                            Brand Promotional File
                          </Label>
                          {(() => {
                            const asset = workspace.productAssets[0];
                            return (
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border text-xs text-foreground hover:border-primary/40 mt-1"
                              >
                                <span className="truncate mr-2 font-medium">{asset.name || "Brand Promotional File"}</span>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </a>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Brief Version History */}
                  <Card className="bg-card border-border shadow-2xs">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-foreground">
                        Brief Revision & Change History
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Audit trail of all material changes made to this campaign brief
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {workspace.briefVersions.map((v) => (
                        <div key={v.version} className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <Badge className="text-[10px] px-1.5 py-0">v{v.version}</Badge>
                              {v.changesSummary}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{new Date(v.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Campaign Info Sidebar */}
                <div className="space-y-6">
                  <Card className="bg-card border-border p-5 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Campaign Parameters</h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Booking Model</span>
                        <span className="font-bold text-foreground uppercase">{workspace.bookingModel}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Payout per Creator</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatINR(workspace.payAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Total Budget</span>
                        <span className="font-bold text-foreground">{formatINR(workspace.totalBudget)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Min. Followers</span>
                        <span className="font-medium text-foreground">{workspace.minFollowers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Target Cities</span>
                        <span className="font-medium text-foreground text-right">
                          {workspace.targetCities.length > 0 ? workspace.targetCities.join(", ") : "All India"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Submission Window</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">48 Hours</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Campaign Deadline</span>
                        <span className="font-medium text-foreground">{workspace.deadline}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Brand Profile Preview */}
                  <Card className="bg-card border-border p-5 space-y-3 shadow-2xs">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Brand Representation</h3>
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={workspace.brandLogo}
                        alt={workspace.brand}
                        className="h-12 w-12 rounded-xl object-cover border border-border"
                      />
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{workspace.brand}</h4>
                        <p className="text-xs text-muted-foreground">{workspace.genre} • {workspace.language}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CREATORS & APPLICANTS DETAILED BREAKDOWN */}
            <TabsContent value="creators" className="space-y-6 mt-5">
              {/* Selected Creators (Pending Reservation) */}
              {pendingCreators.length > 0 && (
                <Card className="bg-card border-amber-500/40 shadow-2xs">
                  <CardHeader className="pb-3 border-b border-amber-500/20 bg-amber-500/5">
                    <CardTitle className="text-base text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        Chosen Creators — Pending Ad Reservation ({pendingCreators.length})
                      </span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                        Not Reserved Yet
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Creators you selected when launching this campaign. Their status automatically changes to Reserved once they accept & reserve the ad slot.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {pendingCreators.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/20 border border-border gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.creatorAvatar} alt={p.creatorName} className="h-11 w-11 rounded-full object-cover border border-border" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-foreground text-sm">{p.creatorName}</h4>
                              <span className="text-xs text-primary font-mono">{p.creatorHandle}</span>
                              {renderCreatorStatusBadge(p.status)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>Followers: <strong className="text-foreground">{p.creatorFollowers.toLocaleString()}</strong></span>
                              <span>•</span>
                              <span>Offered Payout: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(p.payoutAmount)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChatThread(String(p.creatorId));
                              setActiveTab("chat");
                            }}
                            className="text-xs rounded-lg"
                          >
                            <IndianRupee className="mr-1 h-3.5 w-3.5 text-primary" /> Negotiate Price
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Pending Applications Section */}
              {pendingApplications.length > 0 && (
                <Card className="bg-card border-primary/30 shadow-2xs">
                  <CardHeader className="pb-3 border-b border-border bg-primary/5">
                    <CardTitle className="text-base text-foreground flex items-center justify-between">
                      <span>Pending Creator Applications ({pendingApplications.length})</span>
                      <Badge>Action Required</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      These creators have applied for a slot. Review their Instagram credentials and approve or decline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {pendingApplications.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/20 border border-border gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.creatorAvatar} alt={p.creatorName} className="h-11 w-11 rounded-full object-cover border border-border" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-foreground text-sm">{p.creatorName}</h4>
                              <span className="text-xs text-primary font-mono">{p.creatorHandle}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>Followers: <strong className="text-foreground">{p.creatorFollowers.toLocaleString()}</strong></span>
                              <span>•</span>
                              <span>Avg Reel Views: <strong className="text-foreground">{p.creatorMedianViews.toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applicationActionMutation.mutate({ participantId: p.id, action: "decline" })}
                            disabled={applicationActionMutation.isPending}
                            className="text-xs"
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applicationActionMutation.mutate({ participantId: p.id, action: "accept" })}
                            disabled={applicationActionMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
                          >
                            Accept Application
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Reserved and Active Participants List */}
              <Card className="bg-card border-border shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground">Confirmed & Reserved Creators ({reservedCreators.length})</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Creators who have actively reserved their ad slot in this campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {reservedCreators.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      No creators have reserved their ad slot yet. Chosen creators above are currently in Pending status.
                    </div>
                  ) : (
                    reservedCreators.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/20 border border-border gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.creatorAvatar} alt={p.creatorName} className="h-11 w-11 rounded-full object-cover border border-border" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-foreground text-sm">{p.creatorName}</h4>
                              <span className="text-xs text-primary font-mono">{p.creatorHandle}</span>
                              {renderCreatorStatusBadge(p.status)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>Reserved: {new Date(p.reservedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Payout: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(p.payoutAmount)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChatThread(String(p.creatorId));
                              setActiveTab("chat");
                            }}
                            className="text-xs"
                          >
                            <IndianRupee className="mr-1 h-3.5 w-3.5 text-primary" /> Negotiate Price
                          </Button>
                          {p.status === "content_submitted" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setReviewModalState({
                                  isOpen: true,
                                  participant: p,
                                  action: "approve",
                                  reason: "",
                                  notes: "",
                                });
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
                            >
                              Review Reel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: STRUCTURED PRICE NEGOTIATOR (NO FREE-TEXT CHAT) */}
            <TabsContent value="chat" className="space-y-4 mt-5">
              <Card className="bg-card border-border overflow-hidden shadow-2xs">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Left Sidebar: Campaign Creators List for Negotiation */}
                  <div className="p-4 space-y-3 bg-muted/20">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        Select Creator to Negotiate
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Propose custom deal prices in ₹. Free-text chat is disabled.
                      </p>
                    </div>

                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                      {allParticipants.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No creators in this campaign yet.
                        </div>
                      ) : (
                        allParticipants.map((p) => {
                          const isSelected = String(chatThread) === String(p.creatorId);
                          return (
                            <button
                              key={p.creatorId}
                              type="button"
                              onClick={() => setChatThread(String(p.creatorId))}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all border ${
                                isSelected
                                  ? "bg-primary/10 text-primary border-primary/30 font-bold shadow-2xs"
                                  : "bg-background/60 text-foreground border-border/60 hover:bg-muted"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 text-left">
                                <img
                                  src={p.creatorAvatar}
                                  alt={p.creatorName}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-border"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground">{p.creatorName}</p>
                                  <span className="text-[10px] text-muted-foreground font-mono block truncate">
                                    {p.creatorHandle}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                                  {formatINR(p.payoutAmount)}
                                </span>
                                {p.negotiationStatus === "creator_countered" && (
                                  <span className="text-[9px] text-amber-600 font-bold block">
                                    Ask: {formatINR(p.lastOfferedPrice)}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Panel: Structured Price Negotiator Controls & Offer History */}
                  <div className="md:col-span-3 flex flex-col bg-background p-5 space-y-5">
                    {(() => {
                      const activeCreator =
                        allParticipants.find((p) => Number(p.creatorId) === Number(chatThread)) ||
                        allParticipants[0] ||
                        null;

                      if (!activeCreator) {
                        return (
                          <div className="py-20 text-center text-xs text-muted-foreground">
                            Select a creator from the left panel to propose or negotiate deal pricing.
                          </div>
                        );
                      }

                      const creatorOfferHistory = workspace.messages.filter(
                        (m) =>
                          ((m.senderId === activeCreator.creatorId && m.recipientId === workspace.sponsorId) ||
                            (m.senderId === workspace.sponsorId && m.recipientId === activeCreator.creatorId)) &&
                          (m.negotiationOffer || m.content.includes("₹"))
                      );

                      return (
                        <>
                          {/* Selected Creator Negotiation Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                            <div className="flex items-center gap-3">
                              <img
                                src={activeCreator.creatorAvatar}
                                alt={activeCreator.creatorName}
                                className="h-12 w-12 rounded-full object-cover border border-border"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-foreground">{activeCreator.creatorName}</h4>
                                  <span className="text-xs font-mono text-primary">{activeCreator.creatorHandle}</span>
                                  {renderCreatorStatusBadge(activeCreator.status)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Followers: <strong>{activeCreator.creatorFollowers.toLocaleString()}</strong> • Median Views:{" "}
                                  <strong>{activeCreator.creatorMedianViews.toLocaleString()}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right">
                                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                                  Current Brand Offer
                                </span>
                                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  {formatINR(activeCreator.payoutAmount)}
                                </span>
                              </div>
                              {activeCreator.negotiationStatus === "creator_countered" && (
                                <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
                                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                                    Creator Counter-Offer
                                  </span>
                                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                                    {formatINR(activeCreator.lastOfferedPrice)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* If Creator Sent a Counter-Offer: Accept or Decline Banner */}
                          {activeCreator.negotiationStatus === "creator_countered" && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h5 className="text-xs font-bold text-foreground">
                                  {activeCreator.creatorName} proposed a Counter-Offer of{" "}
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {formatINR(activeCreator.lastOfferedPrice)}
                                  </span>
                                </h5>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  You can accept the creator's counter-offer, decline it, or send a new price offer below.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={negotiatePriceMutation.isPending}
                                  onClick={() =>
                                    negotiatePriceMutation.mutate({
                                      creatorId: activeCreator.creatorId,
                                      action: "decline",
                                      amount: activeCreator.payoutAmount,
                                    })
                                  }
                                  className="text-xs font-semibold rounded-xl"
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={negotiatePriceMutation.isPending}
                                  onClick={() =>
                                    negotiatePriceMutation.mutate({
                                      creatorId: activeCreator.creatorId,
                                      action: "accept",
                                      amount: activeCreator.lastOfferedPrice || activeCreator.payoutAmount,
                                    })
                                  }
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  Accept {formatINR(activeCreator.lastOfferedPrice)}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Brand Price Offer Box (Strictly Price Input — No Free-Text Typing) */}
                          <div className="p-4 rounded-xl bg-muted/25 border border-border space-y-3.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <IndianRupee className="h-3.5 w-3.5 text-primary" />
                                  Propose Brand Price Offer (₹)
                                </Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Select a preset rate or enter your custom price offer in INR for {activeCreator.creatorName}.
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                Price-Only Negotiator
                              </Badge>
                            </div>

                            {/* Quick Preset Price Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {[1000, 1200, 1500, 2000, 2500, 3500, 5000, 10000].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setOfferAmountInput(String(preset))}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    Number(offerAmountInput) === preset
                                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                                      : "bg-background hover:bg-muted border-border text-foreground"
                                  }`}
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
                                  value={offerAmountInput}
                                  onChange={(e) => setOfferAmountInput(e.target.value.replace(/[^0-9]/g, ""))}
                                  placeholder="Enter your price offer in ₹ (e.g. 1500)"
                                  className="pl-8 h-10 rounded-xl text-xs font-bold bg-background"
                                />
                              </div>
                              <Button
                                type="button"
                                disabled={
                                  !offerAmountInput ||
                                  Number(offerAmountInput) <= 0 ||
                                  negotiatePriceMutation.isPending
                                }
                                onClick={() =>
                                  negotiatePriceMutation.mutate({
                                    creatorId: activeCreator.creatorId,
                                    action: "offer",
                                    amount: Number(offerAmountInput),
                                  })
                                }
                                className="h-10 px-6 rounded-xl text-xs font-bold shrink-0"
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                {negotiatePriceMutation.isPending ? "Sending Offer..." : "Send Price Offer"}
                              </Button>
                            </div>
                          </div>

                          {/* Structured Negotiation Offer History */}
                          <div className="space-y-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                              Negotiation Timeline with {activeCreator.creatorName}
                            </span>

                            {creatorOfferHistory.length === 0 ? (
                              <div className="p-6 rounded-xl bg-muted/15 border border-border text-center text-xs text-muted-foreground">
                                Initial campaign offer for {activeCreator.creatorName} is{" "}
                                <strong className="text-foreground">{formatINR(activeCreator.payoutAmount)}</strong>.
                                Any new price offers or counter-offers will appear here.
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {creatorOfferHistory.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className="p-3 rounded-xl bg-muted/20 border border-border flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Badge
                                        variant={msg.senderRole === "sponsor" ? "default" : "secondary"}
                                        className="text-[10px] uppercase"
                                      >
                                        {msg.senderRole === "sponsor" ? "Your Brand Offer" : "Creator Response"}
                                      </Badge>
                                      <span className="font-semibold text-foreground">{msg.content}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {new Date(msg.createdAt).toLocaleString([], {
                                        month: "short",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 4: REEL SUBMISSIONS & APPROVALS */}
            <TabsContent value="submissions" className="space-y-6 mt-5">
              {/* Draft Video Previews Review Queue */}
              <Card className="bg-card border-border shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground">Draft Video Previews Review Queue (Pre-Post)</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Approve or request revisions on draft videos uploaded by creators before they publish live on Instagram.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {workspace.participants.filter((p) => p.draftSubmission !== null).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      <p>No draft video previews submitted yet.</p>
                    </div>
                  ) : (
                    workspace.participants
                      .filter((p) => p.draftSubmission !== null)
                      .map((p) => {
                        const draft = p.draftSubmission!;
                        return (
                          <div key={p.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={p.creatorAvatar} alt="" className="h-9 w-9 rounded-full object-cover border border-border" />
                                <div>
                                  <h4 className="font-bold text-foreground text-sm">
                                    {p.creatorName} <span className="text-xs text-primary font-mono">({p.creatorHandle})</span>
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    Submitted Draft: {new Date(draft.submittedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs font-bold uppercase">
                                {(p.draftStatus || "submitted").replace("_", " ")}
                              </Badge>
                            </div>

                            <div className="p-3 rounded-lg bg-background border border-border space-y-2">
                              <a
                                href={draft.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline font-mono flex items-center gap-1.5 truncate"
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                {draft.videoUrl}
                              </a>
                              {draft.notes && (
                                <p className="text-xs text-muted-foreground">
                                  <strong className="text-foreground">Creator Note:</strong> "{draft.notes}"
                                </p>
                              )}
                            </div>

                            {p.draftStatus === "submitted" && (
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDraftReviewState({
                                      isOpen: true,
                                      participant: p,
                                      action: "request_revision",
                                      notes: "",
                                    });
                                  }}
                                  className="text-xs"
                                >
                                  Request Changes
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    reviewDraftMutation.mutate({
                                      participantId: p.id,
                                      action: "approve",
                                    });
                                  }}
                                  disabled={reviewDraftMutation.isPending}
                                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs"
                                >
                                  Approve Draft Preview
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </CardContent>
              </Card>

              {/* Submitted Instagram Reels Review Queue */}
              <Card className="bg-card border-border shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground">Submitted Instagram Reels Review Queue</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Verify published Reels, check audio & hashtag compliance, approve escrow releases or request revisions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {submittedReels.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
                      <p className="font-medium text-foreground">No creators have submitted Reel links yet.</p>
                      <p>Reserved creators have 48 hours to produce and publish their Reels.</p>
                    </div>
                  ) : (
                    submittedReels.map((p) => {
                      const sub = p.submission!;
                      return (
                        <div key={p.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={p.creatorAvatar} alt="" className="h-10 w-10 rounded-full object-cover border border-border" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-foreground text-sm">{p.creatorName}</h4>
                                  <span className="text-xs text-primary font-mono">{p.creatorHandle}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Submitted: {new Date(sub.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {renderCreatorStatusBadge(p.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-background border border-border">
                            <div className="md:col-span-2 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Instagram Reel Link</span>
                              <a
                                href={sub.postUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline font-mono flex items-center gap-1.5 truncate"
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                {sub.postUrl}
                              </a>
                            </div>

                            <div className="flex items-center justify-around border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0">
                              <div className="text-center">
                                <span className="text-[10px] text-muted-foreground uppercase">Views</span>
                                <p className="text-sm font-bold text-foreground">{sub.viewsCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] text-muted-foreground uppercase">Likes</span>
                                <p className="text-sm font-bold text-foreground">{sub.likesCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] text-muted-foreground uppercase">Comments</span>
                                <p className="text-sm font-bold text-foreground">{sub.commentsCount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          {p.status === "content_submitted" && (
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReviewModalState({
                                    isOpen: true,
                                    participant: p,
                                    action: "reject",
                                    reason: "Creative does not meet requirements",
                                    notes: "",
                                  });
                                }}
                                className="text-destructive border-destructive/30 text-xs"
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReviewModalState({
                                    isOpen: true,
                                    participant: p,
                                    action: "request_revision",
                                    reason: "Audio sound tag or caption missing",
                                    notes: "Please re-upload with the official audio snippet and mandatory #ad tag.",
                                  });
                                }}
                                className="text-xs"
                              >
                                Request Revision
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewModalState({
                                    isOpen: true,
                                    participant: p,
                                    action: "approve",
                                    reason: "",
                                    notes: "",
                                  });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs"
                              >
                                Approve Reel & Release {formatINR(p.payoutAmount)}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: PERFORMANCE ANALYTICS */}
            <TabsContent value="performance" className="space-y-6 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card border-border p-5 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-muted-foreground">Total Campaign Views</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-foreground">{totalVerifiedViews.toLocaleString()}</span>
                    <span className="text-xs text-primary font-semibold">{submittedReels.length} Reels live</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Aggregated across all verified Instagram Reels</p>
                </Card>

                <Card className="bg-card border-border p-5 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-muted-foreground">Average Views Per Reel</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {submittedReels.length > 0
                        ? Math.round(totalVerifiedViews / submittedReels.length).toLocaleString()
                        : "0"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Organic creator reach multiplier</p>
                </Card>

                <Card className="bg-card border-border p-5 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-muted-foreground">Estimated Total Interactions</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-primary">
                      {(totalVerifiedLikes + totalVerifiedComments).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalVerifiedLikes.toLocaleString()} Likes • {totalVerifiedComments.toLocaleString()} Comments
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 6: ESCROW & FINANCIAL LEDGER */}
            <TabsContent value="financials" className="space-y-6 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-card border-border p-4 shadow-2xs">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground">Total Allocated Budget</span>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatINR(workspace.totalBudget)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Locked at campaign creation</p>
                </Card>
                <Card className="bg-card border-border p-4 shadow-2xs">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground">Committed Payouts</span>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatINR(workspace.committedPayouts)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{reservedCreators.length} slots reserved</p>
                </Card>
                <Card className="bg-card border-border p-4 shadow-2xs">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground">Released Payouts</span>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(workspace.releasedPayouts)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{approvedSubmissions.length} Reels approved</p>
                </Card>
                <Card className="bg-card border-border p-4 shadow-2xs">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground">Refundable Balance</span>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatINR(refundableBalance)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Unfilled slots balance</p>
                </Card>
              </div>

              <Card className="bg-card border-border p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-foreground mb-2">Escrow Financial Integrity</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All funds are held in secure escrow. Payouts are committed atomically upon creator reservation and released
                  directly into creator wallets upon your Reel approval. Any remaining balance from unfilled slots is 100%
                  refundable if the campaign is paused or closed.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* BRIEF EDIT & VERSIONING MODAL */}
      <Dialog open={isBriefEditOpen} onOpenChange={setIsBriefEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Update Campaign Brief & Notify Creators</DialogTitle>
            <DialogDescription className="text-xs">
              Any changes made here will be versioned, recorded in the audit history, and broadcast to all participating creators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Campaign Title</Label>
              <Input
                value={briefFormData.title}
                onChange={(e) => setBriefFormData({ ...briefFormData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Campaign Brief & Description</Label>
              <Textarea
                rows={3}
                value={briefFormData.description}
                onChange={(e) => setBriefFormData({ ...briefFormData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Audio Track Link</Label>
                <Input
                  value={briefFormData.audioUrl}
                  onChange={(e) => setBriefFormData({ ...briefFormData, audioUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Campaign Deadline</Label>
                <Input
                  type="date"
                  value={briefFormData.deadline}
                  onChange={(e) => setBriefFormData({ ...briefFormData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
              <Label className="font-bold">What Changed? (Reason for update)</Label>
              <Input
                placeholder="e.g. Added #MingreePromotions and updated audio snippet link"
                value={briefFormData.changesSummary}
                onChange={(e) => setBriefFormData({ ...briefFormData, changesSummary: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBriefEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBrief} disabled={updateBriefMutation.isPending}>
              Save Brief & Broadcast v{workspace.briefVersions.length + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REEL REVIEW MODAL */}
      <Dialog
        open={reviewModalState.isOpen}
        onOpenChange={(open) => !open && setReviewModalState({ ...reviewModalState, isOpen: false })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {reviewModalState.action === "approve"
                ? "Approve Reel & Release Payout"
                : reviewModalState.action === "request_revision"
                ? "Request Revision from Creator"
                : "Reject Submission"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Creator: {reviewModalState.participant?.creatorName} ({reviewModalState.participant?.creatorHandle})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {reviewModalState.action === "approve" ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-foreground">
                <p>
                  Approving this submission will release{" "}
                  <strong>{formatINR(reviewModalState.participant?.payoutAmount || workspace.payAmount)}</strong> directly
                  from your campaign escrow into the creator's wallet balance.
                </p>
              </div>
            ) : reviewModalState.action === "request_revision" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Revision Reason</Label>
                  <Input
                    value={reviewModalState.reason}
                    onChange={(e) => setReviewModalState({ ...reviewModalState, reason: e.target.value })}
                    placeholder="e.g. Missing required hashtag or wrong audio snippet"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Specific Feedback & Instructions</Label>
                  <Textarea
                    rows={3}
                    value={reviewModalState.notes}
                    onChange={(e) => setReviewModalState({ ...reviewModalState, notes: e.target.value })}
                    placeholder="Describe exactly what needs to be changed in the re-submitted Reel..."
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>Rejection Reason</Label>
                <Input
                  value={reviewModalState.reason}
                  onChange={(e) => setReviewModalState({ ...reviewModalState, reason: e.target.value })}
                  placeholder="e.g. Video violates guidelines or content completely off-brief"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewModalState({ ...reviewModalState, isOpen: false })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reviewModalState.participant) return;
                reviewSubmissionMutation.mutate({
                  participantId: reviewModalState.participant.id,
                  action: reviewModalState.action,
                  revisionReason: reviewModalState.reason,
                  revisionNotes: reviewModalState.notes,
                  rejectionReason: reviewModalState.reason,
                });
              }}
              disabled={reviewSubmissionMutation.isPending}
              className={
                reviewModalState.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : reviewModalState.action === "request_revision"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-destructive text-destructive-foreground"
              }
            >
              {reviewModalState.action === "approve"
                ? "Confirm & Release Funds"
                : reviewModalState.action === "request_revision"
                ? "Send Revision Request"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DRAFT REVIEW MODAL */}
      <Dialog
        open={draftReviewState.isOpen}
        onOpenChange={(open) => !open && setDraftReviewState({ ...draftReviewState, isOpen: false })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Changes / Reject Draft Preview</DialogTitle>
            <DialogDescription className="text-xs">
              Creator: {draftReviewState.participant?.creatorName} ({draftReviewState.participant?.creatorHandle})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold">Feedback Notes & Required Changes *</Label>
              <Textarea
                rows={4}
                value={draftReviewState.notes}
                onChange={(e) => setDraftReviewState({ ...draftReviewState, notes: e.target.value })}
                placeholder="Explain what changes are needed..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDraftReviewState({ ...draftReviewState, isOpen: false })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!draftReviewState.participant || !draftReviewState.notes.trim()) {
                  toast.error("Please enter feedback notes for the creator.");
                  return;
                }
                reviewDraftMutation.mutate({
                  participantId: draftReviewState.participant.id,
                  action: "request_revision",
                  notes: draftReviewState.notes.trim(),
                });
              }}
              disabled={reviewDraftMutation.isPending || !draftReviewState.notes.trim()}
            >
              Send Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
