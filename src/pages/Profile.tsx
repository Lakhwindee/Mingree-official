import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCitiesByCountry } from "@shared/cities";
import { getTierNameByFollowers, INELIGIBLE_TIER_LABEL } from "@shared/tiers";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import confetti from "canvas-confetti";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Settings = __DummyIcon;
const Instagram = __DummyIcon;
const Save = __DummyIcon;
const Info = __DummyIcon;
const Help = __DummyIcon;
const User = __DummyIcon;



function getCleanErrorMessage(err: unknown, defaultMsg: string): string {
  let msg = "";
  if (err instanceof Error && err.message) {
    msg = err.message;
  } else if (typeof err === "string") {
    msg = err;
  } else if (err && typeof err === "object" && "message" in err) {
    msg = String((err as any).message);
  }

  if (
    !msg ||
    msg.includes("pattern") ||
    msg.includes("SyntaxError") ||
    msg.includes("DOMException") ||
    msg.includes("match the expected pattern") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError")
  ) {
    return defaultMsg;
  }
  return msg;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);
  const [isHandleModalOpen, setIsHandleModalOpen] = useState(false);
  const [handleToVerify, setHandleToVerify] = useState("");
  const [isVerifyingHandle, setIsVerifyingHandle] = useState(false);

  const [lowFollowersNotice, setLowFollowersNotice] = useState<{
    open: boolean;
    username: string;
    followers: number;
    requiredMin: number;
    message: string;
  }>({
    open: false,
    username: "",
    followers: 0,
    requiredMin: 500,
    message: "",
  });

  // Rate card states
  const [reelPrice, setReelPrice] = useState("2500");
  const [storyPrice, setStoryPrice] = useState("800");

  const { data: dbUser } = useQuery({
    queryKey: ["user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/users/${user.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const activeUser = dbUser || user;

  useEffect(() => {
    if (activeUser) {
      setProfileName(activeUser.name || "");
      setProfileHandle(activeUser.handle ? activeUser.handle.replace(/^@/, "") : "");
      setProfileCity(activeUser.city || "");
      setHandleToVerify(activeUser.instagramUsername || (activeUser.handle ? activeUser.handle.replace(/^@/, "") : ""));
    }
  }, [activeUser]);

  const { data: rateCardData } = useQuery({
    queryKey: ["rateCard", user?.id],
    queryFn: () => (user?.id ? api.getRateCards(user.id) : []),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (rateCardData && rateCardData.length > 0) {
      rateCardData.forEach((c: any) => {
        if (c.deliverableType === "Instagram Reel") setReelPrice(String(c.price));
        if (c.deliverableType === "Instagram Story") setStoryPrice(String(c.price));
      });
    }
  }, [rateCardData]);

  const saveRateCardMutation = useMutation({
    mutationFn: (cards: { deliverableType: string; price: number }[]) =>
      api.saveRateCards(user!.id, cards),
    onSuccess: () => {
      toast.success("Rate card saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["rateCard", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save rate card");
    },
  });

  const handleSaveRateCard = async () => {
    if (!user) return;
    saveRateCardMutation.mutate([
      { deliverableType: "Instagram Reel", price: parseFloat(reelPrice) || 2500 },
      { deliverableType: "Instagram Story", price: parseFloat(storyPrice) || 800 },
    ]);
  };

  const refreshAccountFromServer = async (showSuccessFeedback: boolean = false) => {
    if (!user?.id) return;
    setIsConnectingInstagram(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { credentials: "include" });
      if (res.ok) {
        const freshUser = await res.json();
        if (freshUser && freshUser.id === user.id) {
          updateUser(freshUser);
          queryClient.setQueryData(["user", user.id], freshUser);
          queryClient.setQueryData(["currentUser"], freshUser);
          queryClient.invalidateQueries({ queryKey: ["user", user.id] });
          queryClient.invalidateQueries({ queryKey: ["currentUser"] });
          queryClient.invalidateQueries({ queryKey: ["creator-panel"] });
          queryClient.invalidateQueries({ queryKey: ["campaignCreators"] });

          if (freshUser.isInstagramVerified && freshUser.instagramUsername) {
            try {
              confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
            } catch {}
            if (showSuccessFeedback) {
              toast.success(`Instagram account @${freshUser.instagramUsername} verified and linked!`);
            }
          } else if (showSuccessFeedback) {
            toast.info("Instagram authorization completed. Account connection is pending server verification.");
          }
        }
      } else {
        if (showSuccessFeedback) {
          toast.error("Failed to verify connection with server.");
        }
      }
    } catch {
      if (showSuccessFeedback) {
        toast.error("Network error checking connection status with server.");
      }
    } finally {
      setIsConnectingInstagram(false);
      try {
        localStorage.removeItem("mingree_instagram_oauth_result");
      } catch {}
    }
  };

  const handleOAuthError = (errorMsg: string, usernameFromData?: string, followersFromData?: number) => {
    setIsConnectingInstagram(false);
    const lower = (errorMsg || "").toLowerCase();
    if (
      lower.includes("follower") ||
      lower.includes("minimum") ||
      lower.includes("require") ||
      lower.includes("qualify") ||
      lower.includes("tier") ||
      (typeof followersFromData === "number" && followersFromData > 0 && followersFromData < 500)
    ) {
      const matchFollowers = errorMsg.match(/only\s+([\d,]+)\s+followers/i) || errorMsg.match(/([\d,]+)\s+followers/i);
      const matchUsername = errorMsg.match(/@([a-zA-Z0-9_.]+)/);
      const count = typeof followersFromData === "number" && followersFromData > 0 
        ? followersFromData 
        : (matchFollowers ? parseInt(matchFollowers[1].replace(/,/g, ""), 10) : 0);
      const uname = usernameFromData || (matchUsername ? matchUsername[1] : (activeUser?.instagramUsername || activeUser?.handle || ""));

      setLowFollowersNotice({
        open: true,
        username: uname,
        followers: count,
        requiredMin: count < 500 ? 500 : 5000,
        message: errorMsg || `Instagram account @${uname} does not meet the follower requirement.`,
      });
    } else {
      toast.error(errorMsg || "Instagram connection failed.");
    }
  };

  useEffect(() => {
    // Check URL parameters for errors or completion
    const params = new URLSearchParams(window.location.search);
    const igErr = params.get("instagram_error");
    if (igErr) {
      handleOAuthError(decodeURIComponent(igErr));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.has("code") || params.has("error") || params.has("instagram_connected")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Cross-window listeners: only refresh account if user explicitly launched an Instagram connect flow
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("mingree_oauth_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "INSTAGRAM_OAUTH_SUCCESS") {
            refreshAccountFromServer(true);
          } else if (event.data?.type === "INSTAGRAM_OAUTH_ERROR") {
            handleOAuthError(event.data?.error || "Instagram connection failed.", event.data?.username, event.data?.followers);
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mingree_instagram_oauth_result" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.type === "INSTAGRAM_OAUTH_SUCCESS") {
            refreshAccountFromServer(true);
          } else if (parsed.type === "INSTAGRAM_OAUTH_ERROR") {
            handleOAuthError(parsed.error || "Instagram connection failed.", parsed.username, parsed.followers);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleAuthMessage = (event: MessageEvent) => {
      const trustedOrigins = ["https://mingree.com", window.location.origin];
      if (event.origin && !trustedOrigins.includes(event.origin) && !event.origin.includes("mingree.com")) return;
      if (event.data?.type === "INSTAGRAM_AUTH_SUCCESS" || event.data?.type === "INSTAGRAM_OAUTH_SUCCESS") {
        refreshAccountFromServer(true);
      } else if (event.data?.type === "INSTAGRAM_AUTH_ERROR" || event.data?.type === "INSTAGRAM_OAUTH_ERROR") {
        handleOAuthError(event.data?.error || "Instagram connection failed.", event.data?.username, event.data?.followers);
      }
    };
    window.addEventListener("message", handleAuthMessage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [user?.id, queryClient]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; handle: string; city: string }) =>
      api.updateUserProfile(user!.id, data),
    onSuccess: (updated: any) => {
      updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    },
    onError: (err: any) => {
      toast.error(getCleanErrorMessage(err, "Failed to update profile"));
    },
  });

  const safeOpenPopup = (url: string) => {
    try {
      const popup = window.open(url, "instagram_oauth_popup", "width=600,height=750");
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        const tab = window.open(url, "_blank");
        if (!tab) {
          toast.info("Redirecting to Instagram authorization...");
          window.location.href = url;
        }
      }
      return true;
    } catch {
      try {
        window.open(url, "_blank");
        return true;
      } catch {
        window.location.href = url;
        return true;
      }
    }
  };

  const handleConnectInstagramOAuth = async () => {
    if (!user) return;
    setIsConnectingInstagram(true);

    let popup: Window | null = null;
    try {
      popup = window.open("about:blank", "instagram_oauth_popup", "width=600,height=750");
    } catch {}

    try {
      let urlToOpen = "";
      try {
        const res = await fetch(`/api/instagram/auth-url?userId=${user.id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          urlToOpen = data.instagramOAuthUrl || data.authUrl;
        }
      } catch {}

      if (!urlToOpen) {
        const clientId = "3167123270152518";
        const redirectUri = window.location.origin + "/api/instagram/callback";
        const scope = "instagram_business_basic,instagram_business_manage_insights";
        urlToOpen = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
      }

      toast.info("Opening official Instagram Login authorization...");
      if (popup && !popup.closed) {
        popup.location.href = urlToOpen;
      } else {
        const newTab = window.open(urlToOpen, "_blank");
        if (!newTab) {
          window.location.href = urlToOpen;
        }
      }
    } catch (err: any) {
      console.warn("[Instagram OAuth Notice]", err);
      toast.error("Failed to launch Instagram login.");
      if (popup && !popup.closed) {
        try { popup.close(); } catch {}
      }
    } finally {
      setIsConnectingInstagram(false);
    }
  };

  const handleVerifyHandleDirectly = async (_targetHandle?: string) => {
    setIsHandleModalOpen(false);
    handleConnectInstagramOAuth();
  };

  const avatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const res = await fetch(`/api/users/${user!.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatar: avatarUrl }),
      });
      if (!res.ok) throw new Error("Failed to update avatar");
      return res.json();
    },
    onSuccess: (updated: any) => {
      updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      toast.success("Avatar updated!");
    },
    onError: (err: any) => {
      toast.error(getCleanErrorMessage(err, "Failed to update avatar"));
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        avatarMutation.mutate(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    try {
      const unlinkedUser = await api.disconnectInstagram(user.id);
      updateUser(unlinkedUser as any);
      queryClient.setQueryData(["user", user.id], unlinkedUser);
      queryClient.setQueryData(["currentUser"], unlinkedUser);
      queryClient.invalidateQueries({ queryKey: ["user", user.id] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["creator-panel"] });
      toast.success("Instagram disconnected successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect Instagram.");
    }
  };

  const availableCities = getCitiesByCountry("India");

  if (!activeUser) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading profile...
        </main>
      </div>
    );
  }

  const isInstagramLinked = !!activeUser.instagramUsername;

  // Format creator identity cleanly, avoiding internal treasury label
  const creatorDisplayName = (activeUser.name && activeUser.name !== "Mingree Platform Treasury")
    ? activeUser.name
    : (activeUser.instagramUsername ? `@${activeUser.instagramUsername}` : (activeUser.name || "Creator"));

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />

      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">My Profile</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap">Settings</span>
        </div>
        {activeUser && <NotificationDropdown userId={activeUser.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="w-full max-w-3xl mx-auto px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border space-y-5">
          
          {/* Header Title */}
          <div className="hidden md:flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Creator Profile</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your identity, verified Instagram insights, and commercial settings.</p>
            </div>
            <Link href="/support">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Help &amp; Docs
              </Button>
            </Link>
          </div>

          {/* User Profile Card */}
          <Card className="overflow-hidden border-border/80 shadow-xs">
            {/* Subtle Gradient Cover Banner */}
            <div className="h-28 sm:h-36 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-black relative overflow-hidden border-b border-border/40">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-500/15 via-purple-500/10 to-transparent pointer-events-none" />
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Creator Account</span>
              </div>
            </div>

            <CardContent className="px-4 sm:px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
                {/* Avatar with Camera Overlay Button */}
                <div className="relative group self-center sm:self-start">
                  <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl ring-4 ring-card bg-card shadow-md">
                    <AvatarImage
                      src={(user.avatar && !user.avatar.includes("unsplash.com")) ? user.avatar : undefined}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-muted text-foreground">
                      {creatorDisplayName.replace(/^@/, "").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-foreground text-background shadow-md hover:opacity-90 transition-all cursor-pointer flex items-center justify-center border-2 border-card"
                    disabled={avatarMutation.isPending}
                    title="Change profile picture"
                    data-testid="button-change-avatar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    data-testid="input-avatar-upload"
                  />
                </div>

                {/* Edit Profile Info Button */}
                {!isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="self-center sm:self-auto text-xs h-9 px-4 font-semibold gap-1.5 border-border hover:bg-muted/60 rounded-lg shadow-2xs"
                    data-testid="button-edit-profile-info"
                  >
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* User Info Details */}
              <div className="text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {creatorDisplayName}
                  </h2>
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {activeUser.instagramUsername 
                    ? `@${activeUser.instagramUsername}` 
                    : (activeUser.handle ? (activeUser.handle.startsWith("@") ? activeUser.handle : `@${activeUser.handle}`) : "Not connected")}
                </p>

                {/* Status & Identity Attributes */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1.5">
                  {/* Followers Metric */}
                  {activeUser.followers ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-muted/60 text-foreground border border-border/70">
                      <span className="tabular-nums font-bold">{activeUser.followers.toLocaleString()}</span>
                      <span className="text-muted-foreground font-normal">followers</span>
                    </div>
                  ) : null}

                  {/* Marketplace Tier Badge */}
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-muted/60 text-foreground border border-border/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{getTierNameByFollowers(activeUser.followers || 0, Boolean(activeUser.isInstagramVerified && activeUser.instagramUsername))}</span>
                  </div>

                  {/* City Indicator or Prompt */}
                  {activeUser.city ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg bg-muted/60 text-foreground border border-border/70">
                      <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{activeUser.city}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-colors cursor-pointer"
                      data-testid="button-choose-city-prompt"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Add Location</span>
                    </button>
                  )}
                </div>

                {/* Edit Form Drawer */}
                {isEditingProfile && (
                  <div className="mt-5 p-4 sm:p-5 bg-muted/30 rounded-xl border border-border text-left space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Edit Profile Information</h4>
                      <button 
                        onClick={() => setIsEditingProfile(false)} 
                        className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Creator / Display Name</Label>
                        <Input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Your display name"
                          className="h-9 text-sm mt-1 bg-background"
                          data-testid="input-profile-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Public Handle</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2 text-xs text-muted-foreground">@</span>
                          <Input
                            value={profileHandle}
                            onChange={(e) => setProfileHandle(e.target.value)}
                            placeholder="username"
                            className="h-9 text-sm pl-7 bg-background"
                            data-testid="input-profile-handle"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">City (Creator Location)</Label>
                      <div className="mt-1">
                        <Select value={profileCity} onValueChange={setProfileCity}>
                          <SelectTrigger className="h-9 text-sm bg-background" data-testid="select-profile-city">
                            <SelectValue placeholder="Select your city" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px]">
                            {availableCities.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingProfile(false)}
                        className="h-8 text-xs font-medium"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateProfileMutation.mutate({ 
                          name: profileName, 
                          handle: profileHandle,
                          city: profileCity
                        })}
                        disabled={updateProfileMutation.isPending || !profileName.trim()}
                        className="h-8 text-xs font-semibold px-4"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instagram Account Section */}
          <Card className="border-border/80 overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3.5 border-b border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold">
                      Instagram Professional Account
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span>Meta OAuth Integration</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        Verified Insights Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {isInstagramLinked ? (
                <div className="space-y-4">
                  {/* Linked Profile Card */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-12 w-12 border border-border shrink-0 shadow-2xs">
                          <AvatarImage
                            src={(activeUser.avatar && !activeUser.avatar.includes("unsplash.com")) ? activeUser.avatar : undefined}
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className="font-bold bg-muted text-foreground">
                            {activeUser.instagramUsername ? activeUser.instagramUsername.charAt(0).toUpperCase() : "IG"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-base text-foreground truncate">
                              @{activeUser.instagramUsername}
                            </h3>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white text-[10px]" title="Verified Creator">
                              ✓
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <span>Professional Creator Account</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Connected</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: resync button completely removed when connected as requested */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold rounded-lg border-border hover:bg-muted shadow-2xs">
                          <a 
                            href={activeUser.instagramProfileUrl || `https://instagram.com/${activeUser.instagramUsername}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            data-testid="link-instagram-profile"
                            className="inline-flex items-center gap-1.5"
                          >
                            <span>View on Instagram</span>
                            <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg px-2.5"
                          onClick={handleDisconnect}
                          data-testid="button-disconnect-instagram"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>

                    {/* Verified Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
                      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                        <span className="text-[11px] text-muted-foreground block font-medium">Followers</span>
                        <span className="text-lg font-bold text-foreground mt-0.5 block tabular-nums">
                          {typeof activeUser.instagramFollowers === "number" && activeUser.instagramFollowers > 0
                            ? activeUser.instagramFollowers.toLocaleString()
                            : (typeof activeUser.followers === "number" && activeUser.followers > 0
                                ? activeUser.followers.toLocaleString()
                                : "—")}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Audience count</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                        <span className="text-[11px] text-muted-foreground block font-medium">30-Day Reach</span>
                        <span className="text-lg font-bold text-foreground mt-0.5 block tabular-nums">
                          {typeof activeUser.reach === "number" && activeUser.reach > 0
                            ? activeUser.reach.toLocaleString()
                            : "—"}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">Verified Insights</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                        <span className="text-[11px] text-muted-foreground block font-medium">Median Reel Views</span>
                        <span className="text-lg font-bold text-foreground mt-0.5 block tabular-nums">
                          {typeof activeUser.medianViews === "number" && activeUser.medianViews > 0
                            ? activeUser.medianViews.toLocaleString()
                            : "—"}
                        </span>
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5 block">Past 10 reels</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                        <span className="text-[11px] text-muted-foreground block font-medium">Creator Tier</span>
                        <span className="text-lg font-bold text-foreground mt-0.5 block tabular-nums">
                          {getTierNameByFollowers(activeUser.followers || activeUser.instagramFollowers || 0, true)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">Marketplace rank</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 pt-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] shrink-0">✓</span>
                    <span>Audience reach and engagement metrics sync automatically with Meta for brand campaigns.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Unlinked State - Professional Creator Authorization Banner */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        Connect Instagram Creator Account
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                        Link your official Instagram Creator or Business profile to verify your audience metrics, unlock paid brand sponsorships, and showcase verified 30-day reach to music labels.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-muted-foreground pt-1">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                        <span>Verified Creator badge across Mingree marketplace</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                        <span>Live 30-day reach &amp; median reel view rate synced</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                        <span>Secure connection via official instagram.com login</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
                      <Button
                        onClick={handleConnectInstagramOAuth}
                        disabled={isConnectingInstagram}
                        size="default"
                        className="h-10 px-6 rounded-lg text-xs font-semibold text-white shadow-sm bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 cursor-pointer flex items-center gap-2"
                        data-testid="button-profile-connect-instagram-oauth"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <span>{isConnectingInstagram ? "Opening Instagram..." : "Connect with Instagram"}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setIsHandleModalOpen(true)}
                        className="h-10 px-4 rounded-lg text-xs font-medium border-border hover:bg-muted"
                      >
                        Verify via Handle
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Direct Deals Rate Card Section */}
          {user.role !== "admin" && (
            <Card className="border-border/80 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Direct Brand Deals &amp; Rate Card</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure custom commercial pricing for sponsored Reels, Stories, and Collab packages for brands.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setLocation("/creator-requests")} 
                  size="sm"
                  className="text-xs font-semibold shrink-0 self-start sm:self-center h-8 px-4"
                >
                  Manage Rate Card
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Settings */}
          <SettingsCard user={user} onNavigate={setLocation} />

        </div>
      </main>

      {/* Verify Instagram Profile Dialog */}
      <Dialog open={isHandleModalOpen} onOpenChange={setIsHandleModalOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card border-border shadow-xl">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm mb-1">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">Verify Instagram Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Link your Instagram creator handle to sync your audience metrics, 30-day reach, and median reel views on Mingree.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyHandleDirectly(handleToVerify);
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Instagram Handle</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">@</span>
                <Input
                  value={handleToVerify}
                  onChange={(e) => setHandleToVerify(e.target.value.replace(/^@+/, ""))}
                  placeholder="your_instagram_handle"
                  className="pl-7 h-10 text-sm bg-background border-border"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter your public handle without the @ symbol. Reach benchmarks and follower counts will be synced.
              </p>
            </div>

            <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHandleModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isVerifyingHandle || !handleToVerify.trim()}
                className="h-9 text-xs font-semibold bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 text-white"
              >
                {isVerifyingHandle ? "Verifying..." : "Verify & Connect Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Low Followers / Tier Requirement Notice Dialog */}
      <Dialog open={lowFollowersNotice.open} onOpenChange={(open) => setLowFollowersNotice(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md p-6 bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-3 text-center sm:text-left">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-2xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Follower Requirement Notice
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {lowFollowersNotice.username ? `@${lowFollowersNotice.username}` : "Instagram Creator Profile"} • Minimum Threshold Requirement
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Follower progress box */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Verified Audience Count</span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                  {lowFollowersNotice.followers.toLocaleString()} / {lowFollowersNotice.requiredMin.toLocaleString()}
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border/60">
                <div
                  className="bg-gradient-to-r from-amber-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(6, Math.round((lowFollowersNotice.followers / lowFollowersNotice.requiredMin) * 100)))}%`
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {lowFollowersNotice.followers < 500 ? (
                  <>
                    Aapke Instagram account par abhi <strong className="text-foreground font-semibold">{lowFollowersNotice.followers.toLocaleString()} followers</strong> hain. Mingree par account connect karne ke liye minimum <strong className="text-foreground font-semibold">500 followers</strong> ki zaroorat hai.
                  </>
                ) : (
                  <>
                    Aapke Instagram account par <strong className="text-foreground font-semibold">{lowFollowersNotice.followers.toLocaleString()} followers</strong> hain. Paid Nano tier brand campaigns ke liye minimum <strong className="text-foreground font-semibold">5,000 followers</strong> required hain.
                  </>
                )}
              </p>
            </div>

            {/* Platform Guidelines Box */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 text-xs">
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                Platform Rules & Requirements:
              </p>
              <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">✓</span>
                  <span>Minimum <strong>500 authentic followers</strong> required to connect your Instagram profile.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">✓</span>
                  <span>Account must be <strong>Public</strong> and set to Professional Creator or Business mode.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">✓</span>
                  <span><strong>5,000+ followers</strong> unlocks official Nano Creator Tier brand deal campaigns!</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLowFollowersNotice(prev => ({ ...prev, open: false }))}
              className="w-full sm:w-auto text-xs h-9"
              data-testid="button-close-low-followers-modal"
            >
              Samajh Gaya / Got It
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setLowFollowersNotice(prev => ({ ...prev, open: false }));
                setLocation("/campaigns");
              }}
              className="w-full sm:w-auto text-xs h-9 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-semibold"
              data-testid="button-view-tiers-low-followers-modal"
            >
              View Creator Tiers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsCard({ user, onNavigate }: { user: any; onNavigate: (path: string) => void }) {
  const { logout } = useAuth();
  
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
      onNavigate("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      onNavigate("/login");
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
    (accountStatus.balance === 0 || !accountStatus.balance) && 
    (accountStatus.pendingWithdrawals === 0 || !accountStatus.pendingWithdrawals) && 
    (accountStatus.activeReservations === 0 || !accountStatus.activeReservations);

  return (
    <div className="space-y-4">
      {/* Account Actions */}
      <Card className="border-border/80 shadow-2xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-foreground">Session &amp; Logout</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sign out of your Mingree creator account on this device</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto text-xs font-semibold h-9 px-4 text-destructive hover:bg-destructive/10 rounded-lg border-border"
            data-testid="button-logout"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Privacy & Account Settings */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setIsPrivacyModalOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left text-xs shadow-2xs group cursor-pointer"
        >
          <div>
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Advanced Privacy &amp; Account Data Settings</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Manage profile data retention, Meta OAuth permissions, and account closure</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground px-2 py-1 rounded-md bg-muted/60 transition-colors">Manage ↗</span>
        </button>
      </div>

      {/* Step 1: Privacy Dialog */}
      <Dialog open={isPrivacyModalOpen} onOpenChange={setIsPrivacyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Advanced Privacy & Data Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage your personal data retention, OAuth tokens, and account status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded bg-muted/40 border space-y-1.5">
              <p className="font-semibold text-foreground">Data Retention & Compliance</p>
              <p className="text-muted-foreground leading-relaxed">
                Your creator earnings and payout history are stored securely for tax compliance. You can disconnect your Instagram link at any time from the main profile screen.
              </p>
            </div>

            <div className="p-3 rounded border border-destructive/20 bg-destructive/5 space-y-2">
              <div className="text-destructive font-semibold">
                Account Closure & Deletion
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Permanently deletes your creator profile, submission history, and accumulated balance.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-destructive hover:bg-destructive/10 mt-1"
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

      {/* Step 2: Confirmation Dialog for Creator Account Deletion */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive text-base font-bold">
              Confirm Permanent Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-destructive/90 font-medium">
              Warning: This action cannot be undone. All creator stats and perks will be permanently lost.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {statusLoading ? (
              <div className="flex justify-center p-4 text-xs text-muted-foreground">
                Checking account eligibility...
              </div>
            ) : !canDelete ? (
              <div className="rounded p-3.5 bg-muted border border-border text-xs space-y-2">
                <p className="font-semibold text-foreground">
                  Account cannot be deleted right now:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {accountStatus && accountStatus.balance > 0 && (
                    <li>Withdraw your remaining wallet balance of ₹{accountStatus.balance} first.</li>
                  )}
                  {accountStatus && accountStatus.pendingWithdrawals > 0 && (
                    <li>You have {accountStatus.pendingWithdrawals} pending withdrawal(s) in progress.</li>
                  )}
                  {accountStatus && accountStatus.activeReservations > 0 && (
                    <li>You have {accountStatus.activeReservations} active campaign reservation(s). Complete or let them expire first.</li>
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
                {deleteAccountMutation.isPending ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
