import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, formatINR } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useAuth } from "@/lib/auth-context";

export default function SponsorDashboard() {
  const { user: authUser } = useAuth();
  const { data: sponsor } = useQuery({
    queryKey: ["currentSponsor"],
    queryFn: api.getCurrentSponsor,
    initialData: () => (authUser && authUser.role === "sponsor" ? (authUser as any) : undefined),
  });

  const activeSponsor = sponsor || (authUser?.role === "sponsor" ? authUser : null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["sponsorCampaigns", activeSponsor?.id],
    queryFn: () => activeSponsor ? api.getSponsorCampaigns(activeSponsor.id) : [],
    enabled: !!activeSponsor,
  });

  if (!activeSponsor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalSpots = campaigns.reduce((sum, c) => sum + c.totalSpots, 0);
  const filledSpots = campaigns.reduce((sum, c) => sum + (c.totalSpots - c.spotsRemaining), 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.payAmount) * c.totalSpots, 0);
  const activeCampaigns = campaigns.filter(c => c.spotsRemaining > 0).length;

  const stats = [
    { label: "Active Campaigns", value: activeCampaigns.toString() },
    { label: "Total Budget", value: formatINR(totalBudget) },
    { label: "Creators Reached", value: filledSpots.toString() },
    { label: "Fill Rate", value: totalSpots > 0 ? `${Math.round((filledSpots / totalSpots) * 100)}%` : "0%" },
  ];

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <SponsorSidebar />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pt-14 md:pt-0 pb-6">
        
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 overflow-x-hidden space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome, {activeSponsor.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {activeSponsor.companyName || "Brand Partner"}
            </p>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed">
              Manage your influencer campaigns, review submissions, and fund escrow.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Link href="/sponsor/create-campaign">
                <Button size="sm" className="text-xs font-semibold" data-testid="button-create-campaign">
                  Create Campaign
                </Button>
              </Link>
              <Link href="/sponsor/campaigns">
                <Button variant="outline" size="sm" className="text-xs">
                  View Listings
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground">Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaigns.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-muted-foreground">No campaigns created yet</p>
                    <Link href="/sponsor/create-campaign">
                      <Button size="sm" className="mt-3 text-xs" data-testid="button-create-first">
                        Create Your First Campaign
                      </Button>
                    </Link>
                  </div>
                ) : (
                  campaigns.slice(0, 5).map((campaign) => (
                    <Link key={campaign.id} href={`/sponsor/campaigns/${campaign.id}/workspace`}>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5 hover:bg-muted/30 transition-all cursor-pointer" data-testid={`campaign-${campaign.id}`}>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">{campaign.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{campaign.genre || "Music Reels"} • {campaign.bookingModel === "approval_required" ? "Approval Required" : "Instant Booking"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xs sm:text-sm text-foreground tabular-nums">{formatINR(campaign.payAmount)}</p>
                          <span className="text-[11px] text-muted-foreground block">
                            {campaign.reservedSlots !== undefined ? `${campaign.reservedSlots}/${campaign.totalSlots} slots` : `${campaign.totalSpots - campaign.spotsRemaining}/${campaign.totalSpots} spots`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
