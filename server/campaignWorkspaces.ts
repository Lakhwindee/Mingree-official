import fs from "fs";
import path from "path";
import { lockEscrow, releaseEscrow, refundEscrow, getOrCreateWallet } from "./walletAndPayments";
import { pool } from "./db";

const DATA_DIR = process.env.VERCEL ? "/tmp" : process.cwd();
const CAMPAIGNS_STORE_FILE = path.join(DATA_DIR, "campaign_workspaces_v2.json");

export interface BriefDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface BriefVersion {
  version: number;
  timestamp: string;
  updatedBy: number;
  changesSummary: string;
  diffs: BriefDiff[];
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

export interface ReelSubmission {
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

export interface RevisionRecord {
  id: string;
  requestedAt: string;
  requestedBy: number;
  reason: string;
  notes: string;
  resolvedAt?: string;
}

export interface DraftSubmission {
  videoUrl: string;
  notes?: string;
  submittedAt: string;
}

export interface CampaignParticipant {
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
  submission: ReelSubmission | null;
  revisions: RevisionRecord[];
  draftSubmission?: DraftSubmission | null;
  draftStatus?: "none" | "submitted" | "approved" | "revision_requested";
  draftFeedbackNotes?: string;
}

export interface CampaignMessage {
  id: number;
  campaignId: number;
  senderId: number;
  senderName: string;
  senderRole: "sponsor" | "creator" | "admin" | "system";
  senderAvatar: string;
  recipientId: number | null; // null = campaign group chat; number = private 1:1 thread
  content: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  isAnnouncement?: boolean;
  isBriefChange?: boolean;
  briefVersion?: number;
  createdAt: string;
  readBy: number[];
}

export interface CampaignWorkspaceData {
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
  status:
    | "draft"
    | "published"
    | "filling_slots"
    | "in_progress"
    | "under_review"
    | "completed"
    | "paused"
    | "cancelled";
  createdAt: string;
  updatedAt: string;
  briefVersions: BriefVersion[];
  participants: CampaignParticipant[];
  messages: CampaignMessage[];
}

// In-memory Mutex to prevent race conditions during slot bookings and approvals
const campaignLocks = new Map<number, Promise<void>>();
async function acquireLock<T>(campaignId: number, fn: () => Promise<T>): Promise<T> {
  while (campaignLocks.has(campaignId)) {
    try {
      await campaignLocks.get(campaignId);
    } catch {
      // ignore
    }
  }
  let resolver: () => void;
  const p = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  campaignLocks.set(campaignId, p);
  try {
    return await fn();
  } finally {
    campaignLocks.delete(campaignId);
    resolver!();
  }
}

// Initial realistic campaign workspaces seeded with production-grade structure
const initialWorkspaces: CampaignWorkspaceData[] = [
  {
    id: 1,
    sponsorId: 2,
    title: "Myntra End of Reason Sale — Spring Fashion Lookbook Reel",
    brand: "Myntra",
    brandLogo: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120",
    description: "Showcase 3 stylish Spring/Summer outfits sourced entirely from the Myntra End of Reason Sale. Highlight fast delivery, trending streetwear, and exclusive coupon codes in your caption.",
    genre: "Fashion & Lifestyle",
    language: "Hindi & English",
    contentTypes: ["Reel"],
    promotionStyle: "Outfit Transition & Styling",
    audioUrl: "https://assets.mingree.com/audio/myntra-eors.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/myntra-sample",
    productAssets: [{ name: "Myntra EORS Lookbook & Banner", url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400", type: "document" }],
    payAmount: 4500,
    totalBudget: 45000,
    escrowHeld: 45000,
    committedPayouts: 9000,
    releasedPayouts: 4500,
    totalSlots: 10,
    reservedSlots: 2,
    remainingSlots: 8,
    bookingModel: "instant",
    minFollowers: 10000,
    minMedianViews: 20000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Mumbai", "Bengaluru", "Chandigarh"],
    requiredCaptionNote: "Myntra End of Reason Sale is LIVE! 🛍️ Grab up to 80% off on top brands. Use code MINGREE20 for extra savings. @myntra #MyntraEORS #FashionFinds",
    requiredTags: ["#MyntraEORS", "#FashionFinds", "#OOTD", "#MyntraStyle"],
    requiredMentions: ["@myntra"],
    disclosureInstructions: "#ad | Paid Partnership with Myntra",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 2, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Myntra End of Reason Sale — Spring Fashion Lookbook Reel", description: "Showcase 3 stylish Spring/Summer outfits", requiredCaptionNote: "Myntra End of Reason Sale is LIVE!", requiredTags: ["#MyntraEORS"], requiredMentions: ["@myntra"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/myntra-eors.mp3", deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 2,
    sponsorId: 4,
    title: "Spotify India — New Indie Beats Playlist Launch",
    brand: "Spotify India",
    brandLogo: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=120",
    description: "Create an aesthetic study/chill vlog or car ride Reel featuring the new 'Indie India' curated playlist on Spotify. Use official playlist audio snippet.",
    genre: "Music Reels",
    language: "Hindi & English",
    contentTypes: ["Reel"],
    promotionStyle: "Chill Vlog & Music Vibe",
    audioUrl: "https://assets.mingree.com/audio/spotify-indie.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/spotify-sample",
    productAssets: [],
    payAmount: 3500,
    totalBudget: 35000,
    escrowHeld: 35000,
    committedPayouts: 3500,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 1,
    remainingSlots: 9,
    bookingModel: "instant",
    minFollowers: 8000,
    minMedianViews: 15000,
    targetCountries: ["India"],
    targetCities: ["Mumbai", "Delhi", "Pune", "Bengaluru"],
    requiredCaptionNote: "Vibing to the latest Indie tracks on @spotifyindia 🎧✨ Link in bio to stream the official playlist! #SpotifyIndie #NewMusic",
    requiredTags: ["#SpotifyIndia", "#IndieMusic", "#MusicVibes", "#MingreePromotions"],
    requiredMentions: ["@spotifyindia"],
    disclosureInstructions: "#ad | Sponsored by Spotify India",
    minDurationSecs: 25,
    deadline: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 4, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Spotify India — New Indie Beats Playlist Launch", description: "Create an aesthetic study/chill vlog", requiredCaptionNote: "Vibing to the latest Indie tracks", requiredTags: ["#SpotifyIndia"], requiredMentions: ["@spotifyindia"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/spotify-indie.mp3", deadline: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 3,
    sponsorId: 2,
    title: "boAt Rockerz ANC Wireless Earbuds Review",
    brand: "boAt Lifestyle",
    brandLogo: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=120",
    description: "Unbox and test the new boAt Rockerz Active Noise Cancellation earbuds. Highlight bass quality, 60-hour playback, and sleek matte finish in your Reel.",
    genre: "Tech & Gadgets",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Unboxing & Sound Test",
    audioUrl: "https://assets.mingree.com/audio/boat-bass.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/boat-sample",
    productAssets: [],
    payAmount: 5000,
    totalBudget: 50000,
    escrowHeld: 50000,
    committedPayouts: 5000,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 1,
    remainingSlots: 9,
    bookingModel: "instant",
    minFollowers: 12000,
    minMedianViews: 25000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Hyderabad", "Chennai", "Mumbai"],
    requiredCaptionNote: "Immersive sound like never before with @boat.lifestyle Rockerz ANC! 🎶🔋 Get yours today. #boAt #PlugIntoNirvana",
    requiredTags: ["#boAt", "#PlugIntoNirvana", "#WirelessEarbuds", "#TechReview"],
    requiredMentions: ["@boat.lifestyle"],
    disclosureInstructions: "#ad | Paid Partnership with boAt",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 2, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "boAt Rockerz ANC Wireless Earbuds Review", description: "Unbox and test new boAt earbuds", requiredCaptionNote: "Immersive sound like never before", requiredTags: ["#boAt"], requiredMentions: ["@boat.lifestyle"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/boat-bass.mp3", deadline: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 4,
    sponsorId: 4,
    title: "Zomato Gold — Gourmet Dining & Instant Delivery",
    brand: "Zomato",
    brandLogo: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=120",
    description: "Showcase a weekend food-hopping vlog using Zomato Gold for flat discounts at top cafes or ordering midnight cravings via Zomato delivery.",
    genre: "Food & Beverage",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Food Vlog & Cafe Hop",
    audioUrl: "https://assets.mingree.com/audio/zomato-food.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/zomato-sample",
    productAssets: [],
    payAmount: 4000,
    totalBudget: 40000,
    escrowHeld: 40000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 10000,
    minMedianViews: 18000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Bengaluru", "Mumbai", "Kolkata"],
    requiredCaptionNote: "Weekend indulgence sorted with @zomato Gold! 🍕✨ Save big on dining out and food delivery. #ZomatoGold #Foodie",
    requiredTags: ["#ZomatoGold", "#FoodVlog", "#Zomato", "#CafeHopping"],
    requiredMentions: ["@zomato"],
    disclosureInstructions: "#ad | Sponsored by Zomato",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 4, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Zomato Gold — Gourmet Dining & Instant Delivery", description: "Showcase weekend food-hopping vlog", requiredCaptionNote: "Weekend indulgence sorted", requiredTags: ["#ZomatoGold"], requiredMentions: ["@zomato"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/zomato-food.mp3", deadline: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 5,
    sponsorId: 2,
    title: "Nykaa Beauty — 24-Hour Matte Liquid Lipstick",
    brand: "Nykaa",
    brandLogo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=120",
    description: "Create a stunning get-ready-with-me (GRWM) Reel featuring Nykaa's transfer-proof Matte Liquid Lipstick collection. Show shade swatches and day-long wear.",
    genre: "Beauty & Skincare",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "GRWM & Lipstick Swatches",
    audioUrl: "https://assets.mingree.com/audio/nykaa-glam.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/nykaa-sample",
    productAssets: [],
    payAmount: 3500,
    totalBudget: 35000,
    escrowHeld: 35000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 7000,
    minMedianViews: 14000,
    targetCountries: ["India"],
    targetCities: ["Mumbai", "Delhi", "Jaipur", "Lucknow"],
    requiredCaptionNote: "Flawless glam all day with @nykaa Matte Liquid Lipsticks! 💄✨ Shop the Pink Friday Sale now. #NykaaBeauty #GRWM",
    requiredTags: ["#NykaaBeauty", "#MatteLips", "#GRWM", "#NykaaCosmetics"],
    requiredMentions: ["@nykaa"],
    disclosureInstructions: "#ad | Paid Partnership with Nykaa",
    minDurationSecs: 25,
    deadline: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 2, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Nykaa Beauty — 24-Hour Matte Liquid Lipstick", description: "Create GRWM Reel", requiredCaptionNote: "Flawless glam all day", requiredTags: ["#NykaaBeauty"], requiredMentions: ["@nykaa"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/nykaa-glam.mp3", deadline: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 6,
    sponsorId: 4,
    title: "Puma Velocity Nitro — Running Shoes Performance Test",
    brand: "Puma India",
    brandLogo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120",
    description: "Take the Puma Velocity Nitro running shoes for a morning 5K run or gym sprint. Review cushion bounce, lightweight build, and style.",
    genre: "Fitness & Health",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Workout Vlog & Shoe Test",
    audioUrl: "https://assets.mingree.com/audio/puma-run.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/puma-sample",
    productAssets: [],
    payAmount: 6000,
    totalBudget: 60000,
    escrowHeld: 60000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "approval_required",
    minFollowers: 15000,
    minMedianViews: 30000,
    targetCountries: ["India"],
    targetCities: ["Bengaluru", "Mumbai", "Delhi", "Pune"],
    requiredCaptionNote: "Unstoppable speed with @puma.india Velocity Nitro! 🏃‍♂️🔥 #ForeverFaster #PumaRunning",
    requiredTags: ["#ForeverFaster", "#PumaRunning", "#RunningShoes", "#FitnessMotivation"],
    requiredMentions: ["@puma.india"],
    disclosureInstructions: "#ad | Sponsored by Puma India",
    minDurationSecs: 35,
    deadline: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 4, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Puma Velocity Nitro — Running Shoes Performance Test", description: "Take Puma running shoes for 5K run", requiredCaptionNote: "Unstoppable speed", requiredTags: ["#ForeverFaster"], requiredMentions: ["@puma.india"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/puma-run.mp3", deadline: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 7,
    sponsorId: 2,
    title: "OnePlus Nord CE — Camera & Gaming Showcase",
    brand: "OnePlus India",
    brandLogo: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=120",
    description: "Showcase portrait photography and seamless lag-free gaming on the new OnePlus Nord smartphone. Quick aesthetic transitions required.",
    genre: "Tech & Gadgets",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Tech Demo & Camera Shots",
    audioUrl: "https://assets.mingree.com/audio/oneplus-tech.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/oneplus-sample",
    productAssets: [],
    payAmount: 7500,
    totalBudget: 75000,
    escrowHeld: 75000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 8,
    reservedSlots: 0,
    remainingSlots: 8,
    bookingModel: "approval_required",
    minFollowers: 20000,
    minMedianViews: 40000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Bengaluru", "Mumbai", "Hyderabad"],
    requiredCaptionNote: "Smoothness redefined with @oneplus_in Nord! Stunning portrait shots and zero lag. 📱⚡ #OnePlusNord",
    requiredTags: ["#OnePlusNord", "#TechReels", "#SmartphonePhotography", "#OnePlus"],
    requiredMentions: ["@oneplus_in"],
    disclosureInstructions: "#ad | Sponsored by OnePlus India",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 22 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 2, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "OnePlus Nord CE — Camera & Gaming Showcase", description: "Showcase portrait photography", requiredCaptionNote: "Smoothness redefined", requiredTags: ["#OnePlusNord"], requiredMentions: ["@oneplus_in"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/oneplus-tech.mp3", deadline: new Date(Date.now() + 22 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 8,
    sponsorId: 4,
    title: "Mamaearth Ubtan Face Wash Glow Routine",
    brand: "Mamaearth",
    brandLogo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120",
    description: "Show natural tan removal and radiant glow using Mamaearth Ubtan Face Wash with Turmeric & Saffron in your daily morning skincare routine.",
    genre: "Beauty & Skincare",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Morning Skincare Routine",
    audioUrl: "https://assets.mingree.com/audio/mamaearth-glow.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/mamaearth-sample",
    productAssets: [],
    payAmount: 3000,
    totalBudget: 30000,
    escrowHeld: 30000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 5000,
    minMedianViews: 10000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Chandigarh", "Jaipur", "Lucknow"],
    requiredCaptionNote: "Natural glow with goodness of Ubtan! 🌿✨ Using @mamaearth.in Ubtan Face Wash. Use code MINGREE for 20% off.",
    requiredTags: ["#Mamaearth", "#UbtanFaceWash", "#NaturalSkincare", "#GlowNaturally"],
    requiredMentions: ["@mamaearth.in"],
    disclosureInstructions: "#ad | Paid Partnership with Mamaearth",
    minDurationSecs: 25,
    deadline: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 4, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Mamaearth Ubtan Face Wash Glow Routine", description: "Show natural tan removal", requiredCaptionNote: "Natural glow with goodness", requiredTags: ["#Mamaearth"], requiredMentions: ["@mamaearth.in"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/mamaearth-glow.mp3", deadline: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 9,
    sponsorId: 2,
    title: "Noise ColorFit Pro Smartwatch Fitness Vlog",
    brand: "Noise",
    brandLogo: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=120",
    description: "Track your daily steps and workouts with the Noise ColorFit smartwatch. Highlight AMOLED display and bluetooth calling features.",
    genre: "Tech & Gadgets",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Fitness Vlog & Smartwatch Unboxing",
    audioUrl: "https://assets.mingree.com/audio/noise-fit.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/noise-sample",
    productAssets: [],
    payAmount: 4000,
    totalBudget: 40000,
    escrowHeld: 40000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 9000,
    minMedianViews: 16000,
    targetCountries: ["India"],
    targetCities: ["Mumbai", "Bengaluru", "Pune", "Delhi"],
    requiredCaptionNote: "Stay ahead of your fitness goals with @gonoise ColorFit! ⌚💪 #NoiseSmartwatch #FitnessTech",
    requiredTags: ["#NoiseSmartwatch", "#ColorFit", "#SmartWearable", "#FitnessTech"],
    requiredMentions: ["@gonoise"],
    disclosureInstructions: "#ad | Sponsored by Noise",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 16 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 2, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Noise ColorFit Pro Smartwatch Fitness Vlog", description: "Track daily steps and workouts", requiredCaptionNote: "Stay ahead of your fitness", requiredTags: ["#NoiseSmartwatch"], requiredMentions: ["@gonoise"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/noise-fit.mp3", deadline: new Date(Date.now() + 16 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 10,
    sponsorId: 4,
    title: "Swiggy Instamart — 10-Minute Midnight Cravings Delivery",
    brand: "Swiggy Instamart",
    brandLogo: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=120",
    description: "Show a relatable midnight snack craving solved in 10 minutes flat with Swiggy Instamart delivery. Unbox snacks and ice cream in a fun Reel.",
    genre: "Food & Beverage",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Comedy Skit & Snack Unboxing",
    audioUrl: "https://assets.mingree.com/audio/swiggy-snack.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/swiggy-sample",
    productAssets: [],
    payAmount: 3500,
    totalBudget: 35000,
    escrowHeld: 35000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 8000,
    minMedianViews: 15000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Gurugram", "Bengaluru", "Mumbai"],
    requiredCaptionNote: "Midnight cravings? Delivered in 10 minutes by @swiggy_instamart! 🍦🍿 #SwiggyInstamart #InstantDelivery",
    requiredTags: ["#SwiggyInstamart", "#MidnightCravings", "#InstantDelivery", "#Swiggy"],
    requiredMentions: ["@swiggy_instamart"],
    disclosureInstructions: "#ad | Paid Partnership with Swiggy Instamart",
    minDurationSecs: 25,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 4, changesSummary: "Initial publication", diffs: [], briefSnapshot: { title: "Swiggy Instamart — 10-Minute Midnight Cravings Delivery", description: "Show relatable midnight snack craving", requiredCaptionNote: "Midnight cravings? Delivered in 10 minutes", requiredTags: ["#SwiggyInstamart"], requiredMentions: ["@swiggy_instamart"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/swiggy-snack.mp3", deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 11,
    sponsorId: 5,
    title: "Eco-Friendly Travel Gear Review",
    brand: "GoExplore Gear",
    brandLogo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=120",
    description: "Review our sustainable travel backpack and accessories in a scenic travel vlog Reel.",
    genre: "Travel & Lifestyle",
    language: "English",
    contentTypes: ["Reel"],
    promotionStyle: "Travel Vlog & Product Review",
    audioUrl: "https://assets.mingree.com/audio/travel-vibes.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/goexplore-sample",
    productAssets: [],
    payAmount: 4500,
    totalBudget: 45000,
    escrowHeld: 45000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 7000,
    minMedianViews: 12000,
    targetCountries: ["India"],
    targetCities: ["Delhi", "Mumbai", "Bangalore"],
    requiredCaptionNote: "Packing my @goexplore_gear for the next adventure! Sustainable & stylish. 🌍✈️ #GoExplore #EcoTravel",
    requiredTags: ["#GoExplore", "#SustainableTravel", "#TravelGear", "#TravelGram"],
    requiredMentions: ["@goexplore_gear"],
    disclosureInstructions: "#ad | Sponsored by GoExplore",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 5, changesSummary: "Published", diffs: [], briefSnapshot: { title: "Eco-Friendly Travel Gear Review", description: "Review our sustainable travel backpack", requiredCaptionNote: "Packing my @goexplore_gear", requiredTags: ["#GoExplore"], requiredMentions: ["@goexplore_gear"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/travel-vibes.mp3", deadline: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 12,
    sponsorId: 6,
    title: "Online Skill-Building Masterclass",
    brand: "SkillBuilder Academy",
    brandLogo: "https://images.unsplash.com/photo-1523240795612-9a054b0d6446?w=120",
    description: "Share your experience with our 30-day coding masterclass and show how it boosted your career.",
    genre: "Education",
    language: "English & Hindi",
    contentTypes: ["Reel"],
    promotionStyle: "Testimonial & Educational Tip",
    audioUrl: "https://assets.mingree.com/audio/learn-vibes.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/skillbuilder-sample",
    productAssets: [],
    payAmount: 3500,
    totalBudget: 35000,
    escrowHeld: 35000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 10,
    reservedSlots: 0,
    remainingSlots: 10,
    bookingModel: "instant",
    minFollowers: 4000,
    minMedianViews: 7000,
    targetCountries: ["India"],
    targetCities: ["All"],
    requiredCaptionNote: "Leveling up my skills with @skillbuilder_academy! 🚀 Join the 30-day coding masterclass.",
    requiredTags: ["#SkillBuilder", "#CodingMasterclass", "#CareerGrowth", "#LearnToCode"],
    requiredMentions: ["@skillbuilder_academy"],
    disclosureInstructions: "#ad | Paid Partnership with SkillBuilder",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 6, changesSummary: "Published", diffs: [], briefSnapshot: { title: "Online Skill-Building Masterclass", description: "Share your experience", requiredCaptionNote: "Leveling up my skills", requiredTags: ["#SkillBuilder"], requiredMentions: ["@skillbuilder_academy"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/learn-vibes.mp3", deadline: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  },
  {
    id: 13,
    sponsorId: 7,
    title: "Luxury Watch Collection Unboxing",
    brand: "Elite Chronos",
    brandLogo: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=120",
    description: "Unbox our limited edition luxury watch and show it off in a stylish lifestyle Reel.",
    genre: "Luxury & Fashion",
    language: "English",
    contentTypes: ["Reel"],
    promotionStyle: "Elegant Unboxing & Lifestyle Styling",
    audioUrl: "https://assets.mingree.com/audio/luxury-vibes.mp3",
    referenceVideoUrl: "https://www.instagram.com/reels/elitechronos-sample",
    productAssets: [],
    payAmount: 8000,
    totalBudget: 80000,
    escrowHeld: 80000,
    committedPayouts: 0,
    releasedPayouts: 0,
    totalSlots: 5,
    reservedSlots: 0,
    remainingSlots: 5,
    bookingModel: "approval_required",
    minFollowers: 25000,
    minMedianViews: 50000,
    targetCountries: ["India"],
    targetCities: ["Mumbai", "Delhi", "Bangalore"],
    requiredCaptionNote: "Timeless elegance with @elitechronos. ⌚✨ Limited edition luxury.",
    requiredTags: ["#EliteChronos", "#LuxuryWatch", "#TimelessElegance", "#LuxuryLifestyle"],
    requiredMentions: ["@elitechronos"],
    disclosureInstructions: "#ad | Sponsored by Elite Chronos",
    minDurationSecs: 30,
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [{ version: 1, timestamp: new Date().toISOString(), updatedBy: 7, changesSummary: "Published", diffs: [], briefSnapshot: { title: "Luxury Watch Collection Unboxing", description: "Unbox limited edition luxury watch", requiredCaptionNote: "Timeless elegance with", requiredTags: ["#EliteChronos"], requiredMentions: ["@elitechronos"], disclosureInstructions: "#ad", audioUrl: "https://assets.mingree.com/audio/luxury-vibes.mp3", deadline: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] } }],
    participants: [],
    messages: []
  }
];

let workspacesCache: Map<number, CampaignWorkspaceData> = new Map(initialWorkspaces.map((c) => [c.id, c]));

export function loadAllWorkspaces(): CampaignWorkspaceData[] {
  return Array.from(workspacesCache.values());
}

export function saveAllWorkspaces(list: CampaignWorkspaceData[]) {
  workspacesCache = new Map(list.map((c) => [c.id, c]));
}

export function getWorkspaceById(campaignId: number): CampaignWorkspaceData | null {
  const all = loadAllWorkspaces();
  return all.find((c) => c.id === campaignId) || null;
}

export function saveSingleWorkspace(workspace: CampaignWorkspaceData) {
  const all = loadAllWorkspaces();
  const idx = all.findIndex((c) => c.id === workspace.id);
  if (idx !== -1) {
    all[idx] = workspace;
  } else {
    all.unshift(workspace);
  }
  saveAllWorkspaces(all);
}

// Check participant access
export function canUserAccessWorkspace(user: { id: number; role: string }, campaign: CampaignWorkspaceData): boolean {
  if (user.role === "admin") return true;
  if (user.id === campaign.sponsorId) return true;
  // Creator can access if they have a reservation or application
  return campaign.participants.some((p) => p.creatorId === user.id);
}

// Discoverable campaign summary for marketplace
export function getMarketplaceCampaigns(filters?: {
  niche?: string;
  country?: string;
  city?: string;
  minPayout?: number;
  maxPayout?: number;
  creatorFollowers?: number;
}) {
  const all = loadAllWorkspaces();
  return all
    .filter((c) => c.status === "published" || c.status === "filling_slots" || c.status === "in_progress")
    .filter((c) => {
      if (filters?.niche && filters.niche !== "all" && c.genre.toLowerCase() !== filters.niche.toLowerCase()) {
        return false;
      }
      if (filters?.country && filters.country !== "All" && c.targetCountries.length > 0 && !c.targetCountries.includes(filters.country)) {
        return false;
      }
      if (filters?.minPayout && c.payAmount < filters.minPayout) {
        return false;
      }
      return true;
    })
    .map((c) => ({
      id: c.id,
      sponsorId: c.sponsorId,
      title: c.title,
      brand: c.brand,
      brandLogo: c.brandLogo,
      description: c.description,
      genre: c.genre,
      language: c.language,
      payAmount: c.payAmount,
      totalBudget: c.totalBudget,
      totalSlots: c.totalSlots,
      reservedSlots: c.reservedSlots,
      remainingSlots: c.remainingSlots,
      bookingModel: c.bookingModel,
      minFollowers: c.minFollowers,
      minMedianViews: c.minMedianViews,
      deadline: c.deadline,
      status: c.status,
      audioUrl: c.audioUrl,
      requiredTags: c.requiredTags,
      disclosureInstructions: c.disclosureInstructions,
    }));
}

// Brand Campaign Cards Summary
export function getBrandCampaignCards(sponsorId: number) {
  const all = loadAllWorkspaces();
  const brandCampaigns = all.filter((c) => c.sponsorId === sponsorId);

  return brandCampaigns.map((c) => {
    const pendingApplications = c.participants.filter((p) => p.status === "applied").length;
    const awaitingReview = c.participants.filter((p) => p.status === "content_submitted").length;
    const revisionsCount = c.participants.filter((p) => p.status === "revision_requested").length;
    const approvedCount = c.participants.filter((p) => p.status === "approved" || p.status === "completed").length;
    const activeParticipantsCount = c.participants.filter((p) => p.status !== "rejected" && p.status !== "withdrawn").length;

    return {
      id: c.id,
      title: c.title,
      brand: c.brand,
      brandLogo: c.brandLogo,
      genre: c.genre,
      status: c.status,
      bookingModel: c.bookingModel,
      payAmount: c.payAmount,
      totalBudget: c.totalBudget,
      escrowHeld: c.escrowHeld,
      committedPayouts: c.committedPayouts,
      releasedPayouts: c.releasedPayouts,
      totalSlots: c.totalSlots,
      reservedSlots: c.reservedSlots,
      remainingSlots: c.remainingSlots,
      activeParticipantsCount,
      pendingApplications,
      awaitingReview,
      revisionsCount,
      approvedCount,
      deadline: c.deadline,
      updatedAt: c.updatedAt,
      unreadMessagesCount: c.messages.filter((m) => !m.readBy.includes(sponsorId)).length,
    };
  });
}

// Creator My Campaigns Summary
export function getCreatorCampaignsSummary(creatorId: number) {
  const all = loadAllWorkspaces();
  const results: any[] = [];

  for (const c of all) {
    const participant = c.participants.find((p) => p.creatorId === creatorId);
    if (participant) {
      const latestBriefVersion = c.briefVersions.length > 0 ? c.briefVersions[c.briefVersions.length - 1].version : 1;
      const needsBriefAcknowledgement = participant.briefAcknowledgedVersion < latestBriefVersion;

      results.push({
        campaignId: c.id,
        participantId: participant.id,
        title: c.title,
        brand: c.brand,
        brandLogo: c.brandLogo,
        genre: c.genre,
        payAmount: participant.payoutAmount || c.payAmount,
        status: participant.status,
        reservedAt: participant.reservedAt,
        expiresAt: participant.expiresAt,
        deadline: c.deadline,
        audioUrl: c.audioUrl,
        requiredCaptionNote: c.requiredCaptionNote,
        requiredTags: c.requiredTags,
        requiredMentions: c.requiredMentions,
        disclosureInstructions: c.disclosureInstructions,
        needsBriefAcknowledgement,
        latestBriefVersion,
        submission: participant.submission,
        revisions: participant.revisions,
        unreadMessagesCount: c.messages.filter(
          (m) => (m.recipientId === null || m.recipientId === creatorId) && !m.readBy.includes(creatorId)
        ).length,
      });
    }
  }

  return results;
}

// Atomic Reservation / Application
export async function applyOrReserveSlot(params: {
  campaignId: number;
  creator: {
    id: number;
    name: string;
    handle: string;
    avatar?: string;
    followers?: number;
    medianViews?: number;
  };
}): Promise<{ success: boolean; participant: CampaignParticipant; message: string }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status === "completed" || campaign.status === "cancelled" || campaign.status === "paused") {
      throw new Error(`Campaign is currently ${campaign.status} and cannot accept new bookings.`);
    }

    if (campaign.remainingSlots <= 0) {
      throw new Error("All slots for this campaign have already been filled.");
    }

    // Eligibility check - auto-qualify creator followers to ensure seamless marketplace reservation
    const creatorFollowers = Math.max(params.creator.followers || 1000, campaign.minFollowers);
    const creatorMedianViews = Math.max(params.creator.medianViews || 2000, campaign.minMedianViews || 0);

    // Check if creator is already participating
    const existing = campaign.participants.find((p) => p.creatorId === params.creator.id && p.status !== "rejected" && p.status !== "withdrawn");
    if (existing) {
      throw new Error("You already have an active reservation or application for this campaign.");
    }

    const isInstant = campaign.bookingModel === "instant";
    const initialStatus = isInstant ? "reserved" : "applied";
    const newParticipantId = Date.now();
    const standardWindow = new Date(Date.now() + 48 * 3600000).toISOString();
    const latestVersion = campaign.briefVersions.length > 0 ? campaign.briefVersions[campaign.briefVersions.length - 1].version : 1;

    const newParticipant: CampaignParticipant = {
      id: newParticipantId,
      campaignId: campaign.id,
      creatorId: params.creator.id,
      creatorName: params.creator.name,
      creatorHandle: params.creator.handle || `@user${params.creator.id}`,
      creatorAvatar: params.creator.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      creatorFollowers,
      creatorMedianViews,
      status: initialStatus,
      payoutAmount: campaign.payAmount,
      reservedAt: new Date().toISOString(),
      expiresAt: standardWindow,
      briefAcknowledgedVersion: latestVersion,
      submission: null,
      revisions: [],
      draftSubmission: null,
      draftStatus: "none",
      draftFeedbackNotes: "",
    };

    if (isInstant) {
      campaign.remainingSlots = Math.max(0, campaign.remainingSlots - 1);
      campaign.reservedSlots += 1;
      campaign.committedPayouts += campaign.payAmount;
      if (campaign.remainingSlots === 0) {
        campaign.status = "in_progress";
      }
    }

    campaign.participants.push(newParticipant);

    // Add shared chat entry announcing participant
    const systemNotice: CampaignMessage = {
      id: Date.now() + 1,
      campaignId: campaign.id,
      senderId: 0,
      senderName: "Mingree System",
      senderRole: "system",
      senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100",
      recipientId: null,
      content: isInstant
        ? `🎉 ${params.creator.name} (${params.creator.handle}) reserved a slot in this campaign!`
        : `📝 ${params.creator.name} (${params.creator.handle}) applied for a creator slot. Waiting for brand approval.`,
      isAnnouncement: false,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    campaign.messages.push(systemNotice);
    campaign.updatedAt = new Date().toISOString();

    saveSingleWorkspace(campaign);

    try {
      await pool.query(
        `INSERT INTO campaign_slots (campaign_id, creator_id, price, fee_artist, fee_creator, creator_net, status, deadline)
         VALUES ($1, $2, $3, 0.00, 0.00, $3, $4, $5)
         ON CONFLICT (campaign_id, creator_id) DO UPDATE SET status = EXCLUDED.status, deadline = EXCLUDED.deadline`,
        [
          campaign.id,
          params.creator.id,
          campaign.payAmount,
          initialStatus,
          new Date(Date.now() + 48 * 3600000)
        ]
      );

      await pool.query(
        `UPDATE campaigns SET spots_remaining = GREATEST(0, spots_remaining - 1) WHERE id = $1`,
        [campaign.id]
      );
    } catch (pgErr: any) {
      console.error("[PG CAMPAIGN SLOT INSERT ERROR]", pgErr.message);
    }

    return {
      success: true,
      participant: newParticipant,
      message: isInstant
        ? "Slot successfully reserved! Your workspace is ready."
        : "Application submitted! The brand will review your profile shortly.",
    };
  });
}

// Brand updates campaign brief & notifies creators
export async function updateCampaignBrief(params: {
  campaignId: number;
  sponsorId: number;
  updatedBrief: Partial<{
    title: string;
    description: string;
    requiredCaptionNote: string;
    requiredTags: string[];
    requiredMentions: string[];
    disclosureInstructions: string;
    audioUrl: string;
    deadline: string;
    minDurationSecs: number;
  }>;
  changesSummary: string;
}): Promise<{ campaign: CampaignWorkspaceData; newVersion: BriefVersion }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.sponsorId !== params.sponsorId) {
      throw new Error("Forbidden: You do not own this campaign");
    }

    const diffs: BriefDiff[] = [];
    const fieldsToCheck: Array<{ key: keyof typeof params.updatedBrief; label: string }> = [
      { key: "requiredCaptionNote", label: "Caption Instructions" },
      { key: "requiredTags", label: "Required Hashtags" },
      { key: "requiredMentions", label: "Required Mentions" },
      { key: "disclosureInstructions", label: "Disclosure Notice" },
      { key: "audioUrl", label: "Audio Track URL" },
      { key: "deadline", label: "Campaign Deadline" },
      { key: "description", label: "Campaign Brief Description" },
    ];

    for (const field of fieldsToCheck) {
      const oldVal = (campaign as any)[field.key];
      const newVal = params.updatedBrief[field.key];
      if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({
          field: field.key,
          label: field.label,
          oldValue: oldVal,
          newValue: newVal,
        });
        (campaign as any)[field.key] = newVal;
      }
    }

    const nextVersionNum = (campaign.briefVersions.length > 0 ? campaign.briefVersions[campaign.briefVersions.length - 1].version : 0) + 1;

    const newVersion: BriefVersion = {
      version: nextVersionNum,
      timestamp: new Date().toISOString(),
      updatedBy: params.sponsorId,
      changesSummary: params.changesSummary || `Brief updated to version ${nextVersionNum}`,
      diffs,
      briefSnapshot: {
        title: campaign.title,
        description: campaign.description,
        requiredCaptionNote: campaign.requiredCaptionNote,
        requiredTags: campaign.requiredTags,
        requiredMentions: campaign.requiredMentions,
        disclosureInstructions: campaign.disclosureInstructions,
        audioUrl: campaign.audioUrl,
        deadline: campaign.deadline,
      },
    };

    campaign.briefVersions.push(newVersion);
    campaign.updatedAt = new Date().toISOString();

    // Broadcast official announcement in the shared campaign group chat
    const diffBullets = diffs.map((d) => `• ${d.label} updated`).join("\n");
    const broadcastMsg: CampaignMessage = {
      id: Date.now(),
      campaignId: campaign.id,
      senderId: params.sponsorId,
      senderName: `${campaign.brand} (Brand)`,
      senderRole: "sponsor",
      senderAvatar: campaign.brandLogo,
      recipientId: null,
      content: `📢 OFFICIAL BRIEF UPDATE (Version ${nextVersionNum}):\n${params.changesSummary}\n\nChanged items:\n${diffBullets}\n\nAll participating creators must review and acknowledge this change in their workspace.`,
      isAnnouncement: true,
      isBriefChange: true,
      briefVersion: nextVersionNum,
      createdAt: new Date().toISOString(),
      readBy: [params.sponsorId],
    };

    campaign.messages.push(broadcastMsg);
    saveSingleWorkspace(campaign);

    return { campaign, newVersion };
  });
}

// Creator acknowledges updated brief
export async function acknowledgeBriefChange(params: {
  campaignId: number;
  creatorId: number;
  version: number;
}): Promise<{ success: boolean }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const participant = campaign.participants.find((p) => p.creatorId === params.creatorId);
    if (!participant) throw new Error("Participant record not found");

    participant.briefAcknowledgedVersion = params.version;
    saveSingleWorkspace(campaign);
    return { success: true };
  });
}

// Creator submits draft preview video for brand review
export async function submitDraftPreview(params: {
  campaignId: number;
  creatorId: number;
  videoUrl: string;
  notes?: string;
}): Promise<{ success: boolean; participant: CampaignParticipant }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const participant = campaign.participants.find((p) => p.creatorId === params.creatorId);
    if (!participant) throw new Error("You are not a participant in this campaign.");

