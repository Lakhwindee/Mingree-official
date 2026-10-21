import { copyToClipboard } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";

import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiCampaign, type ApiReservation, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Instagram, Clock, Upload, CheckCircle, AlertCircle, LayoutList, Timer, Download, 
  X, AtSign, Star, FileDown, ExternalLink, IndianRupee, Sparkles, Film, ArrowRight
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

function CompactCountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Expired");
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

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
      isExpired 
        ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" 
        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
    }`}>
      <Timer className="h-3 w-3 shrink-0" />
      <span>{timeLeft}</span>
    </div>
  );
}

export default function MyCampaigns() {
  const queryClient = useQueryClient();
  const [submissionData, setSubmissionData] = useState({
    link: "",
    clipUrl: ""
  });
  const [selectedReservation, setSelectedReservation] = useState<(ApiReservation & { campaign: ApiCampaign }) | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", user?.id],
    queryFn: () => user ? api.getUserReservations(user.id) : [],
    enabled: !!user,
  });

  const isUserPro = Boolean(
    user?.subscriptionPlan &&
    user.subscriptionPlan !== "free" &&
    (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt).getTime() > Date.now())
  );

  // Business rules:
  // 1. "Ye free wale me reserved nai hono chahiye": Free tier users cannot have reserved campaigns.
  // 2. "agr maanle kisi ne paid liya or champ… reserve kri lekin uska subscription agle din khatm hone wala or usne wapis work link submit nai kiya to wo reserved v udd jani chahiye":
  //    If unsubmitted and subscription expired OR reservation deadline passed, the reservation is removed!
  const activeReservations = useMemo(() => {
    return reservations.filter((r: ApiReservation) => {
      if (r.status === 'rejected' || r.status === 'expired') return false;

      // If status is "reserved" (unsubmitted):
      if (r.status === 'reserved' && !r.submittedAt) {
        if (!isUserPro) return false;
        if (r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now()) return false;
      }

      return true;
    });
  }, [reservations, isUserPro]);

  const filteredReservations = useMemo(() => {
    if (statusFilter === "all") return activeReservations;
    return activeReservations.filter((r: ApiReservation) => r.status === statusFilter);
  }, [activeReservations, statusFilter]);

  const submitMutation = useMutation({
    mutationFn: ({ reservationId, data }: { reservationId: number; data: typeof submissionData }) => {
      return api.submitWork(reservationId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setSubmissionData({ link: "", clipUrl: "" });
      setIsSubmitModalOpen(false);
      setSelectedReservation(null);
      toast.success("Work submitted! Admin will review it shortly.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit work");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: number) => api.cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
      setIsSubmitModalOpen(false);
      setSelectedReservation(null);
      toast.success("Reservation cancelled. The spot has been released.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel reservation");
    },
  });

  const handleSubmit = () => {
    if (!selectedReservation) return;
    
    if (!submissionData.link || submissionData.link.trim() === "") {
      toast.error("Please provide your Instagram post/reel link");
      return;
    }
    
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(submissionData.link.trim())) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    
    submitMutation.mutate({ reservationId: selectedReservation.id, data: submissionData });
  };

  const handleOpenSubmissionModal = (reservation: ApiReservation & { campaign: ApiCampaign }) => {
    setSelectedReservation(reservation);
    setSubmissionData({
      link: reservation.postUrl || "",
      clipUrl: reservation.clipUrl || ""
    });
    setIsSubmitModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'reserved': 
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] sm:text-xs py-0.5 px-1.5 shadow-xs font-semibold">
            <Clock className="w-2.5 h-2.5 mr-1"/> Reserved
          </Badge>
        );
      case 'submitted': 
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-[10px] sm:text-xs py-0.5 px-1.5 shadow-xs font-semibold">
            <CheckCircle className="w-2.5 h-2.5 mr-1"/> Under Review
          </Badge>
        );
      case 'approved': 
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-[10px] sm:text-xs py-0.5 px-1.5 shadow-xs font-semibold">
            <CheckCircle className="w-2.5 h-2.5 mr-1"/> Approved
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="text-[10px] sm:text-xs py-0.5 px-1.5 shadow-xs font-semibold">
            <AlertCircle className="w-2.5 h-2.5 mr-1"/> Expired
          </Badge>
        );
      default: 
        return null;
    }
  };

  const counts = useMemo(() => {
    return {
      all: activeReservations.length,
      reserved: activeReservations.filter((r: ApiReservation) => r.status === 'reserved').length,
      submitted: activeReservations.filter((r: ApiReservation) => r.status === 'submitted').length,
      approved: activeReservations.filter((r: ApiReservation) => r.status === 'approved').length,
    };
  }, [activeReservations]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />

      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">My Campaigns</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
            {counts.all} Active
          </span>
        </div>
        {user && <NotificationDropdown userId={user.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="w-full max-w-6xl mx-auto px-3 py-3.5 sm:px-6 sm:py-6 overflow-x-hidden box-border">
          
          {/* Header Row & Quick Filter Tabs */}
          <div className="mb-3.5 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="hidden md:block">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Campaigns</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your reserved sponsorships, submit proof, and track approval status in grid view.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs rounded-full px-3"
              >
                All ({counts.all})
              </Button>
              <Button
                variant={statusFilter === "reserved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("reserved")}
                className="h-8 text-xs rounded-full px-3"
              >
                Reserved ({counts.reserved})
              </Button>
              <Button
                variant={statusFilter === "submitted" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("submitted")}
                className="h-8 text-xs rounded-full px-3"
              >
                In Review ({counts.submitted})
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approved")}
                className="h-8 text-xs rounded-full px-3"
              >
                Approved ({counts.approved})
              </Button>
            </div>
          </div>

          {activeReservations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 sm:p-14 text-center bg-card/50"
            >
              <div className="rounded-full bg-primary/10 p-4 mb-3">
                <LayoutList className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">
                {!isUserPro ? "No Active Reserved Campaigns" : "No active campaigns"}
              </h3>
              <p className="mb-4 mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm">
                {!isUserPro
                  ? "Free creators cannot reserve campaigns. Upgrade to Mingree Pro to reserve high-paying brand campaigns and submit your work."
                  : "You haven't reserved any campaigns yet. Explore available opportunities in the grid to get started."}
              </p>
              {!isUserPro ? (
                <Link href="/subscription">
                  <Button className="rounded-full bg-insta-gradient text-white border-0 hover:opacity-90 text-xs sm:text-sm shadow-sm" data-testid="button-upgrade-pro">
                    Upgrade to Pro to Reserve
                  </Button>
                </Link>
              ) : (
                <Link href="/campaigns">
                  <Button className="rounded-full bg-insta-gradient text-white border-0 hover:opacity-90 text-xs sm:text-sm" data-testid="button-find-campaigns">
                    Explore Campaigns
                  </Button>
                </Link>
              )}
            </motion.div>
          ) : filteredReservations.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground text-xs sm:text-sm">
              {statusFilter === "reserved" && !isUserPro
                ? "Free plan creators cannot have reserved campaigns. Upgrade to Pro to reserve campaigns."
                : `No campaigns found for the "${statusFilter}" filter.`}
            </div>
          ) : (
            /* Responsive Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {filteredReservations.map((reservation: ApiReservation & { campaign: ApiCampaign }, index: number) => {
                const campaign = reservation.campaign;
                if (!campaign) return null;

                const isReserved = reservation.status === 'reserved';
                const isSubmitted = reservation.status === 'submitted';
                const isApproved = reservation.status === 'approved';

                return (
                  <motion.div
                    key={reservation.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="h-full"
                  >
                    <Card 
                      className={`group relative flex flex-col h-full overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-md cursor-pointer active:scale-[0.98] ${
                        isReserved ? 'border-amber-400/60' : isApproved ? 'border-green-500/50' : 'border-blue-400/50'
                      }`}
                      onClick={() => handleOpenSubmissionModal(reservation)}
                      data-testid={`card-reservation-${reservation.id}`}
                    >
                      {/* Top Banner Cover */}
                      <div className="h-24 sm:h-32 w-full relative overflow-hidden bg-zinc-900">
                        {campaign.brandLogo ? (
                          <img 
                            src={campaign.brandLogo} 
                            alt={campaign.brand} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center">
                            <span className="text-3xl sm:text-4xl font-bold text-white/90">{campaign.brand.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                        
                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 z-10">
                          {getStatusBadge(reservation.status)}
                          <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] py-0.5 px-1.5 font-medium ml-auto">
                            {campaign.tier}
                          </Badge>
                        </div>

                        {/* Title & Brand overlay at bottom of banner */}
                        <div className="absolute bottom-1.5 sm:bottom-2 left-2 right-2 z-10">
                          <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1 leading-snug drop-shadow-md">
                            {campaign.title}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-white/80 line-clamp-1">
                            {campaign.brand}
                          </p>
                        </div>
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-2 sm:p-3 flex-1 flex flex-col justify-between gap-2 bg-card">
                        {/* Payout / Star Badge */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          {campaign.isPromotional ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-semibold">
                              <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-500 shrink-0" />
                              {campaign.starReward || 1} Stars
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 text-[10px] sm:text-xs py-0.5 px-1.5 font-bold">
                              {formatINR(campaign.payAmount)}
                            </Badge>
                          )}

                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                            <Instagram className="h-2.5 w-2.5" />
                            {campaign.type}
                          </span>
                        </div>

                        {/* Middle Countdown Timer for Reserved Campaigns */}
                        {isReserved && reservation.expiresAt && (
                          <div className="flex items-center justify-between gap-1 py-1 px-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <span className="text-[10px] font-medium text-amber-800 dark:text-amber-300">Time Left:</span>
                            <CompactCountdownTimer expiresAt={reservation.expiresAt} />
                          </div>
                        )}

                        {/* Action Area Button */}
                        <div className="pt-1 border-t border-border/60">
                          {isReserved ? (
                            <Button 
                              size="sm"
                              className="w-full h-7 sm:h-8 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1 shadow-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSubmissionModal(reservation);
                              }}
                              data-testid={`button-submit-work-${reservation.id}`}
                            >
                              <Upload className="h-3 w-3" />
                              <span>Submit Proof</span>
                            </Button>
                          ) : isSubmitted ? (
                            <div className="w-full h-7 sm:h-8 text-xs rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-1 border border-blue-500/20">
                              <CheckCircle className="h-3 w-3" />
                              <span>Under Review</span>
                            </div>
                          ) : (
                            <div className="w-full h-7 sm:h-8 text-xs rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1 border border-green-500/20">
                              <CheckCircle className="h-3 w-3" />
                              <span>Payment Approved</span>
                            </div>
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
      </main>

      {/* ================= SUBMISSION & DETAILS POPUP MODAL ================= */}
      <Dialog open={isSubmitModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSubmitModalOpen(false);
          setSelectedReservation(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[92vh] p-0 overflow-hidden rounded-2xl border-border shadow-2xl">
          {selectedReservation && selectedReservation.campaign && (
            <div className="flex flex-col max-h-[92vh]">
              {/* Modal Banner */}
              <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-zinc-900 shrink-0">
                {selectedReservation.campaign.brandLogo ? (
                  <img 
                    src={selectedReservation.campaign.brandLogo} 
                    alt={selectedReservation.campaign.brand} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white/90">{selectedReservation.campaign.brand.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-0 text-xs px-2 py-0.5">
                    {selectedReservation.campaign.brand}
                  </Badge>
                  {getStatusBadge(selectedReservation.status)}
                </div>

                {/* Title */}
                <div className="absolute bottom-3 left-4 right-4">
                  <DialogTitle className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-md">
                    {selectedReservation.campaign.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-white/80 mt-0.5">
                    Tier: {selectedReservation.campaign.tier} • Deliverable: {selectedReservation.campaign.type}
                  </DialogDescription>
                </div>
              </div>

              {/* Modal Scroll Content */}
              <ScrollArea className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">
                <div className="space-y-4">
                  
                  {/* Reward & Expiry Row */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Payout</span>
                      {selectedReservation.campaign.isPromotional ? (
                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-500" /> {selectedReservation.campaign.starReward || 1} Stars
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatINR(selectedReservation.campaign.payAmount)}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Due Date</span>
                      <span className="text-sm font-bold text-foreground">
                        {new Date(selectedReservation.campaign.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Countdown Timer in Modal if Reserved */}
                  {selectedReservation.status === 'reserved' && selectedReservation.expiresAt && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <Clock className="h-4 w-4" />
                        <span>Submission Deadline:</span>
                      </div>
                      <CompactCountdownTimer expiresAt={selectedReservation.expiresAt} />
                    </div>
                  )}

                  {/* Mandatory Mentions */}
                  {selectedReservation.campaign.mentions && selectedReservation.campaign.mentions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <AtSign className="h-3 w-3" /> Mandatory Mentions
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedReservation.campaign.mentions.map((mention, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs py-1 px-2 bg-primary/5 text-primary border-primary/20 font-medium cursor-pointer hover:bg-primary/10"
                            onClick={async () => {
                              await copyToClipboard(`@${mention}`);
                              toast.success(`Copied @${mention}`);
                            }}
                          >
                            @{mention}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campaign Asset Download */}
                  {selectedReservation.campaign.assetUrl && (
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{selectedReservation.campaign.assetFileName || "Campaign Asset"}</p>
                        <p className="text-[10px] text-muted-foreground">Download sponsor file to share/post</p>
                      </div>
                      <a 
                        href={selectedReservation.campaign.assetUrl} 
                        download={selectedReservation.campaign.assetFileName || "asset"}
                        target="_blank" 
                        rel="noreferrer"
                        className="shrink-0"
                      >
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-full">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </a>
                    </div>
                  )}

                  {/* Submission Input Fields */}
                  {selectedReservation.status === 'reserved' ? (
                    <div className="space-y-3 pt-1">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5 text-primary" /> Submit Your Posted Content
                      </h4>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="link" className="text-xs">Post / Reel URL (Instagram or YouTube) *</Label>
                        <Input 
                          id="link" 
                          placeholder="https://instagram.com/p/..." 
                          value={submissionData.link}
                          onChange={(e) => setSubmissionData({...submissionData, link: e.target.value})}
                          className="h-9 text-xs rounded-xl"
                          data-testid="input-post-link"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="clipUrl" className="text-xs">Optional Proof / Drive Link</Label>
                        <Input 
                          id="clipUrl" 
                          placeholder="https://drive.google.com/... (optional)" 
                          value={submissionData.clipUrl}
                          onChange={(e) => setSubmissionData({...submissionData, clipUrl: e.target.value})}
                          className="h-9 text-xs rounded-xl"
                          data-testid="input-clip-link"
                        />
                      </div>
                    </div>
                  ) : selectedReservation.status === 'submitted' ? (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1 text-blue-900 dark:text-blue-300">
                      <p className="font-semibold">Your submission is under admin review:</p>
                      <p className="truncate text-muted-foreground">{selectedReservation.postUrl}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs space-y-1 text-green-900 dark:text-green-300">
                      <p className="font-semibold">Content verified and approved!</p>
                      <p className="text-muted-foreground">Payout has been credited to your wallet.</p>
                    </div>
                  )}

                </div>
              </ScrollArea>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-border bg-background/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
                {selectedReservation.status === 'reserved' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs h-9 px-3 rounded-xl"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this reservation? The spot will be released.")) {
                        cancelMutation.mutate(selectedReservation.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Reservation
                  </Button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Button 
                    variant="outline" 
                    className="h-9 text-xs px-3 rounded-xl font-semibold"
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      setSelectedReservation(null);
                    }}
                  >
                    Close
                  </Button>

                  {selectedReservation.status === 'reserved' && (
                    <Button 
                      className="h-9 text-xs px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-proof-modal"
                    >
                      {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                    </Button>
                  )}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

