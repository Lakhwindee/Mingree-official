import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatINR } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SponsorSidebar } from "@/components/SponsorSidebar";
import { RateNegotiationChat } from "@/components/RateNegotiationChat";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Heart,
  IndianRupee,
  MessageCircle,
  MessageSquare,
  Music2,
  RotateCcw,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";

export default function CampaignWorkspace() {
  const [, sponsorParams] = useRoute("/sponsor/campaigns/:id/workspace");
  const [, creatorParams] = useRoute("/campaigns/:id/workspace");
  const campaignId = Number((sponsorParams as any)?.id || (creatorParams as any)?.id || 0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Initially null so ONLY the creators list is displayed until the user clicks a creator row
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState<string>("");
  const [showRevisionInputFor, setShowRevisionInputFor] = useState<number | null>(null);
  const [isEditDescOpen, setIsEditDescOpen] = useState(false);
  const [editDescText, setEditDescText] = useState("");

  const {
    data: workspace,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["campaignWorkspace", campaignId],
    queryFn: () => api.getCampaignWorkspace(campaignId),
    enabled: !isNaN(campaignId) && campaignId > 0,
    refetchInterval: 3000,
  });

  const allParticipants = (workspace?.participants || []).filter(
    (p) => p.status !== "rejected" && p.status !== "withdrawn"
  );

  const reviewSubmissionMutation = useMutation({
    mutationFn: (data: {
      participantId: number;
      action: "approve" | "request_revision" | "reject";
      reason?: string;
      notes?: string;
    }) => api.reviewReelSubmission(campaignId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      setRevisionNote("");
      setShowRevisionInputFor(null);
      toast.success(data.message || "Reel review updated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update reel review");
    },
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: (newDesc: string) =>
      api.updateCampaignBrief(campaignId, {
        updatedBrief: {
          description: newDesc.trim(),
          requiredCaptionNote: newDesc.trim(),
        },
        changesSummary: "Campaign description updated by brand partner",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setIsEditDescOpen(false);
      toast.success("Campaign description updated for all creators!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update campaign description");
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        {user?.role !== "creator" && <SponsorSidebar />}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
            <h2 className="text-lg font-bold text-foreground">Campaign Not Found</h2>
            <p className="text-xs text-muted-foreground mt-2">
              {(error as any)?.message || "Unable to load this campaign folder."}
            </p>
            <div className="mt-5">
              <Link href="/sponsor/campaigns">
                <Button className="text-xs font-semibold rounded-xl">Back to Campaigns</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pendingCreators = allParticipants.filter((p) => p.status === "pending");
  const reservedCreators = allParticipants.filter((p) => p.status !== "pending");

  const renderCreatorStatusBadge = (status: string) => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          Pending (Not Reserved Yet)
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
          Reel Submitted
        </span>
      );
    }
    if (status === "revision_requested") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
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

      <main className="flex-1 w-full min-w-0 overflow-y-auto pb-20 md:pb-10">
        {/* Clean Minimal Top Bar */}
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
                <button
                  type="button"
                  onClick={() => {
                    setEditDescText(workspace?.description || workspace?.requiredCaptionNote || "");
                    setIsEditDescOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  title="Change campaign description & notes for all creators"
                >
                  <MessageSquare className="h-3 w-3 text-primary" />
                  <span>Edit Note</span>
                </button>
              </div>
              <h1 className="text-lg font-bold text-foreground truncate">
                {workspace.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Pending: {pendingCreators.length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Reserved: {reservedCreators.length}
            </span>
          </div>
        </div>

        {/* Creators List — Click any creator row to expand all options below it */}
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <Card className="bg-card border-border shadow-xs overflow-hidden rounded-2xl">
            <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Selected Creators ({allParticipants.length})
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                Click on any creator to open Rate Chat & Reel Details
              </span>
            </CardHeader>

            <CardContent className="p-0">
              {allParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No creators in this campaign yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allParticipants.map((p, index) => {
                    const isExpanded = Number(selectedCreatorId) === Number(p.creatorId);

                    return (
                      <div key={p.id || p.creatorId} className="transition-colors">
                        {/* Clickable Creator Row */}
                        <div
                          onClick={() =>
                            setSelectedCreatorId(isExpanded ? null : p.creatorId)
                          }
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            isExpanded ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-6 w-6 rounded-md bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                              #{index + 1}
                            </div>
                            <img
                              src={p.creatorAvatar}
                              alt={p.creatorName}
                              className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-foreground text-sm truncate">
                                  {p.creatorName}
                                </h4>
                                <span className="text-xs text-primary font-mono">
                                  {p.creatorHandle}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                <span>
                                  Rate:{" "}
                                  <strong className="text-emerald-600 dark:text-emerald-400">
                                    {formatINR(p.payoutAmount)}
                                  </strong>
                                </span>
                                {p.negotiationStatus === "creator_countered" &&
                                  p.lastOfferedPrice &&
                                  p.lastOfferedPrice <= (p.baseRate || workspace.payAmount || 1200) && (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      • Creator Offer: {formatINR(p.lastOfferedPrice)}
                                    </span>
                                  )}
                                {p.negotiationStatus === "accepted" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-emerald-500/40 text-emerald-600 px-1.5 py-0"
                                  >
                                    Rate Locked
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                            {renderCreatorStatusBadge(p.status)}

                            <Button
                              size="sm"
                              variant={isExpanded ? "default" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCreatorId(isExpanded ? null : p.creatorId);
                              }}
                              className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              {p.negotiationStatus === "accepted" ||
                              p.status === "approved" ||
                              p.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                                  Creator Details
                                </>
                              ) : (
                                <>
                                  <IndianRupee className="mr-1 h-3.5 w-3.5" />
                                  Rate Chat (₹)
                                </>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="ml-1.5 h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Drawer Below the Clicked Creator */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 bg-muted/15 border-t border-border space-y-5">
                            {/* 1. Creator & Reel Information Panel */}
                            <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                                <div className="flex items-center gap-2">
                                  <Video className="h-4 w-4 text-primary" />
                                  <h5 className="text-xs sm:text-sm font-bold text-foreground">
                                    Reel & Deal Information — {p.creatorName} ({p.creatorHandle})
                                  </h5>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    Followers:{" "}
                                    <strong className="text-foreground">
                                      {(p.creatorFollowers || 0).toLocaleString("en-IN")}
                                    </strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Avg Views:{" "}
                                    <strong className="text-foreground">
                                      {(p.creatorMedianViews || 0).toLocaleString("en-IN")}
                                    </strong>
                                  </span>
                                </div>
                              </div>

                              {/* Deal & Brief Quick Summary */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="rounded-xl bg-muted/30 border border-border p-3">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                    Ad Slot Status
                                  </span>
                                  <span className="text-xs font-bold text-foreground mt-1 block">
                                    {p.status === "pending"
                                      ? "Pending (Not Reserved)"
                                      : p.status === "content_submitted"
                                      ? "Reel Submitted"
                                      : p.status === "approved" || p.status === "completed"
                                      ? "Approved & Paid"
                                      : "Reserved — Active"}
                                  </span>
                                </div>

                                <div className="rounded-xl bg-muted/30 border border-border p-3">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                    Current Deal Rate
                                  </span>
                                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                    {formatINR(p.payoutAmount)}
                                  </span>
                                </div>

                                <div className="rounded-xl bg-muted/30 border border-border p-3">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                    Reserved On
                                  </span>
                                  <span className="text-xs font-semibold text-foreground mt-1 block">
                                    {p.status === "pending"
                                      ? "Waiting for Creator"
                                      : p.reservedAt
                                      ? new Date(p.reservedAt).toLocaleDateString("en-IN")
                                      : "Reserved"}
                                  </span>
                                </div>

                                <div className="rounded-xl bg-muted/30 border border-border p-3">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                    Campaign Deadline
                                  </span>
                                  <span className="text-xs font-semibold text-foreground mt-1 block">
                                    {workspace.deadline || "Flexible"}
                                  </span>
                                </div>
                              </div>

                              {/* Campaign Instructions & Mentions/Tags Briefing Strip */}
                              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Campaign Brief & Instructions
                                  </span>
                                  <p className="text-foreground mt-0.5 text-xs leading-relaxed whitespace-pre-line">
                                    {workspace.description || workspace.requiredCaptionNote || "Promote brand audio / product on Instagram Reels across top creator channels."}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60 text-[11px]">
                                  {workspace.requiredMentions && workspace.requiredMentions.length > 0 && (
                                    <span className="font-semibold text-primary">
                                      Mentions: {workspace.requiredMentions.join(" ")}
                                    </span>
                                  )}
                                  {workspace.requiredTags && workspace.requiredTags.length > 0 && (
                                    <span className="text-muted-foreground">
                                      Tags: {workspace.requiredTags.join(" ")}
                                    </span>
                                  )}
                                  <span className="text-muted-foreground/80">
                                    {workspace.disclosureInstructions || "#ad | Paid Partnership"}
                                  </span>
                                </div>
                              </div>

                              {/* Submitted Reel Details or Waiting State */}
                              {p.submission?.postUrl ? (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">
                                          Submitted Instagram Reel
                                        </span>
                                        {p.submission.liveVerified && (
                                          <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0">
                                            <ShieldCheck className="h-3 w-3 mr-1" />
                                            Verified Live
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        Submitted on{" "}
                                        {new Date(p.submission.submittedAt).toLocaleString("en-IN")}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <a
                                        href={p.submission.postUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open Reel Link
                                      </a>
                                      {p.submission.proofScreenshotUrl && (
                                        <a
                                          href={p.submission.proofScreenshotUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                          View Proof
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reel Performance Metrics */}
                                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                                    <div className="rounded-lg bg-card border border-border p-2.5 flex items-center gap-2">
                                      <Eye className="h-4 w-4 text-primary shrink-0" />
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">
                                          Views
                                        </span>
                                        <span className="text-xs font-bold text-foreground">
                                          {(p.submission.viewsCount || 0).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="rounded-lg bg-card border border-border p-2.5 flex items-center gap-2">
                                      <Heart className="h-4 w-4 text-rose-500 shrink-0" />
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">
                                          Likes
                                        </span>
                                        <span className="text-xs font-bold text-foreground">
                                          {(p.submission.likesCount || 0).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="rounded-lg bg-card border border-border p-2.5 flex items-center gap-2">
                                      <MessageCircle className="h-4 w-4 text-blue-500 shrink-0" />
                                      <div>
                                        <span className="text-[10px] text-muted-foreground block">
                                          Comments
                                        </span>
                                        <span className="text-xs font-bold text-foreground">
                                          {(p.submission.commentsCount || 0).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Review Actions (Approve & Release Payout / Request Revision) */}
                                  {p.status !== "approved" && p.status !== "completed" && (
                                    <div className="pt-2 border-t border-border/60 flex flex-col gap-2.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                          size="sm"
                                          disabled={reviewSubmissionMutation.isPending}
                                          onClick={() =>
                                            reviewSubmissionMutation.mutate({
                                              participantId: p.id,
                                              action: "approve",
                                            })
                                          }
                                          className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                        >
                                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                          Approve Reel & Release {formatINR(p.payoutAmount)}
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setShowRevisionInputFor(
                                              showRevisionInputFor === p.id ? null : p.id
                                            )
                                          }
                                          className="h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer"
                                        >
                                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                          Request Revision
                                        </Button>
                                      </div>

                                      {showRevisionInputFor === p.id && (
                                        <div className="flex items-center gap-2 pt-1">
                                          <Input
                                            value={revisionNote}
                                            onChange={(e) => setRevisionNote(e.target.value)}
                                            placeholder="Enter revision note for creator (e.g. Please add brand tag in caption)..."
                                            className="h-9 text-xs rounded-xl bg-card"
                                          />
                                          <Button
                                            size="sm"
                                            disabled={
                                              !revisionNote.trim() ||
                                              reviewSubmissionMutation.isPending
                                            }
                                            onClick={() =>
                                              reviewSubmissionMutation.mutate({
                                                participantId: p.id,
                                                action: "request_revision",
                                                reason: "Caption / Deliverable Update",
                                                notes: revisionNote.trim(),
                                              })
                                            }
                                            className="h-9 px-3.5 text-xs font-bold rounded-xl shrink-0"
                                          >
                                            Send Revision
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-foreground">
                                      {p.status === "pending"
                                        ? "Creator has not reserved the ad slot yet"
                                        : "Ad Slot Reserved — Waiting for Reel Submission"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {p.status === "pending"
                                        ? "Once the creator reserves this deal from their Requests tab, their status will turn Reserved and they can submit their Reel link."
                                        : "Once the creator posts the Reel and submits the link, the Reel URL, views, likes, and Approve & Pay button will appear right here."}
                                    </p>
                                  </div>

                                  {workspace.audioUrl && (
                                    <a
                                      href={workspace.audioUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-primary hover:bg-muted shrink-0"
                                    >
                                      <Music2 className="h-3.5 w-3.5" />
                                      Campaign Audio
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 2. Two-Way Rate Negotiation Chat Bar (₹ Only) - Hidden once rate is fixed / deal done */}
                            {p.negotiationStatus !== "accepted" &&
                            p.status !== "approved" &&
                            p.status !== "completed" ? (
                              <RateNegotiationChat
                                campaignId={workspace.id}
                                viewerRole="sponsor"
                                brandName={workspace.brand || "Brand"}
                                brandLogo={workspace.brandLogo}
                                creatorId={p.creatorId}
                                creatorName={p.creatorName}
                                creatorHandle={p.creatorHandle}
                                creatorAvatar={p.creatorAvatar}
                                currentPayoutAmount={Number(
                                  p.payoutAmount || workspace.payAmount || 1200
                                )}
                                basePayAmount={Number(
                                  p.baseRate || workspace.payAmount || p.payoutAmount || 1200
                                )}
                                lastOfferedPrice={Math.min(
                                  Number(p.baseRate || workspace.payAmount || 1200),
                                  Number(p.lastOfferedPrice || p.payoutAmount || 1200)
                                )}
                                lastOfferBy={p.lastOfferBy}
                                negotiationStatus={p.negotiationStatus}
                                messages={workspace.messages || []}
                              />
                            ) : (
                              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <span>
                                    Deal finalized & rate locked at{" "}
                                    {formatINR(p.payoutAmount || workspace.payAmount || 1200)}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                                >
                                  Rate Locked
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Campaign Description & Brief Note Modal */}
      <Dialog open={isEditDescOpen} onOpenChange={setIsEditDescOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl bg-card border-border shadow-xl">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Edit Campaign Description & Note
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Update campaign instructions. Changes will update for all creators automatically.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Campaign Description / Creative Note:</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {editDescText.length} characters
                </span>
              </label>
              <Textarea
                value={editDescText}
                onChange={(e) => setEditDescText(e.target.value)}
                placeholder="Write the campaign description, Reel instructions, hashtags, or guidelines here..."
                rows={6}
                className="text-xs leading-relaxed resize-none rounded-xl border-border bg-background focus-visible:ring-primary"
              />
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Live Sync Across All Creators
              </p>
              <p>
                When saved, this replaces the original campaign description across PostgreSQL, every participating creator's deal card, and active workspaces in real time.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditDescOpen(false)}
              disabled={updateDescriptionMutation.isPending}
              className="text-xs rounded-xl h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => updateDescriptionMutation.mutate(editDescText)}
              disabled={updateDescriptionMutation.isPending || !editDescText.trim()}
              className="text-xs font-bold rounded-xl h-9 px-4 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {updateDescriptionMutation.isPending ? "Updating..." : "Save & Update for All Creators"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
