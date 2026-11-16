import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { getCitiesByCountry } from "@shared/cities";
import { useAuth } from "@/lib/auth-context";
import { Mail, Smartphone, CheckCircle2, ShieldCheck } from "lucide-react";

const COUNTRIES = [
  { code: "IN", name: "India" }
];

type UserRole = "creator" | "sponsor";

function PinInput({ value, onChange, testIdPrefix }: { value: string; onChange: (val: string) => void; testIdPrefix: string }) {
  const digits = value.padEnd(6, "").slice(0, 6).split("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (idx: number, char: string) => {
    const cleanChar = char.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = cleanChar;
    onChange(newDigits.join("").trim());

    if (cleanChar && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    onChange(pasteData);
    const targetIdx = Math.min(pasteData.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  return (
    <div className="flex items-center gap-1.5 justify-center" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] || ""}
          onChange={(e) => handleInputChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          data-testid={`${testIdPrefix}-${idx}`}
          className="w-9 h-10 text-center text-sm font-bold rounded-md border border-input bg-background shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ))}
    </div>
  );
}

async function safeParseJson(response: Response): Promise<Record<string, any>> {
  try {
    const text = await response.text();
    if (!text) return { __nonJson: true };
    const trimmed = text.trim();
    if (trimmed.startsWith("<") || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
      return { __nonJson: true };
    }
    return JSON.parse(trimmed);
  } catch {
    return { __nonJson: true };
  }
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [role, setRole] = useState<UserRole>("creator");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IN");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const availableCities = getCitiesByCountry(country);

  // Brand/Sponsor specific fields
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPincode, setBillingPincode] = useState("");
  const [website, setWebsite] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dual OTP verification states (Email OTP + Mobile SMS OTP)
  const [emailOtp, setEmailOtp] = useState("");
  const [smsOtp, setSmsOtp] = useState("");
  const [emailOtpToken, setEmailOtpToken] = useState<string | undefined>(undefined);
  const [smsOtpToken, setSmsOtpToken] = useState<string | undefined>(undefined);
  const [devEmailOtp, setDevEmailOtp] = useState<string | null>(null);
  const [devSmsOtp, setDevSmsOtp] = useState<string | null>(null);

  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [smsResendTimer, setSmsResendTimer] = useState(0);

  useEffect(() => {
    if (emailResendTimer > 0) {
      const timer = setTimeout(() => setEmailResendTimer(emailResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailResendTimer]);

  useEffect(() => {
    if (smsResendTimer > 0) {
      const timer = setTimeout(() => setSmsResendTimer(smsResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsResendTimer]);

  const sendOtp = async (resendTarget: "both" | "email" | "sms" = "both") => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);

    if (!cleanEmail || !cleanName || !password || cleanPhone.length !== 10) {
      const msg = "Please fill all required fields, including a valid email and 10-digit mobile number.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      const msg = "Please enter a valid email address.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!ageConfirmed) {
      const msg = "You must confirm that you are at least 13 years old and agree to our Terms & Privacy Policy.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
          phone: cleanPhone,
          purpose: "signup_dual",
          resendTarget,
        }),
      });

      const data = await safeParseJson(response);

      if (data.__nonJson || !response.ok) {
        throw new Error(data.error || "Failed to send verification codes.");
      }

      if (data.emailOtpToken) {
        setEmailOtpToken(data.emailOtpToken);
      }
      if (data.smsOtpToken) {
        setSmsOtpToken(data.smsOtpToken);
      }
      if (data.devEmailOtp) {
        setDevEmailOtp(data.devEmailOtp);
      }
      if (data.devSmsOtp) {
        setDevSmsOtp(data.devSmsOtp);
      }

      if (resendTarget === "both" || resendTarget === "email") {
        setEmailOtp("");
        setEmailResendTimer(60);
      }
      if (resendTarget === "both" || resendTarget === "sms") {
        setSmsOtp("");
        setSmsResendTimer(60);
      }

      const successMsg =
        data.message || `Verification OTPs sent to ${cleanEmail} and +91 ${cleanPhone}`;
      toast.success(successMsg);

      setStep("otp");
    } catch (error: any) {
      const msg = error.message || "Failed to send verification codes. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndSignup = async () => {
    const cleanEmailOtp = emailOtp.trim();
    const cleanSmsOtp = smsOtp.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);

    if (cleanEmailOtp.length !== 6) {
      const msg = "Please enter the complete 6-digit Email OTP.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (cleanSmsOtp.length !== 6) {
      const msg = "Please enter the complete 6-digit Mobile SMS OTP.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      let verifyRes: Response;
      try {
        verifyRes = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            phone: cleanPhone,
            emailOtp: cleanEmailOtp,
            smsOtp: cleanSmsOtp,
            emailOtpToken,
            smsOtpToken,
          }),
        });
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        verifyRes = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            phone: cleanPhone,
            emailOtp: cleanEmailOtp,
            smsOtp: cleanSmsOtp,
            emailOtpToken,
            smsOtpToken,
          }),
        });
      }

      const verifyData = await safeParseJson(verifyRes);

      if (verifyData.__nonJson || !verifyRes.ok) {
        throw new Error(verifyData.error || "Invalid verification code. Please check both OTPs and try again.");
      }

      const verifiedToken = verifyData.verifiedToken;

      let signupRes: Response;
      try {
        signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            country,
            city: city || "Bangalore",
            password,
            role,
            verifiedToken,
            ageConfirmed,
            minimumAgeRequired: 13,
            companyName: role === "sponsor" ? companyName.trim() : undefined,
            gstNumber: role === "sponsor" ? gstNumber.trim() : undefined,
            panNumber: role === "sponsor" ? panNumber.trim() : undefined,
            billingAddress: role === "sponsor" ? billingAddress.trim() : undefined,
            billingCity: role === "sponsor" ? billingCity.trim() : undefined,
            billingState: role === "sponsor" ? billingState.trim() : undefined,
            billingPincode: role === "sponsor" ? billingPincode.trim() : undefined,
            website: role === "sponsor" ? website.trim() : undefined,
          }),
          credentials: "include",
        });
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            country,
            city: city || "Bangalore",
            password,
            role,
            verifiedToken,
            ageConfirmed,
            minimumAgeRequired: 13,
            companyName: role === "sponsor" ? companyName.trim() : undefined,
            gstNumber: role === "sponsor" ? gstNumber.trim() : undefined,
            panNumber: role === "sponsor" ? panNumber.trim() : undefined,
            billingAddress: role === "sponsor" ? billingAddress.trim() : undefined,
            billingCity: role === "sponsor" ? billingCity.trim() : undefined,
            billingState: role === "sponsor" ? billingState.trim() : undefined,
            billingPincode: role === "sponsor" ? billingPincode.trim() : undefined,
            website: role === "sponsor" ? website.trim() : undefined,
          }),
          credentials: "include",
        });
      }

      const signupData = await safeParseJson(signupRes);

      if (!signupRes.ok || signupData.__nonJson) {
        throw new Error(signupData.error || "Failed to create account");
      }
      const finalUser = signupData;

      login(finalUser);
      queryClient.setQueryData(["currentUser"], finalUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast.success("Email & Mobile Number verified! Account created successfully.");

      setTimeout(() => {
        if (role === "sponsor") {
          window.location.href = "/sponsor";
        } else {
          window.location.href = "/dashboard";
        }
      }, 350);
    } catch (error: any) {
      const rawMsg = error?.message || "";
      let msg = "Invalid verification code or registration failed. Please try again.";
      if (rawMsg && rawMsg !== "Load failed" && rawMsg !== "Failed to fetch") {
        msg = rawMsg;
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            onClick={() => step === "form" ? setLocation("/login") : setStep("form")}
            className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
            data-testid="button-back"
          >
            {step === "form" ? "Back to Login" : "← Edit Details"}
          </button>
          <div className="flex items-center gap-2">
            <img src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png" alt="Mingree Logo" className="w-7 h-7 rounded-lg object-cover shadow-xs" />
            <span className="text-sm font-extrabold text-foreground tracking-tight">Mingree</span>
          </div>
        </div>
        
        <Card className="border-border">
          <CardHeader className="text-center pt-6 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "form" ? "Create Account" : "Verify Email & Mobile Number"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {step === "form" 
                ? "Sign up to join Mingree" 
                : "Enter both 6-digit OTPs sent to your Email Address and Mobile Number"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 pb-6 space-y-4">
            {step === "form" && (
              <div className="space-y-3">
                {errorMessage && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive font-medium flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage(null)} className="text-destructive/70 hover:text-destructive text-sm font-bold ml-2">×</button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("creator")}
                    className={`p-2 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      role === "creator"
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                    data-testid="button-role-creator"
                  >
                    Creator Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("sponsor")}
                    className={`p-2 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      role === "sponsor"
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                    data-testid="button-role-sponsor"
                  >
                    Artist / Brand
                  </button>
                </div>

                <div>
                  <Input
                    type="text"
                    placeholder={role === "sponsor" ? "Contact Person Name" : "Full Name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs h-9"
                    data-testid="input-name"
                  />
                </div>

                {role === "sponsor" && (
                  <div>
                    <Input
                      type="text"
                      placeholder="Company/Brand Name *"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="text-xs h-9"
                      data-testid="input-company-name"
                    />
                  </div>
                )}

                <div>
                  <Input
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Email Address *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                    data-testid="input-email"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center px-2.5 h-9 rounded-md border border-input bg-muted/60 text-xs font-semibold text-foreground select-none shrink-0">
                    🇮🇳 +91
                  </div>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-Digit Mobile Number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    maxLength={10}
                    className="text-xs h-9"
                    required
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <Select value={country} onValueChange={(val) => { setCountry(val); setCity(""); }}>
                    <SelectTrigger className="text-xs h-9" data-testid="select-country">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="text-xs h-9" data-testid="select-city">
                      <SelectValue placeholder="Select City *" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableCities.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {role === "sponsor" && (
                  <>
                    {country === "IN" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="text"
                          placeholder="GST (optional)"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                          className="text-xs h-9"
                          data-testid="input-gst"
                          maxLength={15}
                        />
                        <Input
                          type="text"
                          placeholder="PAN (optional)"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                          className="text-xs h-9"
                          data-testid="input-pan"
                          maxLength={10}
                        />
                      </div>
                    )}

                    <div>
                      <Input
                        type="text"
                        placeholder="Business Address"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="text-xs h-9"
                        data-testid="input-address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="text"
                        placeholder="State"
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        className="text-xs h-9"
                        data-testid="input-state"
                      />
                      <Input
                        type="text"
                        placeholder="Pincode"
                        value={billingPincode}
                        onChange={(e) => setBillingPincode(e.target.value)}
                        className="text-xs h-9"
                        data-testid="input-pincode"
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <Input
                        type="text"
                        placeholder="Website (optional)"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="text-xs h-9"
                        data-testid="input-website"
                      />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-xs h-9 pr-14"
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

                <label
                  htmlFor="signup-age-confirm"
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer select-none"
                >
                  <Checkbox
                    id="signup-age-confirm"
                    checked={ageConfirmed}
                    onCheckedChange={(checked) => setAgeConfirmed(Boolean(checked))}
                    className="mt-0.5"
                    data-testid="checkbox-age-confirm"
                  />
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    I confirm that I am at least <strong className="text-foreground">13 years old</strong> and agree to Mingree's{" "}
                    <Link href="/terms" onClick={(e) => e.stopPropagation()}><span className="underline text-foreground">Terms of Service</span></Link> and{" "}
                    <Link href="/privacy" onClick={(e) => e.stopPropagation()}><span className="underline text-foreground">Privacy Policy</span></Link>.
                  </span>
                </label>

                <Button
                  type="button"
                  onClick={() => sendOtp("both")}
                  className="w-full text-xs font-semibold h-9 cursor-pointer"
                  disabled={
                    isLoading ||
                    !name ||
                    !email ||
                    phone.replace(/[^0-9]/g, "").length !== 10 ||
                    !password ||
                    !ageConfirmed ||
                    (role === "sponsor" && !companyName)
                  }
                  data-testid="button-signup"
                >
                  {isLoading ? "Sending Email & SMS OTPs..." : role === "sponsor" ? "Register Brand" : "Sign Up"}
                </Button>

                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-center text-muted-foreground text-xs">
                    Have an account?{" "}
                    <button
                      onClick={() => setLocation("/login")}
                      className="text-foreground font-semibold hover:underline cursor-pointer"
                      data-testid="link-login"
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                {/* 1. Email OTP Section */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">1. Email OTP Verification</p>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {email.trim().toLowerCase()}
                        </p>
                      </div>
                    </div>
                    {emailOtp.length === 6 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Entered
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center py-1">
                    <PinInput
                      value={emailOtp}
                      onChange={(val) => {
                        setEmailOtp(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      testIdPrefix="input-email-otp"
                    />
                  </div>



                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Sent to your email inbox</span>
                    <button
                      type="button"
                      onClick={() => sendOtp("email")}
                      disabled={emailResendTimer > 0 || isLoading}
                      className={`font-semibold ${
                        emailResendTimer > 0
                          ? "text-muted-foreground cursor-not-allowed"
                          : "text-primary hover:underline cursor-pointer"
                      }`}
                      data-testid="button-resend-email-otp"
                    >
                      {emailResendTimer > 0 ? `Resend Email OTP in ${emailResendTimer}s` : "Resend Email OTP"}
                    </button>
                  </div>
                </div>

                {/* 2. Mobile SMS OTP Section */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">2. Mobile SMS OTP Verification</p>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          +91 {phone.replace(/[^0-9]/g, "").slice(-10)}
                        </p>
                      </div>
                    </div>
                    {smsOtp.length === 6 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Entered
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center py-1">
                    <PinInput
                      value={smsOtp}
                      onChange={(val) => {
                        setSmsOtp(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      testIdPrefix="input-sms-otp"
                    />
                  </div>



                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Sent via SMS to your mobile</span>
                    <button
                      type="button"
                      onClick={() => sendOtp("sms")}
                      disabled={smsResendTimer > 0 || isLoading}
                      className={`font-semibold ${
                        smsResendTimer > 0
                          ? "text-muted-foreground cursor-not-allowed"
                          : "text-primary hover:underline cursor-pointer"
                      }`}
                      data-testid="button-resend-sms-otp"
                    >
                      {smsResendTimer > 0 ? `Resend SMS OTP in ${smsResendTimer}s` : "Resend SMS OTP"}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive font-medium flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage(null)} className="text-destructive/70 hover:text-destructive text-sm font-bold ml-2">×</button>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={verifyAndSignup}
                  className="w-full text-xs font-semibold h-10 flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={isLoading || emailOtp.length !== 6 || smsOtp.length !== 6}
                  data-testid="button-verify"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isLoading ? "Verifying Both OTPs & Creating Account..." : "Verify Email & Mobile & Create Account"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
