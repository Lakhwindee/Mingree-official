export interface Tier {
  id: number;
  name: string; // Filter label: Starter, Nano, Micro, Mid, Macro, Mega
  minFollowers: number;
  maxFollowers: number;
  basePayment?: number;
}

export type Role = 'creator' | 'sponsor';

export interface Campaign {
  id: string;
  title: string;
  brand: string;
  brandLogo: string;
  category: string;
  description: string;
  targetCountries: string[];
  targetCities?: string[];
  isPromotional?: boolean; // Star reward campaign
  starReward?: number; // 1-10 stars
  deadline: string; // ISO date
  totalSpots: number;
  availableSpots: number;
  tier: Tier;
  payAmount: number;
  status: 'active' | 'completed' | 'expired';
  requirements: string[];
  guidelines: string;
  sponsorName: string;
  createdAt: string;
}

export interface CampaignSubmission {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brand: string;
  brandLogo: string;
  reservedAt: string;
  deadline: string;
  status: 'reserved' | 'submitted' | 'approved' | 'rejected';
  payAmount: number;
  starReward?: number;
  postUrl?: string;
  proofScreenshot?: string;
  submittedAt?: string;
  feedback?: string;
}

export interface CreatorProfile {
  id: string;
  name: string;
  email: string;
  instagramUsername: string;
  followerCount: number;
  tier: Tier;
  country: string;
  city: string;
  isInstagramVerified: boolean;
  walletBalance: number;
  lifetimeEarnings: number;
  stars: number;
  proStatus: boolean;
  proExpiryDate?: string;
  upiId?: string;
}

export interface SponsorProfile {
  id: string;
  name: string;
  companyName: string;
  email: string;
  walletBalance: number;
  totalBudgetSpent: number;
  activeCampaignsCount: number;
  creatorsReached: number;
  gstNumber?: string;
  country: string;
  city: string;
}

export interface WithdrawalTransaction {
  id: string;
  date: string;
  amount: number;
  gstDeduction: number; // 18%
  netAmount: number;
  upiId: string;
  status: 'pending' | 'completed' | 'rejected';
  referenceId: string;
}

export interface SponsorDeposit {
  id: string;
  date: string;
  baseAmount: number;
  gstAmount: number; // 18%
  totalPaid: number;
  status: 'completed';
  method: 'UPI' | 'Card' | 'NetBanking';
}

export const TIERS: Tier[] = [
  { id: 1, name: "Starter", minFollowers: 500, maxFollowers: 2000, basePayment: 0 },
  { id: 2, name: "Nano", minFollowers: 2000, maxFollowers: 10000, basePayment: 0 },
  { id: 3, name: "Micro", minFollowers: 10000, maxFollowers: 50000, basePayment: 0 },
  { id: 4, name: "Mid", minFollowers: 50000, maxFollowers: 250000, basePayment: 0 },
  { id: 5, name: "Macro", minFollowers: 250000, maxFollowers: 1000000, basePayment: 0 },
  { id: 6, name: "Mega", minFollowers: 1000000, maxFollowers: Infinity, basePayment: 0 },
];

export const CATEGORIES = [
  'All',
  'Fashion & Apparel',
  'Beauty & Skincare',
  'Tech & Gadgets',
  'Fitness & Health',
  'Food & Beverages',
  'Lifestyle & Travel',
  'Gaming',
  'Promotional ⭐'
];
