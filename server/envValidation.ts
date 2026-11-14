export interface EnvValidationReport {
  isProduction: boolean;
  databaseConfigured: boolean;
  redisConfigured: boolean;
  jwtConfigured: boolean;
  encryptionConfigured: boolean;
  storageConfigured: boolean;
  storageProvider: "r2" | "vercel_blob" | "unconfigured";
  cashfreeMode: "production" | "sandbox" | "unconfigured";
  cashfreeConfigured: boolean;
  cashfreeModeMismatch: boolean;
  instagramConfigured: boolean;
  emailConfigured: boolean;
  smsConfigured: boolean;
  appUrl: string;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnvironment(workerEnv?: Record<string, any>): EnvValidationReport {
  const nodeEnv = String(workerEnv?.NODE_ENV || process.env.NODE_ENV || "").trim();
  const isProduction = nodeEnv === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. DATABASE_URL / Cloudflare Hyperdrive (Supabase PostgreSQL) — presence & protocol check only
  const dbUrl = String(workerEnv?.DATABASE_URL || process.env.DATABASE_URL || "").trim();
  const hyperdriveBound = Boolean(workerEnv?.HYPERDRIVE?.connectionString || process.env.HYPERDRIVE);
  const databaseConfigured = Boolean(
    hyperdriveBound || (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")))
  );
  if (isProduction && !databaseConfigured) {
    errors.push("DATABASE_URL or Cloudflare Hyperdrive binding is required in production (Supabase PostgreSQL).");
  }

  // 1b. UPSTASH REDIS (Distributed Rate Limiting & OTP Lockout) — presence & protocol check only
  const redisUrl = String(workerEnv?.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const redisToken = String(workerEnv?.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  const redisConfigured = Boolean(
    redisUrl &&
      redisToken &&
      (redisUrl.startsWith("https://") || (!isProduction && redisUrl.startsWith("http://")))
  );
  if (isProduction && !redisConfigured) {
    if (process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === "true") {
      errors.push(
        "UPSTASH_REDIS_REST_URL (https://...) and UPSTASH_REDIS_REST_TOKEN are required when REQUIRE_DISTRIBUTED_RATE_LIMIT=true."
      );
    } else {
      warnings.push(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. Using per-isolate rate limiting and OTP lockout."
      );
    }
  }

  // 2. JWT_SECRET — presence & length check only
  const jwtSecret = String(workerEnv?.JWT_SECRET || process.env.JWT_SECRET || "").trim();
  const jwtConfigured = jwtSecret.length >= 32;
  if (isProduction && !jwtConfigured) {
    warnings.push("JWT_SECRET is not set or shorter than 32 characters (recommended: 'openssl rand -hex 32').");
  }

  // 3. TOKEN_ENC_KEY — presence & length check only
  const encKey = String(workerEnv?.TOKEN_ENC_KEY || process.env.TOKEN_ENC_KEY || "").trim();
  const encryptionConfigured = encKey.length >= 32;
  if (isProduction && !encryptionConfigured) {
    warnings.push("TOKEN_ENC_KEY is not set or shorter than 32 characters for financial/PAN AES-256-GCM encryption.");
  }

  // 4. STORAGE (Cloudflare R2 Native Binding or S3 API) — presence check only
  const r2NativeBinding = Boolean(workerEnv?.R2_BUCKET || (globalThis as any).__CF_R2_BUCKET__);
  const r2Configured = r2NativeBinding || Boolean(
    (workerEnv?.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID) &&
    (workerEnv?.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID) &&
    (workerEnv?.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY) &&
    (workerEnv?.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME)
  );
  const blobConfigured = Boolean(workerEnv?.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN);
  const storageConfigured = r2Configured || blobConfigured;
  const storageProvider = r2Configured ? "r2" : blobConfigured ? "vercel_blob" : "unconfigured";
  if (isProduction && !storageConfigured) {
    warnings.push("Cloudflare R2 storage credentials or Workers R2_BUCKET binding are not configured. Uploads will fail until R2 is supplied.");
  }

  // 5. CASHFREE PAYMENTS (Strict Separation of Production vs Sandbox; mock verification never allowed)
  const cashfreeModeRaw = String(workerEnv?.CASHFREE_MODE || process.env.CASHFREE_MODE || workerEnv?.CASHFREE_ENV || process.env.CASHFREE_ENV || "").toLowerCase().trim();
  const cashfreeAppId = String(workerEnv?.CASHFREE_APP_ID || process.env.CASHFREE_APP_ID || "").trim();
  const cashfreeSecret = String(workerEnv?.CASHFREE_SECRET_KEY || process.env.CASHFREE_SECRET_KEY || "").trim();
  const cashfreeConfigured = Boolean(cashfreeAppId && cashfreeSecret);
  const isProdKey = cashfreeSecret.startsWith("cfsk_ma_prod_");
  const isTestKey = cashfreeSecret.startsWith("cfsk_ma_test_");
  const cashfreeModeMismatch =
    (cashfreeModeRaw === "production" && isTestKey) ||
    (cashfreeModeRaw === "sandbox" && isProdKey);

  const cashfreeMode: "production" | "sandbox" | "unconfigured" = !cashfreeConfigured
    ? "unconfigured"
    : cashfreeModeRaw === "sandbox"
      ? "sandbox"
      : cashfreeModeRaw === "production" || isProdKey
        ? "production"
        : "sandbox";

  if (cashfreeModeMismatch) {
    errors.push("CASHFREE_MODE conflicts with CASHFREE_SECRET_KEY prefix (production vs sandbox mismatch).");
  }

  if (isProduction) {
    if (!cashfreeConfigured) {
      warnings.push("Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are not set. Payment order creation and verification are disabled (mock verification is strictly disabled).");
    } else if (cashfreeMode === "sandbox") {
      warnings.push("CASHFREE_MODE is set to 'sandbox' in production environment. Real user payments will not be processed until set to 'production'.");
    }
  }

  // 6. INSTAGRAM META OAUTH — presence check only
  const igAppId = String(workerEnv?.INSTAGRAM_APP_ID || process.env.INSTAGRAM_APP_ID || "").trim();
  const igSecret = String(workerEnv?.INSTAGRAM_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || "").trim();
  const instagramConfigured = Boolean(igAppId && igSecret);
  if (isProduction && !instagramConfigured) {
    warnings.push("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set. Official Instagram OAuth linking will be unavailable.");
  }

  // 7. EMAIL (GMAIL) & SMS (FAST2SMS / TWILIO) — presence check only
  const gmailUser = String(workerEnv?.GMAIL_USER || process.env.GMAIL_USER || "").trim();
  const gmailPass = String(workerEnv?.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "").trim();
  const emailConfigured = Boolean(gmailUser && gmailPass);
  if (isProduction && !emailConfigured) {
    warnings.push("GMAIL_USER / GMAIL_APP_PASSWORD not set. Email OTP delivery is unavailable.");
  }

  const fast2smsKey = String(workerEnv?.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY || "").trim();
  const twilioConfigured = Boolean(
    (workerEnv?.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID) &&
    (workerEnv?.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN) &&
    (workerEnv?.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER)
  );
  const smsConfigured = Boolean(fast2smsKey || twilioConfigured);
  if (isProduction && !smsConfigured) {
    warnings.push("FAST2SMS_API_KEY (or Twilio SMS credentials) not set. SMS OTP delivery will fail.");
  }

  // 8. APP_URL
  const appUrl = String(workerEnv?.APP_URL || process.env.APP_URL || "https://mingree.com").trim().replace(/\/+$/, "");
  if (isProduction && !appUrl.startsWith("https://")) {
    warnings.push("APP_URL does not use HTTPS. Production requires HTTPS for secure cookies and OAuth callbacks.");
  }

  return {
    isProduction,
    databaseConfigured,
    redisConfigured,
    jwtConfigured,
    encryptionConfigured,
    storageConfigured,
    storageProvider,
    cashfreeMode,
    cashfreeConfigured,
    cashfreeModeMismatch,
    instagramConfigured,
    emailConfigured,
    smsConfigured,
    appUrl,
    errors,
    warnings,
  };
}

let workerEnvLogged = false;

/**
 * Validates required bindings and secrets in the Cloudflare Worker startup/request lifecycle.
 * Logs presence-only status once per isolate and never logs secret values.
 */
export function validateWorkerProductionLifecycle(workerEnv?: Record<string, any>): EnvValidationReport {
  const report = validateProductionEnvironment(workerEnv);
  if (report.isProduction && !workerEnvLogged) {
    workerEnvLogged = true;
    console.log("[CF WORKER PRE-FLIGHT] Presence check:", JSON.stringify({
      databaseConfigured: report.databaseConfigured,
      redisConfigured: report.redisConfigured,
      jwtConfigured: report.jwtConfigured,
      encryptionConfigured: report.encryptionConfigured,
      storageConfigured: report.storageConfigured,
      storageProvider: report.storageProvider,
      cashfreeConfigured: report.cashfreeConfigured,
      cashfreeMode: report.cashfreeMode,
      instagramConfigured: report.instagramConfigured,
      emailConfigured: report.emailConfigured,
      smsConfigured: report.smsConfigured,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
    }));
  }
  return report;
}

export function enforceProductionEnvironment(): void {
  const report = validateProductionEnvironment();
  if (report.isProduction) {
    console.log("================================================================================");
    console.log("          MINGREE PRODUCTION PRE-FLIGHT VALIDATION (CLOUDFLARE + SUPABASE)       ");
    console.log("================================================================================");
    console.log(`Database (Supabase / Hyperdrive): ${report.databaseConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`Distributed Redis (Upstash):      ${report.redisConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`JWT Auth Secret:                  ${report.jwtConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`Financial Encryption:             ${report.encryptionConfigured ? "✓ CONFIGURED" : "✗ MISSING"}`);
    console.log(`Persistent Storage:               ${report.storageConfigured ? `✓ CONFIGURED (${report.storageProvider.toUpperCase()})` : "⚠ UNCONFIGURED"}`);
    console.log(`Cashfree Gateway:                 ${report.cashfreeConfigured ? `✓ CONFIGURED [${report.cashfreeMode.toUpperCase()}]` : "⚠ UNCONFIGURED"}`);
    console.log(`Instagram OAuth:                  ${report.instagramConfigured ? "✓ CONFIGURED" : "⚠ UNCONFIGURED"}`);
    console.log(`Email Service:                    ${report.emailConfigured ? "✓ CONFIGURED" : "⚠ UNCONFIGURED"}`);
    console.log(`SMS OTP Gateway:                  ${report.smsConfigured ? "✓ CONFIGURED" : "⚠ UNCONFIGURED"}`);
    console.log(`Public Application URL:           ${report.appUrl}`);

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
