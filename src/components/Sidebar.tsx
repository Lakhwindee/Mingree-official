import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getTierNameByFollowers } from "@shared/tiers";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user: authUser, logout } = useAuth();

  const { data: queryUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  // Use dynamic logged in user and fallback gracefully to active session
  const user = (queryUser && queryUser.id === authUser?.id && queryUser.instagramUsername && queryUser.instagramUsername !== "creator_gram")
    ? queryUser
    : (authUser || queryUser);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setLocation("/login");
    }
  };

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { 
      href: "/campaigns", 
      label: "Fixed Price Campaigns", 
      tag: "Tier"
    },
    { 
      href: "/creator-requests", 
      label: "Direct Brand Deals", 
      tag: "Direct"
    },
  ];

  const workLinks = [
    { href: "/my-campaigns", label: "My Workspaces" },
    { href: "/earnings", label: "Escrow Earnings" },
    { href: "/offers", label: "Offers & Promos" },
  ];

  const accountLinks = [
    { href: "/profile", label: "Profile & Settings" },
    { href: "/about", label: "About Platform" },
    { href: "/support", label: "Help & Support" },
  ];

  const getMobilePageTitle = (path: string) => {
    if (path.startsWith("/profile")) return "My Profile";
    if (path.startsWith("/campaigns")) return "Fixed Price Campaigns";
    if (path.startsWith("/creator-requests")) return "Direct Brand Deals";
    if (path.startsWith("/my-campaigns")) return "My Workspaces";
    if (path.startsWith("/earnings")) return "Earnings & Wallet";
    if (path.startsWith("/offers")) return "Offers & Promos";
    if (path.startsWith("/support")) return "Help & Support";
    if (path.startsWith("/about")) return "About Mingree";
    return "Dashboard";
  };

  const userFollowersCount = user?.followers || user?.instagramFollowers || 0;
  const userCalculatedTier = getTierNameByFollowers(userFollowersCount, Boolean(user?.isInstagramVerified || userFollowersCount > 0));

  return (
    <>
      {/* Mobile Top Header with Sandwich (Hamburger) Menu Button */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-3.5 border-b border-border md:hidden select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            data-testid="button-mobile-sandwich-menu"
            className="h-9 w-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
              alt="Mingree"
              className="w-6 h-6 rounded-md object-cover shrink-0 shadow-2xs"
            />
            <span className="text-sm font-bold text-foreground truncate">
              {getMobilePageTitle(location)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user && <NotificationDropdown userId={user.id} />}
        </div>
      </header>

      {/* Mobile Slide-Over Sandwich Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out Drawer */}
          <aside className="relative z-10 w-72 max-w-[82vw] h-full bg-background dark:bg-zinc-950 border-r border-border px-4 py-5 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-none overflow-y-auto">
            {/* Drawer Header */}
            <div className="mb-5 flex items-center justify-between px-1 pb-3 border-b border-border/70">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex items-center gap-2.5 cursor-pointer">
                  <img
                    src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
                    alt="Mingree Logo"
                    className="w-8 h-8 rounded-xl object-cover shadow-xs"
                  />
                  <div className="flex flex-col">
                    <span className="text-base font-extrabold tracking-tight text-foreground leading-tight">Mingree</span>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">Creator Hub</span>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="h-8 w-8 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Navigation Sections */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
              {/* Overview */}
              <div className="space-y-1">
                <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/80 tracking-wider uppercase mb-1.5">
                  Overview
                </p>
                {mainLinks.map((link) => {
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-foreground/85 hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{link.label}</span>
                        {link.tag && (
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0",
                              isActive
                                ? "bg-white/20 text-white"
                                : "text-muted-foreground bg-muted dark:bg-zinc-800"
                            )}
                          >
                            {link.tag}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Management */}
              <div className="space-y-1">
                <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/80 tracking-wider uppercase mb-1.5">
                  Management
                </p>
                {workLinks.map((link) => {
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      <div
                        className={cn(
                          "flex items-center rounded-lg px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-foreground/85 hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{link.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Account */}
              <div className="space-y-1">
                <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/80 tracking-wider uppercase mb-1.5">
                  Account
                </p>
                {accountLinks.map((link) => {
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                      <div
                        className={cn(
                          "flex items-center rounded-lg px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-foreground/85 hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{link.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer: Creator Tier & Logout */}
            <div className="mt-auto pt-4 space-y-2.5 border-t border-border/70">
              {user && (
                <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[130px]">
                      {user.instagramUsername ? `@${user.instagramUsername.replace(/^@+/, "")}` : (user.handle || user.name)}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {userCalculatedTier}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>Audience</span>
                    {user.isInstagramVerified && user.instagramUsername ? (
                      <span className="font-medium text-foreground">
                        {userFollowersCount ? `${userFollowersCount.toLocaleString()} followers` : "0 followers"}
                      </span>
                    ) : (
                      <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                        <span className="text-pink-600 dark:text-pink-400 font-semibold hover:underline cursor-pointer flex items-center gap-1">
                          + Connect IG
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="w-full flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-semibold text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                data-testid="button-mobile-logout"
              >
                <span>Log out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Pure Typographic Precision Standard) */}
      <aside className="hidden h-screen w-64 flex-col border-r border-border/80 bg-sidebar px-4 py-5 md:flex select-none">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/dashboard">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <img src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png" alt="Mingree Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-foreground leading-tight">Mingree</span>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">Creator Hub</span>
              </div>
            </div>
          </Link>
          {user && <NotificationDropdown userId={user.id} />}
        </div>

        {/* Navigation Categories */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/80 tracking-wider uppercase mb-1.5">
              Overview
            </p>
            {mainLinks.map((link) => {
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer group",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <span className="truncate">{link.label}</span>
                    {link.tag && (
                      <span className={cn(
                        "text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0",
                        isActive 
                          ? "bg-white/20 text-white" 
                          : "text-muted-foreground/90 bg-muted/80 dark:bg-zinc-800"
                      )}>
                        {link.tag}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Workspaces & Financials */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/80 tracking-wider uppercase mb-1.5">
              Management
            </p>
            {workLinks.map((link) => {
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer group",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <span className="truncate">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Account */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/80 tracking-wider uppercase mb-1.5">
              Account
            </p>
            {accountLinks.map((link) => {
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer group",
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <span className="truncate">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer: Creator Tier Card & Logout */}
        <div className="mt-auto pt-4 space-y-2 border-t border-border/70">
          {user && (
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground truncate max-w-[130px]">
                  {user.instagramUsername ? `@${user.instagramUsername.replace(/^@+/, "")}` : (user.handle || user.name)}
                </span>
                <span className="text-[11px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {userCalculatedTier}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>Audience</span>
                {user.isInstagramVerified && user.instagramUsername ? (
                  <span className="font-medium text-foreground">
                    {userFollowersCount ? `${userFollowersCount.toLocaleString()} followers` : "0 followers"}
                  </span>
                ) : (
                  <Link href="/profile">
                    <span className="text-pink-600 dark:text-pink-400 font-semibold hover:underline cursor-pointer flex items-center gap-1">
                      + Connect IG
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}

          <button 
            type="button"
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
