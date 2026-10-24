import { useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { SponsorSidebar } from "@/components/SponsorSidebar";
import { ManualCampaignPage } from "@/features/manual-campaign/ManualCampaignPage";
import { createHttpApi } from "@/features/manual-campaign/httpApi";

// "Choose creators" campaign page. Route: /sponsor/create-campaign/manual
export default function CreateCampaignManual() {
  const [, navigate] = useLocation();
  const api = useMemo(() => createHttpApi(), []);
  return (
    <div className="flex min-h-screen bg-background">
      <SponsorSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-6">
        <ManualCampaignPage
          api={api}
          onBack={() => navigate("/sponsor/create-campaign")}
          onAddMoney={() => navigate("/sponsor/wallet")}
          onCreated={() => { toast.success("Campaign launched. Creators have been notified."); navigate("/sponsor/campaigns"); }}
        />
      </main>
    </div>
  );
}
