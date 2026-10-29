
// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Star = __DummyIcon;

export interface Tier {
  id: number;
  name: string;
  label?: string;
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
  { id: 1, name: "Tier 1", label: "Tier 1", minFollowers: 500, maxFollowers: 1001, basePayment: 22 },
  { id: 2, name: "Tier 2", label: "Tier 2", minFollowers: 1001, maxFollowers: 2001, basePayment: 30 },
  { id: 3, name: "Tier 3", label: "Tier 3", minFollowers: 2001, maxFollowers: 3001, basePayment: 42 },
  { id: 4, name: "Tier 4", label: "Tier 4", minFollowers: 3001, maxFollowers: 5001, basePayment: 60 },
  { id: 5, name: "Tier 5", label: "Tier 5", minFollowers: 5001, maxFollowers: 7501, basePayment: 75 },
  { id: 6, name: "Tier 6", label: "Tier 6", minFollowers: 7501, maxFollowers: 10001, basePayment: 90 },
  { id: 7, name: "Tier 7", label: "Tier 7", minFollowers: 10001, maxFollowers: 12501, basePayment: 105 },
  { id: 8, name: "Tier 8", label: "Tier 8", minFollowers: 12501, maxFollowers: 15001, basePayment: 120 },
  { id: 9, name: "Tier 9", label: "Tier 9", minFollowers: 15001, maxFollowers: 20001, basePayment: 180 },
  { id: 10, name: "Tier 10", label: "Tier 10", minFollowers: 20001, maxFollowers: 25001, basePayment: 210 },
  { id: 11, name: "Tier 11", label: "Tier 11", minFollowers: 25001, maxFollowers: 30001, basePayment: 240 },
  { id: 12, name: "Tier 12", label: "Tier 12", minFollowers: 30001, maxFollowers: 40001, basePayment: 300 },
  { id: 13, name: "Tier 13", label: "Tier 13", minFollowers: 40001, maxFollowers: 50001, basePayment: 360 },
  { id: 14, name: "Tier 14", label: "Tier 14", minFollowers: 50001, maxFollowers: 75001, basePayment: 480 },
  { id: 15, name: "Tier 15", label: "Tier 15", minFollowers: 75001, maxFollowers: 100001, basePayment: 600 },
  { id: 16, name: "Tier 16", label: "Tier 16", minFollowers: 100001, maxFollowers: 150001, basePayment: 840 },
  { id: 17, name: "Tier 17", label: "Tier 17", minFollowers: 150001, maxFollowers: 200001, basePayment: 1080 },
  { id: 18, name: "Tier 18", label: "Tier 18", minFollowers: 200001, maxFollowers: 300001, basePayment: 1440 },
  { id: 19, name: "Tier 19", label: "Tier 19", minFollowers: 300001, maxFollowers: 400001, basePayment: 1800 },
  { id: 20, name: "Tier 20", label: "Tier 20", minFollowers: 400001, maxFollowers: 500001, basePayment: 2160 },
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
