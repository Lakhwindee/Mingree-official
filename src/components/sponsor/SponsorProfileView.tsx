import React, { useState } from 'react';

import confetti from 'canvas-confetti';
import { SponsorProfile } from '../../types';

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Wallet = __DummyIcon;



interface SponsorProfileViewProps {
  sponsor: SponsorProfile;
  onAddFunds: (baseAmount: number) => void;
  onOpenApkModal: () => void;
}

export const SponsorProfileView: React.FC<SponsorProfileViewProps> = ({
  sponsor,
  onAddFunds,
  onOpenApkModal,
}) => {
  const [depositAmount, setDepositAmount] = useState('10000');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  const numDeposit = parseFloat(depositAmount) || 0;
  const gstAmount = Math.round(numDeposit * 0.18); // 18% GST rule for sponsor deposit
  const totalPayable = numDeposit + gstAmount;

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numDeposit <= 0) return;

    setIsDepositing(true);
    setTimeout(() => {
      onAddFunds(numDeposit);
      setIsDepositing(false);
      setDepositSuccess(true);
      confetti({
        particleCount: 50,
        spread: 60,
      });
      setTimeout(() => setDepositSuccess(false), 5000);
    }, 700);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Brand Header */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg font-black text-xl">
          {sponsor.companyName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-white truncate">{sponsor.companyName}</h2>
            
          </div>
          <p className="text-xs text-zinc-400">Account Admin: {sponsor.name}</p>
          <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
            GSTIN: {sponsor.gstNumber}
          </span>
        </div>
      </div>

      {/* Escrow Deposit Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-zinc-900 to-zinc-900 border border-purple-500/30 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          
          Add Escrow Campaign Funds
        </h3>

        <form onSubmit={handleDeposit} className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Deposit Amount (₹)</label>
            <input
              type="number"
              min="1000"
              step="500"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-[11px] space-y-1 text-zinc-400">
            <div className="flex justify-between">
              <span>Wallet Credit:</span>
              <span className="text-white font-semibold">₹{numDeposit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18% applied):</span>
              <span className="text-purple-300 font-semibold">+₹{gstAmount.toLocaleString()}</span>
            </div>
            <div className="pt-1 border-t border-zinc-800 flex justify-between font-bold text-white">
              <span>Total Payment:</span>
              <span className="text-emerald-400">₹{totalPayable.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isDepositing || numDeposit <= 0}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold shadow-md shadow-purple-600/30 cursor-pointer transition-all disabled:opacity-50"
          >
            {isDepositing ? 'Processing Gateway...' : `Pay ₹${totalPayable.toLocaleString()} via Gateway`}
          </button>
        </form>

        {depositSuccess && (
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold text-center">
            ✓ ₹{numDeposit.toLocaleString()} added to escrow balance!
          </div>
        )}
      </div>

      {/* APK Export Card */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <h3 className="text-xs font-bold text-white">Build Android APK (Production)</h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
        </div>
        <p className="text-xs text-zinc-400">
          Export the entire source code as an Android Studio project with Capacitor and Gradle.
        </p>
        <button
          onClick={onOpenApkModal}
          className="w-full mt-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700/60"
        >
          <span>Open APK Center</span>
          
        </button>
      </div>
    </div>
  );
};
