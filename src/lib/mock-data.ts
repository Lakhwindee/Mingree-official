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

export const mockCampaigns: Campaign[] = [];

export const earningsData: { month: string; earnings: number; views: number }[] = [];
