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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const initialBrandRate = Number(basePayAmount || currentPayoutAmount || 1200);
  const activeBrandRate = Number(currentPayoutAmount || 1200);
  const latestRate = Number(lastOfferedPrice || currentPayoutAmount || 1200);
  const isLocked = negotiationStatus === "accepted";

  // Filter only rate negotiation messages for this creator thread
  const rateMessages = (Array.isArray(messages) ? messages : []).filter((m: any) => {
    const isForThisCreator =
      !m.negotiationOffer?.creatorId ||
      Number(m.negotiationOffer?.creatorId) === Number(creatorId) ||
      Number(m.senderId) === Number(creatorId) ||
      Number(m.recipientId) === Number(creatorId);
    const isRateMsg = Boolean(m.negotiationOffer) || (typeof m.content === "string" && m.content.includes("₹"));
    return isForThisCreator && isRateMsg;
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rateMessages.length, negotiationStatus, latestRate]);

  const negotiateMutation = useMutation({
    mutationFn: (params: { action: "offer" | "counter_offer" | "accept" | "decline"; amount: number }) =>
      api.negotiateCampaignPrice(campaignId, {
        creatorId,
        action: params.action,
        amount: params.amount,
      }),
    onSuccess: (_data, vars) => {
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

  // Determine the incoming offer that the current viewer can immediately accept
  const incomingOfferToAccept = (() => {
    if (isLocked) return null;
    if (viewerRole === "creator") {
      // Creator can always accept the Brand's current offer
      return activeBrandRate;
    } else {
      // Sponsor can accept Creator's counter-offer when creator has countered
      if (negotiationStatus === "creator_countered" || lastOfferBy === "creator") {
        return latestRate;
      }
      return null;
    }
  })();

  const handleSendRate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const numericRate = Number(rateInput);
    if (!numericRate || numericRate < 100) {
      toast.error("Please enter a valid rate in ₹ (minimum ₹100)");
      return;
    }
    negotiateMutation.mutate({
      action: viewerRole === "sponsor" ? "offer" : "counter_offer",
      amount: numericRate,
    });
  };

  const quickPresets = [1000, 1200, 1500, 2000, 2500, 3500, 5000];

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
              2-Way Rate Negotiation • Only ₹ Offers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked: {formatINR(activeBrandRate)}
            </Badge>
          ) : negotiationStatus === "creator_countered" ? (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold px-2.5 py-1">
              Creator Ask: {formatINR(latestRate)}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1">
              Brand Offer: {formatINR(activeBrandRate)}
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Middle Chat Stream (Strictly Rate Bubbles from Both Sides) */}
      <div className="p-4 space-y-3 min-h-[240px] max-h-[320px] overflow-y-auto bg-muted/10 flex flex-col">
        {/* Initial Brand Rate Bubble */}
        <div
          className={cn(
            "flex flex-col max-w-[82%]",
            viewerRole === "sponsor" ? "self-end items-end" : "self-start items-start"
          )}
        >
          <span className="text-[10px] font-semibold text-muted-foreground mb-1 px-1">
            {viewerRole === "sponsor" ? "You (Initial Brand Rate)" : `${brandName} (Initial Offer)`}
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
                Offered Rate
              </span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(initialBrandRate)}
              </span>
            </div>
            {viewerRole === "creator" && rateMessages.length === 0 && !isLocked && (
              <Button
                size="sm"
                disabled={negotiateMutation.isPending}
                onClick={() =>
                  negotiateMutation.mutate({
                    action: "accept",
                    amount: initialBrandRate,
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
          const isAcceptMsg = offer?.action === "accept" || String(msg.content).includes("Accepted");
          const isDeclineMsg = offer?.action === "decline" || String(msg.content).includes("Declined");

          // Extract numeric amount if not in offer.amount
          const bubbleAmount =
            offer?.amount ||
            (() => {
              const m = String(msg.content || "").match(/₹([\d,]+)/);
              return m ? Number(m[1].replace(/,/g, "")) : activeBrandRate;
            })();

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
                {isMine
                  ? "You"
                  : msgSide === "sponsor"
                  ? brandName
                  : creatorName}{" "}
                •{" "}
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
                      isMine && !isDeclineMsg ? "text-primary-foreground/80" : "text-muted-foreground"
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

      {/* 3. Bottom Rate-Only Chat Bar ("char baar" — both sides can send ₹ rate or accept) */}
      <div className="p-3 border-t border-border bg-background space-y-2.5">
        {/* Quick Rate Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0 mr-1">
            Quick ₹:
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
        <form onSubmit={handleSendRate} className="flex items-center gap-2">
          <div className="relative flex-1">
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="number"
              min={100}
              step={50}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={
                viewerRole === "creator"
                  ? "Enter your counter rate in ₹ (e.g. 1500)..."
                  : "Enter brand rate offer in ₹ (e.g. 1500)..."
              }
              className="pl-8 h-10 rounded-xl text-xs font-bold bg-muted/30 border-border focus-visible:ring-1"
            />
          </div>

          <Button
            type="submit"
            disabled={!rateInput || Number(rateInput) < 100 || negotiateMutation.isPending}
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
        </form>
      </div>
    </div>
  );
}
