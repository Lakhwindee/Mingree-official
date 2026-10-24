import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function CreateCampaignSelect() {
  const [, navigate] = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <SponsorSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="mx-auto max-w-4xl p-6 sm:p-10 space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Create Campaign</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Choose your preferred campaign creation method to get started.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Fixed Price Option */}
            <Card 
              className="relative overflow-hidden border border-border hover:border-foreground transition-all cursor-pointer flex flex-col justify-between"
              onClick={() => navigate("/sponsor/create-campaign/fixed")}
            >
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl font-bold text-foreground">Fixed Price Campaign</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Set campaign details, target categories, and fixed pricing tiers. Perfect for automated creator applications and standard pricing.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5 text-xs text-muted-foreground mb-6 list-disc pl-4">
                  <li>Standard tier pricing structure</li>
                  <li>Automated creator applications</li>
                  <li>Quick launch workflow</li>
                </ul>
                <Button className="w-full text-xs font-semibold" onClick={(e) => { e.stopPropagation(); navigate("/sponsor/create-campaign/fixed"); }}>
                  Select Fixed Price
                </Button>
              </CardContent>
            </Card>

            {/* Choose Creators / Manual Option */}
            <Card 
              className="relative overflow-hidden border border-border hover:border-foreground transition-all cursor-pointer flex flex-col justify-between"
              onClick={() => navigate("/sponsor/create-campaign/manual")}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-bold text-foreground">Choose Creators (Manual)</CardTitle>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground border border-border">
                    Hand-picked
                  </span>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  Hand-pick specific creators across cities and follower tiers. Preview custom bills in real-time and lock escrow securely.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5 text-xs text-muted-foreground mb-6 list-disc pl-4">
                  <li>Browse creators by city and tier</li>
                  <li>Exact creator selection and pricing</li>
                  <li>Secure cryptographic billing and escrow</li>
                </ul>
                <Button variant="outline" className="w-full text-xs font-semibold" onClick={(e) => { e.stopPropagation(); navigate("/sponsor/create-campaign/manual"); }}>
                  Select Choose Creators
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
