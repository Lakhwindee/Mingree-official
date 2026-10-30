import { ApiCampaign, ApiUser, ApiReservation, ApiTransaction, ApiBankAccount, ApiNotification, ApiSubscription, ApiCategory } from "./api";

export const fallbackCreatorUser: ApiUser = {
  id: 1,
  name: "Judge Saab",
  handle: "@ijudgesaab",
  email: "manindersinghjudge@gmail.com",
  role: "creator",
  followers: 0,
  engagement: "0.0",
  reach: 0,
  avatar: null,
  isVerified: false,
  tier: "Unlinked",
  balance: "0.00",
  companyName: null,
  gstNumber: null,
  instagramUsername: null,
  instagramProfileUrl: null,
  instagramFollowers: 0,
  isInstagramVerified: false,
  instagramVerificationCode: null,
  instagramVerificationStatus: "unlinked",
  instagramAccessToken: null,
  instagramUserId: null,
  instagramTokenExpiresAt: null,
  subscriptionPlan: "free",
  subscriptionExpiresAt: null,
  stars: 0,
  country: "IN",
  city: "",
  totalEarnings: "0.00",
  pendingWithdrawals: "0.00",
  starRewards: 0,
  activeReservations: 0,
  completedSubmissions: 0,
  campaignsCreated: 0,
  createdAt: "2024-01-15T10:00:00.000Z",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingPincode: "",
  shippingPhone: "",
};

export const fallbackSponsorUser: ApiUser = {
  id: 2,
  name: "Brand Sponsor",
  handle: "@sponsor",
  email: "sponsor@mingree.com",
  role: "sponsor",
  followers: 0,
  engagement: "0.0",
  reach: 0,
  avatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150",
  isVerified: true,
  tier: "Sponsor",
  balance: "100000.00",
  companyName: "Brand Sponsor Pvt Ltd",
  gstNumber: "",
  instagramUsername: null,
  instagramProfileUrl: null,
  instagramFollowers: 0,
  isInstagramVerified: false,
  instagramVerificationCode: null,
  instagramVerificationStatus: "unlinked",
  instagramAccessToken: null,
  instagramUserId: null,
  instagramTokenExpiresAt: null,
  subscriptionPlan: "enterprise",
  subscriptionExpiresAt: null,
  stars: 0,
  country: "IN",
  city: "Mumbai",
  totalEarnings: "0.00",
  pendingWithdrawals: "0.00",
  starRewards: 0,
  activeReservations: 0,
  completedSubmissions: 0,
  campaignsCreated: 0,
  createdAt: "2024-01-01T10:00:00.000Z",
};

export const fallbackCampaigns: ApiCampaign[] = [];

export const fallbackReservations: ApiReservation[] = [];

export const fallbackTransactions: ApiTransaction[] = [];

export const fallbackBankAccounts: ApiBankAccount[] = [];

export const fallbackNotifications: ApiNotification[] = [];

export const fallbackSubscription: ApiSubscription = {
  plan: "free",
  expiresAt: null,
  isActive: false,
};

export const fallbackCategories: ApiCategory[] = [
  { id: "fashion", name: "Fashion & Lifestyle", icon: "sparkles", description: "Clothing, luxury, streetwear, and style" },
  { id: "beauty", name: "Beauty & Skincare", icon: "heart", description: "Cosmetics, skincare, hair & organic personal care" },
  { id: "tech", name: "Tech & Gadgets", icon: "smartphone", description: "Phones, audio, laptops, and consumer smart devices" },
  { id: "fitness", name: "Fitness & Health", icon: "activity", description: "Supplements, athletic gear, and wellness programs" },
  { id: "food", name: "Food & Beverage", icon: "utensils", description: "Cafes, FMCG food items, organic drinks, restaurants" },
  { id: "travel", name: "Travel & Hotels", icon: "compass", description: "Resorts, airlines, luggage, and tourism destinations" },
];
