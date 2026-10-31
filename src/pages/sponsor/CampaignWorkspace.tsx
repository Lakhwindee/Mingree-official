import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatINR } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SponsorSidebar } from "@/components/SponsorSidebar";
import { RateNegotiationChat } from "@/components/RateNegotiationChat";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderOpen,
  IndianRupee,
  Users,
  Video,
} from "lucide-react";

export default function CampaignWorkspace() {
  const [, sponsorParams] = useRoute("/sponsor/campaigns/:id/workspace");
  const [, creatorParams] = useRoute("/campaigns/:id/workspace");
  const campaignId = Number((sponsorParams as any)?.id || (creatorParams as any)?.id || 0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);

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

  useEffect(() => {
    if (allParticipants.length > 0 && selectedCreatorId === null) {
      setSelectedCreatorId(allParticipants[0].creatorId);
    }
  }, [allParticipants, selectedCreatorId]);

  const reviewSubmissionMutation = useMutation({
    mutationFn: (data: {
      participantId: number;
      action: "approve" | "request_revision" | "reject";
    }) => api.reviewReelSubmission(campaignId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      toast.success(data.message || "Reel approved & payout released!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve submission");
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
  const activeCreator =
    allParticipants.find((p) => Number(p.creatorId) === Number(selectedCreatorId)) ||
    allParticipants[0] ||
    null;

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

        {/* Simple Main Content: 1) Creators List  2) Rate Chat (₹) */}
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          {/* 1. Chosen Creators List */}
          <Card className="bg-card border-border shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Selected Creators ({allParticipants.length})
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {allParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No creators in this campaign yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allParticipants.map((p, index) => {
                    const isSelectedForChat =
                      activeCreator && Number(activeCreator.creatorId) === Number(p.creatorId);

                    return (
                      <div
                        key={p.id || p.creatorId}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isSelectedForChat ? "bg-primary/5" : "hover:bg-muted/20"
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
                              {p.negotiationStatus === "creator_countered" && p.lastOfferedPrice && (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  • Creator Ask: {formatINR(p.lastOfferedPrice)}
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

                            {p.submission?.postUrl && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <a
                                  href={p.submission.postUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Submitted Reel
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                          {renderCreatorStatusBadge(p.status)}

                          {p.status === "content_submitted" && (
                            <Button
                              size="sm"
                              disabled={reviewSubmissionMutation.isPending}
                              onClick={() =>
                                reviewSubmissionMutation.mutate({
                                  participantId: p.id,
                                  action: "approve",
                                })
                              }
                              className="h-8 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              Approve & Pay
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant={isSelectedForChat ? "default" : "outline"}
                            onClick={() => setSelectedCreatorId(p.creatorId)}
                            className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            <IndianRupee className="mr-1 h-3.5 w-3.5" />
                            Rate Chat (₹)
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Direct 2-Way Rate Negotiation Chat Bar */}
          {activeCreator && (
            <RateNegotiationChat
              campaignId={workspace.id}
              viewerRole="sponsor"
              brandName={workspace.brand || "Brand"}
              brandLogo={workspace.brandLogo}
              creatorId={activeCreator.creatorId}
              creatorName={activeCreator.creatorName}
              creatorHandle={activeCreator.creatorHandle}
              creatorAvatar={activeCreator.creatorAvatar}
              currentPayoutAmount={Number(activeCreator.payoutAmount || workspace.payAmount || 1200)}
              basePayAmount={Number(workspace.payAmount || activeCreator.payoutAmount || 1200)}
              lastOfferedPrice={Number(
                activeCreator.lastOfferedPrice || activeCreator.payoutAmount || 1200
              )}
              lastOfferBy={activeCreator.lastOfferBy}
              negotiationStatus={activeCreator.negotiationStatus}
              messages={workspace.messages || []}
            />
          )}
        </div>
      </main>
    </div>
  );
}
