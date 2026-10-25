import React, { useState } from 'react';

import confetti from 'canvas-confetti';
import { CreatorProfile, WithdrawalTransaction } from '../../types';

import { Wallet, ArrowUpRight } from 'lucide-react';



interface CreatorWalletProps {
  profile: CreatorProfile;
  withdrawals: WithdrawalTransaction[];
  onWithdraw: (amount: number, upiId: string) => boolean;
}

export const CreatorWallet: React.FC<CreatorWalletProps> = ({
  profile,
  withdrawals,
  onWithdraw,
}) => {
  const [amountInput, setAmountInput] = useState('1000');
  const [upiIdInput, setUpiIdInput] = useState(profile.upiId || 'aarav@okaxis');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const numAmount = parseFloat(amountInput) || 0;
  const gstDeduction = Math.round(numAmount * 0.18);
  const netAmount = numAmount > 0 ? numAmount - gstDeduction : 0;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (numAmount < 500) {
      setErrorMsg('Minimum withdrawal amount is ₹500 (Government GST compliance).');
      return;
    }

    if (numAmount > profile.walletBalance) {
      setErrorMsg('Withdrawal amount exceeds your available wallet balance.');
      return;
    }

    if (!upiIdInput || !upiIdInput.includes('@')) {
      setErrorMsg('Please enter a valid UPI ID (e.g. mobile@upi or username@okhdfcbank).');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const ok = onWithdraw(numAmount, upiIdInput);
      setIsProcessing(false);
      if (ok) {
        setSuccessMsg(`Withdrawal of ₹${netAmount} initiated to ${upiIdInput}! (Reference: UPI-BULKPE-${Math.floor(100000 + Math.random() * 900000)})`);
        confetti({
          particleCount: 60,
          spread: 70,
        });
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    }, 800);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white">Creator Earnings & Wallet</h2>
        <p className="text-xs text-zinc-400">Withdraw payouts directly to your Indian UPI account</p>
      </div>

      {/* Main Balance Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 via-[#191920] to-[#141418] border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Available for Instant Withdrawal</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            
            Bulkpe Auto-UPI
          </span>
        </div>

        <div className="mt-2">
          <span className="text-3xl font-black text-white tracking-tight">
            ₹{profile.walletBalance.toLocaleString('en-IN')}
          </span>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
            <span>Lifetime: <strong className="text-zinc-200">₹{profile.lifetimeEarnings.toLocaleString('en-IN')}</strong></span>
            <span>•</span>
            <span>TDS/GST Compliant</span>
          </div>
        </div>
      </div>

      {/* UPI Withdrawal Form Card */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          
          Instant UPI Payout Request
        </h3>

        <form onSubmit={handleWithdraw} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Withdrawal Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-zinc-500 font-bold">₹</span>
              <input
                type="number"
                min={500}
                max={profile.walletBalance}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-7 pr-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#FF3399]"
                placeholder="500"
              />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {[500, 1000, 2000, profile.walletBalance].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountInput(preset.toString())}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-semibold cursor-pointer"
                >
                  {preset === profile.walletBalance ? 'Max (₹' + preset + ')' : '₹' + preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Beneficiary UPI ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. mobile@upi or username@okaxis"
              value={upiIdInput}
              onChange={(e) => setUpiIdInput(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF3399]"
            />
          </div>

          {/* Real-time GST Breakdown (Rule from spec) */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Gross Withdrawal:</span>
              <span className="font-semibold text-white">₹{numAmount}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span className="flex items-center gap-1">
                <span>GST (18% Govt Mandate):</span>
                <span title="18% GST as per Indian Tax rules">
                  
                </span>
              </span>
              <span className="text-rose-400 font-semibold">-₹{gstDeduction}</span>
            </div>
            <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between font-bold">
              <span className="text-zinc-200">Net Credited to UPI:</span>
              <span className="text-emerald-400 text-sm">₹{netAmount}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
              
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
              
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing || numAmount < 500 || numAmount > profile.walletBalance}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF3399] to-[#FF6B6B] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#FF3399]/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Confirm & Withdraw ₹{netAmount}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
          
          Recent Payout History
        </h3>

        <div className="space-y-2">
          {withdrawals.map((tx) => (
            <div
              key={tx.id}
              className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">₹{tx.netAmount}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Paid via UPI
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Gross: ₹{tx.amount} (GST ₹{tx.gstDeduction}) • {tx.date}
                </div>
                <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                  Ref: {tx.referenceId}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono text-zinc-400 block">{tx.upiId}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Instant Payout</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
