import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail, Lock, LogIn, Sparkles, Building2, UserCheck, HelpCircle, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import mingreeLogo from "@assets/generated_images/mingree_mg_circular_logo.png";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      let data: any = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Pre-seed React Query cache with complete user profile to avoid any spinner flicker on target page
      queryClient.setQueryData(["currentUser"], {
        id: data.id || 1,
        name: data.name || "Creator",
        email: data.email || email,
        handle: data.handle || `@${(data.email || email).split("@")[0]}`,
        role: data.role || "creator",
        avatar: data.avatar,
        followers: data.followers || data.instagramFollowers || 0,
        instagramFollowers: data.instagramFollowers || data.followers || 0,
        tier: data.tier || "New Creator",
        instagramUsername: data.instagramUsername,
        isInstagramVerified: data.isInstagramVerified,
        balance: data.balance || "0.00",
        stars: data.stars ?? 0,
      });

      setIsSuccess(true);
      toast({
        title: "Welcome Back!",
        description: `Logged in as ${data.name || "Creator"}. Smoothly taking you in...`,
      });

      // Brief 350ms duration so user sees smooth feedback and state transitions seamlessly
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Persist auth session in native context & localStorage
      login({
        id: data.id || 1,
        name: data.name || "Creator",
        email: data.email || email,
        handle: data.handle || `@${(data.email || email).split("@")[0]}`,
        role: data.role || "creator",
        avatar: data.avatar,
        followers: data.followers || data.instagramFollowers || 0,
        tier: data.tier || "New Creator",
        instagramUsername: data.instagramUsername,
        isInstagramVerified: data.isInstagramVerified,
      });

      // Silently refresh currentUser in background
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      // Smoothly navigate based on role
      if (data.role === "admin") {
        setLocation("/admin/dashboard");
      } else if (data.role === "sponsor") {
        setLocation("/sponsor");
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-zinc-950 via-[#180828] to-zinc-950 flex flex-col justify-between p-4 sm:p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <div className="flex items-center gap-2">
          <img src={mingreeLogo} alt="Mingree" className="h-8 w-8 rounded-xl object-cover" />
          <span className="text-lg font-bold text-white tracking-tight">Mingree</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/about">
            <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-white gap-1.5 h-8">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>How It Works</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto my-auto"
      >
        <Card className="border-purple-500/20 bg-black/60 backdrop-blur-2xl text-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 p-[2px] shadow-lg">
              <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                <img src={mingreeLogo} alt="Mingree" className="h-12 w-12 rounded-xl object-cover" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Welcome Back</CardTitle>
            <CardDescription className="text-zinc-400 text-xs sm:text-sm">
              Log in to access your campaigns and earnings
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-zinc-300">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/5 border-zinc-700/60 text-white placeholder:text-zinc-500 rounded-xl focus:border-pink-500"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">Password</Label>
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-pink-400 hover:text-pink-300 text-xs font-medium"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/5 border-zinc-700/60 text-white placeholder:text-zinc-500 rounded-xl focus:border-pink-500"
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-11 rounded-xl text-white font-semibold shadow-lg transition-all duration-300",
                  isSuccess 
                    ? "bg-emerald-600 hover:bg-emerald-600 shadow-emerald-500/25" 
                    : "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 active:scale-[0.98]"
                )}
                disabled={isLoading || isSuccess}
                data-testid="button-login"
              >
                {isSuccess ? (
                  <span className="flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <CheckCircle2 className="h-4 w-4 text-white animate-bounce" />
                    <span>Taking you to dashboard...</span>
                  </span>
                ) : isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Log In</span>
                  </span>
                )}
              </Button>
            </form>

            <div className="pt-4 text-center border-t border-zinc-800/80">
              <p className="text-zinc-400 text-xs">
                Don't have an account?{" "}
                <button
                  onClick={() => setLocation("/signup")}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-bold hover:underline"
                  data-testid="link-signup"
                >
                  Create an account
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center py-2">
        <p className="text-[11px] text-zinc-500">
          By continuing, you agree to Mingree's{" "}
          <Link href="/terms"><span className="underline cursor-pointer">Terms</span></Link> &{" "}
          <Link href="/privacy"><span className="underline cursor-pointer">Privacy Policy</span></Link>
        </p>
      </div>
    </div>
  );
}
