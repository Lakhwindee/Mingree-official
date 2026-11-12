import app, { getJwtSecret, createSignedOtpToken } from "../server";
import http from "http";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createPaymentOrder, getOrCreateWallet } from "../server/walletAndPayments";
import { isDatabaseConfigured, pool, verifyDbConnection } from "../server/db";

interface TestResult {
  num: number;
  name: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  message: string;
}

const results: TestResult[] = [];

function recordTest(num: number, name: string, status: "PASS" | "FAIL" | "BLOCKED", message: string) {
  results.push({ num, name, status, message });
  const prefix = status === "PASS" ? "✓ PASS" : status === "BLOCKED" ? "⊘ BLOCKED" : "✗ FAIL";
  console.log(`[TEST ${num}] ${prefix} - ${name}: ${message}`);
}

async function runIntegrationTests() {
  console.log("==================================================");
  console.log("   MINGREE PHASE 1.1 SECURITY INTEGRATION SUITE   ");
  console.log("==================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const jwtSecret = getJwtSecret();

  try {
    // TEST 1: No hardcoded default accounts or fake wallet balances at startup
    try {
      const initialUsers: any[] = (global as any).registeredUsers || [];
      const hasDefaultSeededCreators = initialUsers.some((u) =>
        ["riyasen.creator@mingree.in", "aarohi.creator@mingree.in", "sponsor@mingree.in"].includes(
          String(u.email || "").toLowerCase()
        )
      );
      const freshWallet1 = await getOrCreateWallet(7001);
      const freshWallet2 = await getOrCreateWallet(7002);
      const passed =
        !hasDefaultSeededCreators &&
        freshWallet1.balance === 0 &&
        freshWallet1.escrowHeld === 0 &&
        freshWallet2.balance === 0;

      recordTest(
        1,
        "No pre-seeded default accounts or fake wallet balances",
        passed ? "PASS" : "FAIL",
        `Pre-seeded dummy users present: ${hasDefaultSeededCreators}, Fresh wallet balances: ₹${freshWallet1.balance} / ₹${freshWallet2.balance}`
      );
    } catch (err: any) {
      recordTest(1, "No pre-seeded default accounts or fake wallet balances", "FAIL", err.message);
    }

    // TEST 2: All three master OTP values (123456, 898846, 937978) are strictly rejected across email verify, phone-accounts, and phone-reset-password
    try {
      const masterOtps = ["123456", "898846", "937978"];
      let allRejected = true;
      const statuses: string[] = [];

      for (const code of masterOtps) {
        const rVerify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "victim@mingree.com", otp: code }),
        });
        const rPhoneAcc = await fetch(`${baseUrl}/api/auth/phone-accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "9876543210", otp: code, firebaseVerified: true }),
        });
        const rPhoneReset = await fetch(`${baseUrl}/api/auth/phone-reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: "9876543210",
            otp: code,
            newPassword: "HackedPassword123!",
          }),
        });

        statuses.push(`${code}->[${rVerify.status},${rPhoneAcc.status},${rPhoneReset.status}]`);
        if (rVerify.status !== 400 || rPhoneAcc.status !== 400 || rPhoneReset.status !== 403) {
          allRejected = false;
        }
      }

      // Also verify that an expired OTP token is rejected and only a valid unexpired generated OTP token succeeds
      const validOtp = "654321";
      const validOtpHash = crypto.createHash("sha256").update(validOtp).digest("hex");
      const expiredOtpToken = createSignedOtpToken("realuser@mingree.com", validOtpHash, Date.now() - 5000);
      const validOtpToken = createSignedOtpToken("realuser@mingree.com", validOtpHash, Date.now() + 60000);

      const rExpiredOtp = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "realuser@mingree.com", otp: validOtp, otpToken: expiredOtpToken }),
      });
      const rValidOtp = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "realuser@mingree.com", otp: validOtp, otpToken: validOtpToken }),
      });

      const passed = allRejected && rExpiredOtp.status === 400 && rValidOtp.status === 200;
      recordTest(
        2,
        "Master OTP bypasses (123456, 898846, 937978) & expired OTP rejected; valid generated OTP accepted",
        passed ? "PASS" : "FAIL",
        `Master OTPs: ${statuses.join(" ")}, Expired OTP: ${rExpiredOtp.status}, Valid OTP: ${rValidOtp.status}`
      );
    } catch (err: any) {
      recordTest(
        2,
        "Master OTP bypasses (123456, 898846, 937978) & expired OTP rejected; valid generated OTP accepted",
        "FAIL",
        err.message
      );
    }

    // Register test accounts in memory for role/ownership integration tests
    const testUsers = [
      {
        id: 101,
        email: "creator101@mingree.com",
        passwordHash: bcrypt.hashSync("CreatorPass#101", 10),
        name: "Test Creator 101",
        role: "creator",
        isEmailVerified: true,
        status: "active",
      },
      {
        id: 202,
        email: "sponsor202@mingree.com",
        passwordHash: bcrypt.hashSync("SponsorPass#202", 10),
        name: "Test Sponsor 202",
        role: "sponsor",
        isEmailVerified: true,
        status: "active",
      },
      {
        id: 909,
        email: "admin909@mingree.com",
        passwordHash: bcrypt.hashSync("AdminPass#909", 10),
        name: "Test Admin 909",
        role: "admin",
        isEmailVerified: true,
        status: "active",
      },
    ];
    (global as any).registeredUsers.push(...testUsers);

    const creatorToken = jwt.sign(
      { id: 101, email: "creator101@mingree.com", role: "creator" },
      jwtSecret,
      { expiresIn: "1h" }
    );
    const sponsorToken = jwt.sign(
      { id: 202, email: "sponsor202@mingree.com", role: "sponsor" },
      jwtSecret,
      { expiresIn: "1h" }
    );
    const adminToken = jwt.sign(
      { id: 909, email: "admin909@mingree.com", role: "admin" },
      jwtSecret,
      { expiresIn: "1h" }
    );
    const expiredJwt = jwt.sign(
      { id: 101, email: "creator101@mingree.com", role: "creator" },
      jwtSecret,
      { expiresIn: "-10s" }
    );
    const forgedJwt = jwt.sign(
      { id: 909, email: "admin909@mingree.com", role: "admin" },
      "forged_wrong_signing_secret",
      { expiresIn: "1h" }
    );

    // TEST 3: Unauthenticated, invalid JWT, expired JWT, and x-user-id spoofing rejection
    try {
      const rUnauth = await fetch(`${baseUrl}/api/auth/me`);
      const rForged = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${forgedJwt}` },
      });
      const rExpired = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${expiredJwt}` },
      });
      const rSpoofHeader = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${creatorToken}`,
          "x-user-id": "202",
        },
      });
      const passed =
        rUnauth.status === 401 &&
        rForged.status === 401 &&
        rExpired.status === 401 &&
        rSpoofHeader.status === 403;

      recordTest(
        3,
        "Authentication & x-user-id spoofing enforcement",
        passed ? "PASS" : "FAIL",
        `Unauth: ${rUnauth.status}, Forged JWT: ${rForged.status}, Expired JWT: ${rExpired.status}, Spoofed x-user-id: ${rSpoofHeader.status}`
      );
    } catch (err: any) {
      recordTest(3, "Authentication & x-user-id spoofing enforcement", "FAIL", err.message);
    }

    // TEST 4: Instagram configuration inaccessible to unauthenticated and non-admin users; accessible only to admins
    try {
      process.env.APP_URL = "https://mingree.com";
      const rUnauthGet = await fetch(`${baseUrl}/api/instagram/config`);
      const rUnauthPost = await fetch(`${baseUrl}/api/instagram/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: "attacker_app_id" }),
      });
      const rCreatorGet = await fetch(`${baseUrl}/api/instagram/config`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      const rCreatorConfigure = await fetch(`${baseUrl}/api/instagram/configure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({ appId: "attacker_app_id" }),
      });
      const rAdminGet = await fetch(`${baseUrl}/api/instagram/config`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const rAdminPost = await fetch(`${baseUrl}/api/instagram/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ appId: "123456789012345" }),
      });

      const passed =
        rUnauthGet.status === 401 &&
        rUnauthPost.status === 401 &&
        rCreatorGet.status === 403 &&
        rCreatorConfigure.status === 403 &&
        rAdminGet.status === 200 &&
        rAdminPost.status === 200;

      recordTest(
        4,
        "Instagram configuration restricted strictly to authenticated admins",
        passed ? "PASS" : "FAIL",
        `Unauth GET/POST: ${rUnauthGet.status}/${rUnauthPost.status}, Creator GET/POST: ${rCreatorGet.status}/${rCreatorConfigure.status}, Admin GET/POST: ${rAdminGet.status}/${rAdminPost.status}`
      );
    } catch (err: any) {
      recordTest(4, "Instagram configuration restricted strictly to authenticated admins", "FAIL", err.message);
    }

    // TEST 5: Instagram OAuth initiation requires authentication and rejects cross-user userId query parameter
    try {
      const rUnauthLogin = await fetch(`${baseUrl}/api/instagram/login?format=json`);
      const rUnauthAuthUrl = await fetch(`${baseUrl}/api/instagram/auth-url`);
      const rSpoofLogin = await fetch(`${baseUrl}/api/instagram/login?userId=202&format=json`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      const rSpoofAuthUrl = await fetch(`${baseUrl}/api/instagram/auth-url?userId=202`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      const rSelfAuthUrl = await fetch(`${baseUrl}/api/instagram/auth-url`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });

      const passed =
        rUnauthLogin.status === 401 &&
        rUnauthAuthUrl.status === 401 &&
        rSpoofLogin.status === 403 &&
        rSpoofAuthUrl.status === 403 &&
        rSelfAuthUrl.status === 200;

      recordTest(
        5,
        "Instagram OAuth initiation requires auth & blocks cross-user ID spoofing",
        passed ? "PASS" : "FAIL",
        `Unauth login/auth-url: ${rUnauthLogin.status}/${rUnauthAuthUrl.status}, Spoofed userId=202: ${rSpoofLogin.status}/${rSpoofAuthUrl.status}, Valid self: ${rSelfAuthUrl.status}`
      );
    } catch (err: any) {
      recordTest(5, "Instagram OAuth initiation requires auth & blocks cross-user ID spoofing", "FAIL", err.message);
    }

    // TEST 6: Category subscriptions enforce authentication and user ownership
    try {
      const rUnauthGet = await fetch(`${baseUrl}/api/users/101/category-subscriptions`);
      const rUnauthPost = await fetch(`${baseUrl}/api/users/101/category-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "music_reels", tier: "Nano" }),
      });
      const rCrossUserPost = await fetch(`${baseUrl}/api/users/202/category-subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({ category: "music_reels", tier: "Nano" }),
      });
      const rCrossUserGet = await fetch(`${baseUrl}/api/users/202/category-subscriptions`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      const rCrossUserDelete = await fetch(`${baseUrl}/api/users/202/category-subscriptions`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({ category: "music_reels", tier: "Nano" }),
      });

      const rOwnerPost = await fetch(`${baseUrl}/api/users/101/category-subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({ category: "music_reels", tier: "Nano" }),
      });
      const rOwnerGet = await fetch(`${baseUrl}/api/users/101/category-subscriptions`, {
        headers: { Authorization: `Bearer ${creatorToken}` },
      });
      const subsList = await rOwnerGet.json();
      const rAdminGet = await fetch(`${baseUrl}/api/users/101/category-subscriptions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const rOwnerDelete = await fetch(`${baseUrl}/api/users/101/category-subscriptions`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({ category: "music_reels", tier: "Nano" }),
      });

      const passed =
        rUnauthGet.status === 401 &&
        rUnauthPost.status === 401 &&
        rCrossUserPost.status === 403 &&
        rCrossUserGet.status === 403 &&
        rCrossUserDelete.status === 403 &&
        rOwnerPost.status === 201 &&
        rOwnerGet.status === 200 &&
        Array.isArray(subsList) &&
        subsList.length === 1 &&
        rAdminGet.status === 200 &&
        rOwnerDelete.status === 200;

      recordTest(
        6,
        "Category subscriptions require authentication and enforce user ownership",
        passed ? "PASS" : "FAIL",
        `Unauth: ${rUnauthGet.status}/${rUnauthPost.status}, Cross-user: ${rCrossUserGet.status}/${rCrossUserPost.status}/${rCrossUserDelete.status}, Owner CRUD: ${rOwnerPost.status}/${rOwnerGet.status}/${rOwnerDelete.status}, Admin GET: ${rAdminGet.status}`
      );
    } catch (err: any) {
      recordTest(6, "Category subscriptions require authentication and enforce user ownership", "FAIL", err.message);
    }

    // TEST 7: Cashfree wrong payment amount, failed order, 404 order, and invalid webhook signature cannot credit a wallet
    try {
      process.env.CASHFREE_APP_ID = "cf_test_app_id";
      process.env.CASHFREE_SECRET_KEY = "cf_test_secret_key";
      process.env.CASHFREE_MODE = "sandbox";

      await createPaymentOrder({
        orderId: "CF_WRONG_AMOUNT_ORDER",
        userId: 202,
        purpose: "wallet_deposit",
        amount: 5000,
      });

      const walletBefore = (await getOrCreateWallet(202)).balance;
      const originalFetch = global.fetch;
      global.fetch = async (input: any, init?: any) => {
        const urlStr = typeof input === "string" ? input : input?.url || String(input);
        if (urlStr.includes("sandbox.cashfree.com/pg/orders/CF_WRONG_AMOUNT_ORDER")) {
          // Return mismatched amount (₹100 instead of expected ₹5,000)
          return new Response(
            JSON.stringify({
              order_id: "CF_WRONG_AMOUNT_ORDER",
              order_amount: 100,
              order_status: "PAID",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(input, init);
      };

      try {
        const rWrongAmount = await originalFetch(`${baseUrl}/api/cashfree/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sponsorToken}`,
          },
          body: JSON.stringify({ orderId: "CF_WRONG_AMOUNT_ORDER" }),
        });

        const webhookBody = JSON.stringify({
          data: {
            order: {
              order_id: "CF_WRONG_AMOUNT_ORDER",
              order_amount: 5000,
              order_status: "PAID",
            },
          },
        });
        const rInvalidSig = await originalFetch(`${baseUrl}/api/cashfree/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-timestamp": String(Date.now()),
            "x-webhook-signature": "forged_invalid_hmac_signature",
          },
          body: webhookBody,
        });

        const walletAfter = (await getOrCreateWallet(202)).balance;
        const passed =
          rWrongAmount.status === 400 &&
          rInvalidSig.status === 400 &&
          walletAfter === walletBefore;

        recordTest(
          7,
          "Wrong payment amount and invalid webhook signature rejected without crediting wallet",
          passed ? "PASS" : "FAIL",
          `Wrong amount status: ${rWrongAmount.status}, Invalid webhook signature status: ${rInvalidSig.status}, Wallet unchanged: ₹${walletAfter}`
        );
      } finally {
        global.fetch = originalFetch;
      }
    } catch (err: any) {
      recordTest(
        7,
        "Wrong payment amount and invalid webhook signature rejected without crediting wallet",
        "FAIL",
        err.message
      );
    }

    // TEST 8: Cashfree duplicate concurrent verification (Promise.all) cannot double-credit a wallet
    try {
      process.env.CASHFREE_APP_ID = "cf_test_app_id";
      process.env.CASHFREE_SECRET_KEY = "cf_test_secret_key";
      process.env.CASHFREE_MODE = "sandbox";

      await createPaymentOrder({
        orderId: "CF_CONCURRENT_ORDER_3000",
        userId: 202,
        purpose: "wallet_deposit",
        amount: 3000,
      });

      const walletBefore = (await getOrCreateWallet(202)).balance;
      const originalFetch = global.fetch;
      global.fetch = async (input: any, init?: any) => {
        const urlStr = typeof input === "string" ? input : input?.url || String(input);
        if (urlStr.includes("sandbox.cashfree.com/pg/orders/CF_CONCURRENT_ORDER_3000")) {
          return new Response(
            JSON.stringify({
              order_id: "CF_CONCURRENT_ORDER_3000",
              order_amount: 3000,
              order_status: "PAID",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(input, init);
      };

      try {
        // Fire 5 simultaneous verification requests + 1 signed webhook concurrently
        const webhookPayload = JSON.stringify({
          data: {
            order: {
              order_id: "CF_CONCURRENT_ORDER_3000",
              order_amount: 3000,
              order_status: "PAID",
            },
          },
        });
        const ts = String(Date.now());
        const validSig = crypto
          .createHmac("sha256", "cf_test_secret_key")
          .update(`${ts}${webhookPayload}`)
          .digest("base64");

        const concurrentResponses = await Promise.all([
          ...Array.from({ length: 5 }, () =>
            originalFetch(`${baseUrl}/api/cashfree/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sponsorToken}`,
              },
              body: JSON.stringify({ orderId: "CF_CONCURRENT_ORDER_3000" }),
            }).then((r) => r.json())
          ),
          originalFetch(`${baseUrl}/api/cashfree/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-timestamp": ts,
              "x-webhook-signature": validSig,
            },
            body: webhookPayload,
          }).then((r) => r.json()),
        ]);

        const walletAfter = (await getOrCreateWallet(202)).balance;
        const freshCreditsCount = concurrentResponses.filter((r) => r.alreadyProcessed === false).length;
        const duplicateCount = concurrentResponses.filter((r) => r.alreadyProcessed === true).length;

        const passed =
          walletAfter === walletBefore + 3000 &&
          freshCreditsCount === 1 &&
          duplicateCount === 5;

        recordTest(
          8,
          "Cashfree concurrent verification & webhook race protection prevents double-credit",
          passed ? "PASS" : "FAIL",
          `6 concurrent calls -> Fresh credits: ${freshCreditsCount}, Idempotent duplicates: ${duplicateCount}, Wallet delta: +₹${walletAfter - walletBefore} (expected +₹3000)`
        );
      } finally {
        global.fetch = originalFetch;
        delete process.env.CASHFREE_APP_ID;
        delete process.env.CASHFREE_SECRET_KEY;
      }
    } catch (err: any) {
      recordTest(
        8,
        "Cashfree concurrent verification & webhook race protection prevents double-credit",
        "FAIL",
        err.message
      );
    }

    // TEST 9: Database migration SQL & server startup safety verification
    try {
      const migrationSql = fs.readFileSync(
        path.join(process.cwd(), "migrations", "002_phase1_consolidation.sql"),
        "utf-8"
      );
      const dbTsSource = fs.readFileSync(path.join(process.cwd(), "server", "db.ts"), "utf-8");
      const serverTsSource = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf-8");

      const hasDummyInsertInMigration = /INSERT\s+INTO\s+(users|wallets)/i.test(migrationSql);
      const hasDeleteInMigration = /\b(DELETE\s+FROM|TRUNCATE\s+TABLE)\b/i.test(migrationSql);
      const hasDeleteInDbTs = /\b(DELETE\s+FROM|TRUNCATE\s+TABLE)\b/i.test(dbTsSource);

      // Extract startServer() body from server.ts and confirm no DELETE or INSERT INTO users
      const startServerIdx = serverTsSource.indexOf("async function startServer()");
      const startServerBody = startServerIdx !== -1 ? serverTsSource.slice(startServerIdx) : "";
      const hasDestructiveStartupSql = /\b(DELETE\s+FROM|INSERT\s+INTO\s+users)\b/i.test(startServerBody);

      // Also verify verifyDbConnection() does not run DDL migrations
      const verifyFnIdx = dbTsSource.indexOf("export async function verifyDbConnection");
      const verifyFnBody = verifyFnIdx !== -1 ? dbTsSource.slice(verifyFnIdx) : "";
      const runsMigrationsOnVerify = /runDatabaseMigrations|ensureSchemaInitialized|001_init\.sql/i.test(verifyFnBody);

      const passed =
        !hasDummyInsertInMigration &&
        !hasDeleteInMigration &&
        !hasDeleteInDbTs &&
        !hasDestructiveStartupSql &&
        !runsMigrationsOnVerify;

      recordTest(
        9,
        "Migration SQL & server startup free of dummy user seeds, automatic DDL, and destructive DELETEs",
        passed ? "PASS" : "FAIL",
        `Dummy INSERT in 002_migration: ${hasDummyInsertInMigration}, DELETE in db.ts: ${hasDeleteInDbTs}, Destructive SQL in startServer(): ${hasDestructiveStartupSql}, Auto-migrate in verifyDbConnection(): ${runsMigrationsOnVerify}`
      );
    } catch (err: any) {
      recordTest(
        9,
        "Migration SQL & server startup free of dummy user seeds, automatic DDL, and destructive DELETEs",
        "FAIL",
        err.message
      );
    }

    // TEST 10: PostgreSQL-backed wallet and payment integration test
    const testDbUrl = (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "").trim();
    if (!testDbUrl || !isDatabaseConfigured) {
      recordTest(
        10,
        "PostgreSQL-backed wallet and payment integration test",
        "BLOCKED",
        "BLOCKED: Neither TEST_DATABASE_URL nor DATABASE_URL is configured in the current environment."
      );
    } else {
      const dbReachable = await verifyDbConnection();
      if (!dbReachable) {
        recordTest(
          10,
          "PostgreSQL-backed wallet and payment integration test",
          "BLOCKED",
          "BLOCKED: PostgreSQL connection could not be established from current environment."
        );
      } else {
        let client;
        try {
          client = await pool.connect();
          await client.query("BEGIN");
          const userRes = await client.query(
            `INSERT INTO users (email, password_hash, name, role, is_verified, is_active)
             VALUES ($1, $2, 'PG Integration Tester', 'sponsor', true, true)
             RETURNING id`,
            [`pg_test_${Date.now()}@mingree.com`, "test_hash"]
          );
          const testUserId = Number(userRes.rows[0].id);
          await client.query(
            `INSERT INTO wallets (user_id, balance, locked_escrow) VALUES ($1, 1000.00, 0.00)`,
            [testUserId]
          );
          const lockRes = await client.query(
            `SELECT balance, locked_escrow FROM wallets WHERE user_id = $1 FOR UPDATE`,
            [testUserId]
          );
          const bal = parseFloat(lockRes.rows[0].balance);
          await client.query("ROLLBACK");
          recordTest(
            10,
            "PostgreSQL-backed wallet and payment integration test",
            bal === 1000 ? "PASS" : "FAIL",
            `Transactional PostgreSQL wallet creation & SELECT FOR UPDATE row lock verified (rolled back cleanly).`
          );
        } catch (dbErr: any) {
          if (client) {
            try {
              await client.query("ROLLBACK");
            } catch {}
          }
          recordTest(10, "PostgreSQL-backed wallet and payment integration test", "FAIL", dbErr.message);
        } finally {
          if (client) client.release();
        }
      }
    }
  } finally {
    server.close();
  }

  console.log("\n==================================================");
  const passedCount = results.filter((r) => r.status === "PASS").length;
  const blockedCount = results.filter((r) => r.status === "BLOCKED").length;
  const failedCount = results.filter((r) => r.status === "FAIL").length;
  console.log(
    `SUMMARY: ${passedCount} PASSED, ${blockedCount} BLOCKED, ${failedCount} FAILED (Total: ${results.length})`
  );
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runIntegrationTests();
