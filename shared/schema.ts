import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  bigserial,
  bigint,
  integer,
  timestamp,
  decimal,
  numeric,
  boolean,
  index,
  jsonb,
  uniqueIndex,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// 1. Users
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("creator"), // creator, sponsor, admin
  name: text("name").notNull().default(""),
  handle: text("handle"),
  phone: text("phone"),
  companyName: text("company_name"),
  gstNumber: text("gst_number"),
  brandCategory: text("brand_category"),
  bio: text("bio"),
  city: text("city"),
  state: text("state"),
  country: text("country").notNull().default("India"),
  niche: text("niche"),
  gender: text("gender"),
  tier: text("tier").notNull().default("Unlinked"),
  followers: integer("followers").notNull().default(0),
  instagramFollowers: integer("instagram_followers").notNull().default(0),
  avatar: text("avatar"),
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"),
  trustScore: integer("trust_score").notNull().default(60),
  isPro: boolean("is_pro").notNull().default(false),
  proExpiresAt: timestamp("pro_expires_at"),
  suspended: boolean("suspended").notNull().default(false),
  suspendReason: text("suspend_reason"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_users_role").on(table.role),
  index("idx_users_city").on(table.city),
  index("idx_users_created_at").on(table.createdAt),
]);

// 2. Email OTPs
export const emailOtps = pgTable("email_otps", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  purpose: text("purpose").notNull().default("verify"),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_email_otps_unique").on(table.email, table.purpose),
  index("idx_email_otps_expires").on(table.email, table.expiresAt),
]);

// 3. OAuth States (Browser/Session Bound Single-Use CSRF Protection)
export const oauthStates = pgTable("oauth_states", {
  state: text("state").primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  browserTokenHash: text("browser_token_hash").notNull(),
  returnTo: text("return_to").notNull().default("/profile"),
  redirectUri: text("redirect_uri").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_oauth_states_expires").on(table.expiresAt),
  index("idx_oauth_states_user").on(table.userId),
]);

// 4. Creator Profiles
export const creatorProfiles = pgTable("creator_profiles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  instagramUserId: text("instagram_user_id").unique(),
  username: text("username"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  followers: integer("followers").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  mediaCount: integer("media_count").notNull().default(0),
  medianViews: integer("median_views").notNull().default(0),
  engagementRate: numeric("engagement_rate", { precision: 6, scale: 2 }).notNull().default("0.00"),
  tier: text("tier").notNull().default("Unlinked"),
  status: text("status").notNull().default("pending"),
  available: boolean("available").notNull().default(true),
  riskScore: integer("risk_score").notNull().default(0),
  riskFlags: jsonb("risk_flags").notNull().default([]),
  accessTokenEnc: text("access_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at"),
  metricsUpdatedAt: timestamp("metrics_updated_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_creator_profiles_username").on(table.username),
  index("idx_creator_profiles_followers").on(table.followers),
]);

// 5. Instagram Identities (Anti-Farming & Cooldown)
export const instagramIdentities = pgTable("instagram_identities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  instagramUserId: text("instagram_user_id").notNull().unique(),
  username: text("username"),
  firstUserId: bigint("first_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  currentUserId: bigint("current_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  historicalUserIds: bigint("historical_user_ids", { mode: "number" }).array(),
  connectCount: integer("connect_count").notNull().default(1),
  firstLinkedAt: timestamp("first_linked_at").notNull().defaultNow(),
  linkedAt: timestamp("linked_at").notNull().defaultNow(),
  unlinkedAt: timestamp("unlinked_at"),
  cooldownUntil: timestamp("cooldown_until"),
}, (table) => [
  index("idx_instagram_identities_current_user").on(table.currentUserId),
  index("idx_instagram_identities_username").on(table.username),
]);

// 6. Rate Cards
export const rateCards = pgTable("rate_cards", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  deliverableType: text("deliverable_type").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }).notNull(),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rate_cards_creator_deliverable").on(table.creatorId, table.deliverableType),
]);

// 7. Category Subscriptions
export const categorySubscriptions = pgTable("category_subscriptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  categorySlug: text("category_slug"),
  tier: text("tier").notNull().default("Nano"),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull().default("500.00"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_category_sub_unique").on(table.userId, table.category, table.tier),
  index("idx_category_sub_user").on(table.userId),
]);

