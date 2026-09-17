import { Campaign, CampaignSubmission, CreatorProfile, SponsorProfile, TIERS, WithdrawalTransaction } from '../types';

export const initialCreatorProfile: CreatorProfile = {
  id: 'c_101',
  name: 'Aarav Sharma',
  email: 'aarav.creator@instagram.com',
  instagramUsername: 'aarav_vibes',
  followerCount: 28500,
  tier: TIERS[5], // Tier 6 (20,000 - 35,000)
  country: 'India',
  city: 'Mumbai',
  isInstagramVerified: true,
  walletBalance: 3850,
  lifetimeEarnings: 14200,
  stars: 12, // 2 milestones achieved (5, 10), next at 15
  proStatus: true,
  proExpiryDate: '2026-10-30',
  upiId: 'aarav@okaxis'
};

export const initialSponsorProfile: SponsorProfile = {
  id: 's_202',
  name: 'Priya Malhotra',
  companyName: 'GlowAura Beauty Labs',
  email: 'partnerships@glowaura.com',
  walletBalance: 45000,
  totalBudgetSpent: 128000,
  activeCampaignsCount: 4,
  creatorsReached: 86,
  gstNumber: '27AABCG1234F1Z5',
  country: 'India',
  city: 'Bengaluru'
};

export const initialCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    title: 'Summer Vitamin C Serum Launch Reel',
    brand: 'GlowAura',
    brandLogo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150&auto=format&fit=crop&q=80',
    category: 'Beauty & Skincare',
    description: 'Create an engaging 30-45s Instagram Reel showcasing your morning skincare routine featuring GlowAura Vitamin C Glow Serum.',
    targetCountries: ['India'],
    targetCities: ['Mumbai', 'Delhi', 'Bengaluru', 'Pune'],
    deadline: new Date(Date.now() + 38 * 3600 * 1000).toISOString(),
    totalSpots: 25,
    availableSpots: 7,
    tier: TIERS[5], // Tier 6
    payAmount: 300,
    status: 'active',
    requirements: [
      'Minimum 1 Reel post with audio trending on Instagram',
      'Tag @glowaura and use #GlowWithAura #SummerSkin',
      'Pin the discount link in your bio for 48 hours',
      'Clear lighting, vertical 9:16 aspect ratio'
    ],
    guidelines: 'Demonstrate application on clean skin before moisturizer. Show the texture and glow finish. No competitor skincare products in background.',
    sponsorName: 'GlowAura Beauty Labs',
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: 'camp-2',
    title: 'SonicBass ANC Earbuds Unboxing & Sound Test',
    brand: 'SonicTech',
    brandLogo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80',
    category: 'Tech & Gadgets',
    description: 'Test the active noise cancellation and deep bass in a real-world setting (cafe/metro/gym) and share your authentic reaction.',
    targetCountries: ['India', 'United States'],
    deadline: new Date(Date.now() + 45 * 3600 * 1000).toISOString(),
    totalSpots: 15,
    availableSpots: 3,
    tier: TIERS[5], // Tier 6
    payAmount: 300,
    status: 'active',
    requirements: [
      'Show the charging case, earbuds in ear, and battery life feature',
      'Mention 40hr playtime and Bluetooth 5.3 instant connect',
      'Swipe-up / link in sticker for purchase'
    ],
    guidelines: 'Focus on crisp audio testing. Highlight the sleek matte finish and ergonomic fit.',
    sponsorName: 'SonicTech Global',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  },
  {
    id: 'camp-3',
    title: 'Star Boost: Mingree Creator App Promotion ⭐',
    brand: 'Mingree Official',
    brandLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    category: 'Promotional ⭐',
    isPromotional: true,
    starReward: 5, // 5 stars = 1 FREE Pro Month!
    description: 'Promote the new Mingree Android App to your creator peers. Earn 5 Gold Stars immediately to claim 1 Free Month of Mingree PRO membership!',
    targetCountries: ['India', 'United States', 'United Kingdom', 'Canada'],
    deadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    totalSpots: 100,
    availableSpots: 42,
    tier: TIERS[0], // Open to all Tiers
    payAmount: 0,
    status: 'active',
    requirements: [
      'Post 1 Story and 1 Reel introducing Mingree to creators',
      'Highlight 20-tier payout system and instant UPI withdrawal',
      'Include your referral code link in Story sticker'
    ],
    guidelines: 'Authentic creator testimonial on how Mingree connects micro & nano influencers with international brand campaigns.',
    sponsorName: 'Mingree Platform Inc.',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 'camp-4',
    title: 'Monsoon Streetwear Collection Lookbook',
    brand: 'UrbanThreads',
    brandLogo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&auto=format&fit=crop&q=80',
    category: 'Fashion & Apparel',
    description: 'Style 2 outfits from the new UrbanThreads oversized graphic tees collection with high-energy transitions.',
    targetCountries: ['India'],
    targetCities: ['Mumbai', 'Delhi', 'Bangalore', 'Chandigarh'],
    deadline: new Date(Date.now() + 29 * 3600 * 1000).toISOString(),
    totalSpots: 20,
    availableSpots: 5,
    tier: TIERS[4], // Tier 5
    payAmount: 200,
    status: 'active',
    requirements: [
      'High-fashion aesthetic Reel with transition beat-sync',
      'Show garment labels and fabric texture in close-up',
      'Caption must include style tips and promo discount code'
    ],
    guidelines: 'Urban outdoor backdrop or modern studio lighting. Avoid cluttered indoor rooms.',
    sponsorName: 'UrbanThreads Apparel',
    createdAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
  },
  {
    id: 'camp-5',
    title: 'Protein Plant Shake Quick Breakfast Recipe',
    brand: 'NutriFuel',
    brandLogo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80',
    category: 'Fitness & Health',
    description: 'Make a 3-minute post-workout smoothie using NutriFuel Raw Vegan Protein powder. Show blender ingredients and final taste test.',
    targetCountries: ['India'],
    deadline: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    totalSpots: 10,
    availableSpots: 1,
    tier: TIERS[6], // Tier 7
    payAmount: 500,
    status: 'active',
    requirements: [
      'Show 1 scoop NutriFuel powder + banana/berries + oats',
      'Taste reaction on camera with clear genuine smile',
      'Mention zero added sugar and 26g clean protein per scoop'
    ],
    guidelines: 'Clean kitchen setup or gym smoothie bar. Natural sunlight preferred.',
    sponsorName: 'NutriFuel Wellness',
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString()
  },
  {
    id: 'camp-6',
    title: 'Pro Creator Star Sprint: Tech Reviews ⭐',
    brand: 'Mingree Stars',
    brandLogo: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80',
    category: 'Promotional ⭐',
    isPromotional: true,
    starReward: 3,
    description: 'Share a story highlighting why micro-influencers can earn predictable income with Mingree verified brands.',
    targetCountries: ['India'],
    deadline: new Date(Date.now() + 50 * 3600 * 1000).toISOString(),
    totalSpots: 50,
    availableSpots: 19,
    tier: TIERS[0],
    payAmount: 0,
    status: 'active',
    requirements: ['1 Instagram story series (minimum 2 slides) with link sticker'],
    guidelines: 'Tag @mingree.official and talk about your dashboard stats.',
    sponsorName: 'Mingree Rewards',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  }
];

