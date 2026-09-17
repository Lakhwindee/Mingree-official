export interface Tier {
  id: number;
  name: string; // Already "Tier 1", "Tier 2", etc.
  minFollowers: number;
  maxFollowers: number;
  basePayment: number;
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
  // Nano Influencers (500 - 50K)
  { id: 1, name: "Tier 1", minFollowers: 500, maxFollowers: 1000, basePayment: 20 },
  { id: 2, name: "Tier 2", minFollowers: 1000, maxFollowers: 2000, basePayment: 50 },
  { id: 3, name: "Tier 3", minFollowers: 2000, maxFollowers: 5000, basePayment: 80 },
  { id: 4, name: "Tier 4", minFollowers: 5000, maxFollowers: 10000, basePayment: 150 },
  { id: 5, name: "Tier 5", minFollowers: 10000, maxFollowers: 20000, basePayment: 200 },
  { id: 6, name: "Tier 6", minFollowers: 20000, maxFollowers: 35000, basePayment: 300 },
  { id: 7, name: "Tier 7", minFollowers: 35000, maxFollowers: 50000, basePayment: 500 },
  // Micro Influencers (50K - 100K)
  { id: 8, name: "Tier 8", minFollowers: 50000, maxFollowers: 75000, basePayment: 700 },
  { id: 9, name: "Tier 9", minFollowers: 75000, maxFollowers: 100000, basePayment: 900 },
  // Mid-Tier Influencers (100K - 500K)
  { id: 10, name: "Tier 10", minFollowers: 100000, maxFollowers: 150000, basePayment: 1200 },
  { id: 11, name: "Tier 11", minFollowers: 150000, maxFollowers: 200000, basePayment: 1500 },
  { id: 12, name: "Tier 12", minFollowers: 200000, maxFollowers: 300000, basePayment: 2000 },
  { id: 13, name: "Tier 13", minFollowers: 300000, maxFollowers: 500000, basePayment: 2500 },
  // Macro Influencers (500K - 1M)
  { id: 14, name: "Tier 14", minFollowers: 500000, maxFollowers: 750000, basePayment: 3000 },
  { id: 15, name: "Tier 15", minFollowers: 750000, maxFollowers: 1000000, basePayment: 4000 },
  // Mega Influencers (1M+)
  { id: 16, name: "Tier 16", minFollowers: 1000000, maxFollowers: 2000000, basePayment: 5000 },
  { id: 17, name: "Tier 17", minFollowers: 2000000, maxFollowers: 3000000, basePayment: 7000 },
  { id: 18, name: "Tier 18", minFollowers: 3000000, maxFollowers: 5000000, basePayment: 9000 },
  { id: 19, name: "Tier 19", minFollowers: 5000000, maxFollowers: 7000000, basePayment: 12000 },
  { id: 20, name: "Tier 20", minFollowers: 7000000, maxFollowers: 10000000, basePayment: 15000 },
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
