import { db } from "./db";
import { promoCodes, promoRedemptions, users, kyc } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { CONFIG } from "../shared/config";

// In-memory promo fallbacks
interface MemoryPromo {
  id: number;
  code: string;
  discountType: string; // percentage | fixed | trial_pro | tax_exempt
  discountValue: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
}

const memoryPromosMap = new Map<string, MemoryPromo>([
  [
    "LAUNCH50",
    {
      id: 1,
      code: "LAUNCH50",
      discountType: "percentage",
      discountValue: "50.00",
      maxUses: 500,
      usedCount: 0,
      isActive: true,
    },
  ],
  [
    "PROCREATOR",
    {
      id: 2,
      code: "PROCREATOR",
      discountType: "trial_pro",
      discountValue: "100.00",
      maxUses: 1000,
      usedCount: 0,
      isActive: true,
    },
  ],
]);

const memoryRedemptionsSet = new Set<string>(); // "userId:promoId"

// 1. Validate Promo Code
export async function validatePromoCode(code: string, userId: number): Promise<{
  valid: boolean;
  promo?: any;
  discountAmount?: number;
  message: string;
}> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return { valid: false, message: "Promo code is required" };

  let promo: any = null;
  try {
    const rows = await db.select().from(promoCodes).where(eq(promoCodes.code, cleanCode));
    if (rows.length > 0) promo = rows[0];
  } catch {
    promo = memoryPromosMap.get(cleanCode) || null;
  }

  if (!promo) {
    return { valid: false, message: "Invalid promo code" };
  }

  if (promo.isActive === false) {
    return { valid: false, message: "This promo code is no longer active" };
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, message: "This promo code has expired" };
  }

  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { valid: false, message: "This promo code has reached its maximum redemptions" };
  }

  // Check unique redemption per user
  try {
    const existing = await db
      .select()
      .from(promoRedemptions)
      .where(and(eq(promoRedemptions.userId, userId), eq(promoRedemptions.promoCodeId, promo.id)));
    if (existing.length > 0) {
      return { valid: false, message: "You have already redeemed this promo code" };
    }
  } catch {
    if (memoryRedemptionsSet.has(`${userId}:${promo.id}`)) {
      return { valid: false, message: "You have already redeemed this promo code" };
    }
  }

  const value = parseFloat(promo.discountValue || "0");
  let discountAmount = 0;
  if (promo.discountType === "percentage") {
    discountAmount = parseFloat(((CONFIG.CREATOR_PRO_PRICE * value) / 100).toFixed(2));
  } else if (promo.discountType === "fixed" || promo.discountType === "trial_pro") {
    discountAmount = Math.min(CONFIG.CREATOR_PRO_PRICE, value);
  }

  return {
    valid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    },
    discountAmount,
    message: "Promo code is valid!",
  };
}

// 2. Apply and Redeem Promo Code Atomically
export async function applyAndRedeemPromoCode(code: string, userId: number): Promise<{ success: boolean; discountAmount: number }> {
  const validation = await validatePromoCode(code, userId);
  if (!validation.valid || !validation.promo) {
    throw new Error(validation.message);
  }

  const promoId = validation.promo.id;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(promoCodes)
        .set({ usedCount: sql`${promoCodes.usedCount} + 1` } as any)
        .where(eq(promoCodes.id, promoId));

      await tx.insert(promoRedemptions).values({
        userId,
        promoCodeId: promoId,
      } as any);
    });
  } catch {
    const memPromo = memoryPromosMap.get(code.trim().toUpperCase());
    if (memPromo) {
      memPromo.usedCount += 1;
    }
    memoryRedemptionsSet.add(`${userId}:${promoId}`);
  }

  return { success: true, discountAmount: validation.discountAmount || 0 };
}

// 3. Tax Invoice PDF Generator
export interface TaxInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  customerGstin?: string;
  customerPan?: string;
  billingAddress?: string;
  description: string;
  baseAmount: number;
  platformFee: number;
  gstAmount: number;
  totalAmount: number;
}

export function generateTaxInvoiceHtml(data: TaxInvoiceData): string {
  const cgst = (data.gstAmount / 2).toFixed(2);
  const sgst = (data.gstAmount / 2).toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${data.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 30px; color: #1e293b; background-color: #f8fafc; }
    .invoice-card { max-width: 750px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .brand-title { font-size: 28px; font-weight: 800; color: #2563eb; margin: 0; }
    .invoice-title { font-size: 20px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-block { font-size: 14px; line-height: 1.6; }
    .info-title { font-weight: 700; color: #0f172a; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .totals-row { font-weight: 700; font-size: 16px; background: #eff6ff; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="brand-title">Mingree</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Creator & Sponsor Platform</p>
      </div>
      <div>
        <h2 class="invoice-title">Tax Invoice</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;"># ${data.invoiceNumber}</p>
        <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Date: ${data.invoiceDate}</p>
      </div>
    </div>

    <div class="grid">
      <div class="info-block">
        <div class="info-title">Billed By:</div>
        <strong>Mingree Technologies Pvt Ltd</strong><br>
        GSTIN: 27AABCM1234F1Z1<br>
        PAN: AABCM1234F<br>
        Mumbai, Maharashtra, India
      </div>
      <div class="info-block">
        <div class="info-title">Billed To:</div>
        <strong>${data.customerName}</strong><br>
        ${data.customerEmail}<br>
        ${data.customerGstin ? `GSTIN: ${data.customerGstin}<br>` : ""}
        ${data.customerPan ? `PAN: ${data.customerPan}<br>` : ""}
        ${data.billingAddress || "India"}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Base Amount (₹)</th>
          <th class="text-right">Platform Fee (7.5%)</th>
          <th class="text-right">CGST (9%)</th>
          <th class="text-right">SGST (9%)</th>
          <th class="text-right">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.description}</td>
          <td class="text-right">${data.baseAmount.toFixed(2)}</td>
          <td class="text-right">${data.platformFee.toFixed(2)}</td>
          <td class="text-right">${cgst}</td>
          <td class="text-right">${sgst}</td>
          <td class="text-right"><strong>${data.totalAmount.toFixed(2)}</strong></td>
        </tr>
        <tr class="totals-row">
          <td colspan="5"><strong>Total Amount Payable</strong></td>
          <td class="text-right"><strong>₹${data.totalAmount.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <p>This is a computer-generated tax invoice and requires no physical signature.</p>
      <p>&copy; ${new Date().getFullYear()} Mingree Platform. Statutory GST Compliance ID: MINGREE-INV-${Date.now()}</p>
    </div>
  </div>
</body>
</html>
  `;
}
