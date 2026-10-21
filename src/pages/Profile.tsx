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
  CheckCircle2, 
  Instagram, 
  Loader2, 
  ExternalLink, 
  Users, 
  Clock, 
  ShieldCheck, 
  Camera, 
  MapPin, 
  Save, 
  Edit3, 
  Sparkles,
  LogOut,
  HelpCircle,
  X,
  Crown,
  Lock,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  Shield
} from "lucide-react";
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
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";

function getCleanErrorMessage(err: unknown, defaultMsg: string): string {
  if (err instanceof Error && err.message) {
    if (
      err.message.includes("pattern") ||
      err.message.includes("SyntaxError") ||
      err.message.includes("DOMException") ||
      err.message.includes("match the expected pattern")
    ) {
      return defaultMsg;
    }
    return err.message;
  }
  return defaultMsg;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
    initialData: () => (authUser ? (authUser as any) : undefined),
  });

  const activeUser = user || (authUser as any);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileCity, setProfileCity] = useState("");

  // Direct Instagram handle state
  const [handleInput, setHandleInput] = useState("");
  const [followersInput, setFollowersInput] = useState("1000");

  const connectHandleMutation = useMutation({
    mutationFn: (data: { username: string; followers: number }) => 
      api.updateUserInstagram(user!.id, data.username, `https://instagram.com/${data.username}`, data.followers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Instagram account connected & verified!");
      setHandleInput("");
    },
    onError: (err: Error) => {
      toast.error(getCleanErrorMessage(err, "Failed to connect Instagram handle"));
    }
  });

  useEffect(() => {
    if (activeUser) {
      setProfileName(activeUser.name || "");
      setProfileHandle(activeUser.handle ? activeUser.handle.replace(/^@+/, "") : "");
      setProfileCity(activeUser.city || "");
    }
  }, [activeUser]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('instagram_connected') === 'true') {
        const username = params.get('username');
        toast.success(username ? `Instagram @${username} connected successfully!` : "Instagram connected successfully!");
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        try {
          window.history.replaceState({}, '', '/profile');
        } catch {}
      }
      const error = params.get('error');
      if (error) {
        toast.error(`Instagram connection error: ${error.replace(/_/g, ' ')}`);
        try {
          window.history.replaceState({}, '', '/profile');
        } catch {}
      }
    } catch {}

    // Listen for cross-window message from OAuth popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "INSTAGRAM_OAUTH_SUCCESS" || event.data?.type === "OAUTH_AUTH_SUCCESS") {
        setIsConnectingInstagram(false);
        const username = event.data.username || "";
        toast.success(username ? `Instagram account @${username} connected via Meta!` : "Instagram connected successfully!");
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      } else if (event.data?.type === "INSTAGRAM_OAUTH_ERROR") {
        setIsConnectingInstagram(false);
        toast.error(event.data.error || "Instagram connection failed or was cancelled.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; handle?: string; city?: string }) => api.updateUserProfile(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile information updated!");
      setIsEditingProfile(false);
    },
    onError: (error: Error) => {
      toast.error(getCleanErrorMessage(error, "Failed to update profile"));
    },
  });

  const handleConnectInstagramOAuth = () => {
    if (!user) return;
    setIsConnectingInstagram(true);

    try {
      const isFramed = typeof window !== "undefined" && window.self !== window.top;
      const isMobile = typeof navigator !== "undefined" && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);
      const popupUrl = `/api/instagram/login?userId=${user.id}&return_to=/profile`;

      if (isMobile && !isFramed) {
        window.location.href = popupUrl;
        return;
      }

      const width = 580;
      const height = 740;
      const left = Math.floor(window.screenX + Math.max(0, (window.outerWidth - width) / 2));
      const top = Math.floor(window.screenY + Math.max(0, (window.outerHeight - height) / 2));

      let popup: Window | null = null;
      try {
        popup = window.open(
          popupUrl,
          "instagram_oauth_popup",
          `width=${width},height=${height},left=${left},top=${top}`
        );
      } catch (err) {
        console.warn("Popup launch error:", err);
        window.location.href = popupUrl;
        return;
      }

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        if (!isFramed) {
          window.location.href = popupUrl;
        } else {
          try {
            window.open(popupUrl, "_blank");
          } catch {
            window.location.href = popupUrl;
          }
        }
        return;
      }

      try {
        popup.focus();
      } catch {}

      const popupTimer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(popupTimer);
            setIsConnectingInstagram(false);
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
          }
        } catch {}
      }, 1000);

      setTimeout(() => {
        clearInterval(popupTimer);
        setIsConnectingInstagram(false);
      }, 90000);
    } catch (error: any) {
      setIsConnectingInstagram(false);
      const cleanMsg = getCleanErrorMessage(error, "Redirecting to Meta login...");
      if (
        error?.message?.includes("pattern") ||
        error?.message?.includes("SyntaxError") ||
        error?.message?.includes("DOMException") ||
        error?.message?.includes("match the expected pattern")
      ) {
        window.location.href = `/api/instagram/login?userId=${user.id}&return_to=/profile`;
        return;
      }
      toast.error(cleanMsg);
    }
  };

  const avatarMutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(user!.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile picture updated!");
    },
    onError: (error: Error) => {
      toast.error(getCleanErrorMessage(error, "Failed to update profile picture"));
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    avatarMutation.mutate(file);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    try {
      await api.disconnectInstagram(user.id);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
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
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const isInstagramLinked = !!activeUser.instagramUsername;

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />

      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">My Profile</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">Settings</span>
        </div>
        {activeUser && <NotificationDropdown userId={activeUser.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="w-full max-w-3xl mx-auto px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border space-y-4 sm:space-y-6">
          
          {/* Header Title */}
          <div className="hidden md:flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Profile</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your identity, Instagram link, and settings.</p>
            </div>
            <Link href="/support">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </Button>
            </Link>
          </div>

          {/* User Profile Card with Modern Header Banner */}
          <Card className="overflow-hidden border-border/80 shadow-xs">
            {/* Top Gradient Banner */}
            <div className="h-20 sm:h-24 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 relative">
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <CardContent className="px-4 sm:px-6 pb-5 sm:pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mt-10 sm:-mt-12 mb-4">
                {/* Avatar with Camera upload button */}
                <div className="relative group self-center sm:self-start">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-card shadow-md bg-card ring-2 ring-primary/20">
                    <AvatarImage src={user.avatar || undefined} className="object-cover" />
                    <AvatarFallback className="text-xl sm:text-2xl font-bold bg-muted text-foreground">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white shadow-md hover:scale-105 active:scale-95 transition cursor-pointer border-2 border-card"
                    disabled={avatarMutation.isPending}
                    title="Change profile picture"
                    data-testid="button-change-avatar"
                  >
                    {avatarMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
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

                {/* Edit profile info toggle button */}
                {!isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="self-center sm:self-auto text-xs h-8 gap-1.5 rounded-full px-4 shadow-xs"
                    data-testid="button-edit-profile-info"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* User Info Details */}
              <div className="text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">{user.name}</h2>
                  {user.isVerified && (
                    <Badge className="bg-blue-500 hover:bg-blue-600 gap-1 text-[11px] py-0 px-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {user.handle.startsWith("@") ? user.handle : `@${user.handle}`}
                </p>

                {/* Status Badges Row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {user.role === "creator" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Sparkles className="h-3 w-3" />
                      {user.tier || "New Creator"}
                    </span>
                  )}
                  
                  {user.followers ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <Users className="h-3 w-3" />
                      {user.followers.toLocaleString()} followers
                    </span>
                  ) : null}

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {user.city || "No city set"}
                  </span>
                </div>

                {/* Edit Form Drawer / Container */}
                {isEditingProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-muted/50 rounded-2xl border border-border/80 text-left space-y-3"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Edit Profile Information</h4>
                      <button 
                        onClick={() => setIsEditingProfile(false)} 
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <Input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Your full name"
                          className="h-9 text-sm mt-1 bg-background"
                          data-testid="input-profile-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Handle</Label>
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
                      <Label className="text-xs text-muted-foreground">City</Label>
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

                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingProfile(false)}
                        className="h-8 text-xs"
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
                        className="h-8 text-xs gap-1.5"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Changes
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instagram Account Section */}
          {user.role !== "admin" && (
            <Card className="border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <div className="rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-1 text-white shadow-xs">
                    <Instagram className="h-4 w-4" />
                  </div>
                  <span>Instagram Account</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Connect your real Instagram account to unlock brand campaigns and sponsor collaborations.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                {isInstagramLinked ? (
                  <div className="space-y-3.5">
                    {/* Clean Connected Card without re-sync button */}
                    <div className="rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0 shadow-sm">
                            <div className="rounded-2xl bg-card p-2">
                              <Instagram className="h-6 w-6 text-pink-600" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-foreground truncate">@{user.instagramUsername}</h3>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Meta Verified
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {user.instagramFollowers ? `${user.instagramFollowers.toLocaleString()} verified followers synced via Meta OAuth` : "Connected via official Meta OAuth"}
                            </p>
                          </div>
                        </div>

                        {/* Actions (Re-sync removed, clean View Profile & Disconnect) */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          {user.instagramProfileUrl ? (
                            <Button variant="outline" size="sm" asChild className="h-8.5 text-xs gap-1.5 rounded-lg bg-background">
                              <a 
                                href={user.instagramProfileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                data-testid="link-instagram-profile"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>View Profile</span>
                              </a>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" asChild className="h-8.5 text-xs gap-1.5 rounded-lg bg-background">
                              <a 
                                href={`https://instagram.com/${user.instagramUsername}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                data-testid="link-instagram-profile"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>View Profile</span>
                              </a>
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3"
                            onClick={handleDisconnect}
                            data-testid="button-disconnect-instagram"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Official Meta Verification Active Status Badge */}
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/15 p-3.5 flex items-center gap-3">
                      <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-emerald-900 dark:text-emerald-200">Official Meta Verification Active</p>
                        <p className="text-emerald-700/90 dark:text-emerald-400 mt-0.5">
                          Your Instagram account is verified via Meta Business Login OAuth and qualifies for sponsored campaigns.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Direct Instagram Handle Connection Card */}
                    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-sm">
                      <div className="flex items-start gap-3.5">
                        <div className="rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-3 text-white shadow-sm shrink-0">
                          <Instagram className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-foreground">Connect Instagram Handle Directly</h4>
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              Instant Verification
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Enter your Instagram username and follower count to instantly connect your profile and start applying for creator deals.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">Instagram Handle</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">@</span>
                            <Input
                              type="text"
                              placeholder="username"
                              value={handleInput}
                              onChange={(e) => setHandleInput(e.target.value.replace(/^@+/, ""))}
                              className="pl-7 text-xs h-9"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">Follower Count</label>
                          <Input
                            type="number"
                            placeholder="e.g. 5000"
                            value={followersInput}
                            onChange={(e) => setFollowersInput(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          onClick={() => {
                            if (!handleInput.trim()) {
                              toast.error("Please enter your Instagram handle");
                              return;
                            }
                            const followers = Number(followersInput) || 0;
                            if (followers < 500) {
                              toast.error("Minimum 500 followers required to connect an Instagram account");
                              return;
                            }
                            connectHandleMutation.mutate({ username: handleInput.trim(), followers });
                          }}
                          disabled={connectHandleMutation.isPending}
                          size="sm"
                          className="bg-pink-600 hover:bg-pink-700 text-white font-bold h-9 px-5 rounded-lg text-xs"
                        >
                          {connectHandleMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                              Save & Connect Handle
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Official Meta OAuth Connect Card (Optional Alternative) */}
                    <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-orange-500/5 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          <h5 className="text-xs font-bold text-foreground">Or Connect via Official Meta OAuth Login</h5>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">For Official Meta API Sync</span>
                      </div>
                      <Button
                        onClick={handleConnectInstagramOAuth}
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto text-xs font-bold h-8.5 px-4 rounded-lg"
                        data-testid="button-profile-connect-instagram-oauth"
                      >
                        {isConnectingInstagram ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Connecting to Meta...
                          </>
                        ) : (
                          <>
                            <Instagram className="mr-2 h-3.5 w-3.5 text-pink-600" />
                            Connect via Meta OAuth
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subscription & Account Settings */}
          <SettingsCard user={user} onNavigate={setLocation} />

        </div>
      </main>
    </div>
  );
}

function SettingsCard({ user, onNavigate }: { user: any; onNavigate: (path: string) => void }) {
  const queryClient = useQueryClient();
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

  const hasActiveSubscription = accountStatus?.subscriptionPlan && accountStatus.subscriptionPlan !== "free";
  const isCreator = user?.role === "creator";
  const canDelete = accountStatus && 
    (accountStatus.balance === 0 || !accountStatus.balance) && 
    (accountStatus.pendingWithdrawals === 0 || !accountStatus.pendingWithdrawals) && 
    (accountStatus.activeReservations === 0 || !accountStatus.activeReservations);

  return (
    <div className="space-y-4">
      {/* Subscription Card */}
      {isCreator && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span>Subscription & Membership</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <div>
                <p className="font-bold text-sm capitalize">{accountStatus?.subscriptionPlan || "Free"} Plan</p>
                {accountStatus?.subscriptionExpiresAt ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {accountStatus.autoRenew ? "Renews on" : "Expires on"}: {new Date(accountStatus.subscriptionExpiresAt).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Basic access to view campaigns</p>
                )}
              </div>
              <Link href="/subscription">
                <Button size="sm" variant={hasActiveSubscription ? "outline" : "default"} className="text-xs h-8 rounded-lg">
                  {hasActiveSubscription ? "Manage Plan" : "Upgrade to Pro"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-foreground">Session & Logout</p>
            <p className="text-xs text-muted-foreground">Sign out of your Mingree account on this device</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto text-xs h-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40 rounded-lg gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Deep Nested Privacy & Advanced Account Settings Link */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsPrivacyModalOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all text-left text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Advanced Privacy & Account Data Settings</p>
              <p className="text-[11px] text-muted-foreground">Manage profile data, Meta OAuth authorization, and account closure</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Step 1: Deep Nested Privacy Dialog */}
      <Dialog open={isPrivacyModalOpen} onOpenChange={setIsPrivacyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4.5 w-4.5 text-primary" />
              Advanced Privacy & Data Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage your personal data retention, OAuth tokens, and account status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
              <p className="font-semibold text-foreground">Data Retention & Compliance</p>
              <p className="text-muted-foreground leading-relaxed">
                Your creator earnings and payout history are stored securely for tax compliance. You can disconnect your Instagram link at any time from the main profile screen.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-red-100 dark:border-red-950 bg-red-50/40 dark:bg-red-950/20 space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                <span>Account Closure & Deletion</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Permanently deletes your creator profile, submission history, and accumulated stars.
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

      {/* Step 2: Confirmation Dialog for Creator Account Deletion */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base">
              <AlertCircle className="h-5 w-5" />
              Confirm Permanent Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-destructive/90 font-medium">
              Warning: This action cannot be undone. All creator stats and perks will be permanently lost.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {statusLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !canDelete ? (
              <div className="rounded-lg p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Account cannot be deleted right now:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-amber-700 dark:text-amber-400">
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
                {deleteAccountMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Permanently Delete Account
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
