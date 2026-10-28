import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { api, type ApiCampaign, type ApiReservation, formatINR } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useAuth } from "@/lib/auth-context";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;



export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user: authUser } = useAuth();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
    initialData: () => (authUser && authUser.role === "creator" ? (authUser as any) : undefined),
    refetchInterval: 30000,
  });

  const activeUser = user || (authUser as any);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.getCampaigns(),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", activeUser?.id],
    queryFn: () => activeUser ? api.getUserReservations(activeUser.id) : [],
    enabled: !!activeUser,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["categorySubscriptions", activeUser?.id],
    queryFn: () => activeUser ? api.getUserCategorySubscriptions(activeUser.id) : [],
    enabled: !!activeUser,
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["creatorWorkspaces", activeUser?.id],
    queryFn: () => activeUser ? api.getCreatorWorkspaces(activeUser.id) : [],
    enabled: !!activeUser,
  });

  const { data: analytics } = useQuery({
    queryKey: ["creatorAnalytics"],
    queryFn: api.getCreatorAnalytics,
    enabled: !!activeUser && activeUser.role === "creator",
  });

  if (!activeUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-xs text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isReservationActive = (r?: ApiReservation | null): boolean => {
    if (!r) return false;
    if (r.status === "expired" || r.status === "rejected") return false;
    if (r.status === "reserved" && r.expiresAt) {
      const isExpired = new Date(r.expiresAt).getTime() <= Date.now();
      if (isExpired) return false;
    }
    return true;
  };

  const isCampaignReserved = (campaignId: number): boolean => {
    const r = reservations.find((res: ApiReservation) => res.campaignId === campaignId);
    return isReservationActive(r);
  };

  const availableCampaigns = campaigns.filter((c: ApiCampaign) => {
    if (c.spotsRemaining <= 0) return false;
    if (isCampaignReserved(c.id)) return false;
    return true;
  });

  const isVerifiedAccount = Boolean(activeUser.isInstagramVerified && activeUser.instagramUsername);

  const stats = [
    { 
      label: "Verified Audience", 
      value: (isVerifiedAccount && activeUser.followers) ? `${activeUser.followers.toLocaleString()} followers` : "Not Connected", 
      sub: isVerifiedAccount ? `${activeUser.tier || "Creator"} Tier` : "Connect Instagram to verify"
    },
    { 
      label: "Escrow Earnings", 
      value: formatINR(analytics?.totalEarnings || 0), 
      sub: "Secured in Escrow"
    },
    { 
      label: "Average Views", 
      value: (isVerifiedAccount && analytics?.avgViews) ? analytics.avgViews.toLocaleString() : "Not Connected", 
      sub: "Per Instagram Reel"
    },
    { 
      label: "Engagement Rate", 
      value: isVerifiedAccount ? "4.8%" : "Not Connected", 
      sub: isVerifiedAccount ? "Verified metrics" : "Requires Instagram link"
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {/* Mobile Sticky Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden shadow-xs w-full max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">Dashboard</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
              {activeUser.tier || "Creator"}
            </span>
          </div>
          <NotificationDropdown userId={activeUser.id} />
        </header>
        
        <div className="w-full max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Executive Welcome Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Welcome back, {activeUser.name.split(' ')[0]}
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Overview of your fixed-price campaigns, direct brand deals, and escrow performance.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/campaigns")}
                className="text-xs h-9 rounded-xl font-medium"
              >
                Fixed Price Ads
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/creator-requests")}
                className="text-xs h-9 rounded-xl font-medium bg-primary text-primary-foreground shadow-xs"
              >
                Direct Brand Deals
              </Button>
            </div>
          </div>

          {/* 4 Precision Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="border border-border/80 shadow-xs h-full">
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
                    <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                    <div className="mt-3">
                      <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight tabular-nums">
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {stat.sub}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Dual Commercial Models Quick Command Center */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Model 1: Fixed Price / Tier Model Card */}
            <Card className="border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold">Fixed Price Model</CardTitle>
                    <CardDescription className="text-xs">
                      Guaranteed payouts based on follower tier and category groups
                    </CardDescription>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Tier Model
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
                      Audience Tier
                    </span>
                    <span className="font-semibold text-foreground text-sm mt-0.5 block">
                      {activeUser.tier || "Small"} Tier
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
                      Groups Joined
                    </span>
                    <span className="font-semibold text-foreground text-sm mt-0.5 block">
                      {subscriptions.length} Categories
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {availableCampaigns.length} campaigns open for instant slot reservation
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/campaigns")}
                    className="text-xs font-semibold text-primary h-8 px-2.5 hover:bg-primary/10"
                  >
                    Browse Ads
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Model 2: Direct Brand Deals Card */}
            <Card className="border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold">Direct Brand Deals</CardTitle>
                    <CardDescription className="text-xs">
                      Custom sponsorship offers sent directly to your rate card
                    </CardDescription>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Direct Model
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
                      Direct Invites
                    </span>
                    <span className="font-semibold text-foreground text-sm mt-0.5 block">
                      {workspaces.length} Total Deals
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                    <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
                      Rate Card
                    </span>
                    <span className="font-semibold text-foreground text-sm mt-0.5 block">
                      Configured & Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Brands browse your profile to send direct booking proposals
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/creator-requests")}
                    className="text-xs font-semibold text-primary h-8 px-2.5 hover:bg-primary/10"
                  >
                    Manage Deals
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Workspaces & Deliverable Milestones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Active Workspaces & Deadlines</h3>
                <p className="text-xs text-muted-foreground">Campaigns currently in content delivery and review</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/my-campaigns")}
                className="text-xs h-8 rounded-lg"
              >
                View All Workspaces
              </Button>
            </div>

            {reservations.length === 0 ? (
              <Card className="border-dashed border bg-card/40">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">No Active Workspaces</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                    Claim a slot from Fixed Price Campaigns or accept a direct brand offer to start your content workspace.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/campaigns")}
                    className="text-xs h-8 px-3 rounded-lg font-medium"
                  >
                    Explore Campaigns
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {reservations.map((res: any) => (
                  <Card key={res.id} className="border border-border/80 shadow-xs hover:border-border transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">{res.campaignTitle}</h4>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {res.expiresAt ? `Due ${new Date(res.expiresAt).toLocaleDateString()}` : "In Progress"}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/campaigns/${res.campaignId}/workspace`)}
                        className="text-xs h-8 px-2.5 rounded-lg shrink-0"
                      >
                        Workspace
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
