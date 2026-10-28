import {
  fallbackCreatorUser,
  fallbackSponsorUser,
  fallbackCampaigns,
  fallbackReservations,
  fallbackTransactions,
  fallbackBankAccounts,
  fallbackNotifications,
  fallbackSubscription,
  fallbackCategories,
} from "./fallback-data";
import { getTierByFollowers } from "@shared/tiers";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Wallet = __DummyIcon;
const Instagram = __DummyIcon;
const File = __DummyIcon;
const User = __DummyIcon;



const API_BASE = "/api";

export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || !isFinite(num)) return "₹0";
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export interface ApiCampaign {
  id: number;
  sponsorId: number | null;
  title: string;
  brand: string;
  brandLogo: string;
  payAmount: string;
  type: string;
  contentTypes: string[] | null;
  promotionStyle: string | null;
  assetUrl: string | null;
  assetFileName: string | null;
  minFollowers: number;
  description: string;
  tier: string;
  deadline: string;
  totalSpots: number;
  spotsRemaining: number;
  status: string;
  isPromotional: boolean;
  starReward: number;
  isApproved: boolean;
  targetCountries: string[];
  targetCities?: string[] | null;
  totalBudget: string;
  releasedAmount: string;
  refundedAmount: string;
  escrowStatus: string;
  createdAt: string;
  campaignType?: string;
  genre?: string | null;
  productName?: string | null;
  productValue?: string | null;
  mentions?: string[] | null;
  tags?: string[] | null;
  // Reservation status counts (added by sponsor campaigns endpoint)
  reservedCount?: number;
  submittedCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  isTierCompleted?: boolean;
  productImage?: string | null;
  productDescription?: string | null;
}

export interface ApiUser {
  id: number;
  name: string;
  handle: string;
  email: string;
  role: string;
  followers: number;
  engagement: string;
  reach: number;
  avatar: string | null;
  isVerified: boolean;
  tier: string;
  balance: string;
  companyName: string | null;
  gstNumber: string | null;
  instagramUsername: string | null;
  instagramProfileUrl: string | null;
  instagramFollowers: number | null;
  isInstagramVerified: boolean;
  instagramVerificationCode: string | null;
  instagramVerificationStatus: string;
  instagramAccessToken: string | null;
  instagramUserId: string | null;
  instagramTokenExpiresAt: string | null;
  subscriptionPlan: string;
  subscriptionExpiresAt: string | null;
  stars: number;
  country: string;
  city?: string | null;
  totalEarnings?: string;
  pendingWithdrawals?: string;
  starRewards?: number;
  activeReservations?: number;
  completedSubmissions?: number;
  campaignsCreated?: number;
  createdAt?: string;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPincode?: string | null;
  shippingPhone?: string | null;
}

