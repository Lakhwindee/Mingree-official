import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  TrendingUp, 
  Wallet, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Instagram,
  Star,
  Zap,
  Shield,
  BarChart3,
  Gift,
  Building2,
  Target,
  Megaphone,
  BadgeCheck,
  Layers,
  Cpu,
  Globe,
  Flame,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import mingreeLogo from "@assets/generated_images/mingree_mg_circular_logo.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <Sparkles className="h-6 w-6 text-purple-400" />,
      title: "AI-Powered Campaign Match",
      description: "Our intelligent matching engine pairs your Instagram niche with high-converting brand campaigns instantly."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-pink-400" />,
      title: "Dynamic Tier Payouts",
      description: "Unlock up to 20 progressive tiers. Higher follower counts grant access to elite tier campaigns paying up to ₹15,000 per post."
    },
    {
      icon: <Wallet className="h-6 w-6 text-cyan-400" />,
      title: "Instant UPI & Bank Payouts",
      description: "Fast, secure, and hassle-free withdrawals directly to your bank account or UPI ID with complete tax transparency."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-emerald-400" />,
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
      icon: <Target className="h-6 w-6 text-blue-400" />,
      title: "Precision Targeting",
      description: "Filter creators across 20 engagement tiers, categories, and geographic locations."
    },
    {
      icon: <Users className="h-6 w-6 text-purple-400" />,
      title: "Verified Influencers",
      description: "Work exclusively with authentic, verified Instagram creators with genuine engagement."
    },
    {
      icon: <Megaphone className="h-6 w-6 text-pink-400" />,
      title: "Automated Campaigns",
      description: "Launch briefs, track submissions, and approve content in a single unified dashboard."
    },
    {
      icon: <BadgeCheck className="h-6 w-6 text-emerald-400" />,
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
    <div className="min-h-screen bg-[#07090e] text-white selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#07090e]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")}>
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 blur-sm opacity-70" />
                <img src={mingreeLogo} alt="Mingree" className="relative h-10 w-10 rounded-xl object-cover border border-white/20" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
                  Mingree
                </span>
                <span className="block text-[10px] text-purple-400 font-medium tracking-widest uppercase">SceneAI Edition</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#tiers" className="hover:text-white transition-colors">Creator Tiers</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#brands" className="hover:text-white transition-colors">For Brands</a>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white hover:bg-white/5"
                onClick={() => setLocation("/login")}
                data-testid="nav-login"
              >
                Log In
              </Button>
              <Button 
                className="relative group overflow-hidden rounded-xl p-px font-semibold"
                onClick={() => setLocation("/signup")}
                data-testid="nav-signup"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 transition-all duration-300 group-hover:opacity-90" />
                <span className="relative px-5 py-2.5 rounded-[11px] bg-[#0c0f17] transition-colors group-hover:bg-opacity-0 flex items-center gap-2 text-white">
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* SceneAI Asset Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/30 mb-8 backdrop-blur-md shadow-lg shadow-purple-500/5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs sm:text-sm font-medium text-purple-200">
                Asset ID: <span className="text-white font-mono">6aa12a4f24eca443e1cd1a53</span> • AI-Powered Creator Platform
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.1]">
              Turn Your Instagram Into <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent drop-shadow-2xl">
                An Automated Earning Engine
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
              Connect with top global brands, reserve high-payout campaigns across 20 engagement tiers, and monetize your influence with instant UPI & bank transfers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-lg px-9 py-7 rounded-2xl shadow-xl shadow-purple-600/30 transition-all duration-300 transform hover:-translate-y-0.5"
                onClick={() => setLocation("/signup")}
                data-testid="hero-signup"
              >
                Start Earning Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white font-medium text-lg px-9 py-7 rounded-2xl backdrop-blur-xl transition-all"
                onClick={() => setLocation("/sponsor/login")}
                data-testid="hero-sponsor"
              >
                <Building2 className="mr-2 h-5 w-5 text-purple-400" />
                I'm a Brand Sponsor
              </Button>
            </div>

            {/* Interactive Preview Showcase Card (SceneAI Style Asset Showcase) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative max-w-5xl mx-auto rounded-3xl p-2 bg-gradient-to-b from-white/20 via-white/5 to-transparent shadow-2xl backdrop-blur-2xl"
            >
              <div className="rounded-[22px] bg-[#0c0f17] border border-white/10 overflow-hidden p-6 sm:p-8 text-left relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20">
                      <div className="h-full w-full bg-[#0c0f17] rounded-[14px] flex items-center justify-center">
                        <Instagram className="h-7 w-7 text-pink-400" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">Aarav Sharma</h3>
                        <BadgeCheck className="h-5 w-5 text-purple-400" />
                      </div>
                      <p className="text-sm text-gray-400">@aarav.creator • Tier 12 Influencer (185K Followers)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-semibold">
                      Balance: <span className="text-white font-bold">₹42,850</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-medium rounded-xl"
                      onClick={() => setLocation("/dashboard")}
                    >
                      Open Studio
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Active Campaigns</div>
                    <div className="text-2xl font-bold text-white flex items-center justify-between">
                      <span>4 Campaigns</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Live</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Next payout: ₹4,500 on review approval</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Engagement Rate</div>
                    <div className="text-2xl font-bold text-white flex items-center justify-between">
                      <span>6.8%</span>
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                    </div>
                    <p className="text-xs text-emerald-400 mt-2">+1.4% higher than tier average</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Earnings (MTD)</div>
                    <div className="text-2xl font-bold text-white flex items-center justify-between">
                      <span>₹1,18,400</span>
                      <Wallet className="h-5 w-5 text-pink-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Withdrawn instantly to UPI</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm mt-2 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section (Bento Grid) */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
              Advanced Capabilities
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Engineered for High-Growth Creators
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg">
              Everything you need to discover brands, manage submissions, and maximize your Instagram monetization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.04] transition-all duration-300 group"
              >
                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-black/40 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold uppercase tracking-wider mb-4">
              Simple Workflow
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              How Mingree Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg">
              Get started and receive your first brand campaign payout in 4 transparent steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-pink-500/40 transition-all group"
              >
                <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 font-mono">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Benefits */}
      <section id="tiers" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
                20 Engagement Tiers
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Grow Your Followers,<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  Unlock Elite Brand Payouts
                </span>
              </h2>
              <p className="text-gray-400 mb-8 text-base sm:text-lg leading-relaxed">
                Our automated tier system scales seamlessly with your Instagram growth. From Tier 1 micro-influencers to Tier 20 celebrity creators, every milestone unlocks higher-paying campaigns.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <Zap className="h-5 w-5 text-purple-400" />, text: "Tier 1 starts at just 500 followers — zero barrier to entry" },
                  { icon: <Shield className="h-5 w-5 text-pink-400" />, text: "Higher tiers automatically unlock all lower-tier campaigns" },
                  { icon: <Gift className="h-5 w-5 text-amber-400" />, text: "Top creator tiers earn up to ₹15,000 per sponsored reel" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-gray-200 font-medium text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { tier: "Tier 1", followers: "500 - 1K", pay: "₹20 / post", gradient: "from-purple-500/20 to-indigo-500/20" },
                { tier: "Tier 5", followers: "10K - 20K", pay: "₹200 / post", gradient: "from-indigo-500/20 to-pink-500/20" },
                { tier: "Tier 10", followers: "100K - 150K", pay: "₹1,200 / post", gradient: "from-pink-500/20 to-purple-500/20" },
                { tier: "Tier 20", followers: "7M - 10M+", pay: "₹15,000+ / post", gradient: "from-amber-500/20 to-pink-500/20" }
              ].map((item, index) => (
                <motion.div
                  key={item.tier}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`p-6 rounded-3xl bg-gradient-to-br ${item.gradient} border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/50 transition-all`}
                >
                  <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">{item.tier}</div>
                  <div className="text-xl sm:text-2xl font-bold text-white mb-2">{item.followers}</div>
                  <div className="text-xs text-gray-300 font-medium bg-white/10 px-3 py-1.5 rounded-xl inline-block">
                    {item.pay}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Brands Section */}
      <section id="brands" className="py-24 px-4 sm:px-6 lg:px-8 bg-black/40 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
              Sponsor Dashboard
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Reach Millions of <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Engaged Audiences</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg">
              Launch targeted campaigns and work with verified Instagram influencers to drive massive brand awareness and sales.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {brandFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 rounded-3xl bg-blue-500/[0.03] border border-blue-500/20 hover:border-blue-500/50 transition-all"
              >
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-lg px-9 py-7 rounded-2xl shadow-xl shadow-blue-600/20"
              onClick={() => setLocation("/sponsor/login")}
              data-testid="brand-signup-cta"
            >
              Launch Brand Campaign
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-gray-400 text-sm mt-4">
              Already managing campaigns? <button onClick={() => setLocation("/sponsor/login")} className="text-blue-400 hover:underline font-medium">Log in as Sponsor</button>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="p-12 sm:p-16 rounded-3xl bg-gradient-to-br from-purple-900/40 via-[#0c0f17] to-pink-900/30 border border-purple-500/30 relative overflow-hidden shadow-2xl backdrop-blur-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none" />
            
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">
              Ready to Monetize Your Influence?
            </h2>
            <p className="text-gray-300 mb-10 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
              Join over 15,000 creators earning daily on Mingree. Free to sign up and takes less than 2 minutes.
            </p>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:opacity-90 text-white font-bold text-lg px-12 py-7 rounded-2xl shadow-xl shadow-purple-500/30 transition-all transform hover:-translate-y-0.5"
              onClick={() => setLocation("/signup")}
              data-testid="cta-signup"
            >
              Create Free Creator Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#05070b]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-3">
              <img src={mingreeLogo} alt="Mingree" className="h-8 w-8 rounded-xl object-cover" />
              <span className="text-lg font-bold text-white">Mingree</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors">About</Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/refunds" className="text-gray-400 hover:text-white transition-colors">Refunds & Cancellations</Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5 text-gray-500 text-sm">
            <div>© 2026 Mingree Inc. All rights reserved. SceneAI Asset ID: 6aa12a4f24eca443e1cd1a53</div>
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              All Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

