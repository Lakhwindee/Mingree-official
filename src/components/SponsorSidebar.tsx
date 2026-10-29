import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Settings = __DummyIcon;
const Help = __DummyIcon;



export function SponsorSidebar() {
  const [location, setLocation] = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { logout } = useAuth();

  const { data: sponsor } = useQuery({
    queryKey: ["currentSponsor"],
    queryFn: api.getCurrentSponsor,
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

  const mobileLinks = [
    { href: "/sponsor", label: "Dashboard" },
    { href: "/sponsor/campaigns", label: "Workspaces" },
    { href: "/sponsor/create-campaign", label: "Create" },
    { href: "/sponsor/wallet", label: "Wallet" },
  ];

  const links = [
    { href: "/sponsor", label: "Dashboard" },
    { href: "/sponsor/campaigns", label: "Workspaces" },
    { href: "/sponsor/create-campaign", label: "Create Campaign" },
    { href: "/sponsor/wallet", label: "Escrow & Payouts" },
    { href: "/sponsor/settings", label: "Settings" },
    { href: "/about", label: "About" },
    { href: "/sponsor/support", label: "Help & Support" },
  ];

  const moreLinks = [
    { href: "/sponsor/settings", label: "Settings" },
    { href: "/about", label: "About Mingree" },
    { href: "/sponsor/support", label: "Help & Support" },
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

      {/* Mobile Menubar Attached to Bottom */}
      <nav 
        aria-label="Sponsor Navigation"
        className="fixed inset-x-0 bottom-0 w-full z-50 flex items-center justify-around bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0.5rem))] md:hidden select-none"
        style={{ touchAction: "manipulation" }}
      >
        {mobileLinks.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className="flex-1 max-w-[76px]">
              <div 
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded transition-colors cursor-pointer min-h-[44px]", 
                  isActive 
                    ? "text-foreground font-semibold bg-muted" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`sponsor-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
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
              "w-full flex items-center justify-center py-2 px-1 rounded transition-colors cursor-pointer min-h-[44px]",
              showMoreMenu ? "text-foreground font-semibold bg-muted" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            data-testid="button-sponsor-mobile-more"
          >
            <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">More</span>
          </button>
        </div>

        {/* More Menu Popup Modal */}
        {showMoreMenu && (
          <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0.5rem))] right-3 left-3 max-w-sm mx-auto rounded-2xl border border-border bg-popover/98 backdrop-blur-xl p-3 shadow-xl z-50 animate-in fade-in slide-from-bottom-2 duration-150">
            <div className="px-2 py-1.5 border-b border-border/50 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Brand Navigation</span>
            </div>
            
            <div className="grid grid-cols-1 gap-1 py-1">
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
                      data-testid={`sponsor-more-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
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
              data-testid="button-sponsor-mobile-logout"
            >
              <span>Log out</span>
            </button>
          </div>
        )}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <Link href="/sponsor">
            <span className="text-xl font-bold tracking-tight text-foreground cursor-pointer">Mingree</span>
          </Link>
          {sponsor && <NotificationDropdown userId={sponsor.id} />}
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {links.map((link) => {
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-xs font-medium transition-colors hover:bg-sidebar-accent cursor-pointer",
                    isActive ? "bg-sidebar-accent text-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-4 border-t border-border">
          <div className="rounded p-3 bg-muted/40 border border-border">
            <p className="text-[11px] font-medium text-muted-foreground">Account Type</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">Brand Partner</p>
          </div>

          <Button 
            variant="ghost" 
            className="w-full justify-start text-xs text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
