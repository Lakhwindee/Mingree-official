import React from "react";
import { Role } from "../types";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Wallet = __DummyIcon;
const Home = __DummyIcon;



export type CreatorTab = "dashboard" | "campaigns" | "my-tasks" | "wallet" | "profile";
export type SponsorTab = "overview" | "campaigns" | "create" | "submissions" | "profile";

interface AndroidBottomNavProps {
  role: Role;
  creatorTab: CreatorTab;
  setCreatorTab: (tab: CreatorTab) => void;
  sponsorTab: SponsorTab;
  setSponsorTab: (tab: SponsorTab) => void;
  activeTasksCount: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  role,
  creatorTab,
  setCreatorTab,
  sponsorTab,
  setSponsorTab,
  activeTasksCount,
}) => {
  if (role === "creator") {
    const creatorNavItems: { id: CreatorTab; label: string; badge?: number }[] = [
      { id: "dashboard", label: "Home" },
      { id: "campaigns", label: "Campaigns" },
      {
        id: "my-tasks",
        label: "Tasks",
        badge: activeTasksCount > 0 ? activeTasksCount : undefined,
      },
      { id: "wallet", label: "Wallet" },
      { id: "profile", label: "Profile" },
    ];

    return (
      <nav className="sticky bottom-0 z-40 bg-background/98 backdrop-blur-xl border-t border-border px-2 py-2 flex items-center justify-around shadow-sm">
        {creatorNavItems.map((item) => {
          const isActive = creatorTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCreatorTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded transition-colors cursor-pointer ${
                isActive
                  ? "text-foreground font-semibold bg-muted"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs whitespace-nowrap">
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="ml-1 text-[9px] font-bold px-1 rounded-full bg-foreground text-background">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  const sponsorNavItems: { id: SponsorTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "campaigns", label: "Campaigns" },
    { id: "create", label: "New Campaign" },
    { id: "submissions", label: "Review" },
    { id: "profile", label: "Brand" },
  ];

  return (
    <nav className="sticky bottom-0 z-40 bg-background/98 backdrop-blur-xl border-t border-border px-2 py-2 flex items-center justify-around shadow-sm">
      {sponsorNavItems.map((item) => {
        const isActive = sponsorTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setSponsorTab(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded transition-colors cursor-pointer ${
              isActive
                ? "text-foreground font-semibold bg-muted"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs whitespace-nowrap">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
