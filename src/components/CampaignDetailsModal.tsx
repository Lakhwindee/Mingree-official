import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR, type ApiCampaign } from "@/lib/api";
import { format } from "date-fns";
import { useState, useEffect } from "react";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Camera = __DummyIcon;
const File = __DummyIcon;



const PROMOTION_STYLE_LABELS: Record<string, { label: string; description: string }> = {
  lyricals: { label: "Lyricals / Page Promotion", description: "Use provided content/audio only" },
  face_ad: { label: "Face on Camera", description: "Appear in video for the ad" },
  share_only: { label: "Direct Share", description: "Share sponsor's provided file" },
};

const CONTENT_TYPE_LABELS: Record<string, { label: string }> = {
  reel: { label: "Reel" },
  story: { label: "Story" },
  post: { label: "Post" },
  carousel: { label: "Carousel" },
};

interface CampaignDetailsModalProps {
  campaign: ApiCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  onReserve: (campaign: ApiCampaign) => void;
  isReserving: boolean;
  hasActiveSubscription?: boolean;
}

export function CampaignDetailsModal({ campaign, isOpen, onClose, onReserve, isReserving, hasActiveSubscription = true }: CampaignDetailsModalProps) {
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  useEffect(() => {
    if (!isOpen) {
      setHasDownloaded(false);
    }
  }, [isOpen, campaign?.id]);
  
  if (!campaign) return null;

  const promotionStyle = campaign.promotionStyle ? PROMOTION_STYLE_LABELS[campaign.promotionStyle] : null;
  const deadlineDate = campaign.deadline ? new Date(campaign.deadline) : null;
  const isValidDeadline = deadlineDate && !isNaN(deadlineDate.getTime());
  const isProductCampaign = campaign.campaignType === "product";
  const isPromotionalCampaign = campaign.isPromotional === true;
  
  const requiresDownload = !!campaign.assetUrl;
  const canReserve = !requiresDownload || hasDownloaded;
  
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = campaign.assetUrl!;
    link.download = campaign.assetFileName || "campaign-asset";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setHasDownloaded(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold">{campaign.title}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                by <span className="font-semibold text-foreground">{campaign.brand}</span>
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {campaign.tier}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {isProductCampaign ? (
                <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-center">
                  <span className="text-xs text-muted-foreground block">Reward</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block" data-testid="modal-payment">
                    Free Product
                  </span>
                </div>
              ) : isPromotionalCampaign ? (
                <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-center">
                  <span className="text-xs text-muted-foreground block">Stars Reward</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block" data-testid="modal-payment">
                    {campaign.starReward || 1} Stars
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-center">
                  <span className="text-xs text-muted-foreground block">Payment</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block" data-testid="modal-payment">
                    {formatINR(campaign.payAmount)}
                  </span>
                </div>
              )}
              <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-center">
                <span className="text-xs text-muted-foreground block">Spots Left</span>
                <span className="text-base font-bold text-foreground mt-0.5 block" data-testid="modal-spots">
                  {campaign.spotsRemaining}/{campaign.totalSpots}
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-center">
                <span className="text-xs text-muted-foreground block">Min Followers</span>
                <span className="text-base font-bold text-foreground mt-0.5 block">
                  {campaign.minFollowers >= 1000000 
                    ? `${(campaign.minFollowers / 1000000).toFixed(1)}M` 
                    : `${(campaign.minFollowers / 1000).toFixed(0)}K`}
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-center">
                <span className="text-xs text-muted-foreground block">Deadline</span>
                <span className="text-base font-bold text-foreground mt-0.5 block">
                  {isValidDeadline ? format(deadlineDate!, "MMM d") : "Flexible"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Content Type</h3>
              <div className="flex flex-wrap gap-2">
                {(campaign.contentTypes || (campaign.type ? campaign.type.split(", ") : ["Reel"])).map((type: string) => {
                  const typeLower = type.toLowerCase().trim();
                  const contentType = CONTENT_TYPE_LABELS[typeLower];
                  const label = contentType?.label || type;
                  return (
                    <Badge key={type} variant="outline" className="text-xs py-1 px-2.5">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {promotionStyle && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Promotion Style</h3>
                  <div className="rounded-lg bg-muted/40 border border-border p-3.5">
                    <p className="font-medium text-sm">{promotionStyle.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{promotionStyle.description}</p>
                  </div>
                </div>
              </>
            )}

            {isProductCampaign && campaign.productName && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Product Details</h3>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="font-semibold text-sm">{campaign.productName}</p>
                    {campaign.productValue && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Worth: {formatINR(campaign.productValue)}
                      </p>
                    )}
                    {campaign.productDescription && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {campaign.productDescription}
                      </p>
                    )}
                    <div className="mt-2.5 p-2 bg-muted rounded text-xs text-foreground">
                      You will receive this product for free after your content is approved
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Campaign Brief</h3>
              <p className="text-xs text-muted-foreground leading-relaxed" data-testid="modal-description">
                {campaign.description}
              </p>
            </div>

            {campaign.assetUrl && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Download Content</h3>
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-xs">{campaign.assetFileName || "Campaign Asset"}</p>
                        <p className="text-[11px] text-muted-foreground">Provided by sponsor</p>
                      </div>
                      <Button 
                        variant={hasDownloaded ? "outline" : "default"}
                        size="sm"
                        onClick={handleDownload}
                        className="text-xs h-8"
                        data-testid="button-download-asset"
                      >
                        {hasDownloaded ? "Downloaded" : "Download First"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!hasActiveSubscription && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
                <p className="font-semibold text-destructive">Upgrade Required</p>
                <p className="text-muted-foreground mt-0.5">
                  Aapko campaign reserve karne ke liye Pro plan par upgrade karna padega.
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 border border-border p-3">
              You have 48 hours to submit your work after reserving
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 sm:p-6 pt-3 border-t">
          {requiresDownload && !hasDownloaded && (
            <div className="mb-3 p-2.5 rounded bg-muted text-xs text-muted-foreground">
              Please download the campaign file first before reserving
            </div>
          )}
          <div className="flex gap-2.5">
            <Button
              className="flex-1 text-xs font-semibold h-9"
              onClick={() => onReserve(campaign)}
              disabled={isReserving || campaign.spotsRemaining <= 0 || !canReserve}
              data-testid="button-confirm-reserve"
            >
              {isReserving ? "Reserving..." : campaign.spotsRemaining <= 0 ? "No Spots Available" : !canReserve ? "Download File First" : "Reserve This Campaign"}
            </Button>
            <Button variant="outline" className="text-xs h-9" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
