import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

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
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
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
      const safeMsg = rawMsg.includes("expected pattern") || rawMsg.includes("SyntaxError") || rawMsg.includes("JSON")
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Admin Portal</h1>
          <p className="text-sm text-slate-400">Mingree Management Console</p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-white text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-slate-400 text-xs">
              Enter your administrator credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-xs uppercase tracking-wider font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mingree.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-500"
                  data-testid="input-admin-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-500"
                  data-testid="input-admin-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-slate-100 hover:bg-white text-slate-900 font-semibold py-2.5 rounded-lg text-sm"
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? "Signing in..." : "Access Admin Panel"}
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
                className="w-full bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300 font-medium py-2 rounded-lg text-xs"
              >
                1-Tap Demo Admin Sign-In
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/login")}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to Creator / Brand Login
              </Button>
              <p className="text-[11px] text-slate-500">
                This area is restricted to authorized administrators only.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          Mingree Internal Administration
        </p>
      </motion.div>
    </div>
  );
}
