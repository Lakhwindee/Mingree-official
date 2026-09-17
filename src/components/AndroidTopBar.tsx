import React from 'react';
import { Bell, Sparkles, UserCheck, Briefcase } from 'lucide-react';
import { Role } from '../types';

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
    <div className="sticky top-0 z-40 bg-[#0A0A0B]/95 backdrop-blur-md px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3399] via-[#FF5E62] to-[#FF9966] p-0.5 flex items-center justify-center shadow-md shadow-[#FF3399]/20">
          <div className="w-full h-full bg-[#0A0A0B] rounded-[10px] flex items-center justify-center">
            <span className="text-[#FF3399] font-black text-sm tracking-tight">M</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white">Mingree</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-[#FF3399] font-semibold border border-pink-500/20">
              APP
            </span>
          </div>
        </div>
      </div>

      {/* Center: Role Switcher Pill */}
      <div className="flex items-center bg-zinc-900 p-0.5 rounded-full border border-zinc-800">
        <button
          onClick={() => setRole('creator')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
            role === 'creator'
              ? 'bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserCheck className="w-3 h-3" />
          <span>Creator</span>
        </button>
        <button
          onClick={() => setRole('sponsor')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
            role === 'sponsor'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Briefcase className="w-3 h-3" />
          <span>Sponsor</span>
        </button>
      </div>

      {/* Right Actions: Stars (Creator) or Notifications */}
      <div className="flex items-center gap-2">
        {role === 'creator' && (
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full cursor-pointer hover:bg-amber-500/20 transition-colors"
            title="Gold Stars Balance"
          >
            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-bold text-amber-300">{stars}</span>
          </div>
        )}

        <button
          onClick={onOpenNotifications}
          className="relative w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FF3399] text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
              {unreadNotifications}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
