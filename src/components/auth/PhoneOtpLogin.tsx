import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtpCode, firebaseDb, handleFirestoreError, OperationType } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { ConfirmationResult } from "firebase/auth";
import { Smartphone, CheckCircle2, ArrowRight, RefreshCw, KeyRound, ShieldCheck } from "lucide-react";

interface PhoneOtpLoginProps {
  role?: "creator" | "sponsor";
  onSuccess?: () => void;
  className?: string;
}

export function PhoneOtpLogin({ role = "creator", onSuccess, className = "" }: PhoneOtpLoginProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Setup invisible recaptcha
      const verifier = setupRecaptcha("firebase-recaptcha-container", "invisible");
      
      const fullPhone = `+91${cleanPhone.slice(-10)}`;
      const result = await sendPhoneOtp(fullPhone, verifier);
      setConfirmationResult(result);
      setStep("otp");
      setResendTimer(60);
      toast({
        title: "OTP Sent!",
        description: `6-digit SMS verification code sent to ${fullPhone}`,
      });
    } catch (error: any) {
      console.error("[FIREBASE PHONE AUTH ERROR]", error);
      let errorMsg = "Could not send SMS OTP. Please check your number.";
      if (error?.code === "auth/invalid-phone-number") {
        errorMsg = "The phone number is formatted incorrectly.";
      } else if (error?.code === "auth/too-many-requests") {
        errorMsg = "Too many requests. Please wait a few minutes or use a test number.";
      } else if (error?.code === "auth/captcha-check-failed") {
        errorMsg = "reCAPTCHA verification failed. Please try again.";
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      toast({
        title: "SMS Verification Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!confirmationResult || otp.length !== 6) {
      toast({
        title: "Incomplete Code",
        description: "Please enter the complete 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { user, idToken, phoneNumber: verifiedPhone } = await verifyPhoneOtpCode(confirmationResult, otp);
      
      // Sync phone login with backend API
      const response = await fetch("/api/auth/phone-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: verifiedPhone || `+91${phoneNumber.slice(-10)}`,
          role,
          name: fullName.trim() || undefined,
          idToken,
          uid: user.uid,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to log in with verified phone");
      }

      // Persist profile in Firestore under /users/{userId}
      try {
        await setDoc(doc(firebaseDb, "users", user.uid), {
          uid: user.uid,
          phoneNumber: verifiedPhone || `+91${phoneNumber.slice(-10)}`,
          role,
          displayName: fullName.trim() || `User ${(verifiedPhone || phoneNumber).slice(-4)}`,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn("[FIRESTORE USER WRITE WARNING]", firestoreErr);
      }

      queryClient.setQueryData(["currentUser"], data);
      login(data);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast({
        title: "Verification Successful!",
        description: `Welcome to Mingree, ${data.name || "Creator"}!`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        if (data.role === "admin") {
          setLocation("/admin/dashboard");
        } else if (data.role === "sponsor") {
          setLocation("/sponsor");
        } else {
          setLocation("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("[OTP VERIFY ERROR]", error);
      let errorMsg = "Invalid verification code. Please try again.";
      if (error?.code === "auth/invalid-verification-code") {
        errorMsg = "Incorrect 6-digit OTP code entered.";
      } else if (error?.code === "auth/code-expired") {
        errorMsg = "Verification code has expired. Please request a new one.";
      } else if (error?.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Verification Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden container for Firebase Invisible reCAPTCHA */}
      <div id="firebase-recaptcha-container" ref={recaptchaContainerRef}></div>

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone-number" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary" /> Mobile Number
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 h-10 border border-border rounded-lg bg-muted/40 text-xs font-semibold text-foreground shrink-0 select-none">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <Input
                id="phone-number"
                type="tel"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                className="h-10 text-xs font-mono tracking-wider flex-1"
                maxLength={10}
                required
                autoFocus
                data-testid="input-phone-auth-number"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              We'll send a 6-digit SMS OTP via Firebase Authentication.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone-name" className="text-xs font-semibold text-foreground">
              Your Name <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="phone-name"
              type="text"
              placeholder="e.g. Aryan Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 text-xs"
              data-testid="input-phone-auth-name"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            disabled={isLoading || phoneNumber.replace(/[^0-9]/g, "").length < 10}
            data-testid="button-send-phone-otp"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Sending SMS Code...
              </>
            ) : (
              <>
                <span>Send SMS OTP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>

          {/* Test number assistance tip */}
          <div className="rounded-lg bg-muted/40 p-2.5 border border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Verified Firebase SMS Auth:</strong> Test numbers configured in Firebase Console (e.g., <code className="bg-muted px-1 rounded font-mono">+91 9999999999</code> with OTP <code className="bg-muted px-1 rounded font-mono">123456</code>) verify instantly.
            </span>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2 text-center">
            <div className="inline-flex p-2 rounded-full bg-primary/10 text-primary mb-1">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Enter 6-Digit SMS Code</h3>
            <p className="text-xs text-muted-foreground">
              Sent to <span className="font-semibold text-foreground">+91 {phoneNumber.slice(-10)}</span>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                }}
                className="text-primary hover:underline ml-2 text-xs font-medium cursor-pointer"
              >
                Change
              </button>
            </p>
          </div>

          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(val) => setOtp(val)}
              data-testid="input-phone-otp-digits"
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
            className="w-full h-10 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            disabled={isVerifying || otp.length !== 6}
            data-testid="button-verify-phone-otp"
          >
            {isVerifying ? (
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
              Back to Mobile Number
            </button>
            <button
              type="button"
              onClick={() => handleSendOtp()}
              disabled={resendTimer > 0 || isLoading}
              className={`font-semibold cursor-pointer ${
                resendTimer > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:underline"
              }`}
            >
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
