import { Handshake, Home, LayoutDashboard, Settings, Wallet, LayoutList, Users, Crown, LogOut, MoreHorizontal, User, HelpCircle, Gift, Info, Shield } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import mingreeLogo from "@assets/generated_images/mingree_mg_circular_logo.png";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setLocation("/login");
    }
  };

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/campaigns", label: "Campaigns", icon: Handshake },
    { href: "/my-campaigns", label: "My Campaigns", icon: LayoutList },
    { href: "/offers", label: "Offers", icon: Gift },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/earnings", label: "Earnings", icon: Wallet },
    { href: "/subscription", label: "Subscription", icon: Crown },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/about", label: "About Mingree", icon: Info },
    { href: "/support", label: "Help & Support", icon: HelpCircle },
  ];

  const mobileLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/campaigns", label: "Campaigns", icon: Handshake },
    { href: "/my-campaigns", label: "My Campaigns", icon: LayoutList },
    { href: "/earnings", label: "Earnings", icon: Wallet },
  ];

  const moreLinks = [
    { href: "/offers", label: "Offers", icon: Gift },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/subscription", label: "Subscription", icon: Crown },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/about", label: "About Mingree", icon: Info },
    { href: "/support", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop for More Menu */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar Attached to Bottom */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 w-full z-50 flex items-center justify-around bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/80 dark:border-zinc-800/80 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0.5rem))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)] md:hidden select-none"
        style={{ touchAction: "manipulation" }}
      >
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className="flex-1 max-w-[76px]">
              <div 
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer min-h-[44px]", 
                  isActive 
                    ? "text-primary font-semibold bg-primary/10 dark:bg-primary/20" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-105")} />
                <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">{link.label}</span>
              </div>
            </Link>
          );
        })}
        
        <div className="flex-1 max-w-[76px] flex justify-center">
          <button 
            type="button"
            className={cn(
              "w-full flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer min-h-[44px]",
              showMoreMenu 
                ? "text-primary font-semibold bg-primary/10 dark:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            data-testid="button-mobile-more"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">More</span>
          </button>
        </div>

        {/* More Menu Popup Modal positioned nicely above attached bottom bar */}
        {showMoreMenu && (
          <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0.5rem))] right-2 left-2 max-w-sm mx-auto rounded-3xl border border-border/80 dark:border-zinc-800 bg-popover/98 dark:bg-zinc-950/98 backdrop-blur-2xl p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="px-3 py-1.5 border-b border-border/50 mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">More Menu</span>
              {user?.tier && <span className="text-[11px] text-muted-foreground font-medium">{user.tier} Tier</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-1">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <div 
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-medium cursor-pointer transition-colors",
                        isActive ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted active:bg-muted"
                      )}
                      onClick={() => setShowMoreMenu(false)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="my-1.5 border-t border-border/50" />
            <button 
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-2xl p-2 text-xs font-medium text-red-500 cursor-pointer hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
              onClick={() => {
                setShowMoreMenu(false);
                handleLogout();
              }}
              data-testid="button-mobile-logout"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r bg-sidebar px-4 py-6 md:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <img src={mingreeLogo} alt="Mingree" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-xl font-bold tracking-tight">Mingree</span>
          </div>
          {user && <NotificationDropdown userId={user.id} />}
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent cursor-pointer",
                    isActive ? "bg-sidebar-accent text-primary shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          {user && user.role === "creator" && user.instagramUsername && user.tier && (
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:from-indigo-950/50 dark:to-purple-950/50">
              <p className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Your Tier</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">Creator</span>
                <span className="text-xs text-indigo-600/80 dark:text-indigo-400/80">{user.tier}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
                <div className="h-full bg-insta-gradient" style={{ width: `${Math.min((user.followers / 100000) * 100, 100)}%` }} />
              </div>
            </div>
          )}

          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
