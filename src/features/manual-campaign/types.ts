// Types for the "Choose creators" (manual) campaign flow.
// Money is shown in rupees here for DISPLAY only. The server computes and checks every amount.

export type DeliverableType = "reel" | "story" | "collab_post";
export type MetricsSource = "api_verified" | "creator_reported" | "none";

export interface City {
  id: number;
  name: string;
  state: string;
}

export interface CreatorCard {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  igVerifiedBadge?: boolean;
  city: City;
  tier: string; // tier id, see tiers.ts
  followers: number;
  engagementRate: number | null; // percent, e.g. 4.6
  medianViews: number | null;
  indiaAudiencePct: number | null;
  metricsSource: MetricsSource; // decides the "verified" label
  completedDeals: number;
  onTimeRate: number | null; // percent
  genres: string[];
  recentReels: { thumbUrl?: string | null; permalink?: string | null }[]; // up to 3
  price: number; // creator's rate for the chosen deliverable (rupees)
  pricePer1kViews: number | null; // informational only
}

export interface CreatorSearchParams {
  cityIds: number[];
  tierId: string;
  deliverable: DeliverableType;
  q?: string;
  minEngagement?: number; // percent
  genres?: string[];
  sort?: "relevance" | "price_asc" | "price_desc" | "views_desc" | "followers_desc";
  cursor?: string | null;
}

export interface CreatorSearchResult {
  items: CreatorCard[];
  total: number;
  nextCursor: string | null;
}

export interface BillLine {
  creatorId: number;
  price: number;
  feeArtist: number;
  gstInFee: number;
  artistCost: number;
}

export interface Bill {
  lines: BillLine[];
  subtotal: number; // sum of creator prices
  feeTotal: number; // platform fee (GST included)
  gstInFee: number; // part of feeTotal that is GST
  total: number; // what the artist pays
  walletBalance: number;
  shortfall: number; // 0 when the wallet covers the total
  billId: string; // server token, sent back on submit so the server can detect rate changes
}

export interface CampaignDetails {
  title: string;
  songUrl: string;
  description: string;
  genre: string;
  language: string;
  deliverable: DeliverableType;
  deadline: string; // yyyy-mm-dd
  cityIds: number[];
  accountsToMention: string[];
  requiredTags: string[];
  captionNote: string;
  disclosureInstructions?: string;
  assetUrl?: string;
  assetFileName?: string;
  websiteUrl?: string;
  promotionStyle: "lyrics" | "face_on_camera" | "direct_share";
}

export interface SubmitPayload {
  details: CampaignDetails;
  creatorIds: number[];
  billId: string;
}

export type SubmitResult =
  | { ok: true; campaignId: number }
  | { ok: false; reason: "bill_changed"; bill: Bill }
  | { ok: false; reason: "insufficient_funds"; bill: Bill }
  | { ok: false; reason: "error"; message: string };

// The UI only talks to the backend through this interface, so it can be tested and previewed without a server.
export interface ManualCampaignApi {
  listCities(): Promise<City[]>;
  searchCreators(p: CreatorSearchParams): Promise<CreatorSearchResult>;
  previewBill(input: { deliverable: DeliverableType; creatorIds: number[] }): Promise<Bill>;
  submit(p: SubmitPayload): Promise<SubmitResult>;
}
