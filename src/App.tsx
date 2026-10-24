import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Toaster as SonnerToaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";

import NotFound from "@/pages/not-found";
import AboutMingree from "@/pages/AboutMingree";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import SponsorLogin from "@/pages/SponsorLogin";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import Earnings from "@/pages/Earnings";
import Profile from "@/pages/Profile";
import MyCampaigns from "@/pages/MyCampaigns";
import Offers from "@/pages/Offers";
import Groups from "@/pages/Groups";
import CategoryCampaignsPage from "@/pages/CategoryCampaigns";
import SponsorDashboard from "@/pages/sponsor/SponsorDashboard";
import SponsorCampaigns from "@/pages/sponsor/SponsorCampaigns";
import CreateCampaign from "@/pages/sponsor/CreateCampaign";
import CreateCampaignManual from "@/pages/sponsor/CreateCampaignManual";
import CreateCampaignSelect from "@/pages/sponsor/CreateCampaignSelect";
import SponsorSettings from "@/pages/sponsor/SponsorSettings";
import SponsorWallet from "@/pages/sponsor/SponsorWallet";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Support from "@/pages/Support";
import ForgotPassword from "@/pages/ForgotPassword";
import CampaignWorkspace from "@/pages/sponsor/CampaignWorkspace";
import CreatorCampaignWorkspace from "@/pages/CreatorCampaignWorkspace";
import CreatorRequests from "@/pages/CreatorRequests";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import DataDeletion from "@/pages/legal/DataDeletion";
import Refunds from "@/pages/legal/Refunds";
import Contact from "@/pages/legal/Contact";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Help = __DummyIcon;



// Root entry point that routes authenticated users directly to their dashboard
function RootEntry() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === "sponsor") {
      return <Redirect to="/sponsor" />;
    }
    if (user.role === "admin") {
      return <Redirect to="/admin/dashboard" />;
    }
    return <Redirect to="/dashboard" />;
  }

  // If not authenticated, open login directly (skip marketing pages)
  return <Login />;
}

// Protected Route wrapper for Creator
function ProtectedCreatorRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "sponsor") {
    return <Redirect to="/sponsor" />;
  }

  return <Component />;
}

// Protected Route wrapper for Sponsor
function ProtectedSponsorRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

// Guest-only Route (redirects away if already logged in)
function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    if (user.role === "sponsor") {
      return <Redirect to="/sponsor" />;
    }
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Root Entry: Auto-redirects to Dashboard if logged in, else Login */}
      <Route path="/" component={RootEntry} />
      
      {/* In-app About & Help Section (Contains previous landing page info) */}
      <Route path="/about" component={AboutMingree} />

      {/* Auth Routes */}
      <Route path="/login">
        <GuestRoute component={Login} />
      </Route>
      <Route path="/signup">
        <GuestRoute component={Signup} />
      </Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/sponsor/login" component={SponsorLogin} />
      
      {/* Creator Routes */}
      <Route path="/dashboard">
        <ProtectedCreatorRoute component={Dashboard} />
      </Route>
      <Route path="/campaigns">
        <ProtectedCreatorRoute component={Campaigns} />
      </Route>
      <Route path="/creator-requests">
        <ProtectedCreatorRoute component={CreatorRequests} />
      </Route>
      <Route path="/campaigns/:categoryId">
        <ProtectedCreatorRoute component={CategoryCampaignsPage} />
      </Route>
      <Route path="/my-campaigns">
        <ProtectedCreatorRoute component={MyCampaigns} />
      </Route>
      <Route path="/offers">
        <ProtectedCreatorRoute component={Offers} />
      </Route>
      <Route path="/groups">
        <ProtectedCreatorRoute component={Groups} />
      </Route>
      <Route path="/earnings">
        <ProtectedCreatorRoute component={Earnings} />
      </Route>
      <Route path="/profile">
        <ProtectedCreatorRoute component={Profile} />
      </Route>
      <Route path="/subscription">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/support" component={Support} />
      
      {/* Sponsor Routes */}
      <Route path="/sponsor">
        <ProtectedSponsorRoute component={SponsorDashboard} />
      </Route>
      <Route path="/sponsor/campaigns">
        <ProtectedSponsorRoute component={SponsorCampaigns} />
      </Route>
      <Route path="/sponsor/campaigns/:id/workspace">
        <ProtectedSponsorRoute component={CampaignWorkspace} />
      </Route>
      <Route path="/campaigns/:id/workspace">
        <ProtectedCreatorRoute component={CreatorCampaignWorkspace} />
      </Route>
      <Route path="/sponsor/create-campaign/fixed">
        <ProtectedSponsorRoute component={CreateCampaign} />
      </Route>
      <Route path="/sponsor/create-campaign/manual">
        <ProtectedSponsorRoute component={CreateCampaignManual} />
      </Route>
      <Route path="/sponsor/create-campaign">
        <ProtectedSponsorRoute component={CreateCampaignSelect} />
      </Route>
      <Route path="/sponsor/settings">
        <ProtectedSponsorRoute component={SponsorSettings} />
      </Route>
      <Route path="/sponsor/wallet">
        <ProtectedSponsorRoute component={SponsorWallet} />
      </Route>
      <Route path="/sponsor/support" component={Support} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <Redirect to="/login" />
      </Route>
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      {/* Legal Pages */}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/refunds" component={Refunds} />
      <Route path="/contact" component={Contact} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StoreProvider>
            <TooltipProvider>
              <Toaster />
              <SonnerToaster position="top-right" />
              {showSplash && (
                <SplashScreen
                  durationMs={1300}
                  onFinish={() => setShowSplash(false)}
                />
              )}
              <Router />
            </TooltipProvider>
          </StoreProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
