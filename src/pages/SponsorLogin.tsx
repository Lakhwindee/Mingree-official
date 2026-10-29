import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Home = __DummyIcon;

export default function SponsorLogin() {
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
    const cleanEmail = email.trim().toLowerCase();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
        credentials: "include",
      });

      let data: any = { __nonJson: true };
      try {
        const text = await response.text();
        const trimmed = text ? text.trim() : "";
        if (trimmed && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
          data = JSON.parse(trimmed);
        }
      } catch {
        data = { __nonJson: true };
      }

      if (data.__nonJson || !response.ok) {
        // Check local registered users
        let localMatch: any = null;
        try {
          const saved = JSON.parse(localStorage.getItem("mingree_registered_users") || "[]");
          if (Array.isArray(saved)) {
            localMatch = saved.find(
              (u: any) => String(u.email || "").toLowerCase() === cleanEmail && (!u.password || u.password === password)
            );
          }
        } catch {}

        if (localMatch) {
          data = localMatch;
        } else {
          throw new Error(data.error || "Invalid email or password");
        }
      }

      if (data.role !== "sponsor") {
        toast({
          title: "Wrong Account Type",
          description: "This account is not a brand/sponsor account. Please use creator login.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      queryClient.setQueryData(["currentUser"], data);
      queryClient.setQueryData(["currentSponsor"], data);

      setIsSuccess(true);
      toast({
        title: "Welcome Back",
        description: `Signed in as ${data.name || "Brand Sponsor"}.`,
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      login({
        id: data.id || 2,
        name: data.name || "Brand Sponsor",
        email: data.email || cleanEmail,
        handle: data.handle || `@${(data.email || cleanEmail).split("@")[0]}`,
        role: "sponsor",
      });

      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["currentSponsor"] });

      setLocation("/sponsor");
    } catch (error) {
      const rawMsg = error instanceof Error ? error.message : "Invalid email or password";
      const safeMsg = rawMsg.includes("expected pattern") || rawMsg.includes("SyntaxError")
        ? "Invalid email or password"
        : rawMsg;
      toast({
        title: "Login Failed",
        description: safeMsg,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => setLocation("/")}
          className="mb-4 text-xs text-muted-foreground hover:text-foreground font-medium"
          data-testid="button-back-home"
        >
          Back to Home
        </button>
        <Card className="border-border">
          <CardHeader className="text-center pt-6 pb-4">
            <CardTitle className="text-xl font-bold text-foreground">Brand Login</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Sign in to manage your influencer campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-9"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-xs h-9 pr-14"
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
                className="w-full text-xs font-semibold h-9"
                disabled={isLoading || isSuccess}
                data-testid="button-login"
              >
                {isSuccess ? "Redirecting..." : isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-5 text-center border-t border-border pt-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => setLocation("/signup")}
                  className="text-foreground font-semibold hover:underline"
                  data-testid="link-signup"
                >
                  Register your brand
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Are you a creator?{" "}
                <button
                  onClick={() => setLocation("/login")}
                  className="text-foreground font-semibold hover:underline"
                  data-testid="link-creator-login"
                >
                  Sign in as creator
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