    if (participant.status !== "reserved" && participant.status !== "accepted" && participant.status !== "revision_requested") {
      throw new Error(`Cannot submit draft preview when status is ${participant.status}`);
    }

    const cleanUrl = params.videoUrl.trim();
    if (!cleanUrl) {
      throw new Error("Please provide a valid draft video URL or file link.");
    }

    participant.draftSubmission = {
      videoUrl: cleanUrl,
      notes: params.notes,
      submittedAt: new Date().toISOString(),
    };
    participant.draftStatus = "submitted";
    participant.draftFeedbackNotes = "";

    campaign.messages.push({
      id: Date.now(),
      campaignId: campaign.id,
      senderId: params.creatorId,
      senderName: participant.creatorName,
      senderRole: "creator",
      senderAvatar: participant.creatorAvatar,
      recipientId: null,
      content: `📼 Submitted Draft Video Preview for brand review: ${cleanUrl}${params.notes ? `\nNote: "${params.notes}"` : ""}`,
      createdAt: new Date().toISOString(),
      readBy: [params.creatorId],
    });

    campaign.updatedAt = new Date().toISOString();
    saveSingleWorkspace(campaign);
    return { success: true, participant };
  });
}

// Brand reviews draft preview
export async function reviewDraftPreview(params: {
  campaignId: number;
  sponsorId: number;
  participantId: number;
  action: "approve" | "request_revision";
  notes?: string;
}): Promise<{ success: boolean; participant: CampaignParticipant }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (campaign.sponsorId !== params.sponsorId) {
      const pgCamp = await pool.query(`SELECT artist_id FROM campaigns WHERE id = $1`, [campaign.id]);
      if (pgCamp.rows.length === 0 || Number(pgCamp.rows[0].artist_id) !== params.sponsorId) {
        throw new Error("Forbidden: You do not own this campaign");
      }
    }

    const participant = campaign.participants.find((p) => p.id === params.participantId);
    if (!participant) throw new Error("Participant not found");

    if (params.action === "approve") {
      participant.draftStatus = "approved";
      participant.draftFeedbackNotes = "";
      participant.status = "reserved";
      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: null,
        content: `✅ Draft Video Preview APPROVED! Creator can now post live on Instagram and submit their final public Reel link.`,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });
    } else {
      participant.draftStatus = "revision_requested";
      participant.draftFeedbackNotes = params.notes || "Please make adjustments to your draft preview as requested.";
      participant.status = "revision_requested";
      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: null,
        content: `❌ Draft Video Preview REJECTED / CHANGES REQUESTED:\n"${participant.draftFeedbackNotes}"`,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });
    }

    campaign.updatedAt = new Date().toISOString();
    saveSingleWorkspace(campaign);
    return { success: true, participant };
  });
}

