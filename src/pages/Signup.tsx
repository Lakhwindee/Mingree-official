import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { getCitiesByCountry } from "@shared/cities";
import { useAuth } from "@/lib/auth-context";

const COUNTRIES = [
  { code: "IN", name: "India" }
];

type UserRole = "creator" | "sponsor";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendOtp = async () => {
    if (!email || !name || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      toast({
        title: "Code Sent",
        description: `Verification code sent to ${email}`,
      });
      setStep("otp");
      setResendTimer(60);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    await sendOtp();
  };

  const verifyAndSignup = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Invalid verification code");
      }

      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          country,
          city,
          password,
          role,
          companyName: role === "sponsor" ? companyName : undefined,
          gstNumber: role === "sponsor" ? gstNumber : undefined,
          panNumber: role === "sponsor" ? panNumber : undefined,
          billingAddress: role === "sponsor" ? billingAddress : undefined,
          billingCity: role === "sponsor" ? billingCity : undefined,
          billingState: role === "sponsor" ? billingState : undefined,
          billingPincode: role === "sponsor" ? billingPincode : undefined,
          website: role === "sponsor" ? website : undefined,
        }),
        credentials: "include",
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        throw new Error(signupData.error || "Failed to create account");
      }

      login(signupData);
      queryClient.setQueryData(["currentUser"], signupData);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast({
        title: "Account Created",
        description: "Welcome to Mingree!",
      });

      if (role === "sponsor") {
        setLocation("/sponsor");
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => step === "form" ? setLocation("/login") : setStep("form")}
          className="mb-4 text-xs text-muted-foreground hover:text-foreground font-medium"
          data-testid="button-back"
        >
          {step === "form" ? "Back to Login" : "Back"}
        </button>
        
        <Card className="border-border">
          <CardHeader className="text-center pt-6 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {step === "form" ? "Create Account" : "Verify Email"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {step === "form" 
                ? "Sign up to join Mingree" 
                : `Enter the code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            {step === "form" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("creator")}
                    className={`p-2 rounded border text-xs font-medium transition-colors ${
                      role === "creator"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                    data-testid="button-role-creator"
                  >
                    Creator
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("sponsor")}
                    className={`p-2 rounded border text-xs font-medium transition-colors ${
                      role === "sponsor"
                        ? "bg-foreground text-background border-foreground"
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
                    type="email"
                    placeholder={role === "sponsor" ? "Business Email *" : "Email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs h-9"
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

                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="text"
                        placeholder="City"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        className="text-xs h-9"
                        data-testid="input-city"
                      />
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
                        type="url"
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
                  disabled={isLoading || !name || !email || !password || !city || (role === "sponsor" && !companyName)}
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
                <div className="flex flex-col items-center gap-3">
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={setOtp}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="text-base w-10 h-10" />
                      <InputOTPSlot index={1} className="text-base w-10 h-10" />
                      <InputOTPSlot index={2} className="text-base w-10 h-10" />
                      <InputOTPSlot index={3} className="text-base w-10 h-10" />
                      <InputOTPSlot index={4} className="text-base w-10 h-10" />
                      <InputOTPSlot index={5} className="text-base w-10 h-10" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="button"
                  onClick={verifyAndSignup}
                  className="w-full text-xs font-semibold h-9"
                  disabled={isLoading || otp.length !== 6}
                  data-testid="button-verify"
                >
                  {isLoading ? "Verifying..." : "Verify & Create Account"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Didn't receive code?{" "}
                  <button
                    onClick={resendOtp}
                    disabled={resendTimer > 0 || isLoading}
                    className={`font-semibold ${resendTimer > 0 ? "text-muted-foreground" : "text-foreground hover:underline"}`}
                    data-testid="button-resend"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
