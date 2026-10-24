import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { api, formatINR, type BrandCampaignCard } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { Link, useLocation } from "wouter";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;



export default function SponsorCampaigns() {
  const [, setLocation] = useLocation();

  const { data: sponsor } = useQuery({
    queryKey: ["currentSponsor"],
    queryFn: api.getCurrentSponsor,
  });

  const {
    data: cards = [],
    isLoading,
  } = useQuery({
    queryKey: ["brandCampaignCards", sponsor?.id],
    queryFn: () => api.getBrandCampaignCards(sponsor?.id),
    enabled: !!sponsor,
    refetchInterval: 4000,
  });

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-100">
      <SponsorSidebar />

      <main className="flex-1 w-full min-w-0 overflow-y-auto pb-28 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 py-4 md:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-pink-400">Brand Management</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Campaigns & Workspaces</h1>
          </div>

          <Link href="/sponsor/create-campaign">
            <Button className="bg-pink-600 hover:bg-pink-500 font-bold text-white rounded-xl text-xs sm:text-sm">
               Create Campaign
            </Button>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          {isLoading ? (
            <div className="text-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto" />
              <p className="mt-4 text-xs text-zinc-400">Loading campaign cards...</p>
            </div>
          ) : cards.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-12 text-center space-y-4">
              
              <h3 className="text-lg font-bold text-white">No Campaigns Created Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Launch your first Instagram Reels campaign with targeted creator matching, escrow protection, and dedicated campaign workspaces.
              </p>
              <Link href="/sponsor/create-campaign">
                <Button className="mt-2 bg-pink-600 hover:bg-pink-500 font-bold text-white">
                  + Create Your First Campaign
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((c) => {
                const fillPercent = c.totalSlots > 0 ? Math.round((c.reservedSlots / c.totalSlots) * 100) : 0;
                const payoutProgress = c.totalBudget > 0 ? Math.round((c.releasedPayouts / c.totalBudget) * 100) : 0;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col"
                  >
                    <Card
                      onClick={() => setLocation(`/sponsor/campaigns/${c.id}/workspace`)}
                      className="group cursor-pointer bg-zinc-900/90 hover:bg-zinc-900 border-zinc-800 hover:border-pink-500/50 transition-all rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-pink-500/10"
                    >
                      <CardHeader className="p-5 pb-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={c.brandLogo}
                              alt=""
                              className="h-12 w-12 rounded-xl object-cover border border-zinc-800 shrink-0"
                            />
                            <div>
                              <span className="text-[11px] font-semibold text-pink-400">{c.genre}</span>
                              <h3 className="font-bold text-white text-base group-hover:text-pink-300 transition-colors line-clamp-1">
                                {c.title}
                              </h3>
                            </div>
                          </div>

                          <Badge
                            className={`text-[10px] font-bold uppercase shrink-0 ${
                              c.status === "filling_slots"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : c.status === "under_review"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                : c.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </Badge>
                        </div>

                        {/* Slots Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400 font-medium">
                              Slots: <strong className="text-white">{c.reservedSlots} / {c.totalSlots}</strong>
                            </span>
                            <span className="text-amber-400 font-semibold">{c.remainingSlots} remaining</span>
                          </div>
                          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                            <div
                              className="bg-gradient-to-r from-pink-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, fillPercent)}%` }}
                            />
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 py-2 space-y-3.5">
                        {/* Financial Snapshot */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Budget</span>
                            <span className="font-bold text-white text-sm">{formatINR(c.totalBudget)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Committed Payouts</span>
                            <span className="font-bold text-emerald-400 text-sm">{formatINR(c.committedPayouts)}</span>
                          </div>
                        </div>

                        {/* Workflow Badges */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-lg bg-zinc-950/50 border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block">Creators</span>
                            <span className="font-bold text-white">{c.activeParticipantsCount}</span>
                          </div>
                          <div className={`p-2 rounded-lg border ${c.awaitingReview > 0 ? "bg-amber-950/20 border-amber-500/40 text-amber-300" : "bg-zinc-950/50 border-zinc-800 text-white"}`}>
                            <span className="text-[10px] text-zinc-500 block">Review</span>
                            <span className="font-bold">{c.awaitingReview}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-zinc-950/50 border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 block">Approved</span>
                            <span className="font-bold text-emerald-400">{c.approvedCount}</span>
                          </div>
                        </div>

                        {/* Pending Alerts */}
                        {c.pendingApplications > 0 && (
                          <div className="p-2 rounded-lg bg-pink-950/30 border border-pink-900/40 text-[11px] text-pink-300 flex items-center justify-between font-medium">
                            <span className="flex items-center gap-1.5">
                              
                              {c.pendingApplications} Pending Application{c.pendingApplications > 1 ? "s" : ""}
                            </span>
                            <span className="text-[10px] underline">Review</span>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-5 pt-3 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between">
                        <div className="text-[11px] text-zinc-400">
                          Deadline: <span className="text-zinc-200 font-medium">{c.deadline}</span>
                        </div>

                        <Button
                          size="sm"
                          className="bg-zinc-800 group-hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          Open Workspace 
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
