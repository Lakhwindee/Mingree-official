import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDemoLogin = async (demoEmail: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "Password123!" }),
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

      queryClient.setQueryData(["currentUser"], {
        id: data.id || (roleName === "sponsor" ? 2 : 1),
        name: data.name || (roleName === "sponsor" ? "Brand Partner" : "Demo Creator"),
        email: demoEmail,
        handle: data.handle || (roleName === "sponsor" ? "@brandpartner" : "@democreator"),
        role: data.role || roleName,
        avatar: data.avatar,
        followers: data.followers || 15000,
        instagramFollowers: data.instagramFollowers || 15000,
        tier: data.tier || "Tier 1",
        instagramUsername: data.instagramUsername || "democreator",
        isInstagramVerified: true,
        balance: data.balance || "0.00",
        stars: data.stars ?? 0,
      });

      setIsSuccess(true);
      toast({
        title: `Demo ${roleName === "sponsor" ? "Sponsor" : "Creator"} Logged In`,
        description: `Welcome back, ${data.name || roleName}!`,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      login({
        id: data.id || (roleName === "sponsor" ? 2 : 1),
        name: data.name || (roleName === "sponsor" ? "Brand Partner" : "Demo Creator"),
        email: demoEmail,
        handle: data.handle || (roleName === "sponsor" ? "@brandpartner" : "@democreator"),
        role: data.role || roleName,
        avatar: data.avatar,
        followers: data.followers || 15000,
        tier: data.tier || "Tier 1",
        instagramUsername: data.instagramUsername || "democreator",
        isInstagramVerified: true,
      });

      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      if (roleName === "sponsor") {
        setLocation("/sponsor");
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Demo Login Failed",
        description: error instanceof Error ? error.message : "Could not login",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

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
        title: "Welcome Back",
        description: `Logged in as ${data.name || "Creator"}.`,
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

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

      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background flex flex-col justify-between p-4 sm:p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <span className="text-lg font-bold text-foreground tracking-tight">Mingree</span>
        <Link href="/about">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8">
            How It Works
          </Button>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Log in to access your campaigns and earnings
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-xs pr-14"
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-xs font-semibold"
                disabled={isLoading || isSuccess}
                data-testid="button-login"
              >
                {isSuccess ? "Redirecting..." : isLoading ? "Signing in..." : "Log In"}
              </Button>

              {/* Quick Demo Logins */}
              <div className="pt-2 grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] font-medium h-8"
                  onClick={() => handleDemoLogin("creator@mingree.com", "creator")}
                  disabled={isLoading}
                  data-testid="button-demo-creator"
                >
                  Demo Creator
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] font-medium h-8"
                  onClick={() => handleDemoLogin("sponsor@mingree.com", "sponsor")}
                  disabled={isLoading}
                  data-testid="button-demo-sponsor"
                >
                  Demo Sponsor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] font-medium h-8"
                  onClick={() => handleDemoLogin("admin@mingree.com", "admin")}
                  disabled={isLoading}
                  data-testid="button-demo-admin"
                >
                  Demo Admin
                </Button>
              </div>
            </form>

            <div className="pt-4 text-center border-t border-border">
              <p className="text-muted-foreground text-xs">
                Don't have an account?{" "}
                <button
                  onClick={() => setLocation("/signup")}
                  className="text-foreground font-semibold hover:underline"
                  data-testid="link-signup"
                >
                  Create an account
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center py-2">
        <p className="text-[11px] text-muted-foreground">
          By continuing, you agree to Mingree's{" "}
          <Link href="/terms"><span className="underline cursor-pointer">Terms</span></Link> and{" "}
          <Link href="/privacy"><span className="underline cursor-pointer">Privacy Policy</span></Link>
        </p>
      </div>
    </div>
  );
}
