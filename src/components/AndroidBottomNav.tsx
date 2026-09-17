import React from 'react';
import {
  LayoutDashboard,
  Compass,
  FolderCheck,
  Wallet,
  User,
  PlusCircle,
  Users,
} from 'lucide-react';
import { Role } from '../types';

export type CreatorTab = 'dashboard' | 'campaigns' | 'my-tasks' | 'wallet' | 'profile';
export type SponsorTab = 'overview' | 'campaigns' | 'create' | 'submissions' | 'profile';

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
  if (role === 'creator') {
    const creatorNavItems: { id: CreatorTab; label: string; icon: React.ReactNode; badge?: number }[] = [
      { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'campaigns', label: 'Campaigns', icon: <Compass className="w-5 h-5" /> },
      {
        id: 'my-tasks',
        label: 'My Tasks',
        icon: <FolderCheck className="w-5 h-5" />,
        badge: activeTasksCount > 0 ? activeTasksCount : undefined,
      },
      { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-5 h-5" /> },
      { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    ];

    return (
      <nav className="sticky bottom-0 z-40 bg-[#0A0A0B]/98 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {creatorNavItems.map((item) => {
          const isActive = creatorTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCreatorTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#FF3399]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-[#FF3399] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium transition-transform ${
                  isActive ? 'font-bold scale-105' : ''
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#FF3399] mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // Sponsor Bottom Nav
  const sponsorNavItems: { id: SponsorTab; label: string; icon: React.ReactNode; isCenter?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Compass className="w-5 h-5" /> },
    {
      id: 'create',
      label: 'New Campaign',
      icon: <PlusCircle className="w-6 h-6" />,
      isCenter: true,
    },
    { id: 'submissions', label: 'Review', icon: <Users className="w-5 h-5" /> },
    { id: 'profile', label: 'Brand', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="sticky bottom-0 z-40 bg-[#0A0A0B]/98 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {sponsorNavItems.map((item) => {
        const isActive = sponsorTab === item.id;
        if (item.isCenter) {
          return (
            <button
              key={item.id}
              onClick={() => setSponsorTab(item.id)}
              className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold text-zinc-300 mt-1">
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => setSponsorTab(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              isActive
                ? 'text-purple-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.icon}
            <span
              className={`text-[10px] mt-1 font-medium transition-transform ${
                isActive ? 'font-bold scale-105' : ''
              }`}
            >
              {item.label}
            </span>
            {isActive && (
              <div className="w-1 h-1 rounded-full bg-purple-400 mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
