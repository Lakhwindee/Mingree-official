import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, promoCodes } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("[SEED] Seeding database...");

  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

  if (!adminEmail || !adminPassword) {
    console.error("[SEED ERROR] ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required to seed the admin account.");
    process.exit(1);
  }

  const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

  try {
    // 1. Seed Admin User idempotently without deleting existing users or campaigns
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
    if (existingAdmin.length === 0) {
      await db.insert(users).values({
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: "Mingree Admin",
        role: "admin",
        isEmailVerified: true,
      } as any);
      console.log(`[SEED] Created admin user: ${adminEmail}`);
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
