import { Home, LayoutList, PlusCircle, Settings, Building2, LogOut, Wallet, HelpCircle, Info, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import mingreeLogo from "@assets/generated_images/mingree_mg_circular_logo.png";
import { useAuth } from "@/lib/auth-context";

export function SponsorSidebar() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
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
    { href: "/sponsor", label: "Dashboard", icon: Home },
    { href: "/sponsor/campaigns", label: "My Listings", icon: LayoutList },
    { href: "/sponsor/create-campaign", label: "Create Campaign", icon: PlusCircle },
    { href: "/sponsor/wallet", label: "Wallet", icon: Wallet },
    { href: "/sponsor/settings", label: "Settings", icon: Settings },
    { href: "/about", label: "About Mingree", icon: Info },
    { href: "/support", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Menubar Attached to Bottom */}
      <nav 
        aria-label="Sponsor Navigation"
        className="fixed inset-x-0 bottom-0 w-full z-50 flex items-center justify-around bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/80 dark:border-zinc-800/80 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0.5rem))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)] md:hidden select-none"
        style={{ touchAction: "manipulation" }}
      >
        {links.slice(0, 5).map((link) => {
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
                data-testid={`sponsor-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-105")} />
                <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r bg-sidebar px-4 py-6 md:flex">
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <img src={mingreeLogo} alt="Mingree" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-xl font-bold tracking-tight">Mingree</span>
          </div>
          {sponsor && <NotificationDropdown userId={sponsor.id} />}
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
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:from-indigo-950/50 dark:to-purple-950/50">
            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Account Type</p>
            <div className="mt-1">
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">Brand Partner</span>
            </div>
          </div>

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