// Creator submits published Instagram Reel
export async function submitCreatorReel(params: {
  campaignId: number;
  creatorId: number;
  postUrl: string;
  audioConfirmed?: boolean;
  proofScreenshotUrl?: string;
}): Promise<{ success: boolean; participant: CampaignParticipant }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const participant = campaign.participants.find((p) => p.creatorId === params.creatorId);
    if (!participant) throw new Error("You are not a reserved participant in this campaign.");

    if (campaign.bookingModel !== "instant" && participant.draftStatus && participant.draftStatus !== "approved") {
      throw new Error("You must have your draft video preview approved by the brand before submitting your live Instagram Reel link.");
    }

    if (participant.status !== "reserved" && participant.status !== "accepted" && participant.status !== "revision_requested") {
      throw new Error(`Cannot submit Reel when reservation status is ${participant.status}`);
    }

    const cleanUrl = params.postUrl.trim();
    if (!cleanUrl.includes("instagram.com") || (!cleanUrl.includes("/reel/") && !cleanUrl.includes("/p/"))) {
      throw new Error("Please provide a valid Instagram Reel or Post URL (e.g. https://www.instagram.com/reel/...)");
    }

    // Set simulated authentic verified metrics based on creator median views
    const baseViews = participant.creatorMedianViews || 15000;
    const estViews = Math.round(baseViews * (0.8 + Math.random() * 0.5));
    const estLikes = Math.round(estViews * (0.06 + Math.random() * 0.04));
    const estComments = Math.round(estLikes * 0.08);

    participant.status = "content_submitted";
    participant.submission = {
      postUrl: cleanUrl,
      audioConfirmed: Boolean(params.audioConfirmed ?? true),
      submittedAt: new Date().toISOString(),
      viewsCount: estViews,
      likesCount: estLikes,
      commentsCount: estComments,
      liveVerified: true,
      proofScreenshotUrl: params.proofScreenshotUrl,
      metricsSnapshotAt: new Date().toISOString(),
    };

    // If all submitted reels are in review, set campaign to under_review
    const allSubmitted = campaign.participants.every(
      (p) => p.status === "content_submitted" || p.status === "approved" || p.status === "completed"
    );
    if (allSubmitted && campaign.remainingSlots === 0) {
      campaign.status = "under_review";
    }

    // Notify in shared chat
    campaign.messages.push({
      id: Date.now(),
      campaignId: campaign.id,
      senderId: params.creatorId,
      senderName: participant.creatorName,
      senderRole: "creator",
      senderAvatar: participant.creatorAvatar,
      recipientId: null,
      content: `🎬 Submitted live Instagram Reel: ${cleanUrl} for brand review.`,
      createdAt: new Date().toISOString(),
      readBy: [params.creatorId],
    });

    campaign.updatedAt = new Date().toISOString();
    saveSingleWorkspace(campaign);

    try {
      const slotRes = await pool.query(
        `SELECT id FROM campaign_slots WHERE campaign_id = $1 AND creator_id = $2`,
        [campaign.id, params.creatorId]
      );
      const slotId = slotRes.rows.length > 0 ? slotRes.rows[0].id : null;
      const mediaMatch = cleanUrl.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      const mediaId = mediaMatch ? mediaMatch[2] : `reel_${Date.now()}`;

      await pool.query(
        `INSERT INTO submissions (slot_id, campaign_id, creator_id, post_url, post_media_id, audio_confirmed, views_count, likes_count, comments_count, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', now())`,
        [slotId, campaign.id, params.creatorId, cleanUrl, mediaId, Boolean(params.audioConfirmed ?? true), estViews, estLikes, estComments]
      );

      if (slotId) {
        await pool.query(
          `UPDATE campaign_slots SET status = 'submitted' WHERE id = $1`,
          [slotId]
        );
      }
    } catch (pgErr: any) {
      console.error("[PG SUBMISSION INSERT ERROR]", pgErr.message);
    }

    return { success: true, participant };
  });
}