// 8. Campaigns
export const campaigns = pgTable("campaigns", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  artistId: bigint("artist_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  brand: text("brand"),
  brandLogo: text("brand_logo"),
  category: text("category").notNull().default("music_reels"),
  songUrl: text("song_url"),
  audioUrl: text("audio_url"),
  referenceVideoUrl: text("reference_video_url"),
  productAssets: jsonb("product_assets").notNull().default([]),
  genre: text("genre"),
  language: text("language"),
  description: text("description"),
  deliverableType: text("deliverable_type").notNull().default("reel"),
  contentTypes: text("content_types").array().notNull().default(sql`ARRAY['Reel']::text[]`),
  promotionStyle: text("promotion_style"),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("0.00"),
  budgetRemaining: numeric("budget_remaining", { precision: 12, scale: 2 }).notNull().default("0.00"),
  escrowHeld: numeric("escrow_held", { precision: 12, scale: 2 }).notNull().default("0.00"),
  committedPayouts: numeric("committed_payouts", { precision: 12, scale: 2 }).notNull().default("0.00"),
  releasedPayouts: numeric("released_payouts", { precision: 12, scale: 2 }).notNull().default("0.00"),
  pricingMode: text("pricing_mode").notNull().default("fixed"),
  bookingModel: text("booking_model").notNull().default("instant"),
  fixedPrice: numeric("fixed_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalSpots: integer("total_spots").notNull().default(1),
  spotsRemaining: integer("spots_remaining").notNull().default(1),
  reservedSlots: integer("reserved_slots").notNull().default(0),
  minFollowers: integer("min_followers").notNull().default(1000),
  minMedianViews: integer("min_median_views").notNull().default(500),
  minDurationSecs: integer("min_duration_secs").notNull().default(15),
  tier: text("tier"),
  targetTiers: text("target_tiers").array().notNull().default(sql`'{}'::text[]`),
  targetCities: text("target_cities").array().notNull().default(sql`'{}'::text[]`),
  targetCountries: text("target_countries").array().notNull().default(sql`ARRAY['India']::text[]`),
  requiredTags: text("required_tags").array().notNull().default(sql`'{}'::text[]`),
  requiredMentions: text("required_mentions").array().notNull().default(sql`'{}'::text[]`),
  captionNote: text("caption_note"),
  requiredCaptionNote: text("required_caption_note"),
  disclosureInstructions: text("disclosure_instructions").notNull().default("#ad | Paid Partnership"),
  dealWindowHours: integer("deal_window_hours").notNull().default(48),
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_campaigns_artist_id").on(table.artistId),
  index("idx_campaigns_status").on(table.status),
  index("idx_campaigns_created_at").on(table.createdAt),
]);

// 9. Campaign Offers
export const campaignOffers = pgTable("campaign_offers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  deliverableType: text("deliverable_type").notNull().default("reel"),
  creatorQuote: numeric("creator_quote", { precision: 12, scale: 2 }),
  artistCounter: numeric("artist_counter", { precision: 12, scale: 2 }),
  agreedPrice: numeric("agreed_price", { precision: 12, scale: 2 }),
  round: integer("round").notNull().default(1),
  status: text("status").notNull().default("invited"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_campaign_offers_unique").on(table.campaignId, table.creatorId),
  index("idx_campaign_offers_creator_status").on(table.creatorId, table.status),
  index("idx_campaign_offers_campaign_id").on(table.campaignId),
]);

// 10. Deals
export const deals = pgTable("deals", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).references(() => campaignOffers.id, { onDelete: "set null" }),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  artistId: bigint("artist_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  deliverableType: text("deliverable_type").notNull().default("reel"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  artistCost: numeric("artist_cost", { precision: 12, scale: 2 }).notNull().default("0.00"),
  feeArtist: numeric("fee_artist", { precision: 12, scale: 2 }).notNull().default("0.00"),
  feeCreator: numeric("fee_creator", { precision: 12, scale: 2 }).notNull().default("0.00"),
  creatorNet: numeric("creator_net", { precision: 12, scale: 2 }).notNull().default("0.00"),
  status: text("status").notNull().default("accepted"),
  postUrl: text("post_url"),
  postMediaId: text("post_media_id"),
  audioConfirmed: boolean("audio_confirmed").notNull().default(false),
  resubmitCount: integer("resubmit_count").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  deadline: timestamp("deadline").notNull(),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  firstReleaseAt: timestamp("first_release_at"),
  finalReleaseAt: timestamp("final_release_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_deals_campaign_id").on(table.campaignId),
  index("idx_deals_artist_id").on(table.artistId),
  index("idx_deals_creator_status").on(table.creatorId, table.status),
  index("idx_deals_status_deadline").on(table.status, table.deadline),
]);

