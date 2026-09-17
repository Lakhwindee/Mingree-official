import React, { useState } from 'react';
import { PlusCircle, Sparkles, X, Check, Calculator } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Campaign, CATEGORIES, TIERS } from '../../types';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCampaign: (campaign: Campaign) => void;
  brandName: string;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreateCampaign,
  brandName,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]); // Fashion
  const [selectedTierId, setSelectedTierId] = useState(6); // Tier 6 default
  const [spots, setSpots] = useState('15');
  const [description, setDescription] = useState('');
  const [guidelines, setGuidelines] = useState('');

  if (!isOpen) return null;

  const currentTier = TIERS.find((t) => t.id === selectedTierId) || TIERS[5];
  const numSpots = parseInt(spots, 10) || 1;
  const creatorBudget = currentTier.basePayment * numSpots;
  const platformFee = Math.round(creatorBudget * 0.10); // 10% platform fee rule
  const totalCost = creatorBudget + platformFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      title,
      brand: brandName,
      brandLogo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150&auto=format&fit=crop&q=80',
      category,
      description,
      targetCountries: ['India'],
      deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      totalSpots: numSpots,
      availableSpots: numSpots,
      tier: currentTier,
      payAmount: currentTier.basePayment,
      status: 'active',
      requirements: [
        'Must tag brand account in Instagram post/reel',
        'Use required campaign hashtags in caption',
        'Post must remain public for at least 7 days'
      ],
      guidelines: guidelines || 'High quality visuals, good lighting, authentic review format.',
      sponsorName: brandName,
      createdAt: new Date().toISOString()
    };

    onCreateCampaign(newCampaign);
    confetti({
      particleCount: 70,
      spread: 60,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create Brand Campaign</h3>
              <span className="text-[11px] text-zinc-400">Launch influencer sponsorship campaign</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
              Campaign Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Skincare Routine Reel Challenge"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Total Spots *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={spots}
                onChange={(e) => setSpots(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Influencer Tier Selection */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
              Target Creator Tier *
            </label>
            <select
              value={selectedTierId}
              onChange={(e) => setSelectedTierId(parseInt(e.target.value, 10))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
            >
              {TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} ({tier.minFollowers.toLocaleString()} - {tier.maxFollowers.toLocaleString()} followers) - ₹{tier.basePayment}/creator
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
              Campaign Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain product details, what the creator needs to show in video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
              Creative Guidelines
            </label>
            <input
              type="text"
              placeholder="e.g. Natural lighting, tag @brand, no competitors"
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Budget Calculation Summary */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Creator Payouts ({numSpots} × ₹{currentTier.basePayment}):</span>
              <span className="text-white font-semibold">₹{creatorBudget}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Platform Escrow Fee (10%):</span>
              <span className="text-purple-300 font-semibold">+₹{platformFee}</span>
            </div>
            <div className="pt-1 border-t border-purple-500/20 flex items-center justify-between font-bold text-white">
              <span>Total Campaign Budget:</span>
              <span className="text-emerald-400 text-sm">₹{totalCost}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              Launch Campaign Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
