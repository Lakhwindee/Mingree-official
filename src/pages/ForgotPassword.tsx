import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Smartphone,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  User,
  AlertCircle,
  Check,
  Lock,
} from "lucide-react";

export interface LinkedAccount {
  id: number;
  email: string;
  name: string;
  role: "creator" | "sponsor" | string;
  roleLabel: string;
  companyName?: string | null;
  city?: string | null;
  avatar?: string | null;
  createdAt?: string;
}

export default function ForgotPassword() {
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"phone" | "otp" | "select-account" | "reset" | "no-account">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Multi-account states
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LinkedAccount | null>(null);
  const [resetVerificationToken, setResetVerificationToken] = useState<string | null>(null);

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
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const srvRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${cleanDigits.slice(-10)}@phone.mingree.com`,
          phone: cleanDigits.slice(-10),
          purpose: "forgot_password",
        }),
      });
      const srvData = await srvRes.json().catch(() => ({}));

      if (!srvRes.ok) {
        if (srvRes.status === 404 || srvData.noAccountFound) {
          setStep("no-account");
          toast.error(srvData.error || `No accounts are registered under +91 ${cleanDigits.slice(-10)}`);
          return;
        }
        throw new Error(srvData.error || "Could not send verification code. Please check your number.");
      }

      if (srvData.otpToken) {
        setOtpToken(srvData.otpToken);
      }

      setOtp("");
      setStep("otp");
      setResendTimer(60);
      toast.success(`A 6-digit SMS verification code has been sent to +91 ${cleanDigits.slice(-10)}`);
    } catch (error: any) {
      console.error("[FORGOT PASSWORD SMS ERROR]", error);
      toast.error(error?.message || "Could not send verification code. Please check your number.");
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
      const cleanDigits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);

      // Query all accounts associated with this verified phone number
      const accountsRes = await fetch("/api/auth/phone-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: `+91${cleanDigits}`,
          phone: cleanDigits,
          otp: otp.trim(),
          otpToken: otpToken || undefined,
        }),
      });

      const accountsData = await accountsRes.json();
      if (!accountsRes.ok) {
        throw new Error(accountsData.error || "Invalid or expired verification code.");
      }

      if (accountsData.resetVerificationToken) {
        setResetVerificationToken(accountsData.resetVerificationToken);
      }

      const foundAccounts: LinkedAccount[] = accountsData.accounts || [];
      setAccounts(foundAccounts);

      if (foundAccounts.length === 0) {
        setStep("no-account");
        toast.info("No existing accounts found linked to this mobile number.");
      } else if (foundAccounts.length === 1) {
        // Creator-only or Brand-only scenario
        setSelectedAccount(foundAccounts[0]);
        setStep("reset");
        toast.success(`Mobile verified! Found ${foundAccounts[0].roleLabel} account (${foundAccounts[0].email}).`);
      } else {
        // Shared Phone Number scenario (e.g. Creator account + Brand account)
        setSelectedAccount(foundAccounts[0]); // default selection
        setStep("select-account");
        toast.success(`Verified! Found ${foundAccounts.length} accounts linked to this number.`);
      }
    } catch (error: any) {
      toast.error(
        error?.code === "auth/invalid-verification-code"
          ? "The verification code entered is incorrect."
          : error?.message || "Invalid or expired verification code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAccount) {
      toast.error("Please select an account to reset password.");
      return;
    }

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
      const cleanDigits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
      const res = await fetch("/api/auth/phone-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: `+91${cleanDigits}`,
          targetAccountId: selectedAccount.id,
          targetEmail: selectedAccount.email,
          newPassword,
          resetVerificationToken,
          otp: otp || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      toast.success(data.message || `Password updated for ${selectedAccount.email}! Please log in with your new password.`);
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
            if (step === "phone") {
              setLocation("/login");
            } else if (step === "select-account") {
              setStep("phone");
            } else if (step === "reset" && accounts.length > 1) {
              setStep("select-account");
            } else {
              setStep("phone");
            }
          }}
          className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
          data-testid="button-back"
        >
          {step === "phone"
            ? "Back to Login"
            : step === "reset" && accounts.length > 1
            ? "← Switch Account"
            : "← Change Number"}
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto py-4">
        <Card className="border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="inline-flex p-2.5 rounded-full bg-primary/10 text-primary mx-auto mb-2">
              {step === "select-account" ? (
                <ShieldCheck className="w-5 h-5" />
              ) : step === "reset" ? (
                <Lock className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "phone" && "Forgot Password"}
              {step === "otp" && "Verify Mobile OTP"}
              {step === "select-account" && "Select Account"}
              {step === "reset" && "Set New Password"}
              {step === "no-account" && "No Account Found"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {step === "phone" && "Enter your registered mobile number to receive a secure SMS code"}
              {step === "otp" && `Enter the 6-digit code sent to +91 ${phoneNumber.replace(/[^0-9]/g, "").slice(-10)}`}
              {step === "select-account" && "Choose which account's password you want to reset"}
              {step === "reset" &&
                selectedAccount &&
                `Reset password for ${selectedAccount.roleLabel} (${selectedAccount.email})`}
              {step === "no-account" && `No accounts are registered under +91 ${phoneNumber.replace(/[^0-9]/g, "").slice(-10)}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 space-y-4">
            {/* Step 1: Phone input */}
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
                    Your phone number is used for OTP verification to locate all associated Creator and Brand accounts.
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

            {/* Step 2: OTP verification */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center border border-border">
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit SMS verification code sent to{" "}
                    <strong className="text-foreground font-mono">+91 {phoneNumber.replace(/[^0-9]/g, "").slice(-10)}</strong>
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
                      <span>Verify & Continue</span>
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

            {/* Step 3: Account Selection Screen (Multi-Account Scenario) */}
            {step === "select-account" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/5 p-3 border border-primary/20 text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-primary mb-0.5">Multiple Accounts Found</p>
                  <p className="text-[11px] text-muted-foreground">
                    This phone number is linked to {accounts.length} accounts. Select the account you want to reset.
                    Only the selected account's password will be changed.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    const isSponsor = acc.role === "sponsor";

                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                            : "border-border hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                        }`}
                        data-testid={`account-card-${acc.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSponsor
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            }`}
                          >
                            {isSponsor ? <Building2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {acc.companyName || acc.name}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                  isSponsor
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {isSponsor ? "Brand Account" : "Creator Account"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate font-mono">{acc.email}</p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-slate-300 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (selectedAccount) setStep("reset");
                    }}
                    disabled={!selectedAccount}
                    className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    data-testid="button-continue-reset"
                  >
                    <span>Reset Password for Selected Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("phone")}
                    className="w-full h-9 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Use Different Number
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Password Reset Form */}
            {step === "reset" && selectedAccount && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Selected Account Banner */}
                <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        selectedAccount.role === "sponsor"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {selectedAccount.role === "sponsor" ? (
                        <Building2 className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {selectedAccount.companyName || selectedAccount.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        {selectedAccount.email} •{" "}
                        <span className="font-semibold text-primary">
                          {selectedAccount.role === "sponsor" ? "Brand Partner" : "Creator"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep("select-account")}
                      className="text-[11px] text-primary hover:underline font-semibold shrink-0 cursor-pointer"
                    >
                      Switch
                    </button>
                  )}
                </div>

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

                <p className="text-[11px] text-muted-foreground">
                  This will change the password only for <strong>{selectedAccount.email}</strong>. Any other account
                  linked to this phone number will remain unchanged.
                </p>

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

            {/* Empty State: No Accounts Linked */}
            {step === "no-account" && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">No Account Found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    We could not find any active Creator or Brand accounts linked to +91{" "}
                    {phoneNumber.replace(/[^0-9]/g, "").slice(-10)}.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setPhoneNumber("");
                    }}
                    className="w-full h-9 text-xs"
                  >
                    Try Another Number
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
