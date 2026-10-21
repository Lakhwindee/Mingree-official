import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, promoCodes } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("[SEED] Seeding database...");

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@mingree.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  try {
    // 1. Seed Admin User
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
    if (existingAdmin.length === 0) {
      await db.insert(users).values({
        email: adminEmail,
        passwordHash,
        name: "Mingree Administrator",
        role: "admin",
        handle: "@admin",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        tier: "Admin",
        isEmailVerified: true,
      } as any);
      console.log(`[SEED] Created admin user: ${adminEmail}`);
    } else {
      console.log(`[SEED] Admin user already exists: ${adminEmail}`);
    }

    // 2. Seed Promo Codes: LAUNCH50 and PROCREATOR
    const launch50 = await db.select().from(promoCodes).where(eq(promoCodes.code, "LAUNCH50"));
    if (launch50.length === 0) {
      await db.insert(promoCodes).values({
        code: "LAUNCH50",
        discountType: "percentage",
        discountValue: "50.00",
        maxUses: 500,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      } as any);
      console.log("[SEED] Created promo code: LAUNCH50");
    }

    const proCreator = await db.select().from(promoCodes).where(eq(promoCodes.code, "PROCREATOR"));
    if (proCreator.length === 0) {
      await db.insert(promoCodes).values({
        code: "PROCREATOR",
        discountType: "trial_pro",
        discountValue: "100.00",
        maxUses: 1000,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      } as any);
      console.log("[SEED] Created promo code: PROCREATOR");
    }

    console.log("[SEED] Database seeding complete.");
  } catch (error) {
    console.error("[SEED ERROR] Seeding failed:", error);
    process.exit(1);
  }
}

seed();
