import React from 'react';
import {
  Briefcase,
  Users,
  TrendingUp,
  PlusCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Campaign, CampaignSubmission, SponsorProfile } from '../../types';

interface SponsorDashboardProps {
  sponsor: SponsorProfile;
  campaigns: Campaign[];
  submissions: CampaignSubmission[];
  onNavigateToCreate: () => void;
  onNavigateToSubmissions: () => void;
  onNavigateToCampaigns: () => void;
}

export const SponsorDashboard: React.FC<SponsorDashboardProps> = ({
  sponsor,
  campaigns,
  submissions,
  onNavigateToCreate,
  onNavigateToSubmissions,
  onNavigateToCampaigns,
}) => {
  const pendingSubmissions = submissions.filter((s) => s.status === 'submitted');
  const myCampaigns = campaigns.filter((c) => c.sponsorName === sponsor.companyName || c.brand === 'GlowAura');

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Brand Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
            Brand Portal
          </span>
          <h2 className="text-xl font-black text-white">{sponsor.companyName}</h2>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
            <span>{sponsor.name}</span>
            <span>•</span>
            <span className="text-zinc-500 font-mono text-[10px]">GSTIN: {sponsor.gstNumber}</span>
          </div>
        </div>

        <button
          onClick={onNavigateToCreate}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Main Budget & Metrics Grid (SPONSOR ONLY STATS) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a1429] via-[#151221] to-[#12101a] border border-purple-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Sponsor Escrow Wallet</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Secured Escrow
          </span>
        </div>

        <div>
          <span className="text-3xl font-black text-white tracking-tight">
            ₹{sponsor.walletBalance.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-zinc-400 block mt-0.5">
            Total Disbursed: ₹{sponsor.totalBudgetSpent.toLocaleString('en-IN')}
          </span>
        </div>

        {/* 3 Metrics: Active Campaigns, Creators Reached, Fill Rate */}
        <div className="pt-3 border-t border-purple-500/20 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/30">
            <span className="text-zinc-400 text-[10px] block">Live Campaigns</span>
            <span className="text-base font-extrabold text-white mt-0.5 block">
              {sponsor.activeCampaignsCount}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/30">
            <span className="text-zinc-400 text-[10px] block">Creators Reached</span>
            <span className="text-base font-extrabold text-white mt-0.5 block">
              {sponsor.creatorsReached}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-800/30">
            <span className="text-zinc-400 text-[10px] block">Avg Fill Rate</span>
            <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
              88%
            </span>
          </div>
        </div>
      </div>

      {/* Submissions Requiring Brand Approval Alert */}
      {pendingSubmissions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-300">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {pendingSubmissions.length} Content Submissions Pending
              </h4>
              <p className="text-[10px] text-zinc-400">Review creator Instagram links & release payouts</p>
            </div>
          </div>

          <button
            onClick={onNavigateToSubmissions}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow cursor-pointer"
          >
            Review
          </button>
        </div>
      )}

      {/* Active Brand Campaigns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-purple-400" />
            Your Live Campaigns
          </h3>
          <button
            onClick={onNavigateToCampaigns}
            className="text-xs text-purple-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>All Campaigns</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {campaigns.slice(0, 2).map((camp) => (
            <div
              key={camp.id}
              className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                    {camp.category}
                  </span>
                  <h4 className="text-xs font-bold text-white">{camp.title}</h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {camp.tier.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Spots: <strong className="text-white">{camp.availableSpots}</strong> left of {camp.totalSpots}</span>
                <span className="text-emerald-400 font-bold">₹{camp.payAmount} / creator</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