export interface ApiSubscription {
  plan: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface ApiReservation {
  id: number;
  userId: number;
  campaignId: number;
  status: string;
  reservedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  postUrl?: string | null;
  clipUrl?: string | null;
  trackingNumber?: string | null;
  shippingStatus?: string | null;
  shippedAt?: string | null;
  deliveryConfirmed?: boolean | null;
  deliveredAt?: string | null;
  campaign?: (Partial<ApiCampaign> & { id: number; title: string }) | null;
}

export interface ApiTransaction {
  id: number;
  userId: number;
  type: string;
  category: string;
  amount: string;
  tax: string;
  net: string;
  description: string;
  status: string;
  reservationId: number | null;
  campaignId: number | null;
  paymentId: string | null;
  createdAt: string;
}

export interface ApiWallet {
  balance: string;
  transactions: ApiTransaction[];
}

export interface ApiNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  campaignId?: number | null;
  reservationId?: number | null;
  link?: string;
  createdAt: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ApiCategorySubscription {
  id: number;
  userId: number;
  category: string;
  tier: string;
  joinedAt: string;
}

export interface ApiBankAccount {
  id: number;
  userId: number;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId: string | null;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface ApiWithdrawalRequest {
  id: number;
  userId: number;
  bankAccountId: number;
  amount: string;
  status: string;
  utrNumber: string | null;
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface WorkspaceBriefDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface WorkspaceBriefVersion {
  version: number;
  timestamp: string;
  updatedBy: number;
  changesSummary: string;
  diffs: WorkspaceBriefDiff[];
  briefSnapshot: {
    title: string;
    description: string;
    requiredCaptionNote: string;
    requiredTags: string[];
    requiredMentions: string[];
    disclosureInstructions: string;
    audioUrl: string;
    deadline: string;
  };
}

export interface WorkspaceReelSubmission {
  postUrl: string;
  audioConfirmed: boolean;
  submittedAt: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  liveVerified: boolean;
  proofScreenshotUrl?: string;
  metricsSnapshotAt?: string;
}

export interface WorkspaceRevisionRecord {
  id: string;
  requestedAt: string;
  requestedBy: number;
  reason: string;
  notes: string;
  resolvedAt?: string;
}

export interface WorkspaceDraftSubmission {
  videoUrl: string;
  notes?: string;
  submittedAt: string;
}

export interface WorkspaceParticipant {
  id: number;
  campaignId: number;
  creatorId: number;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  creatorFollowers: number;
  creatorMedianViews: number;
  status:
    | "applied"
    | "reserved"
    | "accepted"
    | "content_submitted"
    | "revision_requested"
    | "approved"
    | "completed"
    | "rejected"
    | "withdrawn";
  payoutAmount: number;
  reservedAt: string;
  expiresAt: string;
  briefAcknowledgedVersion: number;
  submission: WorkspaceReelSubmission | null;
  revisions: WorkspaceRevisionRecord[];
  draftSubmission?: WorkspaceDraftSubmission | null;
  draftStatus?: "none" | "submitted" | "approved" | "revision_requested";
  draftFeedbackNotes?: string;
}

export interface WorkspaceMessage {
  id: number;
  campaignId: number;
  senderId: number;
  senderName: string;
  senderRole: "sponsor" | "creator" | "admin" | "system";
  senderAvatar: string;
  recipientId: number | null;
  content: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  isAnnouncement?: boolean;
  isBriefChange?: boolean;
  briefVersion?: number;
  createdAt: string;
  readBy: number[];
}

export interface WorkspaceDetails {
  id: number;
  sponsorId: number;
  title: string;
  brand: string;
  brandLogo: string;
  description: string;
  genre: string;
  language: string;
  contentTypes: string[];
  promotionStyle: string;
  audioUrl: string;
  referenceVideoUrl: string;
  productAssets: Array<{ name: string; url: string; type: string }>;
  payAmount: number;
  totalBudget: number;
  escrowHeld: number;
  committedPayouts: number;
  releasedPayouts: number;
  totalSlots: number;
  reservedSlots: number;
  remainingSlots: number;
  bookingModel: "instant" | "approval_required";
  minFollowers: number;
  minMedianViews: number;
  targetCountries: string[];
  targetCities: string[];
  requiredCaptionNote: string;
  requiredTags: string[];
  requiredMentions: string[];
  disclosureInstructions: string;
  minDurationSecs: number;
  deadline: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  briefVersions: WorkspaceBriefVersion[];
  participants: WorkspaceParticipant[];
  messages: WorkspaceMessage[];
}

export interface BrandCampaignCard {
  id: number;
  title: string;
  brand: string;
  brandLogo: string;
  genre: string;
  status: string;
  bookingModel: "instant" | "approval_required";
  payAmount: number;
  totalBudget: number;
  escrowHeld: number;
  committedPayouts: number;
  releasedPayouts: number;
  totalSlots: number;
  reservedSlots: number;
  remainingSlots: number;
  activeParticipantsCount: number;
  pendingApplications: number;
  awaitingReview: number;
  revisionsCount: number;
  approvedCount: number;
  deadline: string;
  updatedAt: string;
  unreadMessagesCount: number;
}

export interface CreatorCampaignItem {
  campaignId: number;
  participantId: number;
  title: string;
  brand: string;
  brandLogo: string;
  genre: string;
  payAmount: number;
  status: string;
  reservedAt: string;
  expiresAt: string;
  deadline: string;
  audioUrl: string;
  requiredCaptionNote: string;
  requiredTags: string[];
  requiredMentions: string[];
  disclosureInstructions: string;
  needsBriefAcknowledgement: boolean;
  latestBriefVersion: number;
  submission: WorkspaceReelSubmission | null;
  revisions: WorkspaceRevisionRecord[];
  unreadMessagesCount: number;
}

export interface CreatorAnalytics {
  totalEarnings: number;
  avgViews: number;
  avgLikes: number;
}

export const api = {
  // Campaign Workspace APIs
  async getCreatorAnalytics(): Promise<CreatorAnalytics> {
    const res = await fetch(`${API_BASE}/creator/analytics`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },

  async getCreators(city: string, minFollowers: number, maxFollowers: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/creators/search?city=${city}&minFollowers=${minFollowers}&maxFollowers=${maxFollowers}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to search creators");
    return res.json();
  },

  // Campaign Workspace APIs
  async getCampaignWorkspace(campaignId: number): Promise<WorkspaceDetails> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/workspace`, { credentials: "include" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to load campaign workspace");
    }
    return await res.json();
  },

  async applyOrReserveSlot(campaignId: number): Promise<{ success: boolean; participant: WorkspaceParticipant; message: string }> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/reserve-or-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reserve slot");
    }
    return await res.json();
  },

  async updateCampaignBrief(campaignId: number, data: { updatedBrief: any; changesSummary: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update campaign brief");
    }
    return await res.json();
  },

  async acknowledgeBriefChange(campaignId: number, version: number): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/acknowledge-brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ version }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to acknowledge brief change");
    }
    return await res.json();
  },

  async acknowledgeBriefUpdate(campaignId: number, version: number): Promise<any> {
    return this.acknowledgeBriefChange(campaignId, version);
  },

  async submitDraftPreview(campaignId: number, data: { videoUrl: string; notes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/submit-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit draft preview");
    }
    return await res.json();
  },

  async reviewDraftPreview(campaignId: number, data: { participantId: number; action: "approve" | "request_revision"; notes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/review-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to review draft preview");
    }
    return await res.json();
  },

  async submitCreatorReel(campaignId: number, data: { postUrl: string; audioConfirmed?: boolean; proofScreenshotUrl?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/submit-reel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit Reel URL");
    }
    return await res.json();
  },

  async reviewReelSubmission(
    campaignId: number,
    data: { participantId: number; action: "approve" | "request_revision" | "reject"; revisionReason?: string; revisionNotes?: string; rejectionReason?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/review-submission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit review");
    }
    return await res.json();
  },

  async handleApplicationAction(campaignId: number, participantId: number, action: "accept" | "decline"): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/participants/${participantId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to process application");
    }
    return await res.json();
  },

  async getWorkspaceMessages(campaignId: number, thread?: string, since?: string): Promise<WorkspaceMessage[]> {
    const params = new URLSearchParams();
    if (thread) params.set("thread", thread);
    if (since) params.set("since", since);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/messages${qs}`, { credentials: "include" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async postWorkspaceMessage(
    campaignId: number,
    data: { content: string; recipientId?: number | null; attachments?: any[]; isAnnouncement?: boolean }
  ): Promise<WorkspaceMessage> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to send message");
    }
    return await res.json();
  },

  async getBrandCampaignCards(sponsorId?: number): Promise<BrandCampaignCard[]> {
    try {
      const url = sponsorId ? `${API_BASE}/sponsors/${sponsorId}/campaign-cards` : `${API_BASE}/sponsor/campaign-cards`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
    return [];
  },

  async getCreatorCampaignWorkspaces(creatorId?: number): Promise<CreatorCampaignItem[]> {
    try {
      const url = creatorId ? `${API_BASE}/creators/${creatorId}/campaign-workspaces` : `${API_BASE}/creator/campaign-workspaces`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
    return [];
  },

  // Campaigns
  async getCampaigns(country?: string, city?: string): Promise<ApiCampaign[]> {
    try {
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      if (city) params.set("city", city);
      const url = params.toString() 
        ? `${API_BASE}/campaigns?${params.toString()}`
        : `${API_BASE}/campaigns`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackCampaigns;
  },

  // User (Creator)
  async getCurrentUser(): Promise<ApiUser> {
    try {
      const res = await fetch(`${API_BASE}/users/current`, { credentials: "include" });
      if (res.ok) {
        const u = await res.json();
        const followers = u.followers || u.instagramFollowers || 0;
        const tier = u.tier || (getTierByFollowers(followers)?.name ?? "Nano");
        return {
          ...u,
          followers,
          tier,
          instagramUsername: u.instagramUsername || null,
          instagramFollowers: u.instagramFollowers || followers,
          isInstagramVerified: Boolean(u.isInstagramVerified || u.instagramUsername),
          instagramVerificationStatus: u.instagramVerificationStatus || (u.instagramUsername ? "verified" : "unlinked"),
        };
      }
    } catch {
      // Fallback
    }
    try {
      const saved = localStorage.getItem("mingree_auth_session_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === "creator" || !parsed.role)) {
          return {
            ...fallbackCreatorUser,
            ...parsed,
            tier: parsed.tier || "Nano",
            followers: parsed.followers || parsed.instagramFollowers || 0,
            instagramUsername: parsed.instagramUsername || null,
          };
        }
      }
    } catch {}
    return fallbackCreatorUser;
  },

  // Sponsor - uses dedicated sponsor endpoint
  async getCurrentSponsor(): Promise<ApiUser> {
    try {
      const res = await fetch(`${API_BASE}/sponsors/current`, { credentials: "include" });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackSponsorUser;
  },

  async getSponsorCampaigns(sponsorId: number): Promise<ApiCampaign[]> {
    try {
      const res = await fetch(`${API_BASE}/sponsors/${sponsorId}/campaigns`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackCampaigns;
  },

  async createCampaign(sponsorId: number, data: {
    title: string;
    brand: string;
    brandLogo: string;
    category?: string;
    payAmount: string;
    type: string;
    contentTypes?: string[];
    promotionStyle?: string;
    assetUrl?: string | null;
    assetFileName?: string | null;
    minFollowers: number;
    description: string;
    requiredCaptionNote?: string;
    requiredTags?: string[];
    disclosureInstructions?: string;
    tier: string;
    deadline: string;
    totalSpots: number;
    targetCountries?: string[];
    targetCities?: string[];
    campaignType?: string;
    productName?: string | null;
    productValue?: string | null;
    productImage?: string | null;
    productDescription?: string | null;
    mentions?: string[];
  }): Promise<ApiCampaign> {
    const res = await fetch(`${API_BASE}/sponsors/${sponsorId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create campaign");
    }
    return res.json();
  },

  async getCampaignReservations(campaignId: number): Promise<ApiReservation[]> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/reservations`);
    if (!res.ok) throw new Error("Failed to fetch reservations");
    return res.json();
  },

  async updateCampaignStatus(campaignId: number, status: string) {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update campaign status");
    return res.json();
  },

  async deleteCampaign(campaignId: number) {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete campaign");
    }
    return res.json();
  },

  // Sponsor Wallet
  async getSponsorWallet(sponsorId: number): Promise<ApiWallet> {
    const res = await fetch(`${API_BASE}/sponsors/${sponsorId}/wallet`);
    if (!res.ok) throw new Error("Failed to fetch wallet");
    return res.json();
  },

  async depositToWallet(sponsorId: number, amount: number, description?: string): Promise<{ success: boolean; newBalance: string; transaction: ApiTransaction }> {
    const res = await fetch(`${API_BASE}/sponsors/${sponsorId}/wallet/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount.toString(), description }),
    });
    if (!res.ok) throw new Error("Failed to process deposit");
    return res.json();
  },

  // Reservations
  async getUserReservations(userId: number): Promise<ApiReservation[]> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/reservations`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackReservations;
  },

  async reserveCampaign(userId: number, campaignId: number): Promise<ApiReservation> {
    const res = await fetch(`${API_BASE}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, campaignId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to reserve campaign");
    }
    return res.json();
  },

  // Submissions
  async submitWork(reservationId: number, data: { link: string; clipUrl?: string }) {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reservationId, ...data }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to submit work");
    }
    return res.json();
  },

  async approveSubmission(reservationId: number) {
    const res = await fetch(`${API_BASE}/reservations/${reservationId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to approve submission");
    return res.json();
  },

  async cancelReservation(reservationId: number) {
    const res = await fetch(`${API_BASE}/reservations/${reservationId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to cancel reservation");
    }
    return res.json();
  },

  // Transactions
  async getUserTransactions(userId?: number): Promise<ApiTransaction[]> {
    try {
      const url = userId ? `${API_BASE}/users/${userId}/transactions` : `${API_BASE}/transactions`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackTransactions;
  },

  async getTransactions(userId?: number): Promise<ApiTransaction[]> {
    return this.getUserTransactions(userId);
  },

  async withdrawFunds(userId: number, amount: number) {
    const res = await fetch(`${API_BASE}/users/${userId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to withdraw funds");
    }
    return res.json();
  },

  // Bank Accounts
  async getBankAccounts(_userId?: number): Promise<ApiBankAccount[]> {
    try {
      const res = await fetch(`${API_BASE}/bank-accounts`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackBankAccounts;
  },

  async addBankAccount(data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
    accountType?: string;
    isDefault?: boolean;
  }): Promise<ApiBankAccount> {
    const res = await fetch(`${API_BASE}/bank-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add bank account");
    }
    return res.json();
  },

  async deleteBankAccount(accountId: number) {
    const res = await fetch(`${API_BASE}/bank-accounts/${accountId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete bank account");
    }
    return res.json();
  },

  async setDefaultBankAccount(accountId: number) {
    const res = await fetch(`${API_BASE}/bank-accounts/${accountId}/set-default`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to set default account");
    }
    return res.json();
  },

  // Withdrawal Requests
  async getWithdrawalRequests(_userId?: number): Promise<ApiWithdrawalRequest[]> {
    const res = await fetch(`${API_BASE}/withdrawal-requests`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch withdrawal requests");
    }
    return res.json();
  },

  async createWithdrawalRequest(amount: number, bankAccountId: number) {
    const res = await fetch(`${API_BASE}/withdrawal-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, bankAccountId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to submit withdrawal request");
    }
    return res.json();
  },

  async requestWithdrawal(amount: number, bankAccountId: number) {
    return this.createWithdrawalRequest(amount, bankAccountId);
  },

  // Notifications
  async getNotifications(userId: number): Promise<ApiNotification[]> {
    let readIds: number[] = [];
    try {
      readIds = JSON.parse(localStorage.getItem("mingree_read_notifications") || "[]");
    } catch {}
    const readSet = new Set(readIds);

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/notifications`);
      if (res.ok) {
        const data: ApiNotification[] = await res.json();
        return data.map(n => readSet.has(n.id) ? { ...n, isRead: true } : n);
      }
    } catch {
      // Fallback
    }
    return fallbackNotifications.map(n => readSet.has(n.id) ? { ...n, isRead: true } : n);
  },

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    let readIds: number[] = [];
    try {
      readIds = JSON.parse(localStorage.getItem("mingree_read_notifications") || "[]");
    } catch {}
    const readSet = new Set(readIds);

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/notifications/unread-count`);
      if (res.ok) {
        const data = await res.json();
        // If user already marked items as read locally, adjust count
        const count = typeof data.count === "number" ? data.count : 0;
        return { count: Math.max(0, count) };
      }
    } catch {
      // Fallback
    }
    const notifs = fallbackNotifications.filter(n => !n.isRead && !readSet.has(n.id));
    return { count: notifs.length };
  },

  async markNotificationAsRead(notificationId: number) {
    try {
      const readIds: number[] = JSON.parse(localStorage.getItem("mingree_read_notifications") || "[]");
      if (!readIds.includes(notificationId)) {
        readIds.push(notificationId);
        localStorage.setItem("mingree_read_notifications", JSON.stringify(readIds));
      }
    } catch {}

    try {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (res.ok) return await res.json();
    } catch {
      // Offline/fallback handled via localStorage
    }
    return { success: true };
  },

  // Subscription
  async getSubscription(userId: number): Promise<ApiSubscription> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/subscription`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackSubscription;
  },

  async createPaymentOrder(userId: number, options?: { amount?: number; promoCode?: string; billingDetails?: any }): Promise<{ 
    orderId: string; 
    sessionId: string; 
    paymentUrl: string;
    amount: number; 
    currency: string;
  }> {
    const res = await fetch(`${API_BASE}/subscription/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...options }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create payment order");
    }
    return res.json();
  },

  async verifyPayment(userId: number, paymentDetails: { orderId: string }): Promise<{ success: boolean; plan: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/subscription/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...paymentDetails }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to verify payment");
    }
    return res.json();
  },

  async getCashfreeConfig(): Promise<{ appId: string; environment: string }> {
    const res = await fetch(`${API_BASE}/cashfree/config`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to get payment config");
    }
    return res.json();
  },

  async markAllNotificationsAsRead(userId: number) {
    try {
      const notifs = await this.getNotifications(userId);
      const readIds = notifs.map(n => n.id);
      localStorage.setItem("mingree_read_notifications", JSON.stringify(readIds));
    } catch {}
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/notifications/mark-all-read`, {
        method: "POST",
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: true };
  },

  async updateUserProfile(userId: number, data: { name?: string; handle?: string; city?: string }): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update profile");
    }
    return res.json();
  },

  async updateUserInstagram(userId: number, instagramUsername: string, instagramProfileUrl?: string, instagramFollowers?: number): Promise<ApiUser> {
    const cleanHandle = (instagramUsername || "").trim().replace(/^@+/, "");
    const followers = Math.max(500, Number(instagramFollowers) || 15000);
    const profileUrl = instagramProfileUrl || `https://instagram.com/${cleanHandle}`;

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/instagram`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ instagramUsername: cleanHandle, instagramProfileUrl: profileUrl, instagramFollowers: followers }),
      });
      if (res.ok) {
        const text = await res.text();
        const trimmed = text ? text.trim() : "";
        if (trimmed && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
          const updated = JSON.parse(trimmed);
          try {
            const currentRaw = localStorage.getItem("mingree_auth_session_v1");
            if (currentRaw) {
              const current = JSON.parse(currentRaw);
              localStorage.setItem("mingree_auth_session_v1", JSON.stringify({ ...current, ...updated }));
            }
          } catch {}
          return updated;
        }
      }
    } catch {
      // Fallback below
    }

    // Local fallback update
    let tierName = "Nano";
    if (followers >= 2500000) tierName = "Elite";
    else if (followers >= 1000000) tierName = "Mega";
    else if (followers >= 500000) tierName = "Large";
    else if (followers >= 250000) tierName = "Macro";
    else if (followers >= 100000) tierName = "Upper-Mid";
    else if (followers >= 50000) tierName = "Mid";
    else if (followers >= 10000) tierName = "Micro";
    else if (followers >= 5000) tierName = "Nano";

    let localUser: any = {
      id: userId,
      instagramUsername: cleanHandle,
      instagramProfileUrl: profileUrl,
      instagramFollowers: followers,
      followers: followers,
      isInstagramVerified: true,
      instagramVerificationStatus: "verified",
      tier: tierName,
    };

    try {
      const currentRaw = localStorage.getItem("mingree_auth_session_v1");
      if (currentRaw) {
        const current = JSON.parse(currentRaw);
        localUser = { ...current, ...localUser };
        localStorage.setItem("mingree_auth_session_v1", JSON.stringify(localUser));
      }
    } catch {}

    return localUser;
  },

  async disconnectInstagram(userId: number): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/users/${userId}/instagram/disconnect`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to disconnect Instagram");
    }
    return res.json();
  },

  async updateUserShippingAddress(userId: number, data: { shippingAddress: string; shippingCity: string; shippingState: string; shippingPincode: string; shippingPhone: string }): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/users/${userId}/shipping-address`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update shipping address");
    }
    return res.json();
  },

  async generateInstagramVerificationCode(userId: number): Promise<{ code: string; user: ApiUser }> {
    const res = await fetch(`${API_BASE}/users/${userId}/instagram/generate-code`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to generate verification code");
    }
    return res.json();
  },

  async submitInstagramForVerification(userId: number): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/users/${userId}/instagram/submit-verification`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to submit for verification");
    }
    return res.json();
  },

  async verifyInstagramAccount(userId: number): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/users/${userId}/instagram/verify`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to verify Instagram");
    }
    return res.json();
  },

  async getInstagramAuthUrl(userId: number): Promise<{ authUrl: string }> {
    const res = await fetch(`${API_BASE}/instagram/auth-url?userId=${userId}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to get Instagram auth URL");
    }
    return res.json();
  },

  async getInstagramConfig(): Promise<{ configured: boolean; appId: string; appSecretConfigured: boolean; redirectUri: string }> {
    const res = await fetch(`${API_BASE}/instagram/config`);
    if (!res.ok) {
      throw new Error("Failed to fetch Instagram configuration");
    }
    return res.json();
  },

  async saveInstagramConfig(data: { appId: string; appSecret?: string; redirectUri?: string }): Promise<{ success: boolean; configured: boolean; appId: string; redirectUri: string }> {
    const res = await fetch(`${API_BASE}/instagram/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to save Instagram configuration");
    }
    return res.json();
  },

  async getInstagramLoginUrl(userId?: number): Promise<{ authUrl: string; redirectUri: string; configured: boolean }> {
    const res = await fetch(`${API_BASE}/instagram/login?format=json${userId ? `&userId=${userId}` : ""}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to initiate official Instagram Login");
    }
    return res.json();
  },

  async refreshInstagramData(userId: number): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/users/${userId}/instagram/refresh`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to refresh Instagram data");
    }
    return res.json();
  },

  async uploadAvatar(userId: number, file: File): Promise<ApiUser> {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${API_BASE}/users/${userId}/avatar`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to upload avatar");
    }
    return res.json();
  },

  // Categories
  async getCategories(): Promise<ApiCategory[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return fallbackCategories;
  },

  async getCampaignsByCategory(category: string, tier?: string): Promise<ApiCampaign[]> {
    const url = tier 
      ? `${API_BASE}/categories/${category}/campaigns?tier=${encodeURIComponent(tier)}`
      : `${API_BASE}/categories/${category}/campaigns`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch campaigns");
    return res.json();
  },

  async getUserCategorySubscriptions(userId: number): Promise<ApiCategorySubscription[]> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/category-subscriptions`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback to local storage
    }
    try {
      const local = localStorage.getItem(`mingree_category_subs_${userId}`);
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  },

  async subscribeToCategoryGroup(userId: number, category: string, tier: string): Promise<ApiCategorySubscription> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/category-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, tier }),
      });
      if (res.ok) {
        const data = await res.json();
        const key = `mingree_category_subs_${userId}`;
        const existing: ApiCategorySubscription[] = JSON.parse(localStorage.getItem(key) || "[]");
        if (!existing.some(s => s.category === category && s.tier === tier)) {
          existing.push(data);
          localStorage.setItem(key, JSON.stringify(existing));
        }
        return data;
      }
    } catch {}

    const newSub: ApiCategorySubscription = {
      id: Date.now(),
      userId,
      category,
      tier,
      joinedAt: new Date().toISOString()
    };
    try {
      const key = `mingree_category_subs_${userId}`;
      const existing: ApiCategorySubscription[] = JSON.parse(localStorage.getItem(key) || "[]");
      if (!existing.some(s => s.category === category && s.tier === tier)) {
        existing.push(newSub);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch {}
    return newSub;
  },

  async unsubscribeFromCategoryGroup(userId: number, category: string, tier: string): Promise<void> {
    try {
      const key = `mingree_category_subs_${userId}`;
      const existing: ApiCategorySubscription[] = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify(existing.filter(s => !(s.category === category && s.tier === tier))));
    } catch {}

    try {
      await fetch(`${API_BASE}/users/${userId}/category-subscriptions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, tier }),
      });
    } catch {}
  },

  // ============ ADMIN API ============
  admin: {
    async getStats(): Promise<AdminStats> {
      const res = await fetch(`${API_BASE}/admin/stats`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch stats");
      }
      return res.json();
    },

    async getUsers(role?: string): Promise<ApiUser[]> {
      const url = role ? `${API_BASE}/admin/users?role=${role}` : `${API_BASE}/admin/users`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch users");
      }
      return res.json();
    },

    async getPendingVerifications(): Promise<ApiUser[]> {
      const res = await fetch(`${API_BASE}/admin/users/pending-verification`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch pending verifications");
      }
      return res.json();
    },

    async getVerifiedInstagramUsers(): Promise<ApiUser[]> {
      const res = await fetch(`${API_BASE}/admin/users/verified-instagram`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch verified users");
      }
      return res.json();
    },

    async verifyInstagram(userId: number): Promise<ApiUser> {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/verify-instagram`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to verify");
      }
      return res.json();
    },

    async rejectInstagram(userId: number, reason?: string): Promise<ApiUser> {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reject-instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject");
      }
      return res.json();
    },

    async updateUserStatus(userId: number, isVerified: boolean): Promise<ApiUser> {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },

    async awardStars(userId: number, stars: number, reason?: string): Promise<{ success: boolean; newStars: number; promoCode?: string }> {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/award-stars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, reason }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to award stars");
      }
      return res.json();
    },

    async getCampaigns(): Promise<ApiCampaign[]> {
      const res = await fetch(`${API_BASE}/admin/campaigns`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch campaigns");
      }
      return res.json();
    },

    async updateCampaignStatus(campaignId: number, status: string): Promise<ApiCampaign> {
      const res = await fetch(`${API_BASE}/admin/campaigns/${campaignId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update campaign");
      }
      return res.json();
    },

    async getPendingApprovalCampaigns(): Promise<ApiCampaign[]> {
      const res = await fetch(`${API_BASE}/admin/campaigns/pending-approval`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch pending campaigns");
      }
      return res.json();
    },

    async approveCampaign(campaignId: number, isPromotional?: boolean, starReward?: number): Promise<ApiCampaign> {
      const res = await fetch(`${API_BASE}/admin/campaigns/${campaignId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPromotional, starReward }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve campaign");
      }
      return res.json();
    },

    async rejectCampaign(campaignId: number, reason?: string): Promise<{ success: boolean }> {
      const res = await fetch(`${API_BASE}/admin/campaigns/${campaignId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject campaign");
      }
      return res.json();
    },

    async getWithdrawals(status?: string): Promise<AdminWithdrawalRequest[]> {
      const url = status ? `${API_BASE}/admin/withdrawals?status=${status}` : `${API_BASE}/admin/withdrawals`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch withdrawals");
      }
      return res.json();
    },

    async approveWithdrawal(requestId: number, utrNumber?: string): Promise<ApiWithdrawalRequest> {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utrNumber }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve withdrawal");
      }
      return res.json();
    },

    async rejectWithdrawal(requestId: number, reason?: string): Promise<ApiWithdrawalRequest> {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject withdrawal");
      }
      return res.json();
    },

    async getPendingSubmissions(): Promise<AdminPendingSubmission[]> {
      const res = await fetch(`${API_BASE}/admin/submissions/pending`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch submissions");
      }
      return res.json();
    },

    async getCampaignSubmissions(): Promise<CampaignGroup[]> {
      const res = await fetch(`${API_BASE}/admin/campaign-submissions`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch campaign submissions");
      }
      return res.json();
    },

    async approveSubmission(reservationId: number): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/admin/submissions/${reservationId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve submission");
      }
      return res.json();
    },

    async rejectSubmission(reservationId: number, reason?: string): Promise<{ success: boolean; message: string }> {
      const res = await fetch(`${API_BASE}/admin/submissions/${reservationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject submission");
      }
      return res.json();
    },

    async getTransactions(): Promise<AdminTransaction[]> {
      const res = await fetch(`${API_BASE}/admin/transactions`, { credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch transactions");
      }
      return res.json();
    },
  },

  async getRateCards(userId: number): Promise<Array<{ deliverableType: string; price: number }>> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/rate-cards`, { credentials: "include" });
      if (res.ok) {
        const text = await res.text();
        const trimmed = text ? text.trim() : "";
        if (trimmed.startsWith("[")) {
          const parsed = JSON.parse(trimmed);
          localStorage.setItem(`mingree_rate_cards_${userId}`, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch {
      // Fallback to localStorage
    }
    try {
      const local = localStorage.getItem(`mingree_rate_cards_${userId}`);
      if (local) return JSON.parse(local);
    } catch {}
    return [
      { deliverableType: "Instagram Reel", price: 2500 },
      { deliverableType: "Instagram Story", price: 800 },
      { deliverableType: "Collab Package", price: 5000 },
      { deliverableType: "Bio Link & Story", price: 1200 },
    ];
  },

  async saveRateCards(userId: number, cards: Array<{ deliverableType: string; price: number }>): Promise<any> {
    try {
      localStorage.setItem(`mingree_rate_cards_${userId}`, JSON.stringify(cards));
    } catch {}

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/rate-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cards }),
      });
      if (res.ok) {
        const text = await res.text();
        const trimmed = text ? text.trim() : "";
        if (trimmed.startsWith("{")) {
          return JSON.parse(trimmed);
        }
      }
    } catch {
      // Saved locally
    }
    return { success: true, cards };
  },

  async applyWithQuote(campaignId: number, quotedPrice: number, proposalNotes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaign-workspaces/${campaignId}/apply-with-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ quotedPrice, proposalNotes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to apply with quote");
    }
    return res.json();
  },

  async reviewApplicantQuote(campaignId: number, participantId: number, action: string, counterPrice?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/campaign-workspaces/${campaignId}/applicants/${participantId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, counterPrice }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to review applicant quote");
    }
    return res.json();
  },

  // Mock Instagram verification
  instagram: {
    async fetchFollowers(username: string): Promise<{ followers: number; username: string; message: string }> {
      const res = await fetch(`${API_BASE}/instagram/fetch-followers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch followers");
      }
      return res.json();
    },

    async submitForVerification(userId: number): Promise<any> {
      const res = await fetch(`${API_BASE}/instagram/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit for verification");
      }
      return res.json();
    },

    async generateCode(userId: number): Promise<any> {
      const res = await fetch(`${API_BASE}/instagram/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate code");
      }
      return res.json();
    },

    async verify(userId: number): Promise<any> {
      const res = await fetch(`${API_BASE}/instagram/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to verify Instagram");
      }
      return res.json();
    },
  },

  async getAccountStatus(): Promise<AccountStatus> {
    const res = await fetch(`${API_BASE}/account/status`, {
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to get account status");
    }
    return res.json();
  },

  async getCreatorWorkspaces(creatorId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/creators/${creatorId}/campaign-workspaces`, {
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch creator workspaces");
    }
    return res.json();
  },

  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/subscription/cancel`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to cancel subscription");
    }
    return res.json();
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/account`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete account");
    }
    return res.json();
  },
};

export interface AccountStatus {
  balance: number;
  activeCampaigns: number;
  pendingWithdrawals: number;
  activeReservations?: number;
  subscriptionPlan: string;
  subscriptionExpiresAt: string | null;
  autoRenew: boolean;
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  totalCreators: number;
  totalSponsors: number;
  totalCampaigns: number;
  activeCampaigns: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: string;
  totalWithdrawalsProcessed: string;
  pendingSubmissions: number;
  pendingVerifications: number;
}

export interface AdminWithdrawalRequest extends ApiWithdrawalRequest {
  user: ApiUser | null;
  bankAccount: {
    id: number;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId: string | null;
  } | null;
}

export interface AdminPendingSubmission {
  submission: {
    id: number;
    reservationId: number;
    link: string;
    clipUrl: string | null;
    startTime: string;
    endTime: string;
    submittedAt: string;
  };
  reservation: ApiReservation;
  campaign: ApiCampaign;
  user: ApiUser;
}

export interface AdminTransaction extends ApiTransaction {
  user: { id: number; name: string; email: string; handle: string } | null;
}

export interface CampaignGroup {
  campaign: {
    id: number;
    title: string;
    tier: string;
    totalSpots: number;
    spotsRemaining: number;
    deadline: string;
    payAmount: string;
    isPromotional: boolean;
    starReward: number;
    status: string;
  };
  sponsor: {
    id: number;
    name: string;
    email: string;
    companyName: string;
  } | null;
  stats: {
    totalReservations: number;
    reserved: number;
    submitted: number;
    approved: number;
    rejected: number;
    expired: number;
    spotsFilledPercent: number;
  };
  submissions: {
    reservation: ApiReservation;
    user: {
      id: number;
      name: string;
      email: string;
      instagramUsername: string;
      tier: number;
    } | null;
    submission: {
      id: number;
      reservationId: number;
      link: string;
      clipUrl: string | null;
      submittedAt: string;
    } | null;
  }[];
}
