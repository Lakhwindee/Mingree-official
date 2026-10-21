import { Sidebar } from "@/components/Sidebar";
import { copyToClipboard } from "@/lib/utils";


import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { SUBSCRIPTION_PLANS } from "@shared/schema";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Check, Crown, Loader2, Calendar, Zap, Shield, Clock, CreditCard, Tag, Building2, MapPin, FileText, CheckCircle, X, Smartphone, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLocation, useSearch } from "wouter";
import { useState, useCallback, useEffect } from "react";

declare global {
  interface Window {
    Cashfree: any;
    Razorpay: any;
  }
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

interface PromoValidation {
  valid: boolean;
  code: string;
  type: string;
  discountPercent: number | null;
  trialDays: number | null;
  afterTrialAction: string | null;
}

export default function Subscription() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"billing" | "payment" | "upi">("billing");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  
  const [billingDetails, setBillingDetails] = useState({
    name: "",
    companyName: "",
    gstNumber: "",
    panNumber: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingPincode: "",
    email: "",
    phone: "",
  });
  
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => api.getSubscription(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user) {
      setBillingDetails(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        companyName: (user as any).companyName || "",
        gstNumber: (user as any).gstNumber || "",
        panNumber: (user as any).panNumber || "",
        billingAddress: (user as any).billingAddress || "",
        billingCity: (user as any).billingCity || "",
        billingState: (user as any).billingState || "",
        billingPincode: (user as any).billingPincode || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const orderId = params.get('order_id');
    const status = params.get('status');
    const promo = params.get('promo');
    
    if (orderId && status === 'success' && user?.id) {
      verifyCashfreePayment(orderId, promo || undefined);
    }
  }, [searchString, user?.id]);

  const verifyCashfreePayment = async (orderId: string, promoCode?: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch("/api/subscription/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          orderId,
          promoCode,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Payment successful! Pro subscription activated.");
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        refetchSubscription();
      } else {
        toast.error(data.error || "Payment verification failed");
      }
      setLocation('/subscription');
    } catch (error: any) {
      toast.error(error.message || "Payment verification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadCashfreeScript = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (window.Cashfree) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }
    
    setIsValidatingPromo(true);
    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: promoCode.trim().toUpperCase(), context: "subscription" }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || "Invalid promo code");
        setPromoValidation(null);
        return;
      }
      
      setPromoValidation(data);
      toast.success(data.type === "trial" 
        ? `Trial code valid! Get ${data.trialDays} days free` 
        : `Discount applied! ${data.discountPercent}% off`);
    } catch (error) {
      toast.error("Failed to validate promo code");
      setPromoValidation(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const applyPromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/promo-codes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, context: "subscription" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply promo code");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["currentSponsor"] });
      queryClient.invalidateQueries({ queryKey: ["sponsorWallet"] });
      setShowCheckout(false);
      setPromoCode("");
      setPromoValidation(null);
      refetchSubscription();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenCheckout = () => {
    setShowCheckout(true);
    setCheckoutStep("billing");
    setPromoCode("");
    setPromoValidation(null);
    setUtrNumber("");
    setPaymentSubmitted(false);
  };

  const handleProceedToPayment = () => {
    if (!billingDetails.name || !billingDetails.email) {
      toast.error("Please fill in required fields (Name, Email)");
      return;
    }
    
    if (billingDetails.gstNumber && !validateGST(billingDetails.gstNumber)) {
      toast.error("Invalid GST number format");
      return;
    }
    
    if (billingDetails.panNumber && !validatePAN(billingDetails.panNumber)) {
      toast.error("Invalid PAN number format");
      return;
    }
    
    setCheckoutStep("upi");
  };

  const validateGST = (gst: string) => {
    if (!gst) return true;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  const validatePAN = (pan: string) => {
    if (!pan) return true;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  const { data: upiConfig } = useQuery({
    queryKey: ["upiConfig"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/subscription/upi-config", { credentials: "include" });
        if (!res.ok) return { upiId: "mingree@upi", payeeName: "Mingree Media" };
        return await res.json();
      } catch {
        return { upiId: "mingree@upi", payeeName: "Mingree Media" };
      }
    },
  });

  const handleFinalPayment = async () => {
    if (!user) return;
    
    if (promoValidation?.type === "trial") {
      applyPromoCodeMutation.mutate(promoCode.trim().toUpperCase());
      return;
    }
    
    try {
      const response = await fetch("/api/users/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(billingDetails),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save billing details");
      }
      
      setCheckoutStep("upi");
    } catch (error: any) {
      toast.error(error.message || "Failed to save billing details");
    }
  };

  const handleUpiPaymentSubmit = async () => {
    if (!user) return;
    if (!utrNumber.trim()) {
      toast.error("Please enter the UTR/Transaction Reference Number");
      return;
    }
    if (utrNumber.trim().length < 6) {
      toast.error("Please enter a valid UTR number");
      return;
    }

    setIsProcessing(true);
    try {
      const finalAmount = calculateFinalAmount();
      const res = await fetch("/api/subscription/upi-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          utrNumber: utrNumber.trim(),
          amount: finalAmount,
          promoCode: promoValidation ? promoCode.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment");
      }

      setPaymentSubmitted(true);
      toast.success("Payment submitted! It will be verified shortly.");
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyUpiId = async () => {
    const targetUpiId = upiConfig?.upiId || "mingree@upi";
    const ok = await copyToClipboard(targetUpiId);
    if (ok) {
      toast.success("UPI ID copied!");
    } else {
      toast.error(`UPI ID is: ${targetUpiId}`);
    }
  };

  const openUpiApp = async (app: string) => {
    const finalAmount = calculateFinalAmount();
    const upiId = upiConfig?.upiId || "mingree@upi";
    const merchantName = "Mingree";
    const note = "Pro Subscription";
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = upiLink;
      } else {
        await copyUpiId();
        toast.info("UPI ID copied! Open your UPI app on mobile to scan/pay.");
      }
    } catch {
      await copyUpiId();
      toast.info("UPI ID copied! Please paste it in your payment app.");
    }
  };

  const handleCashfreeSubscriptionPayment = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const finalAmount = calculateFinalAmount();
      const orderRes = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: finalAmount,
          userId: user.id,
          customerName: billingDetails.name || user.name,
          customerEmail: billingDetails.email || user.email,
          customerPhone: billingDetails.phone || "9999999999",
          purpose: "subscription",
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create Cashfree order");
      }

      if (typeof window.Cashfree === 'undefined') {
        throw new Error("Cashfree SDK failed to load. Please refresh the page.");
      }

      const configRes = await fetch("/api/cashfree/config").then(r => r.json()).catch(() => ({ mode: "sandbox" }));

      const cashfree = window.Cashfree({
        mode: configRes.mode || configRes.environment || "sandbox",
      });

      const checkoutOptions = {
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_modal",
      };

      cashfree.checkout(checkoutOptions).then(async (result: any) => {
        try {
          const verifyRes = await fetch("/api/cashfree/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              orderId: orderData.order_id,
              userId: user.id,
              amount: finalAmount,
              purpose: "subscription",
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success("Cashfree Payment successful! Pro subscription activated.");
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            refetchSubscription();
            setShowCheckout(false);
          } else {
            toast.error(verifyData.error || "Payment verification failed");
          }
        } catch {
          toast.error("Failed to verify payment");
        }
        setIsProcessing(false);
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate Cashfree payment");
      setIsProcessing(false);
    }
  };

  const calculateFinalAmount = () => {
    const basePrice = SUBSCRIPTION_PLANS.pro.price;
    if (promoValidation?.type === "trial") {
      return 0;
    }
    if (promoValidation?.type === "discount" && promoValidation.discountPercent) {
      return Math.round(basePrice * (1 - promoValidation.discountPercent / 100));
    }
    return basePrice;
  };

  const isLoading = userLoading || subLoading;
  const hasActiveSubscription = Boolean(
    subscription?.isActive && 
    subscription?.plan && 
    subscription.plan !== "free" &&
    user?.subscriptionPlan !== "free"
  );

  if (isLoading) {
    return (
      <div className="flex h-screen bg-black text-white">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-black text-white">
      <Sidebar />

      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-zinc-800 md:hidden w-full max-w-full shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-white truncate">Subscription</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 whitespace-nowrap">Membership</span>
        </div>
        {user && <NotificationDropdown userId={user.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="w-full max-w-4xl mx-auto px-3.5 py-4 sm:px-6 sm:py-8 overflow-x-hidden box-border">
          <div className="hidden md:block text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Creator Subscription</h1>
            <p className="text-gray-400">Unlock the power to reserve campaigns and start earning</p>
          </div>

          {hasActiveSubscription && (
            <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500/30 mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Pro Creator</h3>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Expires: {subscription?.expiresAt ? format(new Date(subscription.expiresAt), "MMM dd, yyyy") : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white" data-testid="badge-active">Active</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card className={`border-2 ${!hasActiveSubscription ? 'border-gray-700' : 'border-gray-700'} bg-gray-900/50`}>
              <CardHeader>
                <CardTitle className="text-xl text-white">Free</CardTitle>
                <CardDescription className="text-gray-400">Browse and explore</CardDescription>
                <div className="text-3xl font-bold text-white mt-2">
                  ₹0<span className="text-sm font-normal text-gray-400">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {SUBSCRIPTION_PLANS.free.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-gray-500">
                    <X className="w-4 h-4 text-red-500" />
                    Reserve campaigns
                  </li>
                  <li className="flex items-center gap-2 text-gray-500">
                    <X className="w-4 h-4 text-red-500" />
                    Earn from promotions
                  </li>
                </ul>
                {!hasActiveSubscription && (
                  <div className="mt-6">
                    <Button variant="outline" className="w-full" disabled data-testid="button-current-plan">
                      Current Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`border-2 ${hasActiveSubscription ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500/50 bg-gray-900/50'} relative overflow-visible`}>
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                Recommended
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Pro Creator
                </CardTitle>
                <CardDescription className="text-gray-400">Start earning today</CardDescription>
                <div className="text-3xl font-bold text-white mt-2">
                  ₹499<span className="text-sm font-normal text-gray-400">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {SUBSCRIPTION_PLANS.pro.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-green-400 font-medium">
                    <Zap className="w-4 h-4" />
                    Earn 100 - 35,000 per campaign
                  </li>
                </ul>
                <div className="mt-6">
                  {hasActiveSubscription ? (
                    <Button 
                      className="w-full bg-green-600 cursor-not-allowed"
                      disabled
                      data-testid="button-subscription-active"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Subscription Activated
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                      onClick={handleOpenCheckout}
                      disabled={isProcessing}
                      data-testid="button-upgrade-pro"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Upgrade to Pro
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h4 className="font-medium text-white">Secure Payments</h4>
                <p className="text-sm text-gray-400">UPI, Cards, Wallets</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h4 className="font-medium text-white">Instant Activation</h4>
                <p className="text-sm text-gray-400">Start reserving after payment</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <h4 className="font-medium text-white">Unlimited Campaigns</h4>
                <p className="text-sm text-gray-400">No limits on reservations</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Secure UPI payment. By subscribing, you agree to our Terms of Service.</p>
          </div>
        </div>
      </main>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              {checkoutStep === "billing" ? "Billing Details" : checkoutStep === "upi" ? "Pay via UPI" : "Review & Pay"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {checkoutStep === "billing" 
                ? "Enter your billing information for the invoice" 
                : checkoutStep === "upi"
                ? "Complete your payment using any UPI app"
                : "Review your order and complete payment"}
            </DialogDescription>
          </DialogHeader>

          {paymentSubmitted ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Payment Submitted!</h3>
                <p className="text-gray-400">Your payment is being verified. Your Pro subscription will be activated within a few minutes.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-400">UTR Number: <span className="text-white font-mono">{utrNumber}</span></p>
                <p className="text-sm text-gray-400 mt-1">Amount: <span className="text-white">₹{calculateFinalAmount()}</span></p>
              </div>
              <Button 
                onClick={() => { setShowCheckout(false); setPaymentSubmitted(false); setUtrNumber(""); setCheckoutStep("billing"); }}
                className="w-full"
                data-testid="button-close-payment"
              >
                Close
              </Button>
            </div>
          ) : checkoutStep === "upi" ? (
            <div className="space-y-5">
              <Card className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/40">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold text-white">Instant Online Checkout</span>
                    </div>
                    <Badge className="bg-indigo-600 text-white">Recommended</Badge>
                  </div>
                  <p className="text-xs text-gray-300">Pay securely via UPI, Credit/Debit Card, Net Banking, or Wallets powered by Cashfree.</p>
                  <Button
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 h-11"
                    onClick={handleCashfreeSubscriptionPayment}
                    disabled={isProcessing}
                    data-testid="button-cashfree-sub-pay"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isProcessing ? "Processing..." : `Pay ₹${calculateFinalAmount()} with Cashfree`}
                  </Button>
                </CardContent>
              </Card>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-3 text-xs text-gray-500 uppercase">Or Manual UPI Transfer</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Pro Creator Plan</h4>
                        <p className="text-sm text-gray-400">30 days subscription</p>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-white">₹{calculateFinalAmount()}</div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Step 1: Pay via UPI</h4>
                
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Pay to UPI ID:</span>
                    <Button variant="ghost" size="sm" onClick={copyUpiId} className="text-blue-400 hover:text-blue-300" data-testid="button-copy-upi">
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="bg-gray-900 rounded p-3 font-mono text-center text-lg text-white select-all" data-testid="text-upi-id">
                    {upiConfig?.upiId || "Loading..."}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">Amount: ₹{calculateFinalAmount()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800 h-14"
                    onClick={() => openUpiApp("gpay")}
                    data-testid="button-pay-gpay"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Smartphone className="w-4 h-4 text-green-400" />
                      <span className="text-xs">Google Pay</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800 h-14"
                    onClick={() => openUpiApp("phonepe")}
                    data-testid="button-pay-phonepe"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <span className="text-xs">PhonePe</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800 h-14"
                    onClick={() => openUpiApp("paytm")}
                    data-testid="button-pay-paytm"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      <span className="text-xs">Paytm</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800 h-14"
                    onClick={() => openUpiApp("any")}
                    data-testid="button-pay-upi-other"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <ExternalLink className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs">Other UPI</span>
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center">Or copy the UPI ID above and pay from any UPI app manually</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Step 2: Enter Transaction Reference</h4>
                <p className="text-xs text-gray-500">After paying, enter the UTR/Transaction Reference Number from your payment app</p>
                <Input
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="Enter UTR / Transaction Reference Number"
                  className="bg-gray-800 border-gray-700 text-white font-mono"
                  data-testid="input-utr-number"
                />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <Button variant="outline" onClick={() => setCheckoutStep("billing")} data-testid="button-upi-back">
                  Back
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                  onClick={handleUpiPaymentSubmit}
                  disabled={isProcessing || !utrNumber.trim()}
                  data-testid="button-submit-upi-payment"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : checkoutStep === "billing" ? (
            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Full Name *</Label>
                    <Input
                      value={billingDetails.name}
                      onChange={(e) => setBillingDetails({...billingDetails, name: e.target.value})}
                      placeholder="Your full name"
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-billing-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Email *</Label>
                    <Input
                      type="email"
                      value={billingDetails.email}
                      onChange={(e) => setBillingDetails({...billingDetails, email: e.target.value})}
                      placeholder="your@email.com"
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-billing-email"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Have a Promo Code? (Optional)
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        if (promoValidation) setPromoValidation(null);
                      }}
                      placeholder="Enter promo code"
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-promo-code"
                    />
                    <Button
                      variant="outline"
                      onClick={validatePromoCode}
                      disabled={isValidatingPromo || !promoCode.trim()}
                      data-testid="button-validate-promo"
                    >
                      {isValidatingPromo ? "..." : "Apply"}
                    </Button>
                  </div>
                  {promoValidation && (
                    <div className={`mt-2 p-3 rounded ${promoValidation.valid ? "bg-green-900/30 border border-green-700" : "bg-red-900/30 text-red-400"}`}>
                      {promoValidation.valid ? (
                        promoValidation.type === "trial" ? (
                          <div className="space-y-2">
                            <p className="text-green-400 font-medium flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Free Trial: {promoValidation.trialDays} days Pro access!
                            </p>
                            <p className="text-sm text-gray-400">
                              Trial expires on: {new Date(Date.now() + (promoValidation.trialDays || 7) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {promoValidation.afterTrialAction === "continue" 
                                ? "After trial ends, you will be prompted to pay to continue" 
                                : "After trial ends, plan will downgrade to free"}
                            </p>
                          </div>
                        ) : promoValidation.type === "discount" ? (
                          <p className="text-green-400">{promoValidation.discountPercent}% discount applied!</p>
                        ) : (
                          <p className="text-green-400">Promo code applied!</p>
                        )
                      ) : "Invalid promo code"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="outline" onClick={() => setShowCheckout(false)}>
                  Cancel
                </Button>
                {promoValidation?.valid && promoValidation?.type === "trial" ? (
                  <Button 
                    onClick={() => applyPromoCodeMutation.mutate(promoCode.trim().toUpperCase())}
                    disabled={applyPromoCodeMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-activate-trial"
                  >
                    {applyPromoCodeMutation.isPending ? "Activating..." : "Activate Free Trial"}
                  </Button>
                ) : (
                  <Button onClick={handleProceedToPayment} data-testid="button-proceed-payment">
                    Continue to Payment
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
