import { BarChart3, TrendingUp, Users, Wallet, Star } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { Link } from "wouter";
import { api, type ApiCampaign, type ApiUser, type ApiReservation, formatINR } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import heroBg from "@assets/generated_images/abstract_instagram-themed_3d_background.png";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
    initialData: () => (authUser && authUser.role === "creator" ? (authUser as any) : undefined),
    refetchInterval: 30000, // Auto-refresh every 30 seconds to show updated stars
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const activeUser = user || (authUser as any);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.getCampaigns(),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", user?.id],
    queryFn: () => user ? api.getUserReservations(user.id) : [],
    enabled: !!user,
  });

  // Handle URL query parameters if redirected from external flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("instagram_connected") === "true") {
      const username = params.get("username");
      toast.success(username ? `Instagram @${username} connected successfully!` : "Instagram connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      window.history.replaceState({}, "", "/dashboard");
    } else if (params.get("instagram_error")) {
      toast.error(`Instagram connection error: ${params.get("instagram_error")}`);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [queryClient]);

  if (!activeUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-xs text-muted-foreground">Loading Mingree...</p>
        </div>
      </div>
    );
  }
  
  const stats = [
    { label: "Followers", value: activeUser.instagramFollowers ? activeUser.instagramFollowers.toLocaleString() : (activeUser.followers ? activeUser.followers.toLocaleString() : "-"), icon: Users, color: "text-blue-500" },
    { label: "Balance", value: formatINR(activeUser.balance || "0"), icon: Wallet, color: "text-green-500" },
    { label: "Stars", value: `${activeUser.stars || 0}/5`, icon: Star, color: "text-yellow-500" },
    { label: "Campaigns", value: reservations.length.toString(), icon: TrendingUp, color: "text-orange-500" },
  ];

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

  const featuredCampaigns = availableCampaigns.slice(0, 3);

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {/* Mobile Header with Notification */}
        <div className="sticky top-0 z-40 flex items-center justify-between bg-background/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden shadow-xs w-full max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">Dashboard</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">Creator</span>
          </div>
          <NotificationDropdown userId={user.id} />
        </div>
        
        <div className="w-full max-w-5xl mx-auto px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border">
          {/* Hero Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl bg-black text-white shadow-lg relative w-full"
          >
            <div className="absolute inset-0 opacity-40">
              <img src={heroBg} className="w-full h-full object-cover" alt="Background" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-transparent" />
             
            <div className="relative z-10 p-4 sm:p-7 md:p-9">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-amber-300">{user.name.split(' ')[0]}</span>
              </h1>
              <p className="mt-1.5 max-w-lg text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed">
                You have {reservations.length} active campaigns and {campaigns.length} opportunities ready for you.
              </p>
              <div className="mt-4 sm:mt-5 flex flex-wrap gap-2.5 sm:gap-3">
                <Link href="/campaigns">
                  <div className="rounded-full bg-white px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-black transition hover:bg-zinc-100 cursor-pointer shadow-sm text-center">
                    Find Campaigns
                  </div>
                </Link>
                <Link href="/earnings">
                  <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 cursor-pointer text-center">
                    View Earnings
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* 4 Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 w-full">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-full min-w-0"
              >
                <Card className="border-border/80 shadow-xs h-full overflow-hidden">
                  <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-xl bg-muted p-2 dark:bg-zinc-800 ${stat.color}`}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2.5 min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">{stat.value}</p>
                      <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Active Campaigns & Instagram Creator Tips */}
          <div className="mt-5 sm:mt-8 grid gap-4 sm:gap-6 md:grid-cols-2 w-full">
            <Card className="h-full border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold">Active Campaigns</CardTitle>
                <Link href="/campaigns">
                  <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">View All</span>
                </Link>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-2.5 sm:space-y-3">
                {featuredCampaigns.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">No campaigns available right now</p>
                ) : (
                  featuredCampaigns.map((campaign: ApiCampaign) => (
                    <div 
                      key={campaign.id} 
                      className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border p-2.5 sm:p-3.5 transition hover:bg-muted/40 w-full min-w-0 overflow-hidden" 
                      data-testid={`card-campaign-${campaign.id}`}
                    >
                      <div className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center border">
                        {campaign.brandLogo ? (
                          <img src={campaign.brandLogo} alt={campaign.brand} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {campaign.brand.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">{campaign.title}</h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{campaign.brand}</p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-xs sm:text-sm text-primary whitespace-nowrap" data-testid={`text-amount-${campaign.id}`}>
                          {formatINR(campaign.payAmount)}
                        </p>
                        <span className="inline-block rounded-md bg-orange-100 dark:bg-orange-950/40 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-orange-700 dark:text-orange-300 whitespace-nowrap mt-0.5">
                          {campaign.type}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="h-full bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-700 text-white shadow-md border-0 overflow-hidden">
              <CardContent className="flex h-full flex-col justify-between p-4 sm:p-6">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Pro Creator Tip
                  </div>
                  <h3 className="text-base sm:text-xl font-black tracking-tight">Instagram Creator Tips</h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-white/90 leading-relaxed">
                    Reels with trending audio get 2x more engagement. Check out this week's top viral sounds and hashtag strategies.
                  </p>
                </div>
                <Link href="/about">
                  <button className="mt-4 w-full rounded-xl bg-white/20 hover:bg-white/30 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-md transition text-white text-center cursor-pointer shadow-xs">
                    View Creator Guide
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
