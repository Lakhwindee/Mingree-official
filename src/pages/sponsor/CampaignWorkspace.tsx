import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatINR, type WorkspaceDetails, type WorkspaceParticipant, type WorkspaceMessage } from "@/lib/api";
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
import { motion, AnimatePresence } from "framer-motion";

// Dummy icon fallbacks for removed icons
const __DummyIcon = (_props?: any) => null;
const Instagram = __DummyIcon;
const Play = __DummyIcon;
const MessageSquare = __DummyIcon;
const BadgeAlert = __DummyIcon;
const Megaphone = __DummyIcon;
const RotateCcw = __DummyIcon;
const Save = __DummyIcon;
const Send = __DummyIcon;
const Info = __DummyIcon;
const File = __DummyIcon;



export default function CampaignWorkspace() {
  const [, params] = useRoute("/sponsor/campaigns/:id/workspace");
  const campaignId = Number((params as any)?.id || 0);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active section tab
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Chat thread: "group" or creatorId as string for 1:1
  const [chatThread, setChatThread] = useState<string>("group");
  const [chatMessage, setChatMessage] = useState<string>("");
  const [isAnnouncement, setIsAnnouncement] = useState<boolean>(false);
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
    onSuccess: (data) => {
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; recipientId?: number | null; isAnnouncement?: boolean }) =>
      api.postWorkspaceMessage(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      setChatMessage("");
      setIsAnnouncement(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message");
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const recipientId = chatThread === "group" ? null : Number(chatThread);
    sendMessageMutation.mutate({
      content: chatMessage.trim(),
      recipientId,
      isAnnouncement: chatThread === "group" && isAnnouncement,
    });
  };

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-zinc-400">Opening Campaign Workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white p-4">
        <div className="max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center">
          
          <h2 className="text-xl font-bold">Workspace Unavailable</h2>
          <p className="text-sm text-zinc-400 mt-2">
            {(error as any)?.message || "You do not have access to this campaign workspace or it does not exist."}
          </p>
          <Link href="/sponsor/campaigns">
            <Button className="mt-6 bg-pink-600 hover:bg-pink-700">Back to Campaigns</Button>
          </Link>
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
  const pendingApplications = workspace.participants.filter((p) => p.status === "applied");
  const reservedCreators = workspace.participants.filter((p) => p.status !== "applied" && p.status !== "rejected" && p.status !== "withdrawn");
  const submittedReels = workspace.participants.filter((p) => p.submission !== null);
  const pendingReviews = workspace.participants.filter((p) => p.status === "content_submitted");
  const approvedSubmissions = workspace.participants.filter((p) => p.status === "approved" || p.status === "completed");

  const totalVerifiedViews = submittedReels.reduce((sum, p) => sum + (p.submission?.viewsCount || 0), 0);
  const totalVerifiedLikes = submittedReels.reduce((sum, p) => sum + (p.submission?.likesCount || 0), 0);
  const totalVerifiedComments = submittedReels.reduce((sum, p) => sum + (p.submission?.commentsCount || 0), 0);

  const refundableBalance = Math.max(0, workspace.totalBudget - workspace.releasedPayouts - workspace.committedPayouts);

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-100">
      <SponsorSidebar />

      <main className="flex-1 w-full min-w-0 overflow-y-auto pb-24 md:pb-8">
        {/* Workspace Top Navigation Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/sponsor/campaigns">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800">
                
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-pink-400">Campaign Workspace</span>
                <Badge
                  className={`text-[10px] uppercase font-bold ${
                    workspace.status === "filling_slots"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : workspace.status === "under_review"
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                      : workspace.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {workspace.status.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-white truncate max-w-md md:max-w-xl">{workspace.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsBriefEditOpen(true)}
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
              
              Update Brief
            </Button>
          </div>
        </div>

        {/* Workspace Content Tabs */}
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          {/* Quick Metrics Header Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Card className="bg-zinc-900/70 border-zinc-800/80 p-3.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Slots Filled</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-white">
                  {workspace.reservedSlots} / {workspace.totalSlots}
                </span>
                <span className="text-xs text-amber-400 font-semibold">{workspace.remainingSlots} left</span>
              </div>
            </Card>

            <Card className="bg-zinc-900/70 border-zinc-800/80 p-3.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Committed Escrow</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-white">{formatINR(workspace.committedPayouts)}</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Total budget: {formatINR(workspace.totalBudget)}</p>
              </div>
            </Card>

            <Card className="bg-zinc-900/70 border-zinc-800/80 p-3.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Pending Review</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-xl font-bold ${pendingReviews.length > 0 ? "text-amber-400" : "text-white"}`}>
                  {pendingReviews.length}
                </span>
                {pendingReviews.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
              </div>
            </Card>

            <Card className="bg-zinc-900/70 border-zinc-800/80 p-3.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Approved Reels</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-emerald-400">{approvedSubmissions.length}</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Paid: {formatINR(workspace.releasedPayouts)}</p>
              </div>
            </Card>

            <Card className="bg-zinc-900/70 border-zinc-800/80 p-3.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Verified Views</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-indigo-400">
                  {totalVerifiedViews > 0 ? totalVerifiedViews.toLocaleString() : "0"}
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Likes: {totalVerifiedLikes.toLocaleString()}</p>
              </div>
            </Card>

            <Card className="bg-zinc-900/70 border-zinc-800/80 p-3.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Applications</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-xl font-bold ${pendingApplications.length > 0 ? "text-pink-400" : "text-white"}`}>
                  {pendingApplications.length}
                </span>
                <span className="text-xs text-zinc-400 font-medium">Model: {workspace.bookingModel}</span>
              </div>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl h-auto flex flex-nowrap scrollbar-none">
              <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0">
                
                1. Overview & Brief
              </TabsTrigger>
              <TabsTrigger value="creators" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0">
                
                2. Creators & Applicants ({workspace.participants.length})
                {pendingApplications.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-pink-500 text-white font-bold">
                    {pendingApplications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                3. Shared Campaign Chat
              </TabsTrigger>
              <TabsTrigger value="submissions" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0">
                
                4. Reels & Reviews
                {pendingReviews.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-black font-bold">
                    {pendingReviews.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0">
                
                5. Performance Analytics
              </TabsTrigger>
              <TabsTrigger value="financials" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs py-2 px-3.5 gap-1.5 rounded-lg shrink-0">
                
                6. Escrow & Ledger
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & SETTINGS */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Campaign Brief Card */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div>
                        <CardTitle className="text-lg text-white">Campaign Creative Brief</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Current instructions visible to all participating creators (Version {workspace.briefVersions.length})
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsBriefEditOpen(true)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs"
                      >
                        
                        Edit Brief
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                        <Label className="text-xs uppercase text-zinc-400 font-semibold tracking-wider">Description & Creative Angle</Label>
                        <p className="mt-2 text-zinc-200 leading-relaxed whitespace-pre-wrap">{workspace.description}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                          <Label className="text-xs uppercase text-zinc-400 font-semibold tracking-wider">Required Audio Track</Label>
                          {workspace.audioUrl ? (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={workspace.audioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1.5 bg-pink-500/10 px-3 py-1.5 rounded-lg border border-pink-500/20 truncate"
                              >
                                <Play className="h-3.5 w-3.5 fill-pink-400" />
                                {workspace.audioUrl}
                              </a>
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 mt-1">No audio file specified</p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                          <Label className="text-xs uppercase text-zinc-400 font-semibold tracking-wider">Mandatory Disclosure</Label>
                          <div className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-mono">
                            {workspace.disclosureInstructions}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                        <Label className="text-xs uppercase text-zinc-400 font-semibold tracking-wider">Required Caption & Mentions</Label>
                        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 font-mono">
                          {workspace.requiredCaptionNote}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {workspace.requiredTags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-zinc-700 bg-zinc-800/50 text-indigo-300 font-mono">
                              {tag}
                            </Badge>
                          ))}
                          {workspace.requiredMentions.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-pink-900/50 bg-pink-950/30 text-pink-300 font-mono">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Single Brand Promotional File */}
                      {workspace.productAssets && workspace.productAssets.length > 0 && workspace.productAssets[0] && (
                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                          <Label className="text-xs uppercase text-zinc-400 font-semibold tracking-wider">Brand Promotional File</Label>
                          {(() => {
                            const asset = workspace.productAssets[0];
                            return (
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 mt-1"
                              >
                                <span className="truncate mr-2 font-medium">{asset.name || "Brand Promotional File"}</span>
                                
                              </a>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Brief Version History */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        
                        Brief Revision & Change History
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        Audit trail of all material changes made to this campaign brief
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {workspace.briefVersions.map((v) => (
                        <div key={v.version} className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Badge className="bg-pink-600 text-[10px] px-1.5 py-0">v{v.version}</Badge>
                              {v.changesSummary}
                            </span>
                            <span className="text-[11px] text-zinc-500">{new Date(v.timestamp).toLocaleString()}</span>
                          </div>
                          {v.diffs && v.diffs.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-zinc-800/50">
                              {v.diffs.map((d, idx) => (
                                <div key={idx} className="text-[11px] text-zinc-400 flex items-start gap-1">
                                  <span className="text-pink-400 font-semibold">• {d.label}:</span>
                                  <span className="line-through text-zinc-500 truncate max-w-xs">{JSON.stringify(d.oldValue)}</span>
                                  <span className="text-emerald-400 font-medium truncate max-w-xs">→ {JSON.stringify(d.newValue)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Campaign Info Sidebar */}
                <div className="space-y-6">
                  <Card className="bg-zinc-900 border-zinc-800 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Campaign Parameters</h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Booking Model</span>
                        <span className="font-bold text-white uppercase">{workspace.bookingModel}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Payout per Creator</span>
                        <span className="font-bold text-emerald-400 text-sm">{formatINR(workspace.payAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Total Budget</span>
                        <span className="font-bold text-white">{formatINR(workspace.totalBudget)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Min. Followers</span>
                        <span className="font-medium text-white">{workspace.minFollowers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Target Cities</span>
                        <span className="font-medium text-white text-right">
                          {workspace.targetCities.length > 0 ? workspace.targetCities.join(", ") : "All India"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Submission Window</span>
                        <span className="font-medium text-amber-400">48 Hours</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-400">Campaign Deadline</span>
                        <span className="font-medium text-white">{workspace.deadline}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Brand Profile Preview */}
                  <Card className="bg-zinc-900 border-zinc-800 p-5 space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Brand Representation</h3>
                    <div className="flex items-center gap-3 pt-1">
                      <img src={workspace.brandLogo} alt={workspace.brand} className="h-12 w-12 rounded-xl object-cover border border-zinc-700" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{workspace.brand}</h4>
                        <p className="text-xs text-zinc-400">{workspace.genre} • {workspace.language}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CREATORS & APPLICANTS */}
            <TabsContent value="creators" className="space-y-6 mt-6">
              {/* Pending Applications Section */}
              {pendingApplications.length > 0 && (
                <Card className="bg-zinc-900 border-pink-900/40">
                  <CardHeader className="pb-3 border-b border-pink-900/30 bg-pink-950/20">
                    <CardTitle className="text-base text-white flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BadgeAlert className="h-4 w-4 text-pink-400" />
                        Pending Creator Applications ({pendingApplications.length})
                      </span>
                      <Badge className="bg-pink-600">Action Required</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      These creators have applied for a slot. Review their Instagram credentials and approve or decline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {pendingApplications.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.creatorAvatar} alt={p.creatorName} className="h-11 w-11 rounded-full object-cover border border-zinc-700" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{p.creatorName}</h4>
                              <span className="text-xs text-pink-400 font-mono">{p.creatorHandle}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                              <span>Followers: <strong className="text-zinc-200">{p.creatorFollowers.toLocaleString()}</strong></span>
                              <span>•</span>
                              <span>Avg Reel Views: <strong className="text-zinc-200">{p.creatorMedianViews.toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applicationActionMutation.mutate({ participantId: p.id, action: "decline" })}
                            disabled={applicationActionMutation.isPending}
                            className="border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300"
                          >
                             Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applicationActionMutation.mutate({ participantId: p.id, action: "accept" })}
                            disabled={applicationActionMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
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
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white">Participating Creators ({reservedCreators.length})</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Creators with confirmed slots in this campaign, their submission progress, and direct communication access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {reservedCreators.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No creators have reserved slots yet. Share the campaign marketplace link to attract influencers.
                    </div>
                  ) : (
                    reservedCreators.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.creatorAvatar} alt={p.creatorName} className="h-11 w-11 rounded-full object-cover border border-zinc-700" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{p.creatorName}</h4>
                              <span className="text-xs text-zinc-400 font-mono">{p.creatorHandle}</span>
                              <Badge
                                className={`text-[10px] font-bold uppercase ${
                                  p.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : p.status === "content_submitted"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    : p.status === "revision_requested"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {p.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                              <span>Reserved: {new Date(p.reservedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Payout: <strong className="text-emerald-400">{formatINR(p.payoutAmount)}</strong></span>
                              <span>•</span>
                              <span>
                                Brief Ack:{" "}
                                <strong className={p.briefAcknowledgedVersion === workspace.briefVersions.length ? "text-emerald-400" : "text-amber-400"}>
                                  v{p.briefAcknowledgedVersion} / v{workspace.briefVersions.length}
                                </strong>
                              </span>
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
                            className="border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300"
                          >
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-pink-400" /> Message
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
                              className="bg-amber-600 hover:bg-amber-500 text-xs font-bold text-black"
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

            {/* TAB 3: SHARED CAMPAIGN CHAT (CRITICAL FEATURE) */}
            <TabsContent value="chat" className="space-y-4 mt-6">
              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                  {/* Channels / Direct Threads Sidebar */}
                  <div className="p-4 space-y-4 bg-zinc-950/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Communication Channels</span>
                      <div className="mt-2 space-y-1">
                        <button
                          onClick={() => setChatThread("group")}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                            chatThread === "group"
                              ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20"
                              : "text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            Campaign Group Chat
                          </span>
                          <Badge className="bg-black/30 text-[10px] text-zinc-300">
                            {workspace.messages.filter((m) => m.recipientId === null).length}
                          </Badge>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Direct Creator Threads</span>
                      <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
                        {reservedCreators.map((p) => {
                          const threadMsgCount = workspace.messages.filter(
                            (m) =>
                              (m.senderId === p.creatorId && m.recipientId === workspace.sponsorId) ||
                              (m.senderId === workspace.sponsorId && m.recipientId === p.creatorId)
                          ).length;

                          return (
                            <button
                              key={p.creatorId}
                              onClick={() => setChatThread(String(p.creatorId))}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                                chatThread === String(p.creatorId)
                                  ? "bg-zinc-800 text-white font-bold"
                                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <img src={p.creatorAvatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                                <span className="truncate">{p.creatorName}</span>
                              </div>
                              {threadMsgCount > 0 && (
                                <span className="text-[10px] text-zinc-500 font-mono">{threadMsgCount}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages Area */}
                  <div className="md:col-span-3 flex flex-col h-[560px] bg-zinc-950/30">
                    {/* Channel Header */}
                    <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {chatThread === "group" ? (
                          <>
                            <Megaphone className="h-4 w-4 text-pink-400" />
                            <div>
                              <h4 className="text-xs font-bold text-white">Campaign-Wide Group Broadcast</h4>
                              <p className="text-[10px] text-zinc-400">
                                Messages sent here are received by ALL {reservedCreators.length} participating creators in real-time.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            
                            <div>
                              <h4 className="text-xs font-bold text-white">
                                Private 1:1 Thread with {workspace.participants.find((p) => p.creatorId === Number(chatThread))?.creatorName || "Creator"}
                              </h4>
                              <p className="text-[10px] text-zinc-400">Direct private instructions and revision exchange.</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Messages Scroll View */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                      {filteredMessages.length === 0 ? (
                        <div className="text-center py-20 text-zinc-500 text-xs">
                          No messages in this channel yet. Say hello or post an official announcement!
                        </div>
                      ) : (
                        filteredMessages.map((msg) => {
                          const isMe = msg.senderId === user?.id;
                          const isSys = msg.senderRole === "system";

                          if (isSys) {
                            return (
                              <div key={msg.id} className="text-center my-2">
                                <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 inline-block">
                                  {msg.content}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 max-w-xl ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                            >
                              <img
                                src={msg.senderAvatar}
                                alt={msg.senderName}
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-zinc-700"
                              />
                              <div className={`space-y-1 ${isMe ? "text-right" : "text-left"}`}>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                  <span className="font-semibold text-zinc-300">{msg.senderName}</span>
                                  {msg.senderRole === "sponsor" && (
                                    <Badge className="bg-pink-600/30 text-pink-300 text-[9px] px-1 py-0 border-0">Brand</Badge>
                                  )}
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>

                                <div
                                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                                    msg.isAnnouncement
                                      ? "bg-gradient-to-r from-pink-950/80 to-purple-950/80 border border-pink-500/40 text-pink-100 shadow-md"
                                      : isMe
                                      ? "bg-pink-600 text-white rounded-tr-none"
                                      : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/60"
                                  }`}
                                >
                                  {msg.isAnnouncement && (
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-pink-300 pb-1 mb-1 border-b border-pink-500/20">
                                      <Megaphone className="h-3 w-3" /> OFFICIAL ANNOUNCEMENT
                                    </div>
                                  )}
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900/80 space-y-2">
                      {chatThread === "group" && (
                        <div className="flex items-center gap-2 px-1">
                          <label className="flex items-center gap-1.5 text-xs text-pink-400 cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={isAnnouncement}
                              onChange={(e) => setIsAnnouncement(e.target.checked)}
                              className="rounded border-zinc-700 bg-zinc-800 text-pink-600 focus:ring-0"
                            />
                            Mark as Official Announcement (Highlights message for all creators)
                          </label>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder={
                            chatThread === "group"
                              ? "Broadcast an announcement or instruction to all creators..."
                              : "Send private instruction or feedback..."
                          }
                          className="bg-zinc-950 border-zinc-700 text-xs text-white h-10 rounded-xl"
                        />
                        <Button
                          type="submit"
                          disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                          className="h-10 px-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl"
                        >
                          
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 4: REEL SUBMISSIONS & APPROVALS */}
            <TabsContent value="submissions" className="space-y-6 mt-6">
              {/* Draft Video Previews Review Queue */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-white">Draft Video Previews Review Queue (Pre-Post)</CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      Approve or request revisions on draft videos uploaded by creators before they publish live on Instagram.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {workspace.participants.filter((p) => p.draftSubmission !== null).length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      <p>No draft video previews submitted yet.</p>
                    </div>
                  ) : (
                    workspace.participants
                      .filter((p) => p.draftSubmission !== null)
                      .map((p) => {
                        const draft = p.draftSubmission!;
                        return (
                          <div
                            key={p.id}
                            className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={p.creatorAvatar} alt="" className="h-9 w-9 rounded-full object-cover border border-zinc-700" />
                                <div>
                                  <h4 className="font-bold text-white text-sm">{p.creatorName} <span className="text-xs text-pink-400 font-mono">({p.creatorHandle})</span></h4>
                                  <p className="text-[11px] text-zinc-400">Submitted Draft: {new Date(draft.submittedAt).toLocaleString()}</p>
                                </div>
                              </div>
                              <Badge className={`text-xs font-bold uppercase ${
                                p.draftStatus === "approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                                p.draftStatus === "revision_requested" ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" :
                                "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              }`}>
                                {p.draftStatus.replace("_", " ")}
                              </Badge>
                            </div>

                            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <a href={draft.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1.5 truncate">
                                  
                                  {draft.videoUrl}
                                </a>
                              </div>
                              {draft.notes && (
                                <p className="text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                                  <strong className="text-pink-400">Creator Note:</strong> "{draft.notes}"
                                </p>
                              )}
                            </div>

                            {p.draftStatus === "submitted" && (
                              <div className="flex items-center justify-end gap-3 pt-2">
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
                                  className="border-amber-900/50 text-amber-300 hover:bg-amber-950/30 text-xs"
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
                                  className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs"
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

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-white">Submitted Instagram Reels Review Queue</CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      Verify published Reels, check audio & hashtag compliance, approve escrow releases or request revisions.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {submittedReels.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500 text-xs space-y-2">
                      
                      <p>No creators have submitted Reel links yet.</p>
                      <p className="text-[11px] text-zinc-600">
                        Reserved creators have 48 hours to produce and publish their Reels.
                      </p>
                    </div>
                  ) : (
                    submittedReels.map((p) => {
                      const sub = p.submission!;
                      return (
                        <div
                          key={p.id}
                          className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 transition-all hover:border-zinc-700"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={p.creatorAvatar} alt="" className="h-10 w-10 rounded-full object-cover border border-zinc-700" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white text-sm">{p.creatorName}</h4>
                                  <span className="text-xs text-pink-400 font-mono">{p.creatorHandle}</span>
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                  Submitted: {new Date(sub.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <Badge
                              className={`text-xs font-bold uppercase self-start sm:self-center ${
                                p.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : p.status === "revision_requested"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {p.status.replace("_", " ")}
                            </Badge>
                          </div>

                          {/* Reel URL & Verified Metrics Snapshot */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                            <div className="md:col-span-2 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-zinc-400">Instagram Reel Link</span>
                              <div>
                                <a
                                  href={sub.postUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1.5 truncate"
                                >
                                  
                                  {sub.postUrl}
                                </a>
                              </div>
                              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-medium">
                                
                                Official Audio Verified • #ad Disclosure Present
                              </div>
                            </div>

                            <div className="flex items-center justify-around border-t md:border-t-0 md:border-l border-zinc-800 pt-2 md:pt-0">
                              <div className="text-center">
                                <span className="text-[10px] text-zinc-500 uppercase">Views</span>
                                <p className="text-sm font-bold text-white">{sub.viewsCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] text-zinc-500 uppercase">Likes</span>
                                <p className="text-sm font-bold text-white">{sub.likesCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] text-zinc-500 uppercase">Comments</span>
                                <p className="text-sm font-bold text-white">{sub.commentsCount.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Revision History for this Creator */}
                          {p.revisions && p.revisions.length > 0 && (
                            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 space-y-1.5 text-xs">
                              <span className="font-bold text-rose-300 flex items-center gap-1">
                                <RotateCcw className="h-3.5 w-3.5" /> Previous Revision Requests ({p.revisions.length}):
                              </span>
                              {p.revisions.map((r) => (
                                <p key={r.id} className="text-[11px] text-zinc-300">
                                  • <strong className="text-rose-400">{r.reason}:</strong> {r.notes} ({new Date(r.requestedAt).toLocaleDateString()})
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Review Action Buttons */}
                          {p.status === "content_submitted" && (
                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
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
                                className="border-rose-900/40 text-rose-400 hover:bg-rose-950/30 text-xs"
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
                                className="border-amber-900/50 text-amber-300 hover:bg-amber-950/30 text-xs"
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Request Revision
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
                                className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs"
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
            <TabsContent value="performance" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 p-5">
                  <span className="text-xs uppercase font-bold text-zinc-400">Total Campaign Views</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-white">{totalVerifiedViews.toLocaleString()}</span>
                    <span className="text-xs text-indigo-400 font-semibold">{submittedReels.length} Reels live</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Aggregated across all verified Instagram Reels</p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-5">
                  <span className="text-xs uppercase font-bold text-zinc-400">Average Views Per Reel</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-emerald-400">
                      {submittedReels.length > 0
                        ? Math.round(totalVerifiedViews / submittedReels.length).toLocaleString()
                        : "0"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Organic creator reach multiplier</p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-5">
                  <span className="text-xs uppercase font-bold text-zinc-400">Estimated Total Interactions</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-pink-400">
                      {(totalVerifiedLikes + totalVerifiedComments).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {totalVerifiedLikes.toLocaleString()} Likes • {totalVerifiedComments.toLocaleString()} Comments
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 6: ESCROW & FINANCIAL LEDGER */}
            <TabsContent value="financials" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 p-4">
                  <span className="text-[11px] uppercase font-bold text-zinc-400">Total Allocated Budget</span>
                  <p className="text-2xl font-bold text-white mt-1">{formatINR(workspace.totalBudget)}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Locked at campaign creation</p>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-4">
                  <span className="text-[11px] uppercase font-bold text-zinc-400">Committed Payouts</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{formatINR(workspace.committedPayouts)}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{reservedCreators.length} slots reserved</p>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-4">
                  <span className="text-[11px] uppercase font-bold text-zinc-400">Released Payouts</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{formatINR(workspace.releasedPayouts)}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{approvedSubmissions.length} Reels approved</p>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-4">
                  <span className="text-[11px] uppercase font-bold text-zinc-400">Refundable Balance</span>
                  <p className="text-2xl font-bold text-zinc-300 mt-1">{formatINR(refundableBalance)}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Unfilled slots balance</p>
                </Card>
              </div>

              <Card className="bg-zinc-900 border-zinc-800 p-5">
                <h3 className="text-sm font-bold text-white mb-2">Escrow Financial Integrity</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
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
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Update Campaign Brief & Notify Creators</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Any changes made here will be versioned, recorded in the audit history, and broadcast to all participating creators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Campaign Title</Label>
              <Input
                value={briefFormData.title}
                onChange={(e) => setBriefFormData({ ...briefFormData, title: e.target.value })}
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Campaign Brief & Description</Label>
              <Textarea
                rows={3}
                value={briefFormData.description}
                onChange={(e) => setBriefFormData({ ...briefFormData, description: e.target.value })}
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Required Hashtags (Space separated)</Label>
                <Input
                  value={briefFormData.requiredTags}
                  onChange={(e) => setBriefFormData({ ...briefFormData, requiredTags: e.target.value })}
                  placeholder="#MundaDesi #Mingree"
                  className="bg-zinc-950 border-zinc-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Required Mentions (Space separated)</Label>
                <Input
                  value={briefFormData.requiredMentions}
                  onChange={(e) => setBriefFormData({ ...briefFormData, requiredMentions: e.target.value })}
                  placeholder="@brand @artist"
                  className="bg-zinc-950 border-zinc-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Caption Instructions & Hook</Label>
              <Textarea
                rows={2}
                value={briefFormData.requiredCaptionNote}
                onChange={(e) => setBriefFormData({ ...briefFormData, requiredCaptionNote: e.target.value })}
                className="bg-zinc-950 border-zinc-700 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Audio Track Link</Label>
                <Input
                  value={briefFormData.audioUrl}
                  onChange={(e) => setBriefFormData({ ...briefFormData, audioUrl: e.target.value })}
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Campaign Deadline</Label>
                <Input
                  type="date"
                  value={briefFormData.deadline}
                  onChange={(e) => setBriefFormData({ ...briefFormData, deadline: e.target.value })}
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-pink-950/30 border border-pink-900/40 space-y-1.5">
              <Label className="text-pink-300 font-bold">What Changed? (Reason for update)</Label>
              <Input
                placeholder="e.g. Added #MingreePromotions and updated audio snippet link"
                value={briefFormData.changesSummary}
                onChange={(e) => setBriefFormData({ ...briefFormData, changesSummary: e.target.value })}
                className="bg-zinc-950 border-pink-800 text-white"
              />
              <p className="text-[11px] text-zinc-400">
                This explanation will be prominently announced in the campaign chat and creators will be requested to acknowledge it.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsBriefEditOpen(false)} className="text-zinc-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSaveBrief}
              disabled={updateBriefMutation.isPending}
              className="bg-pink-600 hover:bg-pink-500 font-bold text-white"
            >
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
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {reviewModalState.action === "approve"
                ? "Approve Reel & Release Payout"
                : reviewModalState.action === "request_revision"
                ? "Request Revision from Creator"
                : "Reject Submission"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Creator: {reviewModalState.participant?.creatorName} ({reviewModalState.participant?.creatorHandle})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {reviewModalState.action === "approve" ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/40 space-y-2 text-emerald-200">
                <p>
                  Approving this submission will release{" "}
                  <strong>{formatINR(reviewModalState.participant?.payoutAmount || workspace.payAmount)}</strong> directly
                  from your campaign escrow into the creator's wallet balance.
                </p>
                <p className="text-[11px] text-zinc-400">This action is irreversible and writes to the immutable financial ledger.</p>
              </div>
            ) : reviewModalState.action === "request_revision" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Revision Reason</Label>
                  <Input
                    value={reviewModalState.reason}
                    onChange={(e) => setReviewModalState({ ...reviewModalState, reason: e.target.value })}
                    placeholder="e.g. Missing required hashtag or wrong audio snippet"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Specific Feedback & Instructions</Label>
                  <Textarea
                    rows={3}
                    value={reviewModalState.notes}
                    onChange={(e) => setReviewModalState({ ...reviewModalState, notes: e.target.value })}
                    placeholder="Describe exactly what needs to be changed in the re-submitted Reel..."
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Rejection Reason</Label>
                <Input
                  value={reviewModalState.reason}
                  onChange={(e) => setReviewModalState({ ...reviewModalState, reason: e.target.value })}
                  placeholder="e.g. Video violates guidelines or content completely off-brief"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setReviewModalState({ ...reviewModalState, isOpen: false })}
              className="text-zinc-400 hover:text-white"
            >
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
                  ? "bg-emerald-600 hover:bg-emerald-500 font-bold text-white"
                  : reviewModalState.action === "request_revision"
                  ? "bg-amber-600 hover:bg-amber-500 font-bold text-black"
                  : "bg-rose-600 hover:bg-rose-500 font-bold text-white"
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
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Request Changes / Reject Draft Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Creator: {draftReviewState.participant?.creatorName} ({draftReviewState.participant?.creatorHandle})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-bold">Feedback Notes & Required Changes *</Label>
              <Textarea
                rows={4}
                value={draftReviewState.notes}
                onChange={(e) => setDraftReviewState({ ...draftReviewState, notes: e.target.value })}
                placeholder="Explain what changes are needed (e.g. Please improve lighting and ensure audio matches requirement)..."
                className="bg-zinc-950 border-zinc-700 text-white"
              />
              <p className="text-[11px] text-zinc-500">
                This note will be visible to the creator and will unlock their revision box.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDraftReviewState({ ...draftReviewState, isOpen: false })}
              className="text-zinc-400 hover:text-white"
            >
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
              className="bg-amber-600 hover:bg-amber-500 font-bold text-black text-xs"
            >
              Send Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
