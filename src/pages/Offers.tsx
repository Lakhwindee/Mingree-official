import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, formatINR, type CreatorCampaignItem } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export default function Offers() {
  const [, navigate] = useLocation();
  const { user: authUser } = useAuth();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
    initialData: () => (authUser ? (authUser as any) : undefined),
  });

  const activeUser = user || authUser;

  const { data: campaignItems = [], isLoading } = useQuery({
    queryKey: ["creatorCampaignWorkspaces", activeUser?.id],
    queryFn: () => (activeUser ? api.getCreatorCampaignWorkspaces(activeUser.id) : []),
    enabled: !!activeUser?.id,
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex-1 w-full max-w-full min-w-0 overflow-y-auto pt-14 md:pt-0 pb-8">
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="hidden md:flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creator Proposals</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Campaign Offers & Quoted Rates</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage your invitations, quoted proposal rates, and active campaign workspace invitations.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="mt-3 text-xs text-muted-foreground">Loading your campaign offers...</p>
            </div>
          ) : campaignItems.length === 0 ? (
            <Card className="p-12 text-center space-y-4 bg-card border-border">
              <h3 className="text-lg font-bold">No Campaign Offers Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Explore the Campaign Marketplace to discover active promotions, submit custom rate proposals, or reserve slots.
              </p>
              <Button 
                onClick={() => navigate("/campaigns")}
                className="mt-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Browse Campaign Marketplace
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaignItems.map((item: CreatorCampaignItem) => {
                const statusColor = 
                  item.status === "approved" || item.status === "reserved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                  item.status === "applied" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                  item.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                  "bg-blue-500/10 text-blue-400 border-blue-500/30";

                return (
                  <motion.div key={item.campaignId} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover:border-border transition-all rounded-2xl overflow-hidden flex flex-col justify-between bg-card border-border shadow-xs">
                      <CardHeader className="p-5 pb-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground">Campaign ID #{item.campaignId} &bull; {item.brand}</span>
                            <h3 className="font-bold text-base line-clamp-1">{item.title}</h3>
                          </div>
                          <Badge className={`text-[10px] font-bold uppercase shrink-0 border ${statusColor}`}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 pt-0 space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Quoted Payout</span>
                            <span className="text-base font-extrabold text-foreground tabular-nums">{formatINR(item.payAmount)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Deadline</span>
                            <span className="text-xs font-medium">
                              {(() => {
                                if (!item.deadline) return "No deadline";
                                try {
                                  const d = new Date(item.deadline);
                                  return !isNaN(d.getTime()) ? d.toLocaleDateString() : "No deadline";
                                } catch {
                                  return "No deadline";
                                }
                              })()}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => navigate(`/campaigns/${item.campaignId}/workspace`)}
                          className="w-full bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl h-10 flex items-center justify-center cursor-pointer"
                        >
                          Open Campaign Workspace
                        </Button>
                      </CardContent>
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
