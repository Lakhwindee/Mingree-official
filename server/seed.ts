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

    // 4. Purge any dummy campaigns/ads from database (zero demo campaigns allowed)
    await db.execute(
      sql`DELETE FROM campaigns WHERE title ILIKE '%boAt%' OR title ILIKE '%Myntra%' OR title ILIKE '%Spotify%'
           OR title ILIKE '%Zomato%' OR title ILIKE '%Mamaearth%' OR title ILIKE '%Nykaa%'
           OR title ILIKE '%Puma%' OR title ILIKE '%OnePlus%' OR title ILIKE '%Noise%'
           OR title ILIKE '%Swiggy%' OR title ILIKE '%CRED%' OR title ILIKE '%Cult.fit%'
           OR title ILIKE '%Dil Ko Karaar%' OR title ILIKE '%Urban Streetwear%'
           OR title ILIKE '%AI Earbuds%' OR title ILIKE '%Skincare%' OR title ILIKE '%Marathon%'
           OR title ILIKE '%RPG%' OR title ILIKE '%Crypto%' OR title ILIKE '%Goa%' OR title ILIKE '%Bootcamp%' OR title ILIKE '%Swiss Watch%'
           OR artist_id IN (SELECT id FROM users WHERE email IN ('artist@mingree.com', 'admin@mingree.com', 'creator@mingree.com'))`
    ).catch(() => {});
    console.log("[SEED] Purged any demo campaigns/ads from database.");

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
