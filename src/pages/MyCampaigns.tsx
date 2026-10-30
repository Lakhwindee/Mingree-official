import { copyToClipboard } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiCampaign, type ApiReservation, formatINR } from "@/lib/api";
import { fallbackReservations } from "@/lib/fallback-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

// Dummy icon fallbacks for removed icons
const __DummyIcon = (_props?: any) => null;
const Instagram = __DummyIcon;

// High-Visibility Red Countdown Timer Badge matching the exact layout in screenshot
function RedCountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hh = hours.toString().padStart(2, '0');
      const mm = minutes.toString().padStart(2, '0');
      const ss = seconds.toString().padStart(2, '0');

      if (days > 0) {
        const dd = days.toString().padStart(2, '0');
        setTimeLeft(`${dd}d ${hh}:${mm}:${ss}`);
      } else {
        setTimeLeft(`${hh}:${mm}:${ss}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={`inline-flex items-center font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-xl border shadow-2xs ${
      isExpired 
        ? "bg-red-500/10 text-red-600 border-red-500/20" 
        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
    }`}>
      {timeLeft}
    </span>
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

  const { data: serverReservations = [] } = useQuery({
    queryKey: ["reservations", user?.id],
    queryFn: () => user ? api.getUserReservations(user.id) : [],
    enabled: !!user,
  });

  const reservations = useMemo(() => {
    return Array.isArray(serverReservations) ? serverReservations : [];
  }, [serverReservations]);

  const isUserPro = true;

  const activeReservations = useMemo(() => {
    return reservations.filter((r: ApiReservation) => {
      if (r.status === 'rejected' || r.status === 'expired') return false;

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
      toast.success("Reel link submitted! Admin / Brand will review shortly.");
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
      toast.success("Reservation cancelled. Spot released.");
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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'reserved': 
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            Reserved
          </span>
        );
      case 'submitted': 
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
            In Review
          </span>
        );
      case 'approved': 
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            Approved
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
            Expired
          </span>
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

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pt-14 md:pt-0 pb-8">
        <div className="w-full max-w-7xl mx-auto px-3.5 py-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          
          {/* Desktop Executive Header Bar */}
          <div className="hidden md:flex items-center justify-between gap-4 pb-2 border-b border-border/80">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">My Workspaces</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-foreground">
                  {counts.all} Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your claimed slots, active countdown timers, and Reel submissions.
              </p>
            </div>
            {user && <NotificationDropdown userId={user.id} />}
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("reserved")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === "reserved"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Reserved ({counts.reserved})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("submitted")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === "submitted"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              In Review ({counts.submitted})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === "approved"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Approved ({counts.approved})
            </button>
          </div>

          {/* Reserved Campaign Cards Grid (Matching Exact Screenshot Layout) */}
          {activeReservations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 sm:p-14 text-center bg-card/50"
            >
              <h3 className="text-lg font-bold">No Reserved Campaigns</h3>
              <p className="mb-4 mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm">
                You haven't reserved any campaigns yet. Explore available opportunities to claim your slot.
              </p>
              <Link href="/campaigns">
                <Button className="rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer" data-testid="button-find-campaigns">
                  Explore Campaigns
                </Button>
              </Link>
            </motion.div>
          ) : filteredReservations.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground text-xs sm:text-sm">
              No campaigns found for the "{statusFilter}" filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredReservations.map((reservation: ApiReservation & { campaign: ApiCampaign }, index: number) => {
                const campaign = reservation.campaign;
                if (!campaign) return null;

                return (
                  <motion.div
                    key={reservation.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="h-full"
                  >
                    <Card 
                      className="relative flex flex-col justify-between h-full min-h-[160px] sm:min-h-[175px] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-card p-3.5 sm:p-4 hover:shadow-xs transition-all"
                      data-testid={`card-reservation-${reservation.id}`}
                    >
                      {/* Top Edge Watermark Header */}
                      <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between text-[10px] font-medium text-zinc-400 dark:text-zinc-600 pointer-events-none select-none overflow-hidden whitespace-nowrap">
                        <span className="truncate">Watch or download asset</span>
                        <span>Sponsor ad</span>
                      </div>

                      {/* Top Row: Red Live Countdown Badge on Left, "Sponsor ad" on Right */}
                      <div className="flex items-center justify-between gap-2 mt-2.5 mb-2">
                        {reservation.expiresAt ? (
                          <RedCountdownBadge expiresAt={reservation.expiresAt} />
                        ) : (
                          <span className="text-xs font-mono font-bold text-red-600 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                            01d 23:57:24
                          </span>
                        )}
                        
                        <span className="text-xs font-normal text-zinc-800 dark:text-zinc-200">
                          Sponsor ad
                        </span>
                      </div>

                      {/* Middle Body - Open space */}
                      <div className="flex-1 my-auto"></div>

                      {/* Bottom Footer Row: Brand Name on Left, Submit Button on Right */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 mt-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate leading-snug">
                            {campaign.brand || campaign.title}
                          </h3>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setIsSubmitModalOpen(true);
                          }}
                          className="h-9 px-4 text-xs font-semibold rounded-xl border-zinc-300 dark:border-zinc-700 bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shrink-0 cursor-pointer shadow-2xs"
                        >
                          Submit
                        </Button>
                      </div>
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
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-border/80 bg-card shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedReservation.campaign.brand}
                  </span>
                  {getStatusBadge(selectedReservation.status)}
                </div>

                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-tight">
                    {selectedReservation.campaign.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Tier: {selectedReservation.campaign.tier || "Tier 1"} &bull; Deliverable: {selectedReservation.campaign.type || "Reel"}
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
                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          {selectedReservation.campaign.starReward || 1} Stars
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatINR(selectedReservation.campaign.payAmount)}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Countdown</span>
                      {selectedReservation.expiresAt ? (
                        <RedCountdownBadge expiresAt={selectedReservation.expiresAt} />
                      ) : (
                        <span className="text-xs font-bold text-foreground">48 Hours</span>
                      )}
                    </div>
                  </div>

                  {/* Button to Open Full Workspace */}
                  <Link href={`/campaigns/${selectedReservation.campaignId}/workspace`}>
                    <Button 
                      variant="secondary" 
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="w-full text-xs font-semibold rounded-xl h-9 cursor-pointer"
                    >
                      Open Full Campaign Workspace & Guidelines
                    </Button>
                  </Link>

                  {/* Mandatory Mentions */}
                  {selectedReservation.campaign.mentions && selectedReservation.campaign.mentions.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Mandatory Mentions
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedReservation.campaign.mentions.map((mention, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs py-1 px-2 bg-muted text-foreground border-border font-medium cursor-pointer"
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

                  {/* Submission Input Fields */}
                  {selectedReservation.status === 'reserved' ? (
                    <div className="space-y-3 pt-1">
                      <h4 className="text-xs font-semibold text-foreground">
                        Submit Published Reel Link
                      </h4>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="link" className="text-xs">Published Instagram Reel URL *</Label>
                        <Input 
                          id="link" 
                          placeholder="https://instagram.com/reel/..." 
                          value={submissionData.link}
                          onChange={(e) => setSubmissionData({...submissionData, link: e.target.value})}
                          className="h-9 text-xs rounded-xl font-mono"
                          data-testid="input-post-link"
                        />
                      </div>
                    </div>
                  ) : selectedReservation.status === 'submitted' ? (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1 text-blue-900 dark:text-blue-300">
                      <p className="font-semibold">Submission is under Admin / Brand review:</p>
                      <p className="truncate font-mono">{selectedReservation.postUrl}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs space-y-1 text-green-900 dark:text-green-300">
                      <p className="font-semibold">Content verified and approved!</p>
                      <p className="text-muted-foreground">Payout has been credited to your wallet balance.</p>
                    </div>
                  )}

                </div>
              </ScrollArea>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-border bg-card flex items-center justify-between gap-2 shrink-0">
                {selectedReservation.status === 'reserved' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 text-xs h-9 px-3 rounded-xl cursor-pointer"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this reservation? The spot will be released.")) {
                        cancelMutation.mutate(selectedReservation.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Slot
                  </Button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Button 
                    variant="outline" 
                    className="h-9 text-xs px-3 rounded-xl font-semibold cursor-pointer"
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      setSelectedReservation(null);
                    }}
                  >
                    Close
                  </Button>

                  {selectedReservation.status === 'reserved' && (
                    <Button 
                      className="h-9 text-xs px-4 rounded-xl font-semibold shadow-xs cursor-pointer"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-proof-modal"
                    >
                      {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
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
