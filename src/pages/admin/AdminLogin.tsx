import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, Lock, ArrowLeft, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (creds?: { email?: string; password?: string }) => {
      const loginEmail = creds?.email ?? email;
      const loginPassword = creds?.password ?? password;
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, portal: "admin" }),
        credentials: "include",
      });
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response. Please try again.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      return data;
    },
    onSuccess: async (user) => {
      login(user);
      queryClient.clear();
      queryClient.setQueryData(["currentUser"], user);
      setLocation("/admin/dashboard");
    },
    onError: (err: Error) => {
      const rawMsg = err.message || "";
      const safeMsg =
        rawMsg.includes("expected pattern") || rawMsg.includes("SyntaxError") || rawMsg.includes("JSON")
          ? "Invalid email or password. Please try again."
          : rawMsg;
      setError(safeMsg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center p-4 font-sans antialiased">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm tracking-tight relative">
            M
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#FF3399] ring-2 ring-[#F8FAFC]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Mingree Admin Console</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign in with your administrator credentials to access platform operations
            </p>
          </div>
        </div>

        {/* Login Surface */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 text-xs font-medium">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@mingree.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                data-testid="input-admin-email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 text-xs font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                data-testid="input-admin-password"
              />
            </div>

            <div className="pt-1 space-y-2">
              <Button
                type="submit"
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md text-xs shadow-none"
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Sign In to Admin Console"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmail("admin@mingree.com");
                  setPassword("admin123");
                  loginMutation.mutate({ email: "admin@mingree.com", password: "admin123" });
                }}
                disabled={loginMutation.isPending}
                className="w-full h-8 bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-md text-xs shadow-none"
              >
                1-Tap Demo Admin Sign-In
              </Button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Creator & Sponsor Portal</span>
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Lock className="w-3 h-3" />
              <span>Audited Access</span>
            </span>
          </div>
        </div>

        <p className="text-center text-slate-400 text-[11px]">
          Mingree Internal Operations & Treasury Administration
        </p>
      </div>
    </div>
  );
}
