import React from 'react';

import confetti from 'canvas-confetti';
import { CampaignSubmission } from '../../types';

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;



interface SponsorSubmissionsProps {
  submissions: CampaignSubmission[];
  onApprove: (submissionId: string) => void;
  onReject: (submissionId: string) => void;
}

export const SponsorSubmissions: React.FC<SponsorSubmissionsProps> = ({
  submissions,
  onApprove,
  onReject,
}) => {
  const handleApprove = (id: string) => {
    onApprove(id);
    confetti({
      particleCount: 50,
      spread: 60,
    });
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-extrabold text-white">Review Creator Proofs</h2>
        <p className="text-xs text-zinc-400">Verify submitted Instagram content and disburse escrow payments</p>
      </div>

      <div className="space-y-3">
        {submissions.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            
            <p className="text-sm font-semibold text-zinc-300">No submissions to review</p>
            <p className="text-xs text-zinc-500 mt-1">Creator submissions will show up here once posted.</p>
          </div>
        ) : (
          submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                    {sub.brand}
                  </span>
                  <h4 className="text-xs font-bold text-white">{sub.campaignTitle}</h4>
                </div>

                {sub.status === 'submitted' ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                    Awaiting Approval
                  </span>
                ) : sub.status === 'approved' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    Approved & Disbursed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                    {sub.status}
                  </span>
                )}
              </div>

              {/* Creator & Link info */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1">
                    
                    Creator: <strong className="text-zinc-200">@aarav_vibes</strong>
                  </span>
                  <span className="text-emerald-400 font-bold">Payout: ₹{sub.payAmount}</span>
                </div>

                {sub.postUrl ? (
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                    <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                      {sub.postUrl}
                    </span>
                    <a
                      href={sub.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-bold text-[11px] flex items-center gap-1 hover:underline"
                    >
                      <span>Open Post</span>
                      
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-500 italic">No link submitted yet (Spot Reserved)</span>
                )}
              </div>

              {/* Action Buttons for Pending Submissions */}
              {sub.status === 'submitted' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onReject(sub.id)}
                    className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border border-rose-500/20"
                  >
                    
                    <span>Request Changes</span>
                  </button>
                  <button
                    onClick={() => handleApprove(sub.id)}
                    className="py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md shadow-emerald-600/20"
                  >
                    
                    <span>Approve & Pay</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