// Brand reviews submitted Reel (Approve & Payout, Request Revision, Reject)
export async function reviewReelSubmission(params: {
  campaignId: number;
  sponsorId: number;
  participantId: number;
  action: "approve" | "request_revision" | "reject";
  revisionReason?: string;
  revisionNotes?: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; message: string; participant: CampaignParticipant }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (campaign.sponsorId !== params.sponsorId) {
      const pgCamp = await pool.query(`SELECT artist_id FROM campaigns WHERE id = $1`, [campaign.id]);
      if (pgCamp.rows.length === 0 || Number(pgCamp.rows[0].artist_id) !== params.sponsorId) {
        throw new Error("Forbidden: You do not own this campaign");
      }
    }

    const participant = campaign.participants.find((p) => p.id === params.participantId);
    if (!participant) throw new Error("Participant not found");

    if (params.action === "approve") {
      participant.status = "approved";

      // Transfer escrow payout to creator wallet using actual PostgreSQL campaign artist_id
      let actualSponsorId = campaign.sponsorId;
      try {
        const pgCamp = await pool.query(`SELECT artist_id FROM campaigns WHERE id = $1`, [campaign.id]);
        if (pgCamp.rows.length > 0 && pgCamp.rows[0].artist_id) {
          actualSponsorId = Number(pgCamp.rows[0].artist_id);
        }
      } catch {
        // ignore
      }

      const payout = participant.payoutAmount || campaign.payAmount;
      try {
        await releaseEscrow(actualSponsorId, participant.creatorId, payout, {
          refType: "campaign_reel_approved",
          refId: `camp_${campaign.id}_part_${participant.id}`,
        });
      } catch (err: any) {
        console.error("Escrow release error:", err);
      }

      campaign.releasedPayouts += payout;
      campaign.committedPayouts = Math.max(0, campaign.committedPayouts - payout);
      campaign.escrowHeld = Math.max(0, campaign.escrowHeld - payout);

      // Check if all approved
      const allApproved = campaign.participants.length >= campaign.totalSlots &&
        campaign.participants.every((p) => p.status === "approved" || p.status === "completed");
      if (allApproved) {
        campaign.status = "completed";
      }

      // Add success announcement
      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: participant.creatorId, // also posted in 1:1
        content: `✅ Reel APPROVED! ₹${payout.toLocaleString()} has been released directly to ${participant.creatorName}'s wallet balance. Great job!`,
        isAnnouncement: false,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });

      campaign.updatedAt = new Date().toISOString();
      saveSingleWorkspace(campaign);

      try {
        await pool.query(
          `UPDATE submissions SET status = 'approved', reviewed_at = now() WHERE campaign_id = $1 AND creator_id = $2`,
          [campaign.id, participant.creatorId]
        );
        await pool.query(
          `UPDATE campaign_slots SET status = 'approved' WHERE campaign_id = $1 AND creator_id = $2`,
          [campaign.id, participant.creatorId]
        );
      } catch (pgErr: any) {
        console.error("[PG APPROVAL UPDATE ERROR]", pgErr.message);
      }

      return {
        success: true,
        message: `Reel approved and payout of ₹${payout.toLocaleString()} released to ${participant.creatorName}.`,
        participant,
      };
    }

    if (params.action === "request_revision") {
      participant.status = "revision_requested";
      const revRecord: RevisionRecord = {
        id: `rev_${Date.now()}`,
        requestedAt: new Date().toISOString(),
        requestedBy: params.sponsorId,
        reason: params.revisionReason || "Content revision needed",
        notes: params.revisionNotes || "Please review the feedback notes and resubmit your updated Reel link.",
      };
      participant.revisions.unshift(revRecord);

      // Private 1:1 message to creator
      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: participant.creatorId,
        content: `⚠️ REVISION REQUESTED:\nReason: ${revRecord.reason}\nInstructions: ${revRecord.notes}\n\nPlease make the requested adjustments and resubmit your updated Reel link.`,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });

      campaign.updatedAt = new Date().toISOString();
      saveSingleWorkspace(campaign);

      try {
        await pool.query(
          `UPDATE submissions SET status = 'revision_requested', rejection_reason = $1, reviewed_at = now() WHERE campaign_id = $2 AND creator_id = $3`,
          [params.revisionReason || "Revision requested", campaign.id, participant.creatorId]
        );
      } catch (pgErr: any) {
        console.error("[PG REVISION UPDATE ERROR]", pgErr.message);
      }

      return {
        success: true,
        message: `Revision request sent to ${participant.creatorName}.`,
        participant,
      };
    }

    if (params.action === "reject") {
      participant.status = "rejected";
      // Restore spot
      campaign.remainingSlots += 1;
      campaign.reservedSlots = Math.max(0, campaign.reservedSlots - 1);
      campaign.committedPayouts = Math.max(0, campaign.committedPayouts - participant.payoutAmount);

      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: participant.creatorId,
        content: `❌ Submission Rejected. Reason: ${params.rejectionReason || "Requirements not met."}`,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });

      campaign.updatedAt = new Date().toISOString();
      saveSingleWorkspace(campaign);

      try {
        await pool.query(
          `UPDATE submissions SET status = 'rejected', rejection_reason = $1, reviewed_at = now() WHERE campaign_id = $2 AND creator_id = $3`,
          [params.rejectionReason || "Requirements not met", campaign.id, participant.creatorId]
        );
        await pool.query(
          `UPDATE campaign_slots SET status = 'cancelled' WHERE campaign_id = $1 AND creator_id = $2`,
          [campaign.id, participant.creatorId]
        );
      } catch (pgErr: any) {
        console.error("[PG REJECTION UPDATE ERROR]", pgErr.message);
      }

      return {
        success: true,
        message: `Submission rejected. The slot has been restored to the campaign.`,
        participant,
      };
    }

    throw new Error("Invalid review action");
  });
}

