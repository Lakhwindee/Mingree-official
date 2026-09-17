import React from 'react';
import { Bell, X, Sparkles, CheckCircle2, Clock, Wallet } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'money' | 'star' | 'system';
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onClear,
}) => {
  if (!isOpen) return null;

  const notifications: NotificationItem[] = [
    {
      id: 'n1',
      title: 'Payment Credited! ₹300',
      desc: 'Your reel for SonicTech ANC Earbuds was approved. ₹300 added to your wallet.',
      time: '2 hours ago',
      type: 'money',
    },
    {
      id: 'n2',
      title: '⭐ 5 Gold Stars Awarded',
      desc: 'You completed the Mingree App promotional sprint! Check your Pro milestone progress.',
      time: 'Yesterday',
      type: 'star',
    },
    {
      id: 'n3',
      title: 'New High-Paying Campaign',
      desc: 'GlowAura has released 15 new spots for Tier 6 influencers in Mumbai.',
      time: '2 days ago',
      type: 'system',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#FF3399]" />
            <h3 className="text-sm font-bold text-white">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  {item.type === 'money' && <Wallet className="w-3.5 h-3.5 text-emerald-400" />}
                  {item.type === 'star' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  {item.type === 'system' && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF3399]" />}
                  {item.title}
                </span>
                <span className="text-[10px] text-zinc-500">{item.time}</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
        >
          Mark all as read
        </button>
      </div>
    </div>
  );
};