// 11. Workspace Participants (Canonical Campaign Slots, Applications & Workspaces)
export const workspaceParticipants = pgTable("workspace_participants", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorName: text("creator_name").notNull(),
  creatorHandle: text("creator_handle").notNull(),
  creatorAvatar: text("creator_avatar"),
  creatorFollowers: integer("creator_followers").notNull().default(0),
  creatorMedianViews: integer("creator_median_views").notNull().default(0),
  status: text("status").notNull().default("pending"),
  payoutAmount: numeric("payout_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  baseRate: numeric("base_rate", { precision: 12, scale: 2 }),
  briefAcknowledgedVersion: integer("brief_acknowledged_version").notNull().default(1),
  draftSubmission: jsonb("draft_submission"),
  draftStatus: text("draft_status").notNull().default("none"),
  draftFeedbackNotes: text("draft_feedback_notes"),
  submission: jsonb("submission"),
  revisions: jsonb("revisions").notNull().default([]),
  negotiationStatus: text("negotiation_status").notNull().default("initial"),
  lastOfferedPrice: numeric("last_offered_price", { precision: 12, scale: 2 }),
  lastOfferBy: text("last_offer_by"),
  reservedAt: timestamp("reserved_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // nullable!
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_workspace_participants_unique").on(table.campaignId, table.creatorId),
  index("idx_workspace_participants_campaign").on(table.campaignId, table.status),
  index("idx_workspace_participants_creator").on(table.creatorId, table.status),
]);

// 12. Submissions
export const submissions = pgTable("submissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  participantId: bigint("participant_id", { mode: "number" }).unique().references(() => workspaceParticipants.id, { onDelete: "set null" }),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  postUrl: text("post_url").notNull(),
  postMediaId: text("post_media_id"),
  audioConfirmed: boolean("audio_confirmed").notNull().default(false),
  viewsCount: integer("views_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_submissions_creator_status").on(table.creatorId, table.status),
  index("idx_submissions_campaign_id").on(table.campaignId),
]);

// 13. Workspace Messages
export const workspaceMessages = pgTable("workspace_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  senderId: bigint("sender_id", { mode: "number" }).notNull().default(0),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull(),
  senderAvatar: text("sender_avatar"),
  recipientId: bigint("recipient_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  attachments: jsonb("attachments").notNull().default([]),
  isAnnouncement: boolean("is_announcement").notNull().default(false),
  isBriefChange: boolean("is_brief_change").notNull().default(false),
  briefVersion: integer("brief_version"),
  negotiationOffer: jsonb("negotiation_offer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_workspace_messages_campaign_created").on(table.campaignId, table.createdAt),
  index("idx_workspace_messages_recipient").on(table.campaignId, table.recipientId),
]);

// 14. Workspace Message Reads (Lock-Free Read Receipts)
export const workspaceMessageReads = pgTable("workspace_message_reads", {
  messageId: bigint("message_id", { mode: "number" }).notNull().references(() => workspaceMessages.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.messageId, table.userId] }),
  index("idx_workspace_message_reads_user").on(table.userId, table.messageId),
]);

// 15. Campaign Brief Versions
export const campaignBriefVersions = pgTable("campaign_brief_versions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  changesSummary: text("changes_summary").notNull(),
  diffs: jsonb("diffs").notNull().default([]),
  briefSnapshot: jsonb("brief_snapshot").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_campaign_brief_versions_unique").on(table.campaignId, table.version),
  index("idx_campaign_brief_versions_campaign").on(table.campaignId, table.version),
]);

