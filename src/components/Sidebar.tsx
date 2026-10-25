import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Settings = __DummyIcon;
const Home = __DummyIcon;
const Menu = __DummyIcon;
const Help = __DummyIcon;



export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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

  const mobileLinks = [
    { href: "/dashboard", label: "Home" },
    { href: "/campaigns", label: "Fixed Ads" },
    { href: "/creator-requests", label: "Direct Deals" },
    { href: "/my-campaigns", label: "Workspaces" },
  ];

  const moreLinks = [
    { href: "/earnings", label: "Escrow Earnings" },
    { href: "/offers", label: "Offers & Promos" },
    { href: "/profile", label: "Profile" },
    { href: "/about", label: "About Mingree" },
    { href: "/support", label: "Help & Support" },
  ];

  return (
    <>
      {/* Mobile Backdrop for More Menu */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 w-full z-50 flex items-center justify-around bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/80 px-2 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0.6rem))] shadow-sm md:hidden select-none"
        style={{ touchAction: "manipulation" }}
      >
        {mobileLinks.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className="flex-1 max-w-[76px]">
              <div 
                className={cn(
                  "flex items-center justify-center py-2 px-1 rounded-lg transition-all duration-150 cursor-pointer min-h-[44px]", 
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">{link.label}</span>
              </div>
            </Link>
          );
        })}
        
        <div className="flex-1 max-w-[76px] flex justify-center">
          <button 
            type="button"
            className={cn(
              "w-full flex items-center justify-center py-2 px-1 rounded-lg transition-all duration-150 cursor-pointer min-h-[44px]",
              showMoreMenu ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            data-testid="button-mobile-more"
          >
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">More</span>
          </button>
        </div>

        {/* More Menu Popup Modal */}
        {showMoreMenu && (
          <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0.5rem))] right-3 left-3 max-w-sm mx-auto rounded-2xl border border-border bg-popover/98 backdrop-blur-xl p-3 shadow-xl z-50 animate-in fade-in slide-from-bottom-2 duration-150">
            <div className="px-2 py-1.5 border-b border-border/50 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Navigation</span>
              {user?.tier && <span className="text-[11px] text-foreground font-medium">{user.tier} Tier</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-1 py-1">
              {moreLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <div 
                      className={cn(
                        "flex items-center rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors",
                        isActive ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                      )}
                      onClick={() => setShowMoreMenu(false)}
                    >
                      <span className="truncate">{link.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="my-1.5 border-t border-border/50" />
            <button 
              type="button"
              className="w-full flex items-center justify-center rounded-lg p-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => {
                setShowMoreMenu(false);
                handleLogout();
              }}
              data-testid="button-mobile-logout"
            >
              <span>Log out</span>
            </button>
          </div>
        )}
      </nav>

      {/* Desktop Sidebar (Pure Typographic Precision Standard) */}
      <aside className="hidden h-screen w-64 flex-col border-r border-border/80 bg-sidebar px-4 py-5 md:flex select-none">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/dashboard">
            <div className="flex flex-col cursor-pointer group">
              <span className="text-base font-bold tracking-tight text-foreground leading-tight">Mingree</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Creator Network</span>
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
          {user && (user.role === "creator" || !user.role) && (
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground truncate max-w-[130px]">
                  {user.instagramUsername ? `@${user.instagramUsername.replace(/^@+/, "")}` : (user.handle || user.name)}
                </span>
                <span className="text-[11px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {user.tier || "Micro"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>Audience</span>
                <span className="font-medium text-foreground">
                  {(user.followers || user.instagramFollowers || 8889).toLocaleString()} followers
                </span>
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
