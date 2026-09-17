import React from 'react';
import {
  Wallet,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';
import { Campaign, CampaignSubmission, CreatorProfile } from '../../types';

interface CreatorDashboardProps {
  profile: CreatorProfile;
  campaigns: Campaign[];
  submissions: CampaignSubmission[];
  onNavigateToCampaigns: () => void;
  onNavigateToWallet: () => void;
  onNavigateToMyTasks: () => void;
  onSelectCampaign: (campaign: Campaign) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  profile,
  campaigns,
  submissions,
  onNavigateToCampaigns,
  onNavigateToWallet,
  onNavigateToMyTasks,
  onSelectCampaign,
}) => {
  const activeReservation = submissions.find((s) => s.status === 'reserved');
  const starsToNextMilestone = 5 - (profile.stars % 5);
  const milestoneProgress = ((profile.stars % 5) / 5) * 100;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Creator Greeting & Tier Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-1.5">
            Hey, {profile.name.split(' ')[0]} 👋
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-400">@{profile.instagramUsername}</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          </div>
        </div>

        {/* Tier Badge - Note prompt rule: tier.name already contains "Tier X" */}
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] text-white text-xs font-bold shadow-md shadow-[#FF3399]/20">
            {profile.tier.name}
          </span>
          <span className="block text-[10px] text-zinc-500 mt-0.5">
            {(profile.followerCount / 1000).toFixed(1)}k Followers
          </span>
        </div>
      </div>

      {/* Main Balance & Earnings Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c1c22] via-[#16161a] to-[#121215] border border-zinc-800 p-4 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF3399]/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Available Wallet Balance</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            +₹300 this week
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black text-white tracking-tight">
              ₹{profile.walletBalance.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-zinc-400 block mt-0.5">
              Lifetime: ₹{profile.lifetimeEarnings.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            onClick={onNavigateToWallet}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#FF3399]/30 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Withdraw UPI</span>
          </button>
        </div>

        {/* Quick stats mini-row */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <span className="text-zinc-400 text-[10px] block">Star Balance</span>
              <span className="text-zinc-200 font-bold">{profile.stars} Stars</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-zinc-400 text-[10px] block">Pro Status</span>
              <span className="text-purple-300 font-bold">Active VIP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Star Rewards Milestone Card */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/5 border border-amber-500/20">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Sparkles className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Star Milestone Reward</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {starsToNextMilestone} {starsToNextMilestone === 1 ? 'star' : 'stars'} left
          </span>
        </div>

        <div className="mt-2.5 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${milestoneProgress}%` }}
          />
        </div>

        <p className="text-[11px] text-zinc-400 mt-2">
          ⭐ Reach {Math.ceil((profile.stars + 1) / 5) * 5} stars to unlock <strong className="text-amber-300">1 FREE Pro Month</strong> coupon code!
        </p>
      </div>

      {/* Active Reservation Alert (If any) */}
      {activeReservation && (
        <div className="p-3.5 rounded-xl bg-[#FF3399]/10 border border-[#FF3399]/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#FF3399] font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              Active Reservation Spot
            </span>
            <span className="text-zinc-400 text-[11px]">46h Remaining</span>
          </div>

          <p className="text-xs font-semibold text-white truncate">
            {activeReservation.campaignTitle}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-emerald-400">
              Payout: ₹{activeReservation.payAmount}
            </span>
            <button
              onClick={onNavigateToMyTasks}
              className="text-xs font-bold text-[#FF3399] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Submit Proof</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Explore Header */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-[#FF3399]" />
          Recommended Campaigns
        </h3>
        <button
          onClick={onNavigateToCampaigns}
          className="text-xs text-[#FF3399] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          <span>View All</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Campaign Cards List */}
      <div className="space-y-3">
        {campaigns.slice(0, 3).map((camp) => (
          <div
            key={camp.id}
            onClick={() => onSelectCampaign(camp)}
            className="p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-[#FF3399]/40 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-start gap-3">
              <img
                src={camp.brandLogo}
                alt={camp.brand}
                className="w-12 h-12 rounded-xl object-cover border border-zinc-700/60"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    {camp.brand}
                  </span>
                  {camp.isPromotional ? (
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-0.5">
                      ⭐ {camp.starReward} Stars
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-emerald-400">
                      ₹{camp.payAmount}
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-[#FF3399] transition-colors">
                  {camp.title}
                </h4>

                <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                    {camp.category}
                  </span>
                  <span className="text-zinc-500">
                    <strong className="text-zinc-300">{camp.availableSpots}</strong> / {camp.totalSpots} spots
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