// 16. Metric Snapshots
export const metricSnapshots = pgTable("metric_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  dealId: bigint("deal_id", { mode: "number" }).notNull().references(() => deals.id, { onDelete: "cascade" }),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  stillLive: boolean("still_live").notNull().default(true),
  checkpoint: text("checkpoint").notNull().default("auto"),
  takenAt: timestamp("taken_at").notNull().defaultNow(),
}, (table) => [
  index("idx_metric_snapshots_deal_id").on(table.dealId),
]);

// 17. Disputes
export const disputes = pgTable("disputes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  dealId: bigint("deal_id", { mode: "number" }).notNull().references(() => deals.id, { onDelete: "cascade" }),
  raisedByUserId: bigint("raised_by_user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  evidenceUrls: text("evidence_urls").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedByAdminId: bigint("resolved_by_admin_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("idx_disputes_deal_id").on(table.dealId),
  index("idx_disputes_status").on(table.status),
]);

// 18. Wallets
export const wallets = pgTable("wallets", {
  userId: bigint("user_id", { mode: "number" }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  escrowHeld: numeric("escrow_held", { precision: 12, scale: 2 }).notNull().default("0.00"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 19. Ledger Entries (Financial Audit Trail)
export const ledgerEntries = pgTable("ledger_entries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
  refType: text("ref_type"),
  refId: text("ref_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_ledger_entries_user_created").on(table.userId, table.createdAt),
  index("idx_ledger_entries_type").on(table.type),
]);

// 20. Wallet Transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
  escrowAfter: numeric("escrow_after", { precision: 12, scale: 2 }).notNull().default("0.00"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_wallet_transactions_user_created").on(table.userId, table.createdAt),
]);

// 21. Payment Orders (Cashfree)
export const paymentOrders = pgTable("payment_orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: text("order_id").notNull().unique(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  purpose: text("purpose").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  cashfreePaymentId: text("cashfree_payment_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
}, (table) => [
  index("idx_payment_orders_user_id").on(table.userId, table.createdAt),
  index("idx_payment_orders_status").on(table.status),
]);

// 22. UPI Payments
export const upiPayments = pgTable("upi_payments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  utr: text("utr").notNull().unique(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_upi_payments_status").on(table.status, table.createdAt),
  index("idx_upi_payments_user_id").on(table.userId),
]);

// 23. KYC (Encrypted PAN + Masked PAN)
export const kyc = pgTable("kyc", {
  userId: bigint("user_id", { mode: "number" }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  panEncrypted: text("pan_encrypted").notNull(),
  panMasked: text("pan_masked").notNull(),
  fullNameOnPan: text("full_name_on_pan").notNull().default(""),
  name: text("name"),
  dob: date("dob").notNull().default("2000-01-01"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
}, (table) => [
  index("idx_kyc_status").on(table.status),
]);

// 24. Payout Methods (Encrypted Bank/UPI Details)
export const payoutMethods = pgTable("payout_methods", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // UPI, Bank
  accountDetails: jsonb("account_details").notNull().default({}),
  accountDetailsEncrypted: text("account_details_encrypted").notNull().default(""),
  maskedAccount: text("masked_account").notNull().default(""),
  isDefault: boolean("is_default").notNull().default(false),
  isPrimary: boolean("is_primary").notNull().default(true),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_payout_methods_user_id").on(table.userId),
]);

// 25. Withdrawals
export const withdrawals = pgTable("withdrawals", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  tdsAmount: numeric("tds_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  payoutMethodId: bigint("payout_method_id", { mode: "number" }).references(() => payoutMethods.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  utr: text("utr"),
  utrRef: text("utr_ref"),
  rejectionReason: text("rejection_reason"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
}, (table) => [
  index("idx_withdrawals_user_id").on(table.userId, table.requestedAt),
  index("idx_withdrawals_status").on(table.status, table.requestedAt),
]);

// 26. Promo Codes
export const promoCodes = pgTable("promo_codes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("percentage"),
  discountType: text("discount_type").notNull().default("percentage"),
  value: numeric("value", { precision: 8, scale: 2 }).notNull().default("0.00"),
  discountValue: numeric("discount_value", { precision: 8, scale: 2 }).notNull().default("0.00"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  perUserLimit: integer("per_user_limit").notNull().default(1),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 27. Promo Redemptions
export const promoRedemptions = pgTable("promo_redemptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  promoCodeId: bigint("promo_code_id", { mode: "number" }).notNull().references(() => promoCodes.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_promo_user_unique").on(table.promoCodeId, table.userId),
]);

// 28. Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("pro_monthly"),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  promoCodeId: bigint("promo_code_id", { mode: "number" }).references(() => promoCodes.id, { onDelete: "set null" }),
  paymentOrderId: text("payment_order_id"),
  autoRenew: boolean("auto_renew").notNull().default(false),
}, (table) => [
  index("idx_subscriptions_status_expires").on(table.status, table.expiresAt),
]);

