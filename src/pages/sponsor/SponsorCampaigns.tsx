import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { api, formatINR, type BrandCampaignCard } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";

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
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <SponsorSidebar />

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pt-14 md:pt-0 pb-28 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-background/95 backdrop-blur-md px-4 py-4 md:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">Brand Management</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Campaigns & Workspaces</h1>
          </div>

          <Link href="/sponsor/create-campaign">
            <Button size="sm" className="font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
              Create Campaign
            </Button>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          {isLoading ? (
            <div className="text-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="mt-4 text-xs text-muted-foreground">Loading campaign workspaces...</p>
            </div>
          ) : cards.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center space-y-4 rounded-2xl shadow-2xs">
              <h3 className="text-lg font-bold text-foreground">No Campaigns Created Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Launch your first Instagram campaign with targeted creator matching, escrow protection, and dedicated workspaces.
              </p>
              <Link href="/sponsor/create-campaign">
                <Button className="mt-2 font-semibold text-xs rounded-xl">
                  Create Your First Campaign
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((c) => {
                const fillPercent = c.totalSlots > 0 ? Math.round((c.reservedSlots / c.totalSlots) * 100) : 0;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col"
                  >
                    <Card
                      onClick={() => setLocation(`/sponsor/campaigns/${c.id}/workspace`)}
                      className="group cursor-pointer bg-card hover:bg-muted/30 border-border hover:border-foreground/40 transition-all rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md"
                    >
                      <CardHeader className="p-5 pb-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {c.brandLogo ? (
                              <img
                                src={c.brandLogo}
                                alt=""
                                className="h-12 w-12 rounded-xl object-cover border border-border/80 shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-border">
                                {c.title.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-[11px] font-semibold text-primary">{c.genre || "Promotional"}</span>
                              <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors line-clamp-1">
                                {c.title}
                              </h3>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase shrink-0 ${
                              c.status === "filling_slots"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : c.status === "under_review"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                : c.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </Badge>
                        </div>

                        {/* Slots Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">
                              Slots: <strong className="text-foreground">{c.reservedSlots} / {c.totalSlots}</strong>
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{c.remainingSlots} remaining</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/60">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, fillPercent)}%` }}
                            />
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 py-2 space-y-3.5">
                        {/* Financial Snapshot */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">Total Budget</span>
                            <span className="font-bold text-foreground text-sm">{formatINR(c.totalBudget)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">Committed Payouts</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatINR(c.committedPayouts)}</span>
                          </div>
                        </div>

                        {/* Workflow Badges */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-lg bg-muted/50 border border-border/70">
                            <span className="text-[10px] text-muted-foreground block">Creators</span>
                            <span className="font-bold text-foreground">{c.activeParticipantsCount}</span>
                          </div>
                          <div className={`p-2 rounded-lg border ${c.awaitingReview > 0 ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300" : "bg-muted/50 border-border/70 text-foreground"}`}>
                            <span className="text-[10px] text-muted-foreground block">Review</span>
                            <span className="font-bold">{c.awaitingReview}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50 border border-border/70">
                            <span className="text-[10px] text-muted-foreground block">Approved</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{c.approvedCount}</span>
                          </div>
                        </div>

                        {/* Pending Alerts */}
                        {c.pendingApplications > 0 && (
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between font-medium">
                            <span className="flex items-center gap-1.5">
                              {c.pendingApplications} Pending Application{c.pendingApplications > 1 ? "s" : ""}
                            </span>
                            <span className="text-[10px] underline">Review</span>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-5 pt-3 border-t border-border/70 bg-muted/20 flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground">
                          Deadline: <span className="text-foreground font-medium">{c.deadline}</span>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="group-hover:bg-primary group-hover:text-primary-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer"
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
