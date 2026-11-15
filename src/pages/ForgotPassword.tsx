import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Smartphone,
  Mail,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  User,
  Building2,
  ArrowRight,
  AlertCircle,
  Lock,
} from "lucide-react";

interface LinkedAccount {
  id: number;
  email: string;
  name: string;
  role: "creator" | "sponsor" | string;
  roleLabel: string;
  companyName?: string | null;
  city?: string | null;
  avatar?: string | null;
  phone?: string;
}

export default function ForgotPassword() {
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"input" | "otp" | "select-account" | "reset" | "no-account">("input");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [resetVerificationToken, setResetVerificationToken] = useState<string | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const cleanDigits = (val: string) => val.replace(/[^0-9]/g, "").slice(0, 10);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (mode === "phone") {
      const cleanPhone = cleanDigits(phoneNumber);
      if (cleanPhone.length !== 10) {
        toast.error("Please enter a valid 10-digit Indian mobile number.");
        return;
      }

      setIsLoading(true);
      try {
        const srvRes = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanPhone,
            email: `${cleanPhone}@phone.mingree.com`,
            name: "Mingree User",
            purpose: "forgot_password",
            channel: "sms",
          }),
        });
        const srvData = await srvRes.json().catch(() => ({}));

        if (!srvRes.ok) {
          if (srvRes.status === 404 || srvData.noAccountFound) {
            setLinkedAccounts([]);
            setSelectedAccount(null);
            setStep("no-account");
            toast.error(srvData.error || `No account is registered with +91 ${cleanPhone}`);
            return;
          }
          throw new Error(srvData.error || "Could not send verification code. Please check your mobile number.");
        }

        if (srvData.otpToken) {
          setOtpToken(srvData.otpToken);
        }
        setDevOtp(srvData.devOtp || null);

        setOtp("");
        setStep("otp");
        setResendTimer(60);
        toast.success(srvData.message || `Verification code sent to +91 ${cleanPhone}`);
      } catch (error: any) {
        console.error("[FORGOT PASSWORD SMS ERROR]", error);
        toast.error(error?.message || "Could not send verification code. Please check your mobile number.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Email mode
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const srvRes = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
        }),
      });
      const srvData = await srvRes.json().catch(() => ({}));

      if (!srvRes.ok) {
        if (srvRes.status === 404 || srvData.noAccountFound) {
          setStep("no-account");
          toast.error(srvData.error || `No account is registered with ${cleanEmail}`);
          return;
        }
        throw new Error(srvData.error || "Could not send email verification code. Please check your email.");
      }

      if (srvData.otpToken) {
        setOtpToken(srvData.otpToken);
      }
      setDevOtp(srvData.devOtp || null);

      setOtp("");
      setStep("otp");
      setResendTimer(60);
      toast.success(`A 6-digit verification code has been sent to ${cleanEmail}`);
    } catch (error: any) {
      console.error("[FORGOT PASSWORD EMAIL ERROR]", error);
      toast.error(error?.message || "Could not send verification code. Please check your email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "phone") {
        const cleanPhone = cleanDigits(phoneNumber);

        const accRes = await fetch("/api/auth/phone-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: `+91${cleanPhone}`,
            phone: cleanPhone,
            otp: otp.trim(),
            otpToken: otpToken || undefined,
          }),
        });

        const accData = await accRes.json().catch(() => ({}));
        if (!accRes.ok) {
          throw new Error(accData.error || "Invalid or expired verification code.");
        }

        const accounts: LinkedAccount[] = Array.isArray(accData.accounts) ? accData.accounts : [];
        if (accData.resetVerificationToken) {
          setResetVerificationToken(accData.resetVerificationToken);
        }
        setLinkedAccounts(accounts);

        if (accounts.length === 0) {
          setSelectedAccount(null);
          setStep("no-account");
        } else if (accounts.length === 1) {
          setSelectedAccount(accounts[0]);
          setStep("reset");
          toast.success(
            `Phone verified! Found your ${accounts[0].roleLabel} account (${accounts[0].email}).`
          );
        } else {
          setSelectedAccount(accounts[0]);
          setStep("select-account");
          toast.success(
            `Phone verified! Found ${accounts.length} accounts linked to +91 ${cleanPhone}. Choose which one to reset.`
          );
        }
        return;
      }

      // Email mode
      const cleanEmail = email.trim().toLowerCase();

      const verifyRes = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: otp.trim(),
          otpToken: otpToken || undefined,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Invalid or expired verification code.");
      }

      setStep("reset");
      toast.success(`Email verified! You can now set a new password for ${cleanEmail}.`);
    } catch (error: any) {
      toast.error(error?.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Please ensure both password fields match.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "phone") {
        if (!selectedAccount) {
          toast.error("Please select an account to reset.");
          setIsLoading(false);
          return;
        }
        const cleanPhone = cleanDigits(phoneNumber);
        const res = await fetch("/api/auth/phone-reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: `+91${cleanPhone}`,
            phone: cleanPhone,
            targetAccountId: selectedAccount.id,
            targetEmail: selectedAccount.email,
            newPassword,
            resetVerificationToken: resetVerificationToken || undefined,
            otp: otp || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to update password.");
        }

        toast.success(
          data.message ||
            `Password updated for ${selectedAccount.email}! Please log in with your email and new password.`
        );
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }

      // Email mode
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: otp.trim(),
          otpToken: otpToken || undefined,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      toast.success(data.message || `Password updated for ${cleanEmail}! Please log in with your new password.`);
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Failed to set new password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img
              src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
              alt="Mingree Logo"
              className="w-8 h-8 rounded-xl object-cover shadow-xs"
            />
            <span className="text-lg font-bold text-foreground tracking-tight">Mingree</span>
          </div>
        </Link>
        <button
          onClick={() => {
            if (step === "input") {
              setLocation("/login");
            } else if (step === "reset" && linkedAccounts.length > 1 && mode === "phone") {
              setStep("select-account");
            } else {
              setStep("input");
            }
          }}
          className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
          data-testid="button-back"
        >
          {step === "input"
            ? "Back to Login"
            : step === "reset" && linkedAccounts.length > 1 && mode === "phone"
            ? "← Switch Account"
            : mode === "phone"
            ? "← Change Number"
            : "← Change Email"}
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-4">
        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="inline-flex p-2.5 rounded-full bg-primary/10 text-primary mx-auto mb-2">
              {step === "reset" ? (
                <Lock className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "input" && "Forgot Password"}
              {step === "otp" && (mode === "phone" ? "Verify Mobile OTP" : "Verify Email OTP")}
              {step === "select-account" && "Choose Account to Reset"}
              {step === "reset" && "Set New Password"}
              {step === "no-account" && "No Account Found"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {step === "input" &&
                (mode === "phone"
                  ? "Enter your registered mobile number to receive a secure SMS OTP code"
                  : "Enter your registered email address to receive a 6-digit verification code")}
              {step === "otp" &&
                (mode === "phone"
                  ? `Enter the 6-digit code sent to +91 ${cleanDigits(phoneNumber)}`
                  : `Enter the 6-digit code sent to ${email.trim().toLowerCase()}`)}
              {step === "select-account" &&
                `Multiple Mingree accounts are linked to +91 ${cleanDigits(phoneNumber)}. Select which one you want to update:`}
              {step === "reset" &&
                (mode === "phone" && selectedAccount
                  ? `Create a new password for your ${selectedAccount.roleLabel} account`
                  : `Create a new password for ${email.trim().toLowerCase()}`)}
              {step === "no-account" &&
                (mode === "phone"
                  ? `No account is registered under +91 ${cleanDigits(phoneNumber)}`
                  : `No account is registered under ${email.trim().toLowerCase()}`)}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-4">
            {/* Step 1: Phone or Email input */}
            {step === "input" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted/60 border border-border">
                  <button
                    type="button"
                    onClick={() => setMode("phone")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      mode === "phone"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                    Mobile SMS OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("email")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      mode === "email"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    Email OTP
                  </button>
                </div>

                {mode === "phone" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-primary" /> Mobile Number
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center px-3 h-10 rounded-lg border border-input bg-muted/60 text-xs font-semibold text-foreground select-none shrink-0">
                        🇮🇳 +91
                      </div>
                      <Input
                        id="reset-phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(cleanDigits(e.target.value))}
                        className="h-10 text-xs font-medium tracking-wider"
                        maxLength={10}
                        required
                        autoFocus
                        data-testid="input-reset-phone"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Your phone number is used for SMS OTP verification to locate all associated Creator and Brand accounts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" /> Registered Email Address
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-xs"
                      required
                      autoFocus
                      data-testid="input-reset-email"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      We will send a 6-digit OTP verification code to your email address to reset your password.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  disabled={
                    isLoading ||
                    (mode === "phone" ? cleanDigits(phoneNumber).length !== 10 : !email.trim().includes("@"))
                  }
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

            {/* Step 2: OTP verification */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center border border-border">
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit verification code sent to{" "}
                    <strong className="text-foreground font-mono">
                      {mode === "phone" ? `+91 ${cleanDigits(phoneNumber)}` : email.trim().toLowerCase()}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 py-1">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="input-otp">
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
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify &amp; Find My Account</span>
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
                    {mode === "phone" ? "Change Number" : "Change Email"}
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

            {/* Step 3: Account Selection (When both Creator & Brand or multiple accounts share this mobile number) */}
            {step === "select-account" && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {linkedAccounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    const isSponsor = acc.role === "sponsor";
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-muted/30 hover:bg-muted/60"
                        }`}
                        data-testid={`account-card-${acc.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSponsor
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                            }`}
                          >
                            {isSponsor ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {acc.companyName || acc.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 font-semibold ${
                                  isSponsor
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-pink-500/15 text-pink-700 dark:text-pink-300"
                                }`}
                              >
                                {isSponsor ? "Brand Partner" : "Creator"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{acc.email}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedAccount) {
                      toast.error("Please select an account first.");
                      return;
                    }
                    setStep("reset");
                  }}
                  className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  data-testid="button-continue-account"
                >
                  Continue with Selected Account
                </Button>
              </div>
            )}

            {/* Step 4: Password Reset Form */}
            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {mode === "phone" && selectedAccount ? (
                  <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedAccount.role === "sponsor"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                        }`}
                      >
                        {selectedAccount.role === "sponsor" ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground truncate">
                            {selectedAccount.companyName || selectedAccount.name}
                          </p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {selectedAccount.roleLabel}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          Login Email: {selectedAccount.email}
                        </p>
                      </div>
                    </div>
                    {linkedAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStep("select-account")}
                        className="text-[11px] font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs font-semibold text-foreground truncate font-mono">
                      {email.trim().toLowerCase()}
                    </p>
                  </div>
                )}

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
                    "Save New Password & Go to Login"
                  )}
                </Button>
              </form>
            )}

            {/* Empty State: No Account Linked */}
            {step === "no-account" && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">No Account Found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    We could not find any active Creator or Brand account registered with{" "}
                    <strong>
                      {mode === "phone" ? `+91 ${cleanDigits(phoneNumber)}` : email.trim().toLowerCase()}
                    </strong>
                    .
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      if (mode === "phone") setPhoneNumber("");
                      else setEmail("");
                    }}
                    className="w-full h-9 text-xs"
                  >
                    {mode === "phone" ? "Try Another Mobile Number" : "Try Another Email"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/signup")}
                    className="w-full h-9 text-xs"
                  >
                    Create a New Account
                  </Button>
                </div>
              </div>
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
          <Link href="/terms">
            <span className="underline cursor-pointer">Terms</span>
          </Link>{" "}
          and{" "}
          <Link href="/privacy">
            <span className="underline cursor-pointer">Privacy Policy</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
