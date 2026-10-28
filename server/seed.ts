import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, creatorProfiles, wallets, promoCodes, campaigns } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("[SEED] Seeding database...");

  const passwordHash = bcrypt.hashSync("password123", 10);
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);

  try {
    // 1. Seed Admin User
    const adminEmail = "admin@mingree.com";
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
    if (existingAdmin.length === 0) {
      await db.insert(users).values({
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: "Mingree Admin",
        role: "admin",
        handle: "@admin",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        tier: "Admin",
        isEmailVerified: true,
      } as any);
      console.log(`[SEED] Created admin user: ${adminEmail} / admin123`);
    }

    // 2. Seed Artist / Brand Demo User
    const artistEmail = "artist@mingree.com";
    const existingArtist = await db.select().from(users).where(eq(users.email, artistEmail));
    let artistId: number;
    if (existingArtist.length === 0) {
      const [newArtist] = await db.insert(users).values({
        email: artistEmail,
        passwordHash,
        name: "Rohan Verma (Artist)",
        role: "sponsor",
        handle: "@rohanmusic",
        companyName: "Rohan Records",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        tier: "Standard",
        isEmailVerified: true,
      } as any).returning();
      artistId = newArtist.id;
      console.log(`[SEED] Created artist user: ${artistEmail} / password123`);
    } else {
      artistId = existingArtist[0].id;
    }

    // Wallet for Artist
    const existingArtistWallet = await db.select().from(wallets).where(eq(wallets.userId, artistId));
    if (existingArtistWallet.length === 0) {
      await db.insert(wallets).values({
        userId: artistId,
        balance: "500000.00",
        escrowHeld: "0.00",
      } as any);
    }

    // 3. Seed Creator Demo User
    const creatorEmail = "creator@mingree.com";
    const existingCreator = await db.select().from(users).where(eq(users.email, creatorEmail));
    let creatorId: number;
    if (existingCreator.length === 0) {
      const [newCreator] = await db.insert(users).values({
        email: creatorEmail,
        passwordHash,
        name: "Priya Sharma (Creator)",
        role: "creator",
        handle: "@creator",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        tier: "Rising",
        isEmailVerified: true,
      } as any).returning();
      creatorId = newCreator.id;
      console.log(`[SEED] Created creator user: ${creatorEmail} / password123`);
    } else {
      creatorId = existingCreator[0].id;
    }

    // Wallet for Creator
    const existingCreatorWallet = await db.select().from(wallets).where(eq(wallets.userId, creatorId));
    if (existingCreatorWallet.length === 0) {
      await db.insert(wallets).values({
        userId: creatorId,
        balance: "12500.00",
        escrowHeld: "0.00",
      } as any);
    }

    // Creator Profile
    const existingProfile = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, creatorId));
    if (existingProfile.length === 0) {
      await db.insert(creatorProfiles).values({
        userId: creatorId,
        username: null,
        followers: 0,
        medianViews: 0,
        engagementRate: "0.0",
        indiaAudiencePct: "92",
        tierLabel: "Micro",
        riskScore: 5,
        status: "pending",
      } as any);
    }

    // Clear any pre-seeded fake Instagram connections across all profiles
    await db.execute(
      sql`UPDATE creator_profiles SET instagram_user_id = NULL, username = NULL, followers = 0, median_views = 0, engagement_rate = '0.0', status = 'pending', access_token_enc = NULL, token_expires_at = NULL WHERE access_token_enc IS NULL OR username IN ('priyareels', 'priya_reels_official', 'judgesaab')`
    ).catch(() => {});

    // 4. Seed 10 Dummy Campaigns / Ads in Marketplace
    const existingCampaigns = await db.select({ count: sql<number>`count(*)` }).from(campaigns);
    const campaignCount = Number(existingCampaigns[0]?.count || 0);

    if (campaignCount === 0) {
      const dummyCampaignsData = [
        {
          artistId,
          title: "Dil Ko Karaar - Punjabi Pop Track Promotion",
          songUrl: "https://instagram.com/reels/audio/dil_ko_karaar",
          genre: "Music Reels",
          language: "Punjabi / Hindi",
          budget: "50000.00",
          pricingMode: "fixed",
          fixedPrice: "5000.00",
          requiredTags: ["#DilKoKaraar", "#NewMusic", "#PaidPartnership"],
          requiredCaptionNote: "Tag @rohanmusic and use the official audio.",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Urban Streetwear Fashion Summer Drop",
          songUrl: "https://instagram.com/reels/audio/urban_streetwear",
          genre: "Lifestyle",
          language: "Hindi / English",
          budget: "75000.00",
          pricingMode: "cap",
          priceCapPer1k: "25.00",
          requiredTags: ["#UrbanStyle", "#SummerDrop", "#Ad"],
          requiredCaptionNote: "Showcase outfit fit check.",
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Next-Gen AI Earbuds Review & Unboxing",
          songUrl: "https://instagram.com/reels/audio/ai_earbuds",
          genre: "Tech & Gadgets",
          language: "English",
          budget: "100000.00",
          pricingMode: "fixed",
          fixedPrice: "10000.00",
          requiredTags: ["#TechReview", "#AIEarbuds", "#Sponsored"],
          requiredCaptionNote: "Highlight active noise cancellation.",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Glow Up Organic Skincare Routine Reel",
          songUrl: "https://instagram.com/reels/audio/organic_glow",
          genre: "Lifestyle",
          language: "Hindi",
          budget: "40000.00",
          pricingMode: "fixed",
          fixedPrice: "4000.00",
          requiredTags: ["#GlowUp", "#SkincareRoutine", "#Ad"],
          requiredCaptionNote: "Show 7-day before and after result.",
          deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Marathon Training Protein Shake Promo",
          songUrl: "https://instagram.com/reels/audio/protein_power",
          genre: "Fitness & Health",
          language: "English / Hindi",
          budget: "60000.00",
          pricingMode: "cap",
          priceCapPer1k: "20.00",
          requiredTags: ["#FitnessGoals", "#ProteinShake", "#PaidPartnership"],
          requiredCaptionNote: "Post workout routine integration.",
          deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Open World RPG Mobile Game Launch",
          songUrl: "https://instagram.com/reels/audio/rpg_gameplay",
          genre: "Gaming",
          language: "English",
          budget: "120000.00",
          pricingMode: "fixed",
          fixedPrice: "12000.00",
          requiredTags: ["#MobileGaming", "#RPGLunch", "#Ad"],
          requiredCaptionNote: "Show 30s of actual gameplay graphics.",
          deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Crypto Web3 Wallet Secure Onboarding",
          songUrl: "https://instagram.com/reels/audio/web3_wallet",
          genre: "Finance & Apps",
          language: "English",
          budget: "90000.00",
          pricingMode: "cap",
          priceCapPer1k: "35.00",
          requiredTags: ["#Web3", "#CryptoWallet", "#Sponsored"],
          requiredCaptionNote: "Explain gasless transactions.",
          deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Goa Monsoon Luxury Resort Stay Promo",
          songUrl: "https://instagram.com/reels/audio/goa_luxury",
          genre: "Travel",
          language: "English / Hindi",
          budget: "80000.00",
          pricingMode: "fixed",
          fixedPrice: "8000.00",
          requiredTags: ["#GoaDiaries", "#LuxuryResort", "#Ad"],
          requiredCaptionNote: "Highlight infinity pool and villa views.",
          deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Coding Bootcamp Full Stack Scholarship",
          songUrl: "https://instagram.com/reels/audio/coding_bootcamp",
          genre: "Education",
          language: "Hindi / English",
          budget: "55000.00",
          pricingMode: "fixed",
          fixedPrice: "5500.00",
          requiredTags: ["#CodingBootcamp", "#TechCareers", "#PaidPartnership"],
          requiredCaptionNote: "Mention placement guarantee.",
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: "active",
        },
        {
          artistId,
          title: "Designer Swiss Watch Luxury Showcase",
          songUrl: "https://instagram.com/reels/audio/swiss_watch",
          genre: "Lifestyle",
          language: "English",
          budget: "150000.00",
          pricingMode: "cap",
          priceCapPer1k: "50.00",
          requiredTags: ["#SwissWatch", "#LuxuryLifestyle", "#Ad"],
          requiredCaptionNote: "Close-up wrist shot with formal wear.",
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: "active",
        },
      ];

      for (const camp of dummyCampaignsData) {
        await db.insert(campaigns).values(camp as any);
      }
      console.log("[SEED] Created 10 dummy campaigns/ads in marketplace.");
    }

    // 5. Seed Promo Codes: LAUNCH50 and PROCREATOR
    const launch50 = await db.select().from(promoCodes).where(eq(promoCodes.code, "LAUNCH50"));
    if (launch50.length === 0) {
      await db.insert(promoCodes).values({
        code: "LAUNCH50",
        discountType: "percentage",
        discountValue: "50.00",
        maxUses: 500,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      } as any);
    }

    const proCreator = await db.select().from(promoCodes).where(eq(promoCodes.code, "PROCREATOR"));
    if (proCreator.length === 0) {
      await db.insert(promoCodes).values({
        code: "PROCREATOR",
        discountType: "trial_pro",
        discountValue: "100.00",
        maxUses: 1000,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      } as any);
    }

    console.log("[SEED] Database seeding complete.");
  } catch (error) {
    console.error("[SEED ERROR] Seeding failed:", error);
  }
}

seed();
