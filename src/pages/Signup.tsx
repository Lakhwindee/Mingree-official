import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { getCitiesByCountry } from "@shared/cities";
import { useAuth } from "@/lib/auth-context";
import { ConfirmationResult } from "firebase/auth";

const COUNTRIES = [
  { code: "IN", name: "India" }
];

type UserRole = "creator" | "sponsor";

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string | undefined>(undefined);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    if (!cleanEmail || !cleanName || !password || cleanPhone.length < 10) {
      const msg = "Please fill all required fields, including a valid 10-digit mobile number.";
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

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: cleanName, phone: cleanPhone }),
      });

      const data = await safeParseJson(response);

      if (data.__nonJson || !response.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      if (data.otpToken) {
        setOtpToken(data.otpToken);
      }

      if (data.devOtp) {
        setDevOtpCode(String(data.devOtp));
      }
      setOtp("");
      toast.success(`A 6-digit SMS verification code has been sent to +91 ${cleanPhone.slice(-10)}`);

      setStep("otp");
      setResendTimer(60);
    } catch (error: any) {
      const msg = error.message || "Failed to send verification code. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    await sendOtp();
  };

  const verifyAndSignup = async () => {
    const cleanOtp = otp.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    if (!cleanOtp || cleanOtp.length !== 6) {
      const msg = "Please enter the complete 6-digit verification code.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, phone: cleanPhone, otp: cleanOtp, otpToken }),
      });

      const verifyData = await safeParseJson(verifyRes);

      if (verifyData.__nonJson || !verifyRes.ok) {
        throw new Error(verifyData.error || "Invalid verification code. Please check and try again.");
      }

      const verifiedToken = verifyData.verifiedToken;

      const signupRes = await fetch("/api/auth/signup", {
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
          otpVerified: true,
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

      const signupData = await safeParseJson(signupRes);

      if (!signupRes.ok || signupData.__nonJson) {
        throw new Error(signupData.error || "Failed to create account");
      }
      const finalUser = signupData;

      login(finalUser);
      queryClient.setQueryData(["currentUser"], finalUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast.success("Account created successfully! Welcome to Mingree.");

      setTimeout(() => {
        if (role === "sponsor") {
          window.location.href = "/sponsor";
        } else {
          window.location.href = "/dashboard";
        }
      }, 350);
    } catch (error: any) {
      const msg = error.message || "Invalid verification code or registration failed. Please try again.";
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
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
            data-testid="button-back"
          >
            {step === "form" ? "Back to Login" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            <img src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png" alt="Mingree Logo" className="w-7 h-7 rounded-lg object-cover shadow-xs" />
            <span className="text-sm font-extrabold text-foreground tracking-tight">Mingree</span>
          </div>
        </div>
        
        <Card className="border-border">
          <CardHeader className="text-center pt-6 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "form" ? "Create Account" : "Verify Mobile Number"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {step === "form" 
                ? "Sign up to join Mingree" 
                : `Enter the 6-digit SMS code sent to ${phone}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 pb-6 space-y-4">
            {errorMessage && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive font-medium flex items-center justify-between">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-destructive/70 hover:text-destructive text-sm font-bold ml-2">×</button>
              </div>
            )}
            {step === "form" && (
              <div className="space-y-3">
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
                    placeholder={role === "sponsor" ? "Business Email *" : "Email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    inputMode="tel"
                    placeholder="Phone Number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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

                <Button
                  type="button"
                  onClick={sendOtp}
                  className="w-full text-xs font-semibold h-9"
                  disabled={isLoading || !name || !email || !password || (role === "sponsor" && !companyName)}
                  data-testid="button-signup"
                >
                  {isLoading ? "Please wait..." : role === "sponsor" ? "Register Brand" : "Sign Up"}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  By signing up, you agree to our Terms of Service
                </p>

                    <div className="border-t border-border pt-3 mt-3">
                      <p className="text-center text-muted-foreground text-xs">
                        Have an account?{" "}
                        <button
                          onClick={() => setLocation("/login")}
                          className="text-foreground font-semibold hover:underline"
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
                <div className="rounded-lg bg-muted/50 p-3 text-center border border-border">
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit SMS verification code sent to{" "}
                    <strong className="text-foreground font-mono">+91 {phone.replace(/[^0-9]/g, "").slice(-10)}</strong>
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 py-2">
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={(val) => {
                      setOtp(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="text-base w-10 h-10 font-bold" />
                      <InputOTPSlot index={1} className="text-base w-10 h-10 font-bold" />
                      <InputOTPSlot index={2} className="text-base w-10 h-10 font-bold" />
                      <InputOTPSlot index={3} className="text-base w-10 h-10 font-bold" />
                      <InputOTPSlot index={4} className="text-base w-10 h-10 font-bold" />
                      <InputOTPSlot index={5} className="text-base w-10 h-10 font-bold" />
                    </InputOTPGroup>
                  </InputOTP>
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
                  className="w-full text-xs font-semibold h-10"
                  disabled={isLoading || otp.length !== 6}
                  data-testid="button-verify"
                >
                  {isLoading ? "Verifying & Creating Account..." : "Verify & Create Account"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Didn't receive code?{" "}
                  <button
                    onClick={resendOtp}
                    disabled={resendTimer > 0 || isLoading}
                    className={`font-semibold ${resendTimer > 0 ? "text-muted-foreground" : "text-foreground hover:underline cursor-pointer"}`}
                    data-testid="button-resend"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div id="signup-recaptcha-container" />
    </div>
  );
}

