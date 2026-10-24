import React, { useState } from 'react';

import confetti from 'canvas-confetti';
import { Campaign, CreatorProfile } from '../../types';

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Info = __DummyIcon;
const Check = __DummyIcon;



interface CampaignDetailModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onReserveSpot: (campaign: Campaign) => void;
  isAlreadyReserved: boolean;
  profile: CreatorProfile;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  campaign,
  onClose,
  onReserveSpot,
  isAlreadyReserved,
  profile,
}) => {
  const [isReserving, setIsReserving] = useState(false);

  if (!campaign) return null;

  const isEligible = profile.followerCount >= campaign.tier.minFollowers;
  const spotsAvailable = campaign.availableSpots > 0;

  const handleReserve = () => {
    if (!isEligible || !spotsAvailable || isAlreadyReserved) return;
    setIsReserving(true);
    setTimeout(() => {
      onReserveSpot(campaign);
      setIsReserving(false);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#121215] border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header Image / Brand Banner */}
        <div className="relative p-5 pb-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            
          </button>

          <div className="flex items-center gap-3">
            <img
              src={campaign.brandLogo}
              alt={campaign.brand}
              className="w-14 h-14 rounded-2xl object-cover border border-zinc-700 shadow-md"
            />
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#FF3399]">
                {campaign.brand}
              </span>
              <h3 className="text-base font-extrabold text-white leading-tight">
                {campaign.title}
              </h3>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Category: {campaign.category}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Payout & Spot Info Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">Creator Payout</span>
              {campaign.isPromotional ? (
                <span className="text-base font-black text-amber-400 flex items-center gap-1 mt-0.5">
                  ⭐ {campaign.starReward} Stars
                </span>
              ) : (
                <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                  ₹{campaign.payAmount}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">Spots Remaining</span>
              <span className="text-base font-black text-white flex items-center gap-1 mt-0.5">
                
                {campaign.availableSpots} / {campaign.totalSpots}
              </span>
            </div>
          </div>

          {/* Countdown & Expiry Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-300">
            
            <div className="leading-tight">
              <span className="font-bold block">48 Hours Reservation Window</span>
              <span className="text-[11px] text-zinc-400">
                Once reserved, you must post and submit proof within 48h or spot is released.
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-bold text-white mb-1">Campaign Overview</h4>
            <p className="text-zinc-300 leading-relaxed">{campaign.description}</p>
          </div>

          {/* Requirements Checklist */}
          <div>
            <h4 className="font-bold text-white mb-2">Content Deliverables</h4>
            <div className="space-y-2">
              {campaign.requirements.map((req, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
                  
                  <span className="text-zinc-300 leading-tight">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          {campaign.guidelines && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="font-bold text-zinc-300 block mb-1 flex items-center gap-1">
                
                Brand Creative Guidelines
              </span>
              <p className="text-zinc-400 leading-relaxed">{campaign.guidelines}</p>
            </div>
          )}

          {/* Eligibility Check */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-[11px] block">Your Follower Tier</span>
              <span className="font-bold text-white">{profile.tier.name} ({profile.followerCount.toLocaleString()} followers)</span>
            </div>
            {isEligible ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                ✓ Eligible
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-[11px]">
                Requires {campaign.tier.minFollowers.toLocaleString()}+
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 sticky bottom-0">
          {isAlreadyReserved ? (
            <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-center flex items-center justify-center gap-2">
              
              <span>You Have Already Reserved This Spot</span>
            </div>
          ) : !spotsAvailable ? (
            <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-center">
              All Spots Filled
            </div>
          ) : !isEligible ? (
            <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 text-rose-400 font-bold text-center flex items-center justify-center gap-2">
              
              <span>Follower Count Below Requirement</span>
            </div>
          ) : (
            <button
              onClick={handleReserve}
              disabled={isReserving}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-[#FF3399]/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isReserving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Reserve Spot Now (Free)</span>
                  <span className="text-white/80 text-xs">→</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
