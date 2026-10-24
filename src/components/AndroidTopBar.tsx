import React from "react";
import { Role } from "../types";

interface AndroidTopBarProps {
  role: Role;
  setRole: (role: Role) => void;
  stars: number;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  role,
  setRole,
  stars,
  unreadNotifications,
  onOpenNotifications,
  onOpenProfile,
}) => {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md px-4 py-3 border-b border-border flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-base tracking-tight text-foreground">Mingree</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
          APP
        </span>
      </div>

      {/* Center: Role Switcher */}
      <div className="flex items-center bg-muted p-0.5 rounded border border-border">
        <button
          onClick={() => setRole("creator")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
            role === "creator"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Creator
        </button>
        <button
          onClick={() => setRole("sponsor")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
            role === "sponsor"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sponsor
        </button>
      </div>

      {/* Right Actions: Stars or Notifications */}
      <div className="flex items-center gap-2">
        {role === "creator" && (
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-1 bg-muted px-2 py-1 rounded cursor-pointer text-foreground border border-border"
            title="Stars Balance"
          >
            <span className="text-[11px] font-bold">{stars} Stars</span>
          </div>
        )}

        <button
          onClick={onOpenNotifications}
          className="relative px-2.5 py-1 rounded bg-muted border border-border text-[11px] font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
        >
          Alerts
          {unreadNotifications > 0 && (
            <span className="ml-1 px-1 py-0.2 rounded-full bg-foreground text-[9px] font-bold text-background inline-block">
              {unreadNotifications}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
