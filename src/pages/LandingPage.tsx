import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;



export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      title: "Intelligent Campaign Match",
      description: "Our matching engine pairs your Instagram niche with high-converting brand campaigns instantly."
    },
    {
      title: "Dynamic Tier Payouts",
      description: "Unlock up to 20 progressive tiers. Higher follower counts grant access to elite tier campaigns paying up to ₹15,000 per post."
    },
    {
      title: "Instant UPI & Bank Payouts",
      description: "Fast, secure, and hassle-free withdrawals directly to your bank account or UPI ID with complete tax transparency."
    },
    {
      title: "Real-Time Analytics",
      description: "Monitor impressions, engagement rate, content submissions, and live earnings update in real-time."
    }
  ];

  const howItWorks = [
    { step: "01", title: "Connect Instagram", description: "Securely link your Instagram creator profile and verify your audience reach." },
    { step: "02", title: "Browse & Reserve", description: "Select from hundreds of brand campaigns matching your tier and style." },
    { step: "03", title: "Create Content", description: "Publish engaging reels or stories as per campaign guidelines." },
    { step: "04", title: "Get Paid Instantly", description: "Submit proof, get brand approval, and withdraw earnings instantly." }
  ];

  const brandFeatures = [
    {
      title: "Precision Targeting",
      description: "Filter creators across 20 engagement tiers, categories, and geographic locations."
    },
    {
      title: "Verified Influencers",
      description: "Work exclusively with authentic, verified Instagram creators with genuine engagement."
    },
    {
      title: "Automated Campaigns",
      description: "Launch briefs, track submissions, and approve content in a single unified dashboard."
    },
    {
      title: "ROI Guarantee",
      description: "Only release payments upon successful content verification and brand approval."
    }
  ];

  const stats = [
    { value: "15K+", label: "Active Creators" },
    { value: "600+", label: "Global Brands" },
    { value: "₹75L+", label: "Total Payouts" },
    { value: "99.8%", label: "Approval Rate" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-muted selection:text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Mingree
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#tiers" className="hover:text-foreground transition-colors">Creator Tiers</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="#brands" className="hover:text-foreground transition-colors">For Brands</a>
            </div>

            <div className="flex items-center gap-2.5">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs"
                onClick={() => setLocation("/login")}
                data-testid="nav-login"
              >
                Log In
              </Button>
              <Button 
                size="sm"
                className="text-xs font-semibold"
                onClick={() => setLocation("/signup")}
                data-testid="nav-signup"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Turn Your Instagram Into An Automated Earning Engine
          </h1>

          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            Connect with top global brands, reserve high-payout campaigns across 20 engagement tiers, and monetize your influence with instant UPI and bank transfers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Button 
              size="lg"
              className="w-full sm:w-auto text-xs font-semibold px-6 h-10"
              onClick={() => setLocation("/signup")}
              data-testid="hero-signup"
            >
              Start Earning Today
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-xs font-semibold px-6 h-10"
              onClick={() => setLocation("/sponsor/login")}
              data-testid="hero-sponsor"
            >
              I am a Brand Sponsor
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-border bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 rounded-lg bg-card border border-border"
              >
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-xs mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Engineered for Creators
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
              Everything you need to discover brands, manage submissions, and maximize your Instagram monetization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-lg border border-border bg-card"
              >
                <h3 className="text-sm font-bold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              How Mingree Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
              Get started and receive your first brand campaign payout in 4 transparent steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {howItWorks.map((step) => (
              <div
                key={step.step}
                className="p-5 rounded-lg border border-border bg-card"
              >
                <div className="text-xl font-bold text-muted-foreground mb-2 font-mono">
                  {step.step}
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Brands Section */}
      <section id="brands" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              For Brands & Sponsors
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
              Launch targeted campaigns and work with verified Instagram influencers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {brandFeatures.map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-lg border border-border bg-card"
              >
                <h3 className="text-sm font-bold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="sm"
              className="text-xs font-semibold px-6"
              onClick={() => setLocation("/sponsor/login")}
              data-testid="brand-signup-cta"
            >
              Launch Brand Campaign
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <span className="text-base font-bold text-foreground">Mingree</span>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/refunds" className="hover:text-foreground transition-colors">Refunds</Link>
            </div>
          </div>
          <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © 2026 Mingree Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
