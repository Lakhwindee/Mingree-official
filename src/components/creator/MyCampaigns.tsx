import React, { useState } from 'react';

import confetti from 'canvas-confetti';
import { CampaignSubmission } from '../../types';

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;
const Upload = __DummyIcon;
const Info = __DummyIcon;



interface MyCampaignsProps {
  submissions: CampaignSubmission[];
  onSubmitProof: (submissionId: string, postUrl: string, screenshotUrl?: string) => void;
  onBrowseCampaigns: () => void;
}

export const MyCampaigns: React.FC<MyCampaignsProps> = ({
  submissions,
  onSubmitProof,
  onBrowseCampaigns,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'reserved' | 'submitted' | 'approved'>('all');
  const [submittingItem, setSubmittingItem] = useState<CampaignSubmission | null>(null);
  const [postUrl, setPostUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = submissions.filter((s) => {
    if (activeTab === 'all') return true;
    return s.status === activeTab;
  });

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingItem || !postUrl) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitProof(
        submittingItem.id,
        postUrl,
        'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80'
      );
      setIsSubmitting(false);
      setSubmittingItem(null);
      setPostUrl('');
      confetti({
        particleCount: 50,
        spread: 60,
      });
    }, 700);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white">My Tasks & Proofs</h2>
        <p className="text-xs text-zinc-400">Track reserved spots and submit Instagram proof links</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('reserved')}
          className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'reserved' ? 'bg-zinc-800 text-[#FF3399]' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          To Do ({submissions.filter((s) => s.status === 'reserved').length})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'submitted' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          In Review ({submissions.filter((s) => s.status === 'submitted').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'approved' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Approved ({submissions.filter((s) => s.status === 'approved').length})
        </button>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            
            <p className="text-sm font-semibold text-zinc-300">No tasks in this tab</p>
            <button
              onClick={onBrowseCampaigns}
              className="mt-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] text-white text-xs font-bold shadow cursor-pointer"
            >
              Browse Campaigns Now
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src={item.brandLogo}
                    alt={item.brand}
                    className="w-10 h-10 rounded-xl object-cover border border-zinc-700"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      {item.brand}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {item.campaignTitle}
                    </h4>
                  </div>
                </div>

                {/* Status Pill */}
                {item.status === 'reserved' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 whitespace-nowrap flex items-center gap-1">
                    
                    Reserved
                  </span>
                )}
                {item.status === 'submitted' && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 whitespace-nowrap">
                    In Review
                  </span>
                )}
                {item.status === 'approved' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 whitespace-nowrap flex items-center gap-1">
                    
                    Paid & Approved
                  </span>
                )}
              </div>

              {/* Reward & Info */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-[11px]">Reward:</span>
                  {item.starReward ? (
                    <span className="font-bold text-amber-400 flex items-center gap-0.5">
                      
                      {item.starReward} Stars
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-400">₹{item.payAmount}</span>
                  )}
                </div>

                {item.status === 'reserved' && (
                  <span className="text-[11px] text-amber-300 font-medium">
                    Deadline: 46h left
                  </span>
                )}
              </div>

              {/* Post URL info if submitted */}
              {item.postUrl && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 truncate max-w-[200px]">
                    {item.postUrl}
                  </span>
                  <a
                    href={item.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#FF3399] font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>View</span>
                    
                  </a>
                </div>
              )}

              {/* Feedback */}
              {item.feedback && (
                <p className="text-[11px] text-emerald-300/90 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                  {item.feedback}
                </p>
              )}

              {/* Action Button */}
              {item.status === 'reserved' && (
                <button
                  onClick={() => setSubmittingItem(item)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#FF3399]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  
                  <span>Submit Instagram Proof</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Submission Modal */}
      {submittingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#FF3399]" />
              Submit Instagram Reel / Post
            </h3>

            <p className="text-xs text-zinc-400">
              For campaign: <strong className="text-white">{submittingItem.campaignTitle}</strong>
            </p>

            <form onSubmit={handleSubmitProof} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Instagram Post / Reel URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.instagram.com/reel/..."
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3399]"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 text-center cursor-pointer hover:border-[#FF3399]/60 transition-colors">
                
                <span className="text-[11px] text-zinc-300 block font-medium">
                  Upload Screenshot Proof (Optional)
                </span>
                <span className="text-[9px] text-zinc-500">PNG, JPG up to 5MB</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !postUrl}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] text-white text-xs font-bold shadow-md shadow-[#FF3399]/30 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Verifying...' : 'Submit Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
