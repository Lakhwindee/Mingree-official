import React, { useState } from 'react';

import confetti from 'canvas-confetti';
import { CreatorProfile as ICreatorProfile, TIERS, Tier } from '../../types';

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;
const Save = __DummyIcon;
const Star = __DummyIcon;



interface CreatorProfileProps {
  profile: ICreatorProfile;
  onUpdateProfile: (updated: Partial<ICreatorProfile>) => void;
  onOpenApkModal: () => void;
}

export const CreatorProfileView: React.FC<CreatorProfileProps> = ({
  profile,
  onUpdateProfile,
  onOpenApkModal,
}) => {
  const [isEditingIg, setIsEditingIg] = useState(false);
  const [handle, setHandle] = useState(profile.instagramUsername);
  const [followers, setFollowers] = useState(profile.followerCount.toString());
  const [promoCodeClaimed, setPromoCodeClaimed] = useState(false);

  const calculateTierForFollowers = (count: number): Tier => {
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (count >= TIERS[i].minFollowers) {
        return TIERS[i];
      }
    }
    return TIERS[0];
  };

  const handleSaveInstagram = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(followers, 10) || 500;
    const newTier = calculateTierForFollowers(count);
    onUpdateProfile({
      instagramUsername: handle.replace('@', ''),
      followerCount: count,
      tier: newTier,
    });
    setIsEditingIg(false);
  };

  const handleClaimFreeProCode = () => {
    setPromoCodeClaimed(true);
    confetti({
      particleCount: 60,
      spread: 70,
    });
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Profile Header */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF3399] to-[#FF6B6B] p-0.5 shadow-lg">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt={profile.name}
            className="w-full h-full rounded-[14px] object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-white truncate">{profile.name}</h2>
            
          </div>

          <p className="text-xs text-zinc-400">{profile.email}</p>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] text-white text-[10px] font-bold">
              {profile.tier.name}
            </span>
            <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
              
              {profile.city}, {profile.country}
            </span>
          </div>
        </div>
      </div>

      {/* Instagram Verification & Tier Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/20 via-zinc-900 to-pink-950/20 border border-pink-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white">
              <Instagram className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Connected Instagram</h3>
              <span className="text-[11px] text-zinc-400">@{profile.instagramUsername}</span>
            </div>
          </div>

          <button
            onClick={() => setIsEditingIg(!isEditingIg)}
            className="text-[11px] font-semibold text-[#FF3399] hover:underline cursor-pointer"
          >
            {isEditingIg ? 'Cancel' : 'Update Stats'}
          </button>
        </div>

        {isEditingIg ? (
          <form onSubmit={handleSaveInstagram} className="space-y-2 pt-2 border-t border-zinc-800">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-0.5">Instagram Username</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-0.5">Verified Follower Count</label>
              <input
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-[#FF3399] hover:bg-[#FF3399]/90 text-white font-bold text-xs cursor-pointer shadow"
            >
              Recalculate Tier & Save
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800/60">
            <div className="p-2 rounded-xl bg-black/40 border border-zinc-800/60">
              <span className="text-zinc-500 text-[10px] block">Followers</span>
              <span className="text-white font-bold">{profile.followerCount.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-zinc-800/60">
              <span className="text-zinc-500 text-[10px] block">Base Pay Per Post</span>
              <span className="text-emerald-400 font-bold">₹{profile.tier.basePayment}</span>
            </div>
          </div>
        )}
      </div>

      {/* Gold Star Rewards Milestone Voucher */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/5 border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <div>
              <h3 className="text-xs font-bold text-white">Gold Stars Balance</h3>
              <span className="text-[11px] text-amber-300 font-bold">{profile.stars} Total Stars</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
            2 Free Months Earned
          </span>
        </div>

        <p className="text-[11px] text-zinc-300 leading-relaxed">
          You earn gold stars on promotional campaigns. Every <strong>5 Stars</strong> generates a 100% discount voucher for Mingree PRO!
        </p>

        {promoCodeClaimed ? (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-mono font-bold">PROMO: STARFREE30</span>
            <span className="text-[10px] text-emerald-300">Active Voucher</span>
          </div>
        ) : (
          <button
            onClick={handleClaimFreeProCode}
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            
            <span>Claim 1 Free Pro Month Promo Code</span>
          </button>
        )}
      </div>

      {/* Android APK Export Banner */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <h3 className="text-xs font-bold text-white">Android APK & Project Bundle</h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">v1.0.0</span>
        </div>
        <p className="text-xs text-zinc-400">
          Download the complete Android Studio project or build APK directly for testing on your phone.
        </p>
        <button
          onClick={onOpenApkModal}
          className="w-full mt-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700/60"
        >
          <span>Open APK Download Center</span>
          
        </button>
      </div>
    </div>
  );
};
