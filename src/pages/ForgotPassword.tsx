import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtpCode } from "@/lib/firebase";
import { ConfirmationResult } from "firebase/auth";
import { Smartphone, Mail, KeyRound, ShieldCheck, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"input" | "otp" | "reset">("input");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);

  // Email state
  const [email, setEmail] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // OTP & Reset state
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // 1. Send SMS OTP via Firebase
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
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
      const fullPhone = `+91${cleanPhone.slice(-10)}`;
      const result = await sendPhoneOtp(fullPhone, verifier);
      setPhoneConfirmation(result);
      setStep("otp");
      setResendTimer(60);
      toast({
        title: "SMS OTP Sent!",
        description: `6-digit reset code sent to ${fullPhone}`,
      });
    } catch (error: any) {
      console.error("[PHONE RESET ERROR]", error);
      toast({
        title: "Failed to Send SMS OTP",
        description: error.message || "Could not send SMS code. Please try again or use Email reset.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Send Email OTP
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset code.");
      }

      if (data.devOtp) {
        setDevOtp(String(data.devOtp));
        setOtp(String(data.devOtp));
        toast({
          title: "Reset Code Ready",
          description: `Your 6-digit code is ${data.devOtp} (auto-filled).`,
        });
      } else {
        setDevOtp(null);
        toast({
          title: "Reset Code Sent",
          description: `A 6-digit verification code has been sent to ${cleanEmail}`,
        });
      }

      setStep("otp");
      setResendTimer(60);
    } catch (error: any) {
      toast({
        title: "Reset Request Failed",
        description: error.message || "Failed to send reset code. Please check your email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify OTP code
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Incomplete Code",
        description: "Please enter all 6 digits of the code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (method === "phone") {
        if (!phoneConfirmation) {
          throw new Error("Phone session expired. Please request a new code.");
        }
        // Verify with Firebase ConfirmationResult
        await verifyPhoneOtpCode(phoneConfirmation, otp);
        setStep("reset");
        toast({
          title: "Phone Verified!",
          description: "Please set your new password.",
        });
      } else {
        // Verify with backend
        const res = await fetch("/api/auth/verify-reset-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Invalid or expired reset code.");
        }
        setStep("reset");
        toast({
          title: "Code Verified!",
          description: "Please set your new password.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Incorrect verification code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Set New Password
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (method === "phone") {
        const res = await fetch("/api/auth/phone-reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: `+91${phoneNumber.replace(/[^0-9]/g, "").slice(-10)}`,
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update password.");
        }
      } else {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp,
            newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update password.");
        }
      }

      toast({
        title: "Password Updated Successfully!",
        description: "You can now log in with your new password.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to set new password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div id="forgot-password-recaptcha" ref={recaptchaRef}></div>

      <div className="w-full max-w-sm">
        <button
          onClick={() => step === "input" ? setLocation("/login") : setStep("input")}
          className="mb-4 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
          data-testid="button-back"
        >
          {step === "input" ? "← Back to Login" : "← Back"}
        </button>

        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pt-6 pb-4">
            <div className="inline-flex p-2.5 rounded-full bg-primary/10 text-primary mx-auto mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "input" && "Reset Password"}
              {step === "otp" && "Verify Reset Code"}
              {step === "reset" && "Create New Password"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {step === "input" && "Choose how you'd like to receive your reset OTP"}
              {step === "otp" && (method === "phone" ? `Enter SMS code sent to +91 ${phoneNumber.slice(-10)}` : `Enter code sent to ${email}`)}
              {step === "reset" && "Enter a new secure password for your account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-4">
            {step === "input" && (
              <div className="space-y-4">
                {/* Method Switcher */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setMethod("phone")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      method === "phone"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-reset-phone"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      method === "email"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-reset-email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email OTP</span>
                  </button>
                </div>

                {method === "phone" ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-phone" className="text-xs font-semibold text-foreground">
                        Registered Mobile Number
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-3 h-9 border border-border rounded-lg bg-muted/40 text-xs font-semibold text-foreground shrink-0 select-none">
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <Input
                          id="reset-phone"
                          type="tel"
                          placeholder="98765 43210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                          className="h-9 text-xs font-mono tracking-wider flex-1"
                          maxLength={10}
                          required
                          autoFocus
                          data-testid="input-reset-phone"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        We'll send a 6-digit SMS OTP via Firebase to verify and reset your password.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-xs font-semibold h-9 rounded-lg"
                      disabled={isLoading || phoneNumber.replace(/[^0-9]/g, "").length < 10}
                      data-testid="button-send-phone-reset"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Sending SMS Code...
                        </>
                      ) : (
                        <>
                          <span>Send Reset SMS OTP</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>

                    <div className="rounded-lg bg-muted/40 p-2.5 border border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Firebase SMS Auth:</strong> Real SMS is delivered to your phone. Test numbers (e.g. <code className="bg-muted px-1 rounded font-mono">+91 9999999999</code> / OTP <code className="bg-muted px-1 rounded font-mono">123456</code>) also work.
                      </span>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendEmailOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-xs font-semibold text-foreground">
                        Registered Email Address
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-xs h-9"
                        required
                        autoFocus
                        data-testid="input-reset-email"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        We'll send a 6-digit password reset code to this email.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-xs font-semibold h-9 rounded-lg"
                      disabled={isLoading || !email}
                      data-testid="button-send-email-reset"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Sending Email Code...
                        </>
                      ) : (
                        <>
                          <span>Send Reset Code</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {devOtp && (
                  <div className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-center">
                    <p className="text-[11px] text-muted-foreground">
                      Instant Verification Code: <span className="font-mono font-bold text-foreground">{devOtp}</span>
                    </p>
                  </div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    data-testid="input-reset-otp-digits"
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
                  className="w-full text-xs font-semibold h-9 rounded-lg"
                  disabled={isLoading || otp.length !== 6}
                  data-testid="button-verify-reset-otp"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Verify Code</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setOtp("");
                    }}
                    className="hover:text-foreground cursor-pointer"
                  >
                    Change {method === "phone" ? "Number" : "Email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => method === "phone" ? handleSendPhoneOtp() : handleSendEmailOtp()}
                    disabled={resendTimer > 0 || isLoading}
                    className={`font-semibold cursor-pointer ${
                      resendTimer > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:underline"
                    }`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-3">
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
                      className="text-xs h-9 pr-14"
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
                    className="text-xs h-9"
                    required
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs font-semibold h-9 rounded-lg"
                  disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Resetting Password...
                    </>
                  ) : (
                    "Set New Password & Log In"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
