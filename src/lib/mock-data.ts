export interface Campaign {
  id: string;
  title: string;
  brand: string;
  brandLogo: string;
  payAmount: number;
  type: "Reel" | "Story" | "Post" | "Carousel";
  minFollowers: number;
  description: string;
  tier: "Nano" | "Micro" | "Macro" | "Mega";
  deadline: string;
  spots: number;
}

export const mockCampaigns: Campaign[] = [
  {
    id: "1",
    title: "boAt Rockerz 550 ANC Earphones - Active Basshead Reel",
    brand: "boAt Lifestyle",
    brandLogo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100",
    payAmount: 8500,
    type: "Reel",
    minFollowers: 5000,
    tier: "Micro",
    description: "Rocking the boAt Rockerz 550 active noise cancellation in metro or gym! Highlight #PlugIntoNirvana and tag @boat.nirvana.",
    deadline: "2026-11-15",
    spots: 10
  },
  {
    id: "2",
    title: "Mamaearth Vitamin C Face Wash - Morning Skincare Routine",
    brand: "Mamaearth India",
    brandLogo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100",
    payAmount: 6000,
    type: "Reel",
    minFollowers: 8000,
    tier: "Micro",
    description: "100% Made Safe Certified Vitamin C Face Wash for natural glow. Mention toxin-free formula and tag @mamaearth.india.",
    deadline: "2026-11-20",
    spots: 12
  },
  {
    id: "3",
    title: "Zomato Gold Gourmet - 10-Minute Meal Unboxing",
    brand: "Zomato",
    brandLogo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100",
    payAmount: 12000,
    type: "Reel",
    minFollowers: 15000,
    tier: "Macro",
    description: "Late night craving or lunch prep delivered in 10 minutes flat via Zomato Gold! Use promo code ZOMATOCRAVE.",
    deadline: "2026-11-30",
    spots: 8
  },
  {
    id: "4",
    title: "Spotify India - Trending Indie & Punjabi Audio Integration",
    brand: "Spotify India",
    brandLogo: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100",
    payAmount: 7500,
    type: "Reel",
    minFollowers: 5000,
    tier: "Micro",
    description: "Create a relatable lifestyle reel using official trending tracks from Spotify India 'Indie India' or 'Punjabi Hits' playlist.",
    deadline: "2026-11-25",
    spots: 15
  },
  {
    id: "5",
    title: "Cult.fit Transformation - 7-Day HIIT Workout Reel",
    brand: "Cult.fit",
    brandLogo: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=100",
    payAmount: 10000,
    type: "Reel",
    minFollowers: 10000,
    tier: "Macro",
    description: "15-second energetic workout reel wearing gym fit. Highlight 7-day free trial on cult.fit app and tag @cultfitofficial.",
    deadline: "2026-11-28",
    spots: 10
  },
  {
    id: "6",
    title: "Sugar Cosmetics - Matte As Hell Crayon Lipstick Swatch",
    brand: "Sugar Cosmetics",
    brandLogo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100",
    payAmount: 7000,
    type: "Reel",
    minFollowers: 8000,
    tier: "Micro",
    description: "12-hour transfer-proof stay test with @trysugar Matte As Hell lipstick crayon. Show vibrant swatch and application.",
    deadline: "2026-11-18",
    spots: 10
  },
  {
    id: "7",
    title: "Swiggy Instamart - 10-Minute Grocery & Snack Unboxing",
    brand: "Swiggy Instamart",
    brandLogo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100",
    payAmount: 5000,
    type: "Story",
    minFollowers: 5000,
    tier: "Nano",
    description: "Emergency snack or party prep ordering chips, ice cream & drinks delivered in 10 mins via Swiggy Instamart.",
    deadline: "2026-11-12",
    spots: 20
  },
  {
    id: "8",
    title: "Myntra Big Fashion Festival - Festive Outfit Styling",
    brand: "Myntra",
    brandLogo: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100",
    payAmount: 15000,
    type: "Carousel",
    minFollowers: 20000,
    tier: "Macro",
    description: "Style 3 festive outfits from Myntra Big Fashion Festival. Mention up to 80% OFF discounts and tag @myntra.",
    deadline: "2026-11-30",
    spots: 6
  }
];

export const earningsData = [
  { month: "May", earnings: 18500, views: 120000 },
  { month: "Jun", earnings: 24000, views: 180000 },
  { month: "Jul", earnings: 32000, views: 240000 },
  { month: "Aug", earnings: 45000, views: 350000 },
  { month: "Sep", earnings: 58000, views: 480000 },
  { month: "Oct", earnings: 72500, views: 650000 },
];