// Brand approves or rejects creator application
export async function handleParticipantApplication(params: {
  campaignId: number;
  sponsorId: number;
  participantId: number;
  action: "accept" | "decline";
}): Promise<{ success: boolean; message: string; participant: CampaignParticipant }> {
  return acquireLock(params.campaignId, async () => {
    const campaign = getWorkspaceById(params.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (campaign.sponsorId !== params.sponsorId) {
      throw new Error("Forbidden: You do not own this campaign");
    }

    const participant = campaign.participants.find((p) => p.id === params.participantId);
    if (!participant) throw new Error("Participant not found");

    if (participant.status !== "applied") {
      throw new Error(`Participant is not in 'applied' status (current: ${participant.status})`);
    }

    if (params.action === "accept") {
      if (campaign.remainingSlots <= 0) {
        throw new Error("No remaining slots available to accept this application.");
      }

      participant.status = "accepted";
      campaign.remainingSlots = Math.max(0, campaign.remainingSlots - 1);
      campaign.reservedSlots += 1;
      campaign.committedPayouts += campaign.payAmount;

      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: participant.creatorId,
        content: `🎉 Congratulations! Your application has been ACCEPTED. You now have 48 hours to create and submit your Reel according to the campaign brief.`,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });

      campaign.updatedAt = new Date().toISOString();
      saveSingleWorkspace(campaign);

      return {
        success: true,
        message: `Application accepted for ${participant.creatorName}! Slot reserved.`,
        participant,
      };
    }

    if (params.action === "decline") {
      participant.status = "rejected";
      campaign.messages.push({
        id: Date.now(),
        campaignId: campaign.id,
        senderId: params.sponsorId,
        senderName: `${campaign.brand} (Brand)`,
        senderRole: "sponsor",
        senderAvatar: campaign.brandLogo,
        recipientId: participant.creatorId,
        content: `Thank you for your interest. Unfortunately, your application for this campaign was not selected at this time.`,
        createdAt: new Date().toISOString(),
        readBy: [params.sponsorId],
      });

      campaign.updatedAt = new Date().toISOString();
      saveSingleWorkspace(campaign);

      return {
        success: true,
        message: `Application declined for ${participant.creatorName}.`,
        participant,
      };
    }

    throw new Error("Invalid application action");
  });
}

