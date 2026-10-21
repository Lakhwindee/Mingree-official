import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Sparkles, 
  TrendingUp, 
  Wallet, 
  Users, 
  ShieldCheck, 
  ArrowLeft,
  Instagram, 
  Star, 
  Zap, 
  Shield, 
  BarChart3, 
  Building2, 
  Target, 
  Megaphone, 
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Award,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar } from "@/components/Sidebar";
import mingreeLogo from "@assets/generated_images/mingree_mg_circular_logo.png";
import { useAuth } from "@/lib/auth-context";

export default function AboutMingree() {
  const { isAuthenticated, user } = useAuth();

  const creatorFeatures = [
    {
      icon: <Sparkles className="h-5 w-5 text-pink-500" />,
      title: "Discover Campaigns",
      description: "Browse verified brand campaigns matching your niche, content style, and audience size."
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      title: "Dynamic Follower Tiers",
      description: "As your Instagram followers and engagement grow, higher payout tiers unlock automatically."
    },
    {
      icon: <Wallet className="h-5 w-5 text-emerald-500" />,
      title: "Instant Secure Payouts",
      description: "Escrow-backed earnings deposited directly to your bank account or UPI with zero payment delays."
    },
    {
      icon: <Instagram className="h-5 w-5 text-amber-500" />,
      title: "Official Meta Verification",
      description: "Sync your live Instagram metrics and get the verified badge to qualify for high-ticket sponsorships."
    }
  ];

  const brandFeatures = [
    {
      icon: <Target className="h-5 w-5 text-indigo-500" />,
      title: "Hyper-Targeted Matching",
      description: "Filter creators by exact follower brackets, regional languages, location, and content categories."
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-500" />,
      title: "Escrow Budget Protection",
      description: "Funds are locked safely in escrow and only released once you review and approve creator content."
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-pink-500" />,
      title: "Real-Time Tracking",
      description: "Track reservation status, review submissions, and analyze live ROI from your brand dashboard."
    },
    {
      icon: <BadgeCheck className="h-5 w-5 text-emerald-500" />,
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
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-600 dark:text-zinc-400 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>{isAuthenticated ? "Back to Dashboard" : "Back to Login"}</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <img src={mingreeLogo} alt="Mingree" className="h-7 w-7 rounded-lg object-cover" />
          <span className="font-bold text-base">Mingree Guide</span>
        </div>
      </div>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-purple-950 via-zinc-900 to-black p-6 sm:p-8 md:p-10 text-white shadow-xl border border-purple-500/20"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>About Mingree Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Where Creators Turn Influence Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-amber-300">Guaranteed Income</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Mingree connects verified Instagram creators with top brands for sponsored reels, product reviews, and brand launches with escrow-guaranteed payouts.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={isAuthenticated ? "/campaigns" : "/signup"}>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold shadow-md">
                {isAuthenticated ? "Explore Campaigns" : "Get Started Free"}
              </Button>
            </Link>
            <Link href={isAuthenticated ? "/support" : "/login"}>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* How It Works Section */}
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">How Mingree Works</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Simple 4-step workflow from discovery to instant payout</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {howItWorks.map((item) => (
            <Card key={item.step} className="border-border/80 shadow-xs">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Creator Features */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">For Content Creators</h2>
            <p className="text-xs text-muted-foreground">Built to help creators monetize at every follower stage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {creatorFeatures.map((feat, i) => (
            <Card key={i} className="border-border/80 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted">{feat.icon}</div>
                  <h3 className="font-semibold text-sm text-foreground">{feat.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{feat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Brand & Sponsor Features */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">For Brands & Agencies</h2>
            <p className="text-xs text-muted-foreground">Launch scalable influencer campaigns with guaranteed delivery</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {brandFeatures.map((feat, i) => (
            <Card key={i} className="border-border/80 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted">{feat.icon}</div>
                  <h3 className="font-semibold text-sm text-foreground">{feat.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{feat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Trust & Safety Banner */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">100% Escrow & Meta Verified</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Zero payment disputes. Brands fund campaigns upfront, and creators are guaranteed payment upon approved delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Everything you need to know about Mingree</p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-xl px-4 py-1 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-3">
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
