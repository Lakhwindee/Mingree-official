import React from "react";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Check = __DummyIcon;



interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "money" | "star" | "system";
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
      id: "n1",
      title: "Payment Credited: ₹300",
      desc: "Your reel for SonicTech ANC Earbuds was approved. ₹300 added to your wallet.",
      time: "2 hours ago",
      type: "money",
    },
    {
      id: "n2",
      title: "5 Gold Stars Awarded",
      desc: "You completed the Mingree App promotional sprint. Check your Pro milestone progress.",
      time: "Yesterday",
      type: "star",
    },
    {
      id: "n3",
      title: "New High-Paying Campaign",
      desc: "GlowAura has released 15 new spots for Mega influencers in Mumbai.",
      time: "2 days ago",
      type: "system",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-lg p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Notifications</h3>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded"
          >
            Close
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-muted/40 border border-border space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">
                  {item.title}
                </span>
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="w-full py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer border border-border"
        >
          Mark all as read
        </button>
      </div>
    </div>
  );
};
