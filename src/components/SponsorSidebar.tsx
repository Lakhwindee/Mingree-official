import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function SponsorSidebar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const links = [
    { href: "/sponsor", label: "Dashboard" },
    { href: "/sponsor/campaigns", label: "Workspaces" },
    { href: "/sponsor/create-campaign", label: "Create Campaign" },
    { href: "/sponsor/wallet", label: "Escrow & Payouts" },
    { href: "/sponsor/settings", label: "Settings" },
    { href: "/about", label: "About" },
    { href: "/sponsor/support", label: "Help & Support" },
  ];

  const getMobilePageTitle = (path: string) => {
    if (path.startsWith("/sponsor/create-campaign")) return "Create Campaign";
    if (path.startsWith("/sponsor/campaigns")) return "Workspaces";
    if (path.startsWith("/sponsor/wallet")) return "Escrow & Payouts";
    if (path.startsWith("/sponsor/settings")) return "Brand Settings";
    if (path.startsWith("/sponsor/support")) return "Help & Support";
    if (path.startsWith("/about")) return "About Mingree";
    return "Brand Dashboard";
  };

  return (
    <>
      {/* Mobile Top Header with Sandwich (Hamburger) Menu Button */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md px-3.5 border-b border-border md:hidden select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open brand navigation menu"
            data-testid="button-sponsor-sandwich-menu"
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
          {sponsor && <NotificationDropdown userId={sponsor.id} />}
        </div>
      </header>

      {/* Mobile Slide-Over Sandwich Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="relative z-10 w-72 max-w-[82vw] h-full bg-background dark:bg-zinc-950 border-r border-border px-4 py-5 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-none overflow-y-auto">
            <div className="mb-5 flex items-center justify-between px-1 pb-3 border-b border-border/70">
              <Link href="/sponsor" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex items-center gap-2.5 cursor-pointer">
                  <img
                    src="/assets/aistudio/Glossy_Mingree_Ribbon_App_Icon_847ced8d.png"
                    alt="Mingree Logo"
                    className="w-8 h-8 rounded-xl object-cover shadow-xs"
                  />
                  <div className="flex flex-col">
                    <span className="text-base font-extrabold tracking-tight text-foreground leading-tight">Mingree</span>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">Brand Portal</span>
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

            <nav className="flex flex-1 flex-col gap-1.5">
              {links.map((link) => {
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
                      data-testid={`sponsor-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2.5 pt-4 border-t border-border/70">
              <div className="rounded-xl p-3 bg-card border border-border/80 shadow-2xs">
                <p className="text-[11px] font-medium text-muted-foreground">Account Type</p>
                <p className="text-xs font-bold text-foreground mt-0.5 truncate">
                  {sponsor?.companyName || sponsor?.name || "Brand Partner"}
                </p>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-semibold text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                data-testid="button-sponsor-mobile-logout"
              >
                <span>Log out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

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
