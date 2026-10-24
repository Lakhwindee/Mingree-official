import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Send = __DummyIcon;



export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendResetOtp = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset code. Please try again.");
      }

      setStep("otp");
      setResendTimer(60);
      toast({
        title: "Reset Code Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error Sending Reset Code",
        description: error.message || "Failed to send reset code. Please verify your email and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || "Invalid or expired code");
      }

      setStep("reset");
      toast({
        title: "Code Verified",
        description: "You can now set a new password.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid or expired code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password Reset Successful",
        description: "You can now login with your new password.",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Could not reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    await sendResetOtp();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => step === "email" ? setLocation("/login") : setStep("email")}
          className="mb-4 text-xs text-muted-foreground hover:text-foreground font-medium"
          data-testid="button-back"
        >
          {step === "email" ? "Back to Login" : "Back"}
        </button>

        <Card className="border-border">
          <CardHeader className="text-center pt-6 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "email" && "Forgot Password"}
              {step === "otp" && "Verify Code"}
              {step === "reset" && "Set New Password"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {step === "email" && "Enter your email to receive a reset code"}
              {step === "otp" && `Enter the code sent to ${email}`}
              {step === "reset" && "Create a new secure password"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {step === "email" && (
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                    data-testid="input-email"
                  />
                </div>

                <Button
                  onClick={sendResetOtp}
                  className="w-full text-xs font-semibold h-9"
                  disabled={isLoading || !email}
                  data-testid="button-send-code"
                >
                  {isLoading ? "Sending..." : "Send Reset Code"}
                </Button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-10 h-10 text-base" />
                      <InputOTPSlot index={1} className="w-10 h-10 text-base" />
                      <InputOTPSlot index={2} className="w-10 h-10 text-base" />
                      <InputOTPSlot index={3} className="w-10 h-10 text-base" />
                      <InputOTPSlot index={4} className="w-10 h-10 text-base" />
                      <InputOTPSlot index={5} className="w-10 h-10 text-base" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={verifyOtp}
                  className="w-full text-xs font-semibold h-9"
                  disabled={isLoading || otp.length !== 6}
                  data-testid="button-verify"
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Didn't receive code?{" "}
                  <button
                    onClick={resendOtp}
                    disabled={resendTimer > 0}
                    className={`font-semibold ${resendTimer > 0 ? "text-muted-foreground" : "text-foreground hover:underline"}`}
                    data-testid="button-resend"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                  </button>
                </p>
              </div>
            )}

            {step === "reset" && (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs h-9 pr-14"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-xs h-9"
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  onClick={resetPassword}
                  className="w-full text-xs font-semibold h-9"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  data-testid="button-reset"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