// 29. Notifications
export const notifications = pgTable("notifications", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("general"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  message: text("message").notNull().default(""),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_notifications_user_unread").on(table.userId, table.isRead, table.createdAt),
]);

// 30. Security Audit Logs
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  event: text("event").notNull(),
  mingreeUserId: bigint("mingree_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  instagramUsername: text("instagram_username"),
  instagramUserId: text("instagram_user_id"),
  riskScore: integer("risk_score").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("LOW"),
  riskFactors: jsonb("risk_factors").notNull().default([]),
  flags: jsonb("flags").notNull().default([]),
  followers: integer("followers").notNull().default(0),
  mediaCount: integer("media_count").notNull().default(0),
  ipAddress: text("ip_address"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  decision: text("decision").notNull().default("ALLOW"),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_security_audit_logs_event").on(table.event, table.createdAt),
  index("idx_security_audit_logs_user").on(table.mingreeUserId, table.createdAt),
]);

// 31. Cities
export const cities = pgTable("cities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  state: text("state").notNull(),
  country: text("country").notNull().default("India"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 32. City Change Requests
export const cityChangeRequests = pgTable("city_change_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  fromCity: text("from_city"),
  toCity: text("to_city").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  decidedAt: timestamp("decided_at"),
}, (table) => [
  index("idx_city_change_requests_status").on(table.status, table.createdAt),
]);

// 33. Admin Settings
export const adminSettings = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 34. App Config
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Zod Schemas
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["creator", "sponsor"]).default("creator"),
  companyName: z.string().optional(),
  country: z.string().default("IN"),
  city: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const PROMOTION_CATEGORIES = [
  { id: "music_reels", name: "Music Reels", icon: "music", description: "Song promotions, lyrical videos, dance reels" },
  { id: "lifestyle", name: "Lifestyle", icon: "heart", description: "Fashion, beauty, daily life content" },
  { id: "tech", name: "Tech & Gadgets", icon: "smartphone", description: "Tech reviews, gadget promotions" },
  { id: "food", name: "Food & Beverages", icon: "utensils", description: "Food reviews, restaurant promos, recipes" },
  { id: "gaming", name: "Gaming", icon: "gamepad-2", description: "Game promotions, gaming content" },
  { id: "fitness", name: "Fitness & Health", icon: "dumbbell", description: "Fitness products, health tips" },
  { id: "education", name: "Education", icon: "graduation-cap", description: "Course promotions, educational content" },
  { id: "travel", name: "Travel", icon: "plane", description: "Travel destinations, tourism promos" },
  { id: "finance", name: "Finance & Apps", icon: "wallet", description: "Fintech apps, trading platforms" },
  { id: "ecommerce", name: "E-commerce", icon: "shopping-bag", description: "Product promotions, brand collaborations" },
] as const;

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free Creator",
    price: 0,
    features: [
      "Access to public song campaigns",
      "Standard 7.5% platform fee",
      "Standard payout support",
      "Official Instagram verification badge",
    ],
  },
  pro: {
    id: "pro",
    name: "Creator Pro",
    price: 399,
    features: [
      "Lower 4.0% creator fee (save 3.5% on every deal)",
      "Featured placement in artist directory",
      "Early campaign invites (24 hours in advance)",
      "Detailed metrics & views analytics",
      "Priority KYC and withdrawal processing",
    ],
  },
};
