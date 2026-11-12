export interface EnvValidationReport {
  isProduction: boolean;
  databaseConfigured: boolean;
  jwtConfigured: boolean;
  encryptionConfigured: boolean;
  storageConfigured: boolean;
  storageProvider: "r2" | "vercel_blob" | "unconfigured";
  cashfreeMode: "production" | "sandbox" | "unconfigured";
  cashfreeConfigured: boolean;
  instagramConfigured: boolean;
  emailConfigured: boolean;
  appUrl: string;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnvironment(): EnvValidationReport {
  const isProduction = process.env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. DATABASE_URL / Cloudflare Hyperdrive (Supabase PostgreSQL)
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  const hyperdriveBound = Boolean(process.env.HYPERDRIVE);
  const databaseConfigured = Boolean(
    hyperdriveBound || (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")))
  );
  if (isProduction && !databaseConfigured) {
    errors.push("DATABASE_URL or Cloudflare Hyperdrive binding is required in production (Supabase PostgreSQL).");
  }

  // 2. JWT_SECRET
  const jwtSecret = (process.env.JWT_SECRET || "").trim();
  const jwtConfigured = jwtSecret.length >= 32;
  if (isProduction && !jwtConfigured) {
    errors.push("JWT_SECRET is required in production and must be at least 32 characters long (generate via 'openssl rand -hex 32').");
  }

  // 3. TOKEN_ENC_KEY
  const encKey = (process.env.TOKEN_ENC_KEY || "").trim();
  const encryptionConfigured = encKey.length >= 32;
  if (isProduction && !encryptionConfigured) {
    errors.push("TOKEN_ENC_KEY is required in production for financial/PAN AES-256-GCM encryption and must be at least 32 characters long.");
  }

  // 4. STORAGE (Cloudflare R2 Native Binding or S3 API)
  const r2NativeBinding = Boolean((globalThis as any).__CF_R2_BUCKET__);
  const r2Configured = r2NativeBinding || Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
  const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const storageConfigured = r2Configured || blobConfigured;
  const storageProvider = r2Configured ? "r2" : blobConfigured ? "vercel_blob" : "unconfigured";
  if (isProduction && !storageConfigured) {
    warnings.push("Cloudflare R2 storage credentials or Workers R2 binding are not configured. Uploads will fail until R2 is supplied.");
  }

  // 5. CASHFREE PAYMENTS (Separation of Production vs Sandbox)
  const cashfreeModeRaw = (process.env.CASHFREE_MODE || "").toLowerCase().trim();
  const cashfreeAppId = (process.env.CASHFREE_APP_ID || "").trim();
  const cashfreeSecret = (process.env.CASHFREE_SECRET_KEY || "").trim();
  const cashfreeConfigured = Boolean(cashfreeAppId && cashfreeSecret);
  const cashfreeMode = cashfreeConfigured ? (cashfreeModeRaw === "production" ? "production" : "sandbox") : "unconfigured";

  if (isProduction) {
    if (!cashfreeConfigured) {
      warnings.push("Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are not set. Payments will operate in mock verification mode.");
    } else if (cashfreeMode === "sandbox") {
      warnings.push("CASHFREE_MODE is set to 'sandbox' in production environment. Real user payments will not be processed until set to 'production'.");
    }
  }

  // 6. INSTAGRAM META OAUTH
  const igAppId = (process.env.INSTAGRAM_APP_ID || "").trim();
  const igSecret = (process.env.INSTAGRAM_APP_SECRET || "").trim();
  const instagramConfigured = Boolean(igAppId && igSecret);
  if (isProduction && !instagramConfigured) {
    warnings.push("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set. Official Instagram OAuth linking will be unavailable.");
  }

  // 7. EMAIL (GMAIL)
  const gmailUser = (process.env.GMAIL_USER || "").trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || "").trim();
  const emailConfigured = Boolean(gmailUser && gmailPass);
  if (isProduction && !emailConfigured) {
    warnings.push("GMAIL_USER / GMAIL_APP_PASSWORD not set. Transactional verification OTP emails will be logged to console instead of sent.");
  }

  // 8. APP_URL
  const appUrl = (process.env.APP_URL || "https://mingree.com").trim().replace(/\/+$/, "");
  if (isProduction && !appUrl.startsWith("https://")) {
    warnings.push(`APP_URL '${appUrl}' does not use HTTPS. Production requires HTTPS for secure cookies and OAuth callbacks.`);
  }

  return {
    isProduction,
    databaseConfigured,
    jwtConfigured,
    encryptionConfigured,
    storageConfigured,
    storageProvider,
    cashfreeMode,
    cashfreeConfigured,
    instagramConfigured,
    emailConfigured,
    appUrl,
    errors,
    warnings,
  };
}

export function enforceProductionEnvironment(): void {
  const report = validateProductionEnvironment();
  if (report.isProduction) {
    console.log("================================================================================");
    console.log("          MINGREE PRODUCTION PRE-FLIGHT VALIDATION (CLOUDFLARE + SUPABASE)       ");
    console.log("================================================================================");
    console.log(`Database (Supabase / Hyperdrive): ${report.databaseConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`JWT Auth Secret:       ${report.jwtConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`Financial Encryption:  ${report.encryptionConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`Persistent Storage:    ${report.storageConfigured ? `✓ CONFIGURED (${report.storageProvider.toUpperCase()})` : "⚠ UNCONFIGURED"}`);
    console.log(`Cashfree Gateway:      ${report.cashfreeConfigured ? `✓ CONFIGURED [${report.cashfreeMode.toUpperCase()}]` : "⚠ UNCONFIGURED"}`);
    console.log(`Instagram OAuth:       ${report.instagramConfigured ? "✓ CONFIGURED" : "⚠ UNCONFIGURED"}`);
    console.log(`Email Service:         ${report.emailConfigured ? "✓ CONFIGURED" : "⚠ UNCONFIGURED"}`);
    console.log(`Public Application URL:${report.appUrl}`);

    if (report.warnings.length > 0) {
      console.log("\nWarnings:");
      report.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
    }

    if (report.errors.length > 0) {
      console.error("\nFATAL CONFIGURATION ERRORS PREVENTING PRODUCTION STARTUP:");
      report.errors.forEach((e) => console.error(`  ✗ ${e}`));
      console.error("================================================================================");
      process.exit(1);
    }
    console.log("================================================================================\n");
  }
}