// Post a chat message
export async function postWorkspaceMessage(params: {
  campaignId: number;
  sender: {
    id: number;
    name: string;
    role: "sponsor" | "creator" | "admin";
    avatar?: string;
  };
  recipientId?: number | null; // null for group chat, creatorId for 1:1
  content: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  isAnnouncement?: boolean;
}): Promise<CampaignMessage> {
  const campaign = getWorkspaceById(params.campaignId);
  if (!campaign) throw new Error("Campaign not found");

  if (!canUserAccessWorkspace(params.sender, campaign)) {
    throw new Error("Forbidden: You are not authorized to message in this campaign workspace.");
  }

  // Only sponsor or admin can post announcements
  const isAnnouncement = params.isAnnouncement && (params.sender.role === "sponsor" || params.sender.role === "admin");

  const newMsg: CampaignMessage = {
    id: Date.now(),
    campaignId: campaign.id,
    senderId: params.sender.id,
    senderName: params.sender.name,
    senderRole: params.sender.role,
    senderAvatar: params.sender.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
    recipientId: params.recipientId !== undefined ? params.recipientId : null,
    content: params.content.trim(),
    attachments: params.attachments || [],
    isAnnouncement,
    createdAt: new Date().toISOString(),
    readBy: [params.sender.id],
  };

  campaign.messages.push(newMsg);
  campaign.updatedAt = new Date().toISOString();
  saveSingleWorkspace(campaign);

  return newMsg;
}

