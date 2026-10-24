import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/auth-context";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;



export default function AboutMingree() {
  const { isAuthenticated, user } = useAuth();

  const creatorFeatures = [
    {
      title: "Discover Campaigns",
      description: "Browse verified brand campaigns matching your niche, content style, and audience size."
    },
    {
      title: "Dynamic Follower Tiers",
      description: "As your Instagram followers and engagement grow, higher payout tiers unlock automatically."
    },
    {
      title: "Instant Secure Payouts",
      description: "Escrow-backed earnings deposited directly to your bank account or UPI with zero payment delays."
    },
    {
      title: "Official Meta Verification",
      description: "Sync your live Instagram metrics and get the verified badge to qualify for high-ticket sponsorships."
    }
  ];

  const brandFeatures = [
    {
      title: "Hyper-Targeted Matching",
      description: "Filter creators by exact follower brackets, regional languages, location, and content categories."
    },
    {
      title: "Escrow Budget Protection",
      description: "Funds are locked safely in escrow and only released once you review and approve creator content."
    },
    {
      title: "Real-Time Tracking",
      description: "Track reservation status, review submissions, and analyze live ROI from your brand dashboard."
    },
    {
      title: "100% Genuine Audiences",
      description: "Meta API integration guarantees verified accounts with genuine engagement and no fake metrics."
    }
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Create Account & Connect Instagram",
      description: "Sign up and link your Instagram profile via official Meta login to verify your follower tier (min 500 followers)."
    },
    {
      step: "02",
      title: "Browse & Reserve Campaigns",
      description: "Find campaigns that fit your creative style. Reserve a spot to lock in your payout and get 48 hours to create."
    },
    {
      step: "03",
      title: "Create & Submit Content",
      description: "Record your reel or story following the sponsor's brief, post on Instagram, and submit your live link."
    },
    {
      step: "04",
      title: "Earn & Withdraw to Bank",
      description: "Once approved, funds move immediately to your Mingree balance for instant withdrawal via Bank Transfer or UPI."
    }
  ];

  const faqs = [
    {
      q: "What is the minimum requirement to join Mingree?",
      a: "Creators need at least 500 followers on Instagram and an authentic profile. Connecting your account via official Meta Login automatically verifies your follower count and unlocks your initial tier."
    },
    {
      q: "How do payouts and withdrawals work?",
      a: "Brands deposit campaign funds into Mingree escrow before campaigns launch. Once a creator's submission is approved, the funds are credited directly to the creator's wallet balance and can be withdrawn via IMPS/NEFT Bank Transfer or UPI."
    },
    {
      q: "What are the 20 Creator Tiers?",
      a: "Mingree categorizes creators into 20 progressive tiers starting from Nano (500-2K followers) up to Celebrity/Mega (1M+ followers). Higher tiers receive higher fixed base payouts per post."
    },
    {
      q: "Is Mingree safe and compliant with Instagram?",
      a: "Yes! Mingree uses official Meta Instagram Graph API endpoints with OAuth 2.0. We never ask for your Instagram password, and we strictly follow Meta's Developer Policies."
    }
  ];

  const content = (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-10">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Link href={isAuthenticated ? (user?.role === "sponsor" ? "/sponsor" : "/dashboard") : "/login"}>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            {isAuthenticated ? "Back to Dashboard" : "Back to Login"}
          </Button>
        </Link>
        <span className="font-bold text-sm tracking-tight text-foreground">Mingree Guide</span>
      </div>

      {/* Hero Banner */}
      <div className="rounded-xl bg-card border border-border p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            About Mingree Platform
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Where Creators Turn Influence Into Guaranteed Income
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Mingree connects verified Instagram creators with top brands for sponsored reels, product reviews, and brand launches with escrow-guaranteed payouts.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href={isAuthenticated ? "/campaigns" : "/signup"}>
              <Button size="sm" className="text-xs font-semibold">
                {isAuthenticated ? "Explore Campaigns" : "Get Started Free"}
              </Button>
            </Link>
            <Link href={isAuthenticated ? "/support" : "/login"}>
              <Button variant="outline" size="sm" className="text-xs">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-foreground">How Mingree Works</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Simple 4-step workflow from discovery to instant payout</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {howItWorks.map((item) => (
            <Card key={item.step} className="border-border/80">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-muted text-foreground flex items-center justify-center font-bold text-xs shrink-0 border border-border">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Creator Features */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">For Content Creators</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Built to help creators monetize at every follower stage</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {creatorFeatures.map((feat, i) => (
            <Card key={i} className="border-border/80">
              <CardContent className="p-4">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{feat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Brand & Sponsor Features */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">For Brands & Agencies</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Launch scalable influencer campaigns with guaranteed delivery</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {brandFeatures.map((feat, i) => (
            <Card key={i} className="border-border/80">
              <CardContent className="p-4">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{feat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Trust & Safety Banner */}
      <Card className="border-border/80 bg-muted/20">
        <CardContent className="p-5">
          <h3 className="font-bold text-sm text-foreground">100% Escrow & Meta Verified</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Zero payment disputes. Brands fund campaigns upfront, and creators are guaranteed payment upon approved delivery.
          </p>
        </CardContent>
      </Card>

      {/* FAQs */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Everything you need to know about Mingree</p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 py-1 bg-card">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1 pb-3">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
        <Sidebar />
        <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-28 md:pb-8">
          {content}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background py-6">
      {content}
    </div>
  );
}
