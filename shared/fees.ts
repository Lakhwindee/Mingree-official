import { CONFIG } from "./config";

export interface FeeBreakdown {
  basePrice: number;
  artistFeePercent: number;
  artistFee: number;
  artistGstOnFee: number;
  totalArtistPayable: number;
  creatorFeePercent: number;
  creatorFee: number;
  creatorNet: number;
  gstPercent: number;
}

/**
 * Single, centralized platform fee calculation function grounded in shared/config.ts
 */
export function calculatePlatformFees(basePrice: number, isProCreator = false): FeeBreakdown {
  const cleanPrice = Math.max(0, Number(basePrice) || 0);

  const artistFeePercent = CONFIG.FEE_ARTIST_PERCENT;
  const creatorFeePercent = isProCreator ? CONFIG.FEE_CREATOR_PERCENT_PRO : CONFIG.FEE_CREATOR_PERCENT;
  const gstPercent = CONFIG.GST_PERCENT;

  const artistFee = parseFloat(((cleanPrice * artistFeePercent) / 100).toFixed(2));
  const creatorFee = parseFloat(((cleanPrice * creatorFeePercent) / 100).toFixed(2));

  const artistGstOnFee = parseFloat(((artistFee * gstPercent) / 100).toFixed(2));
  const totalArtistPayable = parseFloat((cleanPrice + artistFee + artistGstOnFee).toFixed(2));
  const creatorNet = parseFloat((cleanPrice - creatorFee).toFixed(2));

  return {
    basePrice: cleanPrice,
    artistFeePercent,
    artistFee,
    artistGstOnFee,
    totalArtistPayable,
    creatorFeePercent,
    creatorFee,
    creatorNet,
    gstPercent,
  };
}
