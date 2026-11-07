import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtpCode } from "@/lib/firebase";
import { ConfirmationResult } from "firebase/auth";
import { Smartphone, KeyRound, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"phone" | "otp" | "reset">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanDigits.length < 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const verifier = setupRecaptcha("forgot-password-recaptcha", "invisible");
      const fullPhone = `+91${cleanDigits.slice(-10)}`;
      const result = await sendPhoneOtp(fullPhone, verifier);
      setConfirmationResult(result);
      setStep("otp");
      setResendTimer(60);
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to +91 ${cleanDigits.slice(-10)}`,
      });
    } catch (error: any) {
      console.error("[FORGOT PASSWORD SMS ERROR]", error);
      let errorMsg = "Could not send verification code. Please check your number.";
      if (error?.code === "auth/invalid-phone-number") {
        errorMsg = "Please enter a valid mobile number.";
      } else if (error?.code === "auth/too-many-requests") {
        errorMsg = "Too many attempts. Please try again in a few minutes.";
      } else if (error?.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Error Sending Code",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    if (!confirmationResult) {
      toast({
        title: "Session Expired",
        description: "Please request a new verification code.",
        variant: "destructive",
      });
      setStep("phone");
      return;
    }

    setIsLoading(true);
    try {
      await verifyPhoneOtpCode(confirmationResult, otp);
      setStep("reset");
      toast({
        title: "Code Verified",
        description: "You can now set a new password.",
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error?.code === "auth/invalid-verification-code" 
          ? "The verification code entered is incorrect." 
          : "Invalid or expired verification code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const cleanDigits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
      const res = await fetch("/api/auth/phone-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: `+91${cleanDigits}`,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. Please log in with your new password.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to set new password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6">
      {/* Hidden reCAPTCHA container */}
      <div id="forgot-password-recaptcha" ref={recaptchaRef}></div>

      {/* Top Header */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png" alt="Mingree Logo" className="w-8 h-8 rounded-xl object-cover shadow-xs" />
            <span className="text-lg font-bold text-foreground tracking-tight">Mingree</span>
          </div>
        </Link>
        <button
          onClick={() => step === "phone" ? setLocation("/login") : setStep("phone")}
          className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
          data-testid="button-back"
        >
          {step === "phone" ? "Back to Login" : "← Change Number"}
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="inline-flex p-2.5 rounded-full bg-primary/10 text-primary mx-auto mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "phone" && "Forgot Password"}
              {step === "otp" && "Verify Code"}
              {step === "reset" && "Set New Password"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {step === "phone" && "Enter your registered mobile number to receive a verification code"}
              {step === "otp" && `Enter the 6-digit code sent to +91 ${phoneNumber.replace(/[^0-9]/g, "").slice(-10)}`}
              {step === "reset" && "Create a new secure password for your account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-4">
            {step === "phone" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-primary" /> Mobile Number
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 h-10 border border-border rounded-lg bg-muted/40 text-xs font-semibold text-foreground shrink-0 select-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <Input
                      id="reset-phone"
                      type="tel"
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      className="h-10 text-xs font-mono tracking-wider flex-1"
                      maxLength={10}
                      required
                      autoFocus
                      data-testid="input-reset-phone"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A 6-digit SMS verification code will be sent to this number.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  disabled={isLoading || phoneNumber.replace(/[^0-9]/g, "").length < 10}
                  data-testid="button-send-code"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-1">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup className="gap-1 sm:gap-2">
                      <InputOTPSlot index={0} className="w-9 h-11 sm:w-10 sm:h-12 text-base font-bold rounded-lg border" />
                      <InputOTPSlot index={1} className="w-9 h-11 sm:w-10 sm:h-12 text-base font-bold rounded-lg border" />
                      <InputOTPSlot index={2} className="w-9 h-11 sm:w-10 sm:h-12 text-base font-bold rounded-lg border" />
                      <InputOTPSlot index={3} className="w-9 h-11 sm:w-10 sm:h-12 text-base font-bold rounded-lg border" />
                      <InputOTPSlot index={4} className="w-9 h-11 sm:w-10 sm:h-12 text-base font-bold rounded-lg border" />
                      <InputOTPSlot index={5} className="w-9 h-11 sm:w-10 sm:h-12 text-base font-bold rounded-lg border" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  disabled={isLoading || otp.length !== 6}
                  data-testid="button-verify"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Code</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                    }}
                    className="hover:text-foreground cursor-pointer"
                  >
                    Change Number
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={resendTimer > 0 || isLoading}
                    className={`font-semibold cursor-pointer ${
                      resendTimer > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:underline"
                    }`}
                    data-testid="button-resend"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </button>
                </div>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-semibold text-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 text-xs pr-14"
                      required
                      autoFocus
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-xs"
                    required
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                  disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  data-testid="button-reset"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Updating Password...
                    </>
                  ) : (
                    "Set New Password & Log In"
                  )}
                </Button>
              </form>
            )}

            <div className="pt-4 text-center border-t border-border">
              <p className="text-muted-foreground text-xs">
                Remember your password?{" "}
                <button
                  onClick={() => setLocation("/login")}
                  className="text-foreground font-semibold hover:underline cursor-pointer"
                >
                  Log in
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