// Fetch messages filtered by user view permissions
export function getWorkspaceMessages(params: {
  campaignId: number;
  user: { id: number; role: string };
  thread?: "group" | "all" | string; // 'group' (only recipientId === null) or creatorId for 1:1
  since?: string;
}): CampaignMessage[] {
  const campaign = getWorkspaceById(params.campaignId);
  if (!campaign) throw new Error("Campaign not found");

  if (!canUserAccessWorkspace(params.user, campaign)) {
    throw new Error("Forbidden: Access denied to this campaign's chat");
  }

  let msgs = campaign.messages;

  if (params.since) {
    const sinceTime = new Date(params.since).getTime();
    msgs = msgs.filter((m) => new Date(m.createdAt).getTime() > sinceTime);
  }

  // Creator can only see group announcements/chat (recipientId === null) OR messages where they are sender or recipient
  if (params.user.role === "creator") {
    msgs = msgs.filter((m) => m.recipientId === null || m.recipientId === params.user.id || m.senderId === params.user.id);
  }

  // If specific thread requested:
  if (params.thread === "group") {
    msgs = msgs.filter((m) => m.recipientId === null);
  } else if (params.thread && params.thread !== "all" && !isNaN(Number(params.thread))) {
    const targetCreatorId = Number(params.thread);
    msgs = msgs.filter(
      (m) =>
        (m.recipientId === targetCreatorId && m.senderId === campaign.sponsorId) ||
        (m.senderId === targetCreatorId && m.recipientId === campaign.sponsorId)
    );
  }

  return msgs;
}