export const initialSubmissions: CampaignSubmission[] = [
  {
    id: 'sub-1',
    campaignId: 'camp-1',
    campaignTitle: 'Summer Vitamin C Serum Launch Reel',
    brand: 'GlowAura',
    brandLogo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150&auto=format&fit=crop&q=80',
    reservedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 46 * 3600 * 1000).toISOString(),
    status: 'reserved',
    payAmount: 300
  },
  {
    id: 'sub-2',
    campaignId: 'camp-prev-1',
    campaignTitle: 'Hydrating Matte Lip Tint Showcase',
    brand: 'BerryBlush',
    brandLogo: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=150&auto=format&fit=crop&q=80',
    reservedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    submittedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'submitted',
    postUrl: 'https://www.instagram.com/reel/C89xYzQ12aB/',
    payAmount: 300,
    proofScreenshot: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'sub-3',
    campaignId: 'camp-prev-2',
    campaignTitle: 'Wireless Noise Shield Headphones',
    brand: 'SonicTech',
    brandLogo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80',
    reservedAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    submittedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'approved',
    postUrl: 'https://www.instagram.com/reel/C77bKxP39zQ/',
    payAmount: 300,
    feedback: 'Approved by brand! Payment of ₹300 credited to your wallet.'
  },
  {
    id: 'sub-4',
    campaignId: 'camp-3',
    campaignTitle: 'Star Boost: Mingree Creator App Promotion ⭐',
    brand: 'Mingree Official',
    brandLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    reservedAt: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    submittedAt: new Date(Date.now() - 90 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 70 * 3600 * 1000).toISOString(),
    status: 'approved',
    postUrl: 'https://www.instagram.com/p/C66aMm9L2xP/',
    payAmount: 0,
    starReward: 5,
    feedback: 'Verified! 5 Gold Stars awarded to your balance.'
  }
];

export const initialWithdrawals: WithdrawalTransaction[] = [
  {
    id: 'tx_w_901',
    date: 'Yesterday, 4:15 PM',
    amount: 1500,
    gstDeduction: 270, // 18% of 1500
    netAmount: 1230,
    upiId: 'aarav@okaxis',
    status: 'completed',
    referenceId: 'UPI-BKPE-9821736182'
  },
  {
    id: 'tx_w_902',
    date: '28 Aug 2026',
    amount: 2000,
    gstDeduction: 360,
    netAmount: 1640,
    upiId: 'aarav@okaxis',
    status: 'completed',
    referenceId: 'UPI-RZPX-5519283719'
  },
  {
    id: 'tx_w_903',
    date: '14 Aug 2026',
    amount: 1000,
    gstDeduction: 180,
    netAmount: 820,
    upiId: 'aarav@okaxis',
    status: 'completed',
    referenceId: 'UPI-CFPY-1192837465'
  }
];
