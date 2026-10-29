
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
  { id: 1, name: "Tier 1", label: "Tier 1", minFollowers: 500, maxFollowers: 2500, basePayment: 1000 },
  { id: 2, name: "Tier 2", label: "Tier 2", minFollowers: 2500, maxFollowers: 5000, basePayment: 2000 },
  { id: 3, name: "Tier 3", label: "Tier 3", minFollowers: 5000, maxFollowers: 10000, basePayment: 3500 },
  { id: 4, name: "Tier 4", label: "Tier 4", minFollowers: 10000, maxFollowers: 25000, basePayment: 6000 },
  { id: 5, name: "Tier 5", label: "Tier 5", minFollowers: 25000, maxFollowers: 50000, basePayment: 10000 },
  { id: 6, name: "Tier 6", label: "Tier 6", minFollowers: 50000, maxFollowers: 100000, basePayment: 18000 },
  { id: 7, name: "Tier 7", label: "Tier 7", minFollowers: 100000, maxFollowers: 250000, basePayment: 30000 },
  { id: 8, name: "Tier 8", label: "Tier 8", minFollowers: 250000, maxFollowers: 500000, basePayment: 50000 },
  { id: 9, name: "Tier 9", label: "Tier 9", minFollowers: 500000, maxFollowers: Infinity, basePayment: 100000 },
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
