import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Wallet = __DummyIcon;
const Instagram = __DummyIcon;
const Star = __DummyIcon;



interface GuideStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
}

const creatorSteps: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome to Mingree",
    description: "Let's take a quick tour to help you get started as a creator. You'll learn how to find campaigns, earn money, and grow your influence.",
  },
  {
    id: "instagram",
    title: "Link Your Instagram",
    description: "Connect your Instagram account to unlock campaign opportunities. Your follower count determines your tier and earning potential.",
    targetSelector: "[data-testid='nav-instagram']",
  },
  {
    id: "campaigns",
    title: "Discover Campaigns",
    description: "Browse available campaigns matching your tier. Reserve spots, create content, and submit for approval to earn money.",
    targetSelector: "[data-testid='nav-campaigns']",
  },
  {
    id: "wallet",
    title: "Track Your Earnings",
    description: "View your wallet balance, track earnings from approved campaigns, and request withdrawals directly to your UPI.",
    targetSelector: "[data-testid='nav-wallet']",
  },
  {
    id: "stars",
    title: "Earn Star Rewards",
    description: "Complete promotional campaigns to earn stars. Collect 5 stars to get a free promo code for subscription discounts.",
  },
];

const sponsorSteps: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome to Mingree",
    description: "Let's take a quick tour to help you get started as a sponsor. You'll learn how to create campaigns and connect with creators.",
  },
  {
    id: "wallet",
    title: "Add Funds to Wallet",
    description: "First, add funds to your wallet. This balance will be used to pay creators when their content is approved.",
    targetSelector: "[data-testid='nav-wallet']",
  },
  {
    id: "campaigns",
    title: "Create Campaigns",
    description: "Create campaigns targeting specific tiers and countries. Set your budget, describe content requirements, and wait for creators to join.",
    targetSelector: "[data-testid='nav-campaigns']",
  },
  {
    id: "creators",
    title: "Review Submissions",
    description: "When creators submit content, review and approve it. Payment is automatically sent to approved creators.",
  },
  {
    id: "settings",
    title: "Configure Brand Details",
    description: "Set up your brand profile in settings to help creators recognize your business.",
    targetSelector: "[data-testid='nav-settings']",
  },
];

interface QuickStartGuideProps {
  userRole: "creator" | "sponsor";
  onComplete: () => void;
}

export function QuickStartGuide({ userRole, onComplete }: QuickStartGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const steps = userRole === "creator" ? creatorSteps : sponsorSteps;
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (step.targetSelector) {
      try {
        const element = document.querySelector(step.targetSelector);
        if (element) {
          element.classList.add("guide-highlight");
          return () => element.classList.remove("guide-highlight");
        }
      } catch (err) {
        console.warn("Guide querySelector error:", err);
      }
    }
  }, [currentStep, step.targetSelector]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(`mingree_guide_completed_${userRole}`, "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={handleSkip} />
      
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
        <Card className="border-border bg-card shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h3 className="text-foreground font-semibold text-base mt-0.5">{step.title}</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground -mt-1 -mr-2 h-7"
                onClick={handleSkip}
                data-testid="button-skip-guide"
              >
                Close
              </Button>
            </div>
            
            <p className="text-muted-foreground text-xs mb-6 leading-relaxed">
              {step.description}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                {currentStep + 1} / {steps.length}
              </span>
              
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePrev}
                    className="text-xs text-muted-foreground h-8"
                    data-testid="button-prev-step"
                  >
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="text-xs h-8 font-semibold"
                  data-testid="button-next-step"
                >
                  {isLastStep ? "Get Started" : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function useQuickStartGuide(userRole: "creator" | "sponsor" | null) {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setShowGuide(false);
  }, [userRole]);

  const completeGuide = () => setShowGuide(false);
  
  const resetGuide = () => {
    setShowGuide(false);
  };

  return { showGuide, completeGuide, resetGuide };
}
