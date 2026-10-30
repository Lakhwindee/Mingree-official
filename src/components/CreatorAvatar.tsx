import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface CreatorAvatarProps {
  avatarUrl?: string | null;
  username?: string;
  displayName?: string;
  size?: number;
  className?: string;
}

export function CreatorAvatar({
  avatarUrl,
  username = "",
  displayName = "",
  size = 48,
  className = "",
}: CreatorAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const cleanName = (displayName || username || "IG").trim();
  const initials = cleanName
    .replace(/^[@#]/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || cleanName.slice(0, 2).toUpperCase() || "IG";

  // Disallow fake/placeholder stock photos
  const isFakePlaceholder = avatarUrl ? avatarUrl.includes("unsplash.com") : false;

  if (avatarUrl && !imgError && !isFakePlaceholder) {
    return (
      <img
        src={avatarUrl}
        alt={`@${username || displayName}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={cn("rounded-full object-cover shrink-0 ring-1 ring-border shadow-2xs", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Use initials ONLY if avatar_url is empty or image failed to load (onError)
  const reason = !avatarUrl
    ? "No Instagram profile photo returned from Meta API"
    : isFakePlaceholder
      ? "Placeholder stock images removed"
      : "Instagram profile image failed to load";

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs select-none",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
      title={`${cleanName} (${reason})`}
      aria-label={`${cleanName} initials`}
    >
      {initials}
    </div>
  );
}

export default CreatorAvatar;
