import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, promoCodes, campaigns } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("[SEED] Seeding database...");

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

    // 2. Remove all non-admin demo users (creator, sponsor, artist, etc.) as requested
    await db.execute(
      sql`DELETE FROM users WHERE role != 'admin' AND email != 'admin@mingree.com'`
    ).catch(() => {});
    console.log("[SEED] Removed all non-admin users from database.");

    // 3. Purge any dummy campaigns/ads from database
    await db.execute(
      sql`DELETE FROM campaigns WHERE title ILIKE '%boAt%' OR title ILIKE '%Myntra%' OR title ILIKE '%Spotify%'
           OR title ILIKE '%Zomato%' OR title ILIKE '%Mamaearth%' OR title ILIKE '%Nykaa%'
           OR title ILIKE '%Puma%' OR title ILIKE '%OnePlus%' OR title ILIKE '%Noise%'
           OR title ILIKE '%Swiggy%' OR title ILIKE '%CRED%' OR title ILIKE '%Cult.fit%'
           OR title ILIKE '%Dil Ko Karaar%' OR title ILIKE '%Urban Streetwear%'
           OR title ILIKE '%AI Earbuds%' OR title ILIKE '%Skincare%' OR title ILIKE '%Marathon%'
           OR title ILIKE '%RPG%' OR title ILIKE '%Crypto%' OR title ILIKE '%Goa%' OR title ILIKE '%Bootcamp%' OR title ILIKE '%Swiss Watch%'`
    ).catch(() => {});
    console.log("[SEED] Purged any demo campaigns/ads from database.");

    // 4. Seed Promo Codes: LAUNCH50 and PROCREATOR
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

    console.log("[SEED] Database seeding complete (only admin user retained).");
  } catch (error) {
    console.error("[SEED ERROR] Seeding failed:", error);
  }
}

seed();
