import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, decimal, boolean, index, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema as baseCreateInsertSchema } from "drizzle-zod";
const createInsertSchema: (table: any) => any = baseCreateInsertSchema as any;
import { z } from "zod";

// 1. Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("creator"), // creator, sponsor, admin
  handle: text("handle"),
  avatar: text("avatar"),
  tier: text("tier").default("Tier 1"),
  companyName: text("company_name"),
  status: text("status").notNull().default("active"),
  gstin: text("gstin"),
  pan: text("pan"),
  billingAddress: text("billing_address"),
  isEmailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 2. Email OTPs
export const emailOtps = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 3. Password Resets
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 4. Creator Profiles
export const creatorProfiles = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  instagramUserId: text("instagram_user_id"),
  username: text("username"),
  followers: integer("followers").notNull().default(0),
  tierLabel: text("tier_label"),
  medianViews: integer("median_views").notNull().default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
  indiaAudiencePct: decimal("india_audience_pct", { precision: 5, scale: 2 }).default("0.00"),
  riskScore: integer("risk_score").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | active | needs_review | blocked
  encryptedAccessToken: text("encrypted_access_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
});

// 5. Rate Cards
export const rateCards = pgTable("rate_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deliverableType: text("deliverable_type").notNull(), // Reel, Story, Collab
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 6. Campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  songUrl: text("song_url"),
  genre: text("genre"),
  language: text("language"),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  escrowHeld: decimal("escrow_held", { precision: 12, scale: 2 }).notNull().default("0.00"),
  pricingMode: text("pricing_mode").notNull().default("fixed"), // fixed | cap
  fixedPrice: decimal("fixed_price", { precision: 12, scale: 2 }),
  priceCapPer1k: decimal("price_cap_per_1k", { precision: 12, scale: 2 }),
  filters: jsonb("filters"),
  requiredTags: text("required_tags").array(),
  requiredCaptionNote: text("required_caption_note"),
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("active"),
}, (table) => [
  index("idx_campaigns_artist_status").on(table.artistId, table.status),
]);

// 7. Campaign Offers
export const campaignOffers = pgTable("campaign_offers", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  quotedPrice: decimal("quoted_price", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("invited"), // invited | quoted | auto_accepted | shortlisted | accepted | declined | withdrawn
  source: text("source").notNull().default("autopilot"), // autopilot | direct
}, (table) => [
  index("idx_offers_campaign_id").on(table.campaignId),
  index("idx_offers_creator_status").on(table.creatorId, table.status),
]);

// 8. Deals
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  artistId: integer("artist_id").notNull().references(() => users.id),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  feeArtist: decimal("fee_artist", { precision: 12, scale: 2 }).notNull(),
  feeCreator: decimal("fee_creator", { precision: 12, scale: 2 }).notNull(),
  creatorNet: decimal("creator_net", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("accepted"), // accepted | posted | approved | released | disputed | refunded | expired
  deadline: timestamp("deadline"),
  postUrl: text("post_url"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  firstReleaseAt: timestamp("first_release_at"),
  finalReleaseAt: timestamp("final_release_at"),
}, (table) => [
  index("idx_deals_campaign_id").on(table.campaignId),
  index("idx_deals_creator_status").on(table.creatorId, table.status),
  index("idx_deals_artist_status").on(table.artistId, table.status),
]);

// 9. Metric Snapshots
export const metricSnapshots = pgTable("metric_snapshots", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  takenAt: timestamp("taken_at").notNull().defaultNow(),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  stillLive: boolean("still_live").notNull().default(true),
});

// 10. Disputes
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  raisedByUserId: integer("raised_by_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  evidenceUrl: text("evidence_url"),
  status: text("status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
});

// 11. Wallets
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  escrowHeld: decimal("escrow_held", { precision: 12, scale: 2 }).notNull().default("0.00"),
});

// 12. Ledger Entries
export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  refType: text("ref_type"),
  refId: text("ref_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 13. Payment Orders
export const paymentOrders = pgTable("payment_orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  purpose: text("purpose").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
});

// 14. UPI Payments
export const upiPayments = pgTable("upi_payments", {
  id: serial("id").primaryKey(),
  utr: text("utr").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 15. Promo Codes
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 12, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
});

// 16. Promo Redemptions
export const promoRedemptions = pgTable("promo_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  promoCodeId: integer("promo_code_id").notNull().references(() => promoCodes.id),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_promo_user_unique").on(table.userId, table.promoCodeId),
]);

// 17. Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  plan: text("plan").notNull(),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
});

// 18. Withdrawals
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  tdsAmount: decimal("tds_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  payoutMethodId: integer("payout_method_id"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  utrRef: text("utr_ref"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 19. Payout Methods
export const payoutMethods = pgTable("payout_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // UPI, Bank
  accountDetails: jsonb("account_details").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

// 20. KYC
export const kyc = pgTable("kyc", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  panEncrypted: text("pan_encrypted"),
  name: text("name"),
  status: text("status").notNull().default("pending"),
});

// 21. Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 22. Instagram Identities
export const instagramIdentities = pgTable("instagram_identities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  instagramUserId: text("instagram_user_id").notNull(),
  username: text("username").notNull(),
  boundAt: timestamp("bound_at").notNull().defaultNow(),
});

// 23. Instagram Follower History
export const instagramFollowerHistory = pgTable("instagram_follower_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  followers: integer("followers").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// 24. Security Audit Logs
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: serial("id").primaryKey(),
  event: text("event").notNull(),
  mingreeUserId: integer("mingree_user_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 25. Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 26. App Config
export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// 27. Campaign Slots
export const campaignSlots = pgTable("campaign_slots", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  price: decimal("price", { precision: 14, scale: 2 }).notNull(),
  feeArtist: decimal("fee_artist", { precision: 14, scale: 2 }).notNull().default("0.00"),
  feeCreator: decimal("fee_creator", { precision: 14, scale: 2 }).notNull().default("0.00"),
  creatorNet: decimal("creator_net", { precision: 14, scale: 2 }).notNull().default("0.00"),
  status: text("status").notNull().default("reserved"),
  deadline: timestamp("deadline").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 28. Submissions
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").references(() => campaignSlots.id),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  creatorId: integer("creator_id").notNull().references(() => users.id),
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
});

// 29. Payouts
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  tdsAmount: decimal("tds_amount", { precision: 14, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 14, scale: 2 }).notNull(),
  payoutMethodId: integer("payout_method_id"),
  payoutDetails: jsonb("payout_details").notNull().default({}),
  status: text("status").notNull().default("pending"),
  transferRef: text("transfer_ref"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by").references(() => users.id),
});

// 30. Wallet Transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 14, scale: 2 }).notNull(),
  escrowAfter: decimal("escrow_after", { precision: 14, scale: 2 }).notNull().default("0.00"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 31. Platform Earnings
export const platformEarnings = pgTable("platform_earnings", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id"),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  source: text("source").notNull(),
  feeAmount: decimal("fee_amount", { precision: 14, scale: 2 }).notNull(),
  gstAmount: decimal("gst_amount", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalEarned: decimal("total_earned", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 32. Bank Accounts
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  upiId: text("upi_id"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  ifsc: text("ifsc"),
  bankName: text("bank_name"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 33. Admin Settings
export const adminSettings = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
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
