import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatINR } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, IndianRupee, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface RateNegotiationChatProps {
  campaignId: number;
  viewerRole: "creator" | "sponsor";
  brandName: string;
  brandLogo?: string;
  creatorId: number;
  creatorName: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  currentPayoutAmount: number;
  basePayAmount?: number;
  lastOfferedPrice?: number;
  lastOfferBy?: "sponsor" | "creator";
  negotiationStatus?: string;
  messages?: any[];
}

export function RateNegotiationChat({
  campaignId,
  viewerRole,
  brandName,
  brandLogo,
  creatorId,
  creatorName,
  creatorHandle,
  creatorAvatar,
  currentPayoutAmount,
  basePayAmount,
  lastOfferedPrice,
  lastOfferBy,
  negotiationStatus = "initial",
  messages = [],
}: RateNegotiationChatProps) {
  const queryClient = useQueryClient();
  const [rateInput, setRateInput] = useState<string>("");
  const [localMsgs, setLocalMsgs] = useState<any[]>([]);
  const [localParticipantOverride, setLocalParticipantOverride] = useState<{
    payoutAmount?: number;
    lastOfferedPrice?: number;
    lastOfferBy?: "sponsor" | "creator";
    negotiationStatus?: string;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Maximum negotiable rate is strictly the creator's base rate
  const maxCreatorRate = Math.max(100, Number(basePayAmount || currentPayoutAmount || 1200));
  const effPayoutAmount = localParticipantOverride?.payoutAmount ?? currentPayoutAmount;
  const effLastOfferedPrice = localParticipantOverride?.lastOfferedPrice ?? lastOfferedPrice;
  const effLastOfferBy = localParticipantOverride?.lastOfferBy ?? lastOfferBy;
  const effNegotiationStatus = localParticipantOverride?.negotiationStatus ?? negotiationStatus;

  const activeBrandRate = Math.min(maxCreatorRate, Number(effPayoutAmount || maxCreatorRate));
  const latestRate = Math.min(
    maxCreatorRate,
    Number(effLastOfferedPrice || effPayoutAmount || maxCreatorRate)
  );
  const isLocked = effNegotiationStatus === "accepted";

  // Combine server messages with any optimistic local messages (deduplicated)
  const combinedMessages = (() => {
    const base = Array.isArray(messages) ? [...messages] : [];
    for (const lm of localMsgs) {
      const exists = base.some(
        (bm: any) =>
          Number(bm.id) === Number(lm.id) ||
          (bm.negotiationOffer &&
            lm.negotiationOffer &&
            bm.negotiationOffer.action === lm.negotiationOffer.action &&
            Number(bm.negotiationOffer.amount) === Number(lm.negotiationOffer.amount) &&
            Math.abs(new Date(bm.createdAt).getTime() - new Date(lm.createdAt).getTime()) < 5000)
      );
      if (!exists) base.push(lm);
    }
    return base;
  })();

  // Filter only rate negotiation messages for this creator thread that are <= maxCreatorRate
  const rateMessages = combinedMessages.filter((m: any) => {
    const isForThisCreator =
      !m.negotiationOffer?.creatorId ||
      Number(m.negotiationOffer?.creatorId) === Number(creatorId) ||
      Number(m.senderId) === Number(creatorId) ||
      Number(m.recipientId) === Number(creatorId);
    const isRateMsg =
      Boolean(m.negotiationOffer) ||
      (typeof m.content === "string" && m.content.includes("₹") && !m.isAnnouncement);
    if (!isForThisCreator || !isRateMsg) return false;

    const msgAmount =
      m.negotiationOffer?.amount ||
      (() => {
        const match = String(m.content || "").match(/₹([\d,]+)/);
        return match ? Number(match[1].replace(/,/g, "")) : 0;
      })();

    if (msgAmount > maxCreatorRate) return false;
    return true;
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rateMessages.length, effNegotiationStatus, latestRate]);

  const negotiateMutation = useMutation({
    mutationFn: (params: {
      action: "offer" | "counter_offer" | "accept" | "decline";
      amount: number;
    }) =>
      api.negotiateCampaignPrice(campaignId, {
        creatorId,
        creatorName,
        creatorHandle,
        creatorAvatar,
        baseRate: maxCreatorRate,
        brandName,
        viewerRole,
        action: params.action,
        amount: params.amount,
      }),
    onSuccess: (data, vars) => {
      if (data?.participant) {
        setLocalParticipantOverride({
          payoutAmount: data.participant.payoutAmount,
          lastOfferedPrice: data.participant.lastOfferedPrice,
          lastOfferBy: data.participant.lastOfferBy,
          negotiationStatus: data.participant.negotiationStatus,
        });
      }
      if (data?.message) {
        setLocalMsgs((prev) => [...prev, data.message]);
      }

      // Immediately update campaignWorkspace query cache so parent cards reflect the new rate right away
      queryClient.setQueryData(["campaignWorkspace", campaignId], (oldData: any) => {
        if (!oldData) return oldData;
        const updatedParticipants = Array.isArray(oldData.participants)
          ? oldData.participants.map((p: any) =>
              Number(p.creatorId) === Number(creatorId) || Number(p.id) === Number(creatorId)
                ? {
                    ...p,
                    payoutAmount: data?.participant?.payoutAmount ?? vars.amount,
                    lastOfferedPrice: data?.participant?.lastOfferedPrice ?? vars.amount,
                    lastOfferBy: data?.participant?.lastOfferBy ?? viewerRole,
                    negotiationStatus:
                      data?.participant?.negotiationStatus ??
                      (vars.action === "accept"
                        ? "accepted"
                        : viewerRole === "sponsor"
                        ? "brand_offered"
                        : "creator_countered"),
                  }
                : p
            )
          : oldData.participants;
        const updatedMessages = data?.message
          ? [...(oldData.messages || []), data.message]
          : oldData.messages;
        return {
          ...oldData,
          participants: updatedParticipants,
          messages: updatedMessages,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["creatorWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["campaignWorkspace", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["brandCampaignCards"] });
      setRateInput("");
      if (vars.action === "accept") {
        toast.success(`Rate locked at ${formatINR(vars.amount)}!`);
      } else {
        toast.success(`Rate offer of ${formatINR(vars.amount)} sent!`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send rate");
    },
  });

  // Determine the rate that the current viewer can immediately accept/lock
  const incomingOfferToAccept = (() => {
    if (isLocked) return null;
    if (viewerRole === "creator") {
      return activeBrandRate;
    } else {
      if (effNegotiationStatus === "creator_countered" || effLastOfferBy === "creator") {
        return latestRate;
      }
      return activeBrandRate;
    }
  })();

  const handleSendRate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const numericRate = Number(rateInput);
    if (!numericRate || numericRate < 100) {
      toast.error("Please enter a valid rate in ₹ (minimum ₹100)");
      return;
    }
    if (numericRate > maxCreatorRate) {
      toast.error(
        `Cannot negotiate above creator's rate of ${formatINR(maxCreatorRate)}. Please enter ${formatINR(maxCreatorRate)} or lower.`
      );
      return;
    }
    negotiateMutation.mutate({
      action: viewerRole === "sponsor" ? "offer" : "counter_offer",
      amount: numericRate,
    });
  };

  // Build quick presets strictly <= maxCreatorRate (lower rates up to creator's max rate)
  const quickPresets = (() => {
    const candidates = [
      Math.round((maxCreatorRate * 0.5) / 50) * 50,
      Math.round((maxCreatorRate * 0.65) / 50) * 50,
      Math.round((maxCreatorRate * 0.75) / 50) * 50,
      Math.round((maxCreatorRate * 0.85) / 50) * 50,
      Math.round((maxCreatorRate * 0.9) / 50) * 50,
      maxCreatorRate,
    ].filter((val) => val >= 100 && val <= maxCreatorRate);
    return Array.from(new Set(candidates)).sort((a, b) => a - b);
  })();

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      {/* 1. Top Chat Bar Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {viewerRole === "creator" ? (
            brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {brandName.charAt(0)}
              </div>
            )
          ) : creatorAvatar ? (
            <img
              src={creatorAvatar}
              alt={creatorName}
              className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
              {creatorName.charAt(0)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {viewerRole === "creator" ? brandName : creatorName}
              </h4>
              {viewerRole === "sponsor" && creatorHandle && (
                <span className="text-[11px] text-primary font-mono truncate">{creatorHandle}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Creator Rate: <strong className="text-foreground">{formatINR(maxCreatorRate)}</strong> • Negotiate ≤ {formatINR(maxCreatorRate)} only
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked: {formatINR(activeBrandRate)}
            </Badge>
          ) : effNegotiationStatus === "creator_countered" ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold px-2.5 py-1"
            >
              Creator Offer: {formatINR(latestRate)}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1"
            >
              Current Rate: {formatINR(activeBrandRate)}
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Middle Chat Stream (Strictly Rate Bubbles from Both Sides, <= Creator Rate) */}
      <div className="p-4 space-y-3 min-h-[220px] max-h-[300px] overflow-y-auto bg-muted/10 flex flex-col">
        {/* Initial Creator / Brand Rate Bubble */}
        <div
          className={cn(
            "flex flex-col max-w-[82%]",
            viewerRole === "sponsor" ? "self-end items-end" : "self-start items-start"
          )}
        >
          <span className="text-[10px] font-semibold text-muted-foreground mb-1 px-1">
            {viewerRole === "sponsor" ? "Creator Base Rate" : `${brandName} (Initial Rate)`}
          </span>
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl border text-xs shadow-2xs flex items-center gap-3",
              viewerRole === "sponsor"
                ? "bg-primary/10 border-primary/25 text-foreground rounded-br-sm"
                : "bg-card border-border text-foreground rounded-bl-sm"
            )}
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Max Creator Rate
              </span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(maxCreatorRate)}
              </span>
            </div>
            {viewerRole === "creator" && rateMessages.length === 0 && !isLocked && (
              <Button
                size="sm"
                disabled={negotiateMutation.isPending}
                onClick={() =>
                  negotiateMutation.mutate({
                    action: "accept",
                    amount: activeBrandRate,
                  })
                }
                className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold ml-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Accept
              </Button>
            )}
          </div>
        </div>

        {/* Subsequent 2-Way Rate Bubbles */}
        {rateMessages.map((msg: any, idx: number) => {
          const offer = msg.negotiationOffer;
          const msgSide: "sponsor" | "creator" =
            offer?.proposedBy || (msg.senderRole === "sponsor" ? "sponsor" : "creator");
          const isMine = msgSide === viewerRole;
          const isAcceptMsg =
            offer?.action === "accept" || String(msg.content).includes("Accepted");
          const isDeclineMsg =
            offer?.action === "decline" || String(msg.content).includes("Declined");

          const rawBubbleAmount =
            offer?.amount ||
            (() => {
              const m = String(msg.content || "").match(/₹([\d,]+)/);
              return m ? Number(m[1].replace(/,/g, "")) : activeBrandRate;
            })();
          const bubbleAmount = Math.min(maxCreatorRate, rawBubbleAmount);

          const isLatestMessage = idx === rateMessages.length - 1;

          if (isAcceptMsg) {
            return (
              <div key={msg.id || idx} className="self-center my-1">
                <div className="px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Deal Rate Locked at {formatINR(bubbleAmount)}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id || idx}
              className={cn(
                "flex flex-col max-w-[82%]",
                isMine ? "self-end items-end" : "self-start items-start"
              )}
            >
              <span className="text-[10px] font-semibold text-muted-foreground mb-1 px-1">
                {isMine ? "You" : msgSide === "sponsor" ? brandName : creatorName} •{" "}
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </span>

              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl border text-xs shadow-2xs flex items-center gap-3",
                  isDeclineMsg
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : isMine
                    ? "bg-primary text-primary-foreground border-primary rounded-br-sm"
                    : "bg-card border-border text-foreground rounded-bl-sm"
                )}
              >
                <div>
                  <span
                    className={cn(
                      "text-[10px] uppercase font-bold block",
                      isMine && !isDeclineMsg
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {isDeclineMsg
                      ? "Declined — Standing Rate"
                      : msgSide === "sponsor"
                      ? "Brand Rate Offer"
                      : "Creator Counter Rate"}
                  </span>
                  <span className="text-base font-extrabold tabular-nums">
                    {formatINR(bubbleAmount)}
                  </span>
                </div>

                {/* Inline Accept Button on Latest Incoming Offer from Other Side */}
                {!isMine && !isDeclineMsg && isLatestMessage && !isLocked && (
                  <Button
                    size="sm"
                    disabled={negotiateMutation.isPending}
                    onClick={() =>
                      negotiateMutation.mutate({
                        action: "accept",
                        amount: bubbleAmount,
                      })
                    }
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold ml-1 shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Accept {formatINR(bubbleAmount)}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={chatEndRef} />
      </div>

      {/* 3. Bottom Rate-Only Chat Bar (Capped at <= maxCreatorRate) */}
      <div className="p-3 border-t border-border bg-background space-y-2.5">
        {/* Quick Lower-or-Equal Rate Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0 mr-1">
            Lower ₹ (Max {formatINR(maxCreatorRate)}):
          </span>
          {quickPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setRateInput(String(preset))}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 cursor-pointer",
                Number(rateInput) === preset
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 hover:bg-muted text-foreground border-border"
              )}
            >
              ₹{preset.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        {/* Rate Input Chat Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="number"
              min={100}
              max={maxCreatorRate}
              step={50}
              value={rateInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendRate();
                }
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                if (!raw) {
                  setRateInput("");
                  return;
                }
                const num = Number(raw);
                if (num > maxCreatorRate) {
                  setRateInput(String(maxCreatorRate));
                  toast.info(`Maximum allowed rate is ${formatINR(maxCreatorRate)}`);
                } else {
                  setRateInput(raw);
                }
              }}
              placeholder={`Enter rate ≤ ${formatINR(maxCreatorRate)} (lower only)...`}
              className="pl-8 h-10 rounded-xl text-xs font-bold bg-muted/30 border-border focus-visible:ring-1"
            />
          </div>

          <Button
            type="button"
            onClick={() => handleSendRate()}
            disabled={
              !rateInput ||
              Number(rateInput) < 100 ||
              Number(rateInput) > maxCreatorRate ||
              negotiateMutation.isPending
            }
            className="h-10 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {negotiateMutation.isPending ? "Sending..." : "Send ₹"}
          </Button>

          {incomingOfferToAccept !== null && (
            <Button
              type="button"
              disabled={negotiateMutation.isPending}
              onClick={() =>
                negotiateMutation.mutate({
                  action: "accept",
                  amount: incomingOfferToAccept,
                })
              }
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Accept {formatINR(incomingOfferToAccept)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
