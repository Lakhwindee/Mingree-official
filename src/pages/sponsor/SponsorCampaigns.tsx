import { useState, useMemo } from "react";
import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { api, formatINR, type BrandCampaignCard } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Layers, History, CheckCircle2, FolderCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SponsorCampaigns() {
  const [, setLocation] = useLocation();
  const [filterTab, setFilterTab] = useState<"active" | "history" | "all">("active");

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

  const isCampaignCompleted = (c: BrandCampaignCard) => {
    return c.status === "completed" || (c.totalSlots > 0 && c.approvedCount >= c.totalSlots);
  };

  const activeCards = useMemo(() => cards.filter((c) => !isCampaignCompleted(c)), [cards]);
  const completedCards = useMemo(() => cards.filter((c) => isCampaignCompleted(c)), [cards]);

  const displayedCards = useMemo(() => {
    if (filterTab === "active") return activeCards;
    if (filterTab === "history") return completedCards;
    return cards;
  }, [filterTab, activeCards, completedCards, cards]);

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
          {/* Workspace Tabs: Active vs Completed & History */}
          {!isLoading && cards.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  filterTab === "active"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Active Workspaces</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filterTab === "active"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {activeCards.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("history")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  filterTab === "history"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <History className="h-4 w-4" />
                <span>Completed & History</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filterTab === "history"
                      ? "bg-white/20 text-white"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {completedCards.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  filterTab === "all"
                    ? "bg-foreground/10 text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>All ({cards.length})</span>
              </button>
            </div>
          )}

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
          ) : displayedCards.length === 0 ? (
            filterTab === "active" ? (
              <Card className="border-border bg-card p-10 text-center space-y-4 rounded-2xl shadow-2xs">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Active Workspaces Clean</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  All your campaign spots have been completed and approved! Finished campaign folders have been moved into the <strong>Completed & History</strong> tab.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setFilterTab("history")}
                    className="font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 mr-1.5" />
                    View Completed & History ({completedCards.length})
                  </Button>
                  <Link href="/sponsor/create-campaign">
                    <Button className="font-semibold text-xs rounded-xl cursor-pointer">
                      Create New Campaign
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="border-border bg-card p-10 text-center space-y-4 rounded-2xl shadow-2xs">
                <div className="h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                  <History className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No Completed Campaigns Yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Once creators submit their Reels and you approve them, finished campaign folders will automatically appear here in History.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFilterTab("active")}
                  className="font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Back to Active Workspaces
                </Button>
              </Card>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCards.map((c) => {
                const fillPercent = c.totalSlots > 0 ? Math.round((c.reservedSlots / c.totalSlots) * 100) : 0;
                const isCompleted = isCampaignCompleted(c);

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col"
                  >
                    <Card
                      onClick={() => setLocation(`/sponsor/campaigns/${c.id}/workspace`)}
                      className={cn(
                        "group cursor-pointer transition-all rounded-xl overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm",
                        isCompleted
                          ? "bg-muted/30 hover:bg-muted/50 border-border/60 text-muted-foreground p-0"
                          : "bg-card hover:bg-muted/30 border-border hover:border-foreground/40"
                      )}
                    >
                      {isCompleted ? (
                        /* Compact Grey History Card */
                        <div className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {c.brandLogo ? (
                              <img
                                src={c.brandLogo}
                                alt=""
                                className="h-9 w-9 rounded-lg object-cover border border-border/60 shrink-0 opacity-80"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground font-bold flex items-center justify-center shrink-0 border border-border/80 text-xs">
                                {c.title.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  {c.genre || "Promotional"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold uppercase shrink-0 bg-muted text-muted-foreground border-border/80 px-1.5 py-0"
                                >
                                  COMPLETED
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors line-clamp-1">
                                {c.title}
                              </h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Budget: {formatINR(c.totalBudget)} • Payout: {formatINR(c.committedPayouts)} • {c.approvedCount} Approved
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] font-medium rounded-lg text-muted-foreground border-border/80 bg-muted/50 hover:bg-muted hover:text-foreground shrink-0 cursor-pointer"
                          >
                            History &rarr;
                          </Button>
                        </div>
                      ) : (
                        /* Standard Active Card */
                        <>
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
                                  Reserved: <strong className="text-foreground">{c.reservedSlots} / {c.totalSlots}</strong>
                                </span>
                                {(c as any).pendingCreatorsCount > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    {(c as any).pendingCreatorsCount} Pending Reservation
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {c.remainingSlots} open
                                  </span>
                                )}
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
                                <span className="text-[10px] text-muted-foreground block">Selected</span>
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

                            {/* Pending Reservation / Application Alerts */}
                            {(c as any).pendingCreatorsCount > 0 && (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between font-medium">
                                <span>
                                  {(c as any).pendingCreatorsCount} Chosen Creator{(c as any).pendingCreatorsCount > 1 ? "s" : ""} — Pending Ad Reservation
                                </span>
                                <span className="text-[10px] font-bold underline">View List &rarr;</span>
                              </div>
                            )}
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
                        </>
                      )}
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
