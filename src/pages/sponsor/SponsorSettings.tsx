import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Settings = __DummyIcon;

export default function SponsorSettings() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  
  // Deep modal states
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const { data: sponsor } = useQuery({
    queryKey: ["currentSponsor"],
    queryFn: api.getCurrentSponsor,
  });

  const { data: accountStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["accountStatus"],
    queryFn: api.getAccountStatus,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      toast.success("Account deleted successfully");
      setIsDeleteModalOpen(false);
      setIsPrivacyModalOpen(false);
      logout();
      navigate("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    deleteAccountMutation.mutate();
  };

  const canDelete = accountStatus && 
    accountStatus.balance === 0 && 
    accountStatus.pendingWithdrawals === 0 && 
    accountStatus.activeCampaigns === 0;

  if (!sponsor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SponsorSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="mx-auto max-w-2xl p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
            <p className="text-muted-foreground">Manage your brand account settings, profile and preferences</p>
          </div>

          <div className="space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  
                  Account Information
                </CardTitle>
                <CardDescription>
                  Your registered business details on Mingree
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name</Label>
                  <Input
                    id="name"
                    value={sponsor.name || ""}
                    disabled
                    className="bg-muted/50"
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    
                    <Input
                      id="email"
                      value={sponsor.email || ""}
                      disabled
                      className="bg-muted/50 flex-1"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                {sponsor.companyName && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Company / Organization</Label>
                    <div className="flex items-center gap-2">
                      
                      <Input
                        id="company"
                        value={sponsor.companyName}
                        disabled
                        className="bg-muted/50 flex-1"
                        data-testid="input-company"
                      />
                    </div>
                  </div>
                )}
                {sponsor.gstNumber && (
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST Number</Label>
                    <Input
                      id="gst"
                      value={sponsor.gstNumber}
                      disabled
                      className="bg-muted/50 font-mono text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  
                  Account Security & Session
                </CardTitle>
                <CardDescription>
                  Manage active login session on this device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div>
                    <p className="font-semibold text-sm">Sign Out</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Securely log out from this browser session</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40"
                    data-testid="button-logout"
                  >
                    
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Discreet Nested Advanced Privacy Link */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all text-left text-xs"
              >
                <div className="flex items-center gap-2.5">
                  
                  <div>
                    <p className="font-medium text-foreground">Advanced Privacy & Account Data Settings</p>
                    <p className="text-[11px] text-muted-foreground">Manage data retention, regulatory compliance, and account closure</p>
                  </div>
                </div>
                
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* Step 1: Deep Nested Privacy & Data Dialog */}
      <Dialog open={isPrivacyModalOpen} onOpenChange={setIsPrivacyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              
              Advanced Privacy & Data Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure data management options and account lifecycle for your brand profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
              <p className="font-semibold text-foreground">Data Retention & Compliance</p>
              <p className="text-muted-foreground leading-relaxed">
                Mingree retains transaction invoices and creator payout records for statutory GST compliance (7 years). Active campaigns and chat logs remain securely encrypted.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-red-100 dark:border-red-950 bg-red-50/40 dark:bg-red-950/20 space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                
                <span>Account Closure & Deletion</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Permanently deletes your sponsor profile, campaigns, and API integrations. This cannot be reversed once processed.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-100/50 border-red-200 dark:border-red-900/40 mt-1"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setIsDeleteModalOpen(true);
                  setDeleteConfirmText("");
                }}
              >
                Proceed to Account Deletion Request
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsPrivacyModalOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Strict Confirmation Dialog for Account Deletion */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base">
              
              Confirm Permanent Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-destructive/90 font-medium">
              Warning: This action is irreversible and will permanently wipe your brand profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {statusLoading ? (
              <div className="flex justify-center p-4">
                
              </div>
            ) : !canDelete ? (
              <div className="rounded-lg p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Account cannot be deleted right now:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-amber-700 dark:text-amber-400">
                  {accountStatus && accountStatus.balance > 0 && (
                    <li>Withdraw your remaining wallet balance (${accountStatus.balance.toFixed(2)}) first.</li>
                  )}
                  {accountStatus && accountStatus.pendingWithdrawals > 0 && (
                    <li>You have {accountStatus.pendingWithdrawals} pending withdrawal(s) in progress.</li>
                  )}
                  {accountStatus && accountStatus.activeCampaigns > 0 && (
                    <li>You have {accountStatus.activeCampaigns} active campaign(s) running. Complete or close them first.</li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  To prevent accidental deletion, please type <span className="font-bold text-foreground font-mono">DELETE</span> below:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="font-mono text-sm"
                  data-testid="input-delete-confirm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText("");
              }}
              className="text-xs"
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending || deleteConfirmText !== "DELETE"}
                className="text-xs font-semibold"
                data-testid="button-confirm-delete-account"
              >
                Permanently Delete Account
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
