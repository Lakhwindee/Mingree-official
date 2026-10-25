import React, { useState, useMemo } from 'react';

import { Campaign, CATEGORIES, TIERS } from '../../types';

import { Globe as Globe2, Instagram, X, Star } from 'lucide-react';



interface CampaignsListProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  userFollowers: number;
}

export const CampaignsList: React.FC<CampaignsListProps> = ({
  campaigns,
  onSelectCampaign,
  userFollowers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTierId, setSelectedTierId] = useState<number | 'all'>('all');
  const [showOnlyPromotional, setShowOnlyPromotional] = useState(false);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesSearch =
        camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.brand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || camp.category === selectedCategory;

      const matchesTier =
        selectedTierId === 'all' || camp.tier.id === selectedTierId;

      const matchesPromo = !showOnlyPromotional || camp.isPromotional;

      return matchesSearch && matchesCategory && matchesTier && matchesPromo;
    });
  }, [campaigns, searchQuery, selectedCategory, selectedTierId, showOnlyPromotional]);

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white">Browse Campaigns</h2>
        <p className="text-xs text-zinc-400">Discover brand sponsorships matching your Instagram tier</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brand, category, keywords..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3399] transition-colors"
        />
      </div>

      {/* Quick Filter Pill Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setShowOnlyPromotional(false)}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            !showOnlyPromotional
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          All Sponsorships
        </button>
        <button
          onClick={() => setShowOnlyPromotional(true)}
          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            showOnlyPromotional
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-zinc-400 hover:text-amber-400'
          }`}
        >
          
          <span>Star Campaigns ⭐</span>
        </button>
      </div>

      {/* Category Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 20-Tier Selector Strip */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-zinc-400 flex items-center gap-1 font-medium">
            
            Filter by Influencer Tier
          </span>
          {selectedTierId !== 'all' && (
            <button
              onClick={() => setSelectedTierId('all')}
              className="text-[#FF3399] text-[10px] font-semibold hover:underline cursor-pointer"
            >
              Reset Tier
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedTierId('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedTierId === 'all'
                ? 'bg-[#FF3399] text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All Tiers
          </button>
          {TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTierId(tier.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                selectedTierId === tier.id
                  ? 'bg-[#FF3399] text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {/* Note: tier.name already contains "Tier X" - never prepend "Tier " */}
              {tier.name}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Cards List */}
      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            
            <p className="text-sm font-semibold text-zinc-300">No campaigns found</p>
            <p className="text-xs text-zinc-500 mt-1">Try resetting your search or filters</p>
          </div>
        ) : (
          filteredCampaigns.map((camp) => {
            const fillRate = ((camp.totalSpots - camp.availableSpots) / camp.totalSpots) * 100;
            const isEligible = userFollowers >= camp.tier.minFollowers;

            return (
              <div
                key={camp.id}
                onClick={() => onSelectCampaign(camp)}
                className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-[#FF3399]/40 transition-all cursor-pointer shadow-md group"
              >
                {/* Brand & Payout Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={camp.brandLogo}
                      alt={camp.brand}
                      className="w-11 h-11 rounded-xl object-cover border border-zinc-700/80"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        {camp.brand}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#FF3399] transition-colors leading-snug">
                        {camp.title}
                      </h3>
                    </div>
                  </div>

                  {/* Payout Badge */}
                  <div className="text-right">
                    {camp.isPromotional ? (
                      <span className="text-sm font-extrabold text-amber-400 flex items-center gap-1 justify-end">
                        ⭐ {camp.starReward} Stars
                      </span>
                    ) : (
                      <span className="text-base font-black text-emerald-400">
                        ₹{camp.payAmount}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 block">per post</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 mt-2.5 leading-relaxed">
                  {camp.description}
                </p>

                {/* Spots Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-400 flex items-center gap-1">
                      
                      Spots Left: <strong className="text-white">{camp.availableSpots}</strong> / {camp.totalSpots}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {Math.round(fillRate)}% Filled
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        camp.availableSpots <= 3
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-[#FF3399] to-emerald-400'
                      }`}
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                      {camp.tier.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                      <Globe2 className="w-3 h-3 text-zinc-500" />
                      {camp.targetCountries[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#FF3399] font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                    <span>{isEligible ? 'View & Join' : 'Details'}</span>
                    
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
