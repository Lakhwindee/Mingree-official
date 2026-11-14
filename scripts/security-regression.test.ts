import http from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import assert from "assert";
import app, { getJwtSecret, createSignedOtpToken, createVerifiedEmailToken } from "../server";
import { createPaymentOrder, getOrCreateWallet } from "../server/walletAndPayments";
import { saveSingleWorkspace } from "../server/campaignWorkspaces";
import {
  DistributedRateLimitStore,
  SecurityStoreUnavailableError,
  checkOtpAttemptLock,
  recordOtpFailedAttempt,
  clearOtpAttempts,
  setSecurityRedisRequesterForTest,
  consumeSingleUseJti,
  isSessionJtiRevoked,
  getUserTokenVersion,
} from "../server/security";
import {
  reconfigureDatabase,
  isInMemoryFallbackAllowed,
  isSchemaEnsured,
  markSchemaEnsuredForTest,
  resetDatabaseConfigForTest,
} from "../server/db";
import { validateWorkerProductionLifecycle } from "../server/envValidation";

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  console.log(`[SEC-${String(id).padStart(2, "0")}] ${passed ? "✓ PASS" : "✗ FAIL"} — ${name}: ${details}`);
}

function signCashfreeWebhook(rawBody: string, timestamp: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(`${timestamp}${rawBody}`).digest("base64");
}

async function runSecurityRegressionSuite() {
  console.log("=================================================================");
  console.log("   MINGREE COMPREHENSIVE SECURITY REGRESSION & ATTACK SUITE      ");
  console.log("=================================================================\n");

  const prevEnv = {
    CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
    CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
    INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
  };

  process.env.CASHFREE_APP_ID = "TEST_CF_APP_ID";
  process.env.CASHFREE_SECRET_KEY = "TEST_CF_SECRET_" + crypto.randomBytes(8).toString("hex");
  process.env.INSTAGRAM_APP_ID = "999888777666555";
  process.env.INSTAGRAM_APP_SECRET = "TEST_IG_SECRET_" + crypto.randomBytes(8).toString("hex");
  process.env.CRON_SECRET = "TEST_CRON_SECRET_" + crypto.randomBytes(8).toString("hex");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const jwtSecret = getJwtSecret();

  const createdUploadPaths: string[] = [];

  // Register isolated test actors in memory store alongside a real signed-up user
  const memUsers: any[] = (global as any).registeredUsers || [];
  const sponsorA = {
    id: 9101,
    email: "sec_sponsor_a@test.mingree.internal",
    name: "Sponsor A",
    role: "sponsor",
    companyName: "Brand A",
    tokenVersion: 1,
    status: "active",
  };
  const sponsorB = {
    id: 9102,
    email: "sec_sponsor_b@test.mingree.internal",
    name: "Sponsor B",
    role: "sponsor",
    companyName: "Brand B",
    tokenVersion: 1,
    status: "active",
  };
  const creatorA = {
    id: 9201,
    email: "sec_creator_a@test.mingree.internal",
    name: "Creator A",
    role: "creator",
    handle: "@sec_creator_a",
    tokenVersion: 1,
    isInstagramVerified: false,
    instagramFollowers: 0,
    followers: 0,
    status: "active",
  };
  const creatorB = {
    id: 9202,
    email: "sec_creator_b@test.mingree.internal",
    name: "Creator B",
    role: "creator",
    handle: "@sec_creator_b",
    tokenVersion: 1,
    isInstagramVerified: false,
    instagramFollowers: 0,
    followers: 0,
    status: "active",
  };
  const adminUser = {
    id: 9901,
    email: "sec_admin@test.mingree.internal",
    name: "Security Admin",
    role: "admin",
    tokenVersion: 1,
    status: "active",
  };

  for (const u of [sponsorA, sponsorB, creatorA, creatorB, adminUser]) {
    if (!memUsers.some((m) => m.id === u.id)) memUsers.push(u);
  }

  const issueJwt = (u: any, extra: Record<string, any> = {}) =>
    jwt.sign(
      {
        id: u.id,
        email: u.email,
        role: u.role,
        jti: crypto.randomBytes(16).toString("hex"),
        tv: u.tokenVersion || 1,
        ...extra,
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

  const sponsorAToken = issueJwt(sponsorA);
  const sponsorBToken = issueJwt(sponsorB);
  const creatorAToken = issueJwt(creatorA);
  const creatorBToken = issueJwt(creatorB);
  const adminToken = issueJwt(adminUser);

  // Seed isolated campaign workspace owned by Sponsor A with only Creator A invited
  const isolatedCampaignId = 98001;
  await saveSingleWorkspace({
    id: isolatedCampaignId,
    sponsorId: sponsorA.id,
    title: "Security Audit Campaign",
    brand: "Brand A",
    brandLogo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120",
    description: "Private security audit workspace",
    genre: "Tech",
    language: "English",
    contentTypes: ["Instagram Reel"],
    payAmount: 1500,
    totalBudget: 1632.75,
    escrowHeld: 1632.75,
    committedPayouts: 1500,
    releasedPayouts: 0,
    totalSlots: 1,
    reservedSlots: 0,
    remainingSlots: 1,
    bookingModel: "approval",
    minFollowers: 1000,
    minMedianViews: 500,
    targetCountries: ["India"],
    targetCities: ["Mumbai"],
    requiredCaptionNote: "#ad",
    requiredTags: ["#Mingree"],
    requiredMentions: [],
    disclosureInstructions: "#ad",
    minDurationSecs: 15,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status: "filling_slots",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    briefVersions: [],
    participants: [
      {
        id: 97001,
        campaignId: isolatedCampaignId,
        creatorId: creatorA.id,
        creatorName: creatorA.name,
        creatorHandle: creatorA.handle,
        creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        creatorFollowers: 10000,
        creatorMedianViews: 4000,
        status: "pending",
        payoutAmount: 1500,
        reservedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
        briefAcknowledgedVersion: 1,
        submission: null,
        revisions: [],
        draftSubmission: null,
        draftStatus: "none",
      },
    ],
    messages: [
      {
        id: 1,
        campaignId: isolatedCampaignId,
        senderId: sponsorA.id,
        senderName: sponsorA.name,
        senderRole: "sponsor",
        senderAvatar: "",
        recipientId: creatorA.id,
        content: "Private secret DM to Creator A only",
        createdAt: new Date().toISOString(),
        readBy: [sponsorA.id],
      },
    ],
  } as any);

  try {
    // 1. Login without verified SMS OTP proof
    {
      const r1 = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919876543210", role: "creator" }),
      });
      const r2 = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919876543210", uid: "fake-uid-no-token", role: "creator" }),
      });
      const passed = r1.status === 401 && r2.status === 401;
      record(1, "Login without verified SMS OTP proof rejected", passed, `Statuses: [${r1.status}, ${r2.status}]`);
    }

    // 2. Login using another person's phone number with someone else's valid phone verification token
    {
      const validProofForVictim = createVerifiedEmailToken("9111111111@phone.mingree.com");
      const rMismatch = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "+919999999999",
          verifiedPhoneToken: validProofForVictim,
          role: "creator",
        }),
      });
      const passed = rMismatch.status === 403;
      record(2, "Login with another user's phone vs verified phone token rejected", passed, `Status: ${rMismatch.status}`);
    }

    // 3. Invalid/forged phone verification tokens (wrong signature, malformed, tampered payload)
    {
      const validProof = createVerifiedEmailToken("9876543210@phone.mingree.com");
      const [payloadPart] = validProof.split(".");
      const rogueSigToken = `${payloadPart}.${crypto.randomBytes(32).toString("hex")}`;
      const unsignedToken = `${payloadPart}.`;
      const garbageToken = "forged.token.value";

      const rRogue = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919876543210", verifiedPhoneToken: rogueSigToken }),
      });
      const rNone = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919876543210", verifiedPhoneToken: unsignedToken }),
      });
      const rGarbage = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919876543210", verifiedPhoneToken: garbageToken }),
      });
      const passed = rRogue.status === 401 && rNone.status === 401 && rGarbage.status === 401;
      record(3, "Invalid/forged phone verification tokens rejected", passed, `Statuses: [${rRogue.status}, ${rNone.status}, ${rGarbage.status}]`);
    }

    // 4. Expired phone verification token
    {
      const expiredToken = createVerifiedEmailToken("9876543210@phone.mingree.com", Date.now() - 120_000);
      const rExp = await fetch(`${baseUrl}/api/auth/phone-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919876543210", verifiedPhoneToken: expiredToken }),
      });
      const passed = rExp.status === 401;
      record(4, "Expired phone verification token rejected", passed, `Status: ${rExp.status}`);
    }

    // 5. Client-forged otpVerified: true without server OTP verification
    {
      const rForgeSignup = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Forge Attacker",
          email: `forged_${Date.now()}@test.mingree.internal`,
          phone: "9888877777",
          password: "Password123!",
          role: "creator",
          ageConfirmed: true,
          otpVerified: true,
        }),
      });
      const passed = rForgeSignup.status === 403;
      record(5, "Client-forged otpVerified: true blocked on signup", passed, `Status: ${rForgeSignup.status}`);
    }

    // 6. Single-use OTP & verifiedToken replay/reuse blocked
    {
      const email = `replay_${Date.now()}@test.mingree.internal`;
      const otp = "482910";
      const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
      const otpToken = createSignedOtpToken(email, otpHash, Date.now() + 300_000);

      const firstVerify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, otpToken }),
      });
      const firstData = await firstVerify.json();

      const replayVerify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, otpToken }),
      });

      const signupFirst = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Valid User",
          email,
          phone: "9777766661",
          password: "Password123!",
          role: "creator",
          ageConfirmed: true,
          verifiedToken: firstData.verifiedToken,
        }),
      });

      const replaySignupToken = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Replay User",
          email,
          phone: "9777766662",
          password: "Password123!",
          role: "creator",
          ageConfirmed: true,
          verifiedToken: firstData.verifiedToken,
        }),
      });

      const passed =
        firstVerify.status === 200 &&
        replayVerify.status === 400 &&
        signupFirst.status === 200 &&
        replaySignupToken.status !== 200;
      record(
        6,
        "OTP & verifiedToken replay prevented",
        passed,
        `1st verify:${firstVerify.status}, replay verify:${replayVerify.status}, 1st signup:${signupFirst.status}, replay signup:${replaySignupToken.status}`
      );
    }

    // 7. OTP brute-force attempts trigger lockout (429)
    {
      const email = `bruteforce_${Date.now()}@test.mingree.internal`;
      const realOtpHash = crypto.createHash("sha256").update("918273").digest("hex");
      const otpToken = createSignedOtpToken(email, realOtpHash, Date.now() + 300_000);
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: `00000${i}`, otpToken }),
        });
        statuses.push(res.status);
      }
      const passed = statuses[0] === 400 && statuses[statuses.length - 1] === 429;
      record(7, "OTP brute-force attempts locked out with HTTP 429", passed, `Attempt sequence: [${statuses.join(",")}]`);
    }

    // 8. Unauthorized admin access blocked (including forged JWT role)
    {
      const rOverview = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${creatorAToken}` },
      });
      const rCredit = await fetch(`${baseUrl}/api/admin/wallets/credit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sponsorAToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: sponsorA.id, amount: 50000, reason: "hack" }),
      });
      const rCron = await fetch(`${baseUrl}/api/cron/process-releases`, {
        method: "POST",
        headers: { Authorization: `Bearer ${creatorAToken}` },
      });
      // Token claiming role:admin for non-admin creatorA must ALSO be rejected by DB/mem role lookup in requireAuth
      const escalatedJwt = issueJwt(creatorA, { role: "admin" });
      const rEscalated = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${escalatedJwt}` },
      });

      const passed = rOverview.status === 403 && rCredit.status === 403 && rCron.status === 403 && rEscalated.status === 403;
      record(
        8,
        "Unauthorized admin access & JWT role escalation rejected",
        passed,
        `Statuses: overview=${rOverview.status}, credit=${rCredit.status}, cron=${rCron.status}, forgedRole=${rEscalated.status}`
      );
    }

    // 9. Unauthorized profile modification, IG self-verification, and unsafe avatar URLs blocked
    {
      const rCrossProf = await fetch(`${baseUrl}/api/users/${creatorB.id}/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${creatorAToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked Name" }),
      });
      const rSelfVerifyIg = await fetch(`${baseUrl}/api/users/${creatorA.id}/instagram`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${creatorAToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUsername: "viratkohli", instagramFollowers: 99999999 }),
      });
      const rXssAvatar = await fetch(`${baseUrl}/api/users/${creatorA.id}/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${creatorAToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "javascript:alert(1)" }),
      });

      const passed = rCrossProf.status === 403 && rSelfVerifyIg.status === 403 && rXssAvatar.status === 400;
      record(
        9,
        "Unauthorized profile edit, IG follower spoofing, & javascript: avatar blocked",
        passed,
        `Statuses: crossProf=${rCrossProf.status}, selfVerifyIg=${rSelfVerifyIg.status}, xssAvatar=${rXssAvatar.status}`
      );
    }

    // 10. Unsigned/tampered/wrong-sponsor/reused billId blocked on choose-creators + unauthorized wallet credit
    {
      const unsignedBill = Buffer.from(
        JSON.stringify({
          sponsorId: sponsorA.id,
          selectedCreatorIds: [creatorA.id],
          subtotal: 1,
          platformFee: 0,
          gstAmount: 0,
          total: 1,
          exp: Date.now() + 600_000,
        })
      ).toString("base64");

      const rUnsigned = await fetch(`${baseUrl}/api/campaigns/choose-creators`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sponsorAToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ details: { title: "Tampered" }, billId: unsignedBill }),
      });

      // Generate a legitimate signed bill as Sponsor A, then try submitting it as Sponsor B
      const billRes = await fetch(`${baseUrl}/api/campaigns/choose-creators/bill`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sponsorAToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ deliverable: "reel", creatorIds: [creatorA.id] }),
      });
      const billJson = await billRes.json();

      const rCrossSponsorBill = await fetch(`${baseUrl}/api/campaigns/choose-creators`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sponsorBToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ details: { title: "Cross-Sponsor" }, billId: billJson.billId }),
      });

      // Unauthenticated wallet credit or UPI topup approve as non-admin
      const rApproveUpi = await fetch(`${baseUrl}/api/admin/upi-payments/1/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sponsorAToken}` },
      });

      const passed =
        rUnsigned.status === 400 &&
        billRes.status === 200 &&
        rCrossSponsorBill.status === 403 &&
        rApproveUpi.status === 403;
      record(
        10,
        "Tampered/unsigned bill, cross-sponsor bill, & unauthorized credit blocked",
        passed,
        `unsigned=${rUnsigned.status}, billGen=${billRes.status}, crossSponsor=${rCrossSponsorBill.status}, upiApprove=${rApproveUpi.status}`
      );
    }

    // 11. Duplicate payment webhook idempotency (credited once across sequential + concurrent replays)
    {
      const orderId = `sec_order_${Date.now()}`;
      const amount = 2500;
      await createPaymentOrder({
        orderId,
        userId: sponsorA.id,
        purpose: "wallet_deposit",
        amount,
      });

      const walletBefore = (await getOrCreateWallet(sponsorA.id)).balance;
      const bodyStr = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: { order: { order_id: orderId, order_amount: amount, order_status: "PAID" } },
      });
      const ts = String(Date.now());
      const sig = signCashfreeWebhook(bodyStr, ts, process.env.CASHFREE_SECRET_KEY!);

      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          fetch(`${baseUrl}/api/cashfree/webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-timestamp": ts,
              "x-webhook-signature": sig,
            },
            body: bodyStr,
          }).then((r) => r.json())
        )
      );

      const walletAfter = (await getOrCreateWallet(sponsorA.id)).balance;
      const freshCount = responses.filter((r) => r.success && !r.alreadyProcessed).length;
      const dupCount = responses.filter((r) => r.success && r.alreadyProcessed).length;
      const passed = freshCount === 1 && dupCount === 3 && Math.abs(walletAfter - walletBefore - amount) < 0.01;
      record(
        11,
        "Duplicate Cashfree webhook replay idempotent (exact once credit)",
        passed,
        `fresh=${freshCount}, dup=${dupCount}, delta=₹${walletAfter - walletBefore}`
      );
    }

    // 12. Invalid Cashfree webhook signature & stale replay timestamp rejected
    {
      const bodyStr = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: { order: { order_id: "sec_order_fake", order_amount: 99999, order_status: "PAID" } },
      });
      const freshTs = String(Date.now());
      const staleTs = String(Date.now() - 30 * 60 * 1000); // 30 mins old
      const validSigForStale = signCashfreeWebhook(bodyStr, staleTs, process.env.CASHFREE_SECRET_KEY!);

      const rBadSig = await fetch(`${baseUrl}/api/cashfree/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-timestamp": freshTs,
          "x-webhook-signature": "ZmFrZV9zaWduYXR1cmU=",
        },
        body: bodyStr,
      });

      const rStaleTs = await fetch(`${baseUrl}/api/cashfree/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-timestamp": staleTs,
          "x-webhook-signature": validSigForStale,
        },
        body: bodyStr,
      });

      const passed = rBadSig.status === 400 && rStaleTs.status === 401;
      record(12, "Invalid Cashfree signature & stale webhook timestamp rejected", passed, `badSig=${rBadSig.status}, staleTs=${rStaleTs.status}`);
    }

    // 13. Unauthorized file upload rejected without authentication
    {
      const form = new FormData();
      form.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "test.png");
      const rUnauth = await fetch(`${baseUrl}/api/upload`, { method: "POST", body: form });
      const passed = rUnauth.status === 401;
      record(13, "Unauthenticated file upload blocked", passed, `Status: ${rUnauth.status}`);
    }

    // 14. Oversized (>25MB) & malicious/spoofed file uploads rejected; valid PNG accepted
    {
      // 14a: Spoofed MIME SVG/HTML disguised as PNG
      const svgForm = new FormData();
      svgForm.append(
        "file",
        new Blob(['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'], { type: "image/png" }),
        "evil.png"
      );
      const rSvg = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${creatorAToken}` },
        body: svgForm,
      });

      // 14b: Executable PE header disguised as image/jpeg
      const exeForm = new FormData();
      exeForm.append("file", new Blob([Buffer.from([0x4d, 0x5a, 0x90, 0x00])], { type: "image/jpeg" }), "payload.jpg");
      const rExe = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${creatorAToken}` },
        body: exeForm,
      });

      // 14c: Oversized >25MB buffer
      const oversizedForm = new FormData();
      oversizedForm.append("file", new Blob([Buffer.alloc(26 * 1024 * 1024, 0x41)], { type: "image/png" }), "huge.png");
      const rHuge = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${creatorAToken}` },
        body: oversizedForm,
      });

      // 14d: Real PNG header passes & cleans up
      const validPngForm = new FormData();
      validPngForm.append(
        "file",
        new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])], { type: "image/png" }),
        "../../escape.png"
      );
      const rValid = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${creatorAToken}` },
        body: validPngForm,
      });
      const validData: any = await rValid.json().catch(() => ({}));
      if (validData?.fileName) {
        createdUploadPaths.push(path.join(process.cwd(), "public", "uploads", path.basename(validData.fileName)));
      }

      const passed = rSvg.status === 400 && rExe.status === 400 && rHuge.status === 413 && rValid.status === 200 && !String(validData.url || "").includes("..");
      record(
        14,
        "Malicious/spoofed/oversized uploads rejected & filename path traversal sanitized",
        passed,
        `svg=${rSvg.status}, exe=${rExe.status}, huge=${rHuge.status}, validPng=${rValid.status} (url=${validData.url})`
      );
    }

    // 15. CORS untrusted origin rejected vs trusted origin allowed
    {
      const rEvilCors = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: "https://mingree.com.evil-attacker.com" },
      });
      const evilAcao = rEvilCors.headers.get("access-control-allow-origin");

      const rGoodCors = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: "https://mingree.com" },
      });
      const goodAcao = rGoodCors.headers.get("access-control-allow-origin");

      const passed = !evilAcao && goodAcao === "https://mingree.com";
      record(15, "Strict exact-origin CORS allowlist enforced", passed, `evilOriginHeader=${evilAcao}, goodOriginHeader=${goodAcao}`);
    }

    // 16. IDOR against creator, brand, reservation, workspace, and OAuth state/open-redirect resources
    {
      const rWsIdor = await fetch(`${baseUrl}/api/campaigns/${isolatedCampaignId}/workspace`, {
        headers: { Authorization: `Bearer ${sponsorBToken}` },
      });
      const rNonExistWs = await fetch(`${baseUrl}/api/campaigns/999999999/workspace`, {
        headers: { Authorization: `Bearer ${sponsorBToken}` },
      });
      const rCardsIdor = await fetch(`${baseUrl}/api/sponsors/${sponsorA.id}/campaign-cards`, {
        headers: { Authorization: `Bearer ${sponsorBToken}` },
      });
      const rResIdor = await fetch(`${baseUrl}/api/users/${creatorA.id}/reservations`, {
        headers: { Authorization: `Bearer ${creatorBToken}` },
      });
      const rAcceptInviteIdor = await fetch(`${baseUrl}/api/campaigns/${isolatedCampaignId}/accept-invitation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${creatorBToken}` },
      });
      const rCancelResIdor = await fetch(`${baseUrl}/api/reservations/97001`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${creatorBToken}` },
      });
      const rMatchIdor = await fetch(`${baseUrl}/api/campaigns/${isolatedCampaignId}/match`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sponsorBToken}` },
      });
      const rOAuthOpenRedir = await fetch(`${baseUrl}/api/instagram/auth-url?return_to=//evil.example/phish`, {
        headers: { Authorization: `Bearer ${creatorAToken}` },
      });
      const oauthAuthData: any = await rOAuthOpenRedir.json().catch(() => ({}));
      // Verify callback rejects missing state even with active session cookie!
      const rOAuthNoState = await fetch(`${baseUrl}/api/instagram/callback?code=fake_code`, {
        headers: { Authorization: `Bearer ${creatorAToken}` },
        redirect: "manual",
      });
      const callbackLocation = rOAuthNoState.headers.get("location") || "";

      const passed =
        rWsIdor.status === 403 &&
        rNonExistWs.status === 404 &&
        rCardsIdor.status === 403 &&
        rResIdor.status === 403 &&
        rAcceptInviteIdor.status === 403 &&
        rCancelResIdor.status === 403 &&
        rMatchIdor.status === 403 &&
        rOAuthOpenRedir.status === 200 &&
        !String(oauthAuthData.state || "").includes("evil.example") &&
        rOAuthNoState.status === 302 &&
        callbackLocation.includes("instagram_error=");
      record(
        16,
        "IDOR & OAuth CSRF/open-redirect attacks blocked across brand/creator resources",
        passed,
        `ws=${rWsIdor.status}, missingWs=${rNonExistWs.status}, cards=${rCardsIdor.status}, res=${rResIdor.status}, acceptInv=${rAcceptInviteIdor.status}, delRes=${rCancelResIdor.status}, match=${rMatchIdor.status}, cbNoState=${rOAuthNoState.status}`
      );
    }

    // 17. Session reuse after password reset & logout rejected
    {
      const resetUserEmail = `pwreset_${Date.now()}@test.mingree.internal`;
      const resetOtp = "739104";
      const otpHash = crypto.createHash("sha256").update(resetOtp).digest("hex");
      const otpToken = createSignedOtpToken(resetUserEmail, otpHash, Date.now() + 300_000);

      const vRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetUserEmail, otp: resetOtp, otpToken }),
      });
      const vData: any = await vRes.json();

      const sRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Reset Tester",
          email: resetUserEmail,
          phone: "9666655551",
          password: "InitialPassword123!",
          role: "creator",
          ageConfirmed: true,
          verifiedToken: vData.verifiedToken,
        }),
      });
      const sCookie = sRes.headers.get("set-cookie") || "";
      const oldJwtMatch = sCookie.match(/auth_token=([^;]+)/);
      const oldJwt = oldJwtMatch ? oldJwtMatch[1] : "";

      // Logout revokes oldJwt immediately
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${oldJwt}` },
      });
      const afterLogoutMe = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${oldJwt}` },
      });

      // Log in again cleanly to get second active JWT, then perform password reset -> bumps tokenVersion
      const login2 = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetUserEmail, password: "InitialPassword123!" }),
      });
      const login2Cookie = login2.headers.get("set-cookie") || "";
      const sessionBeforeReset = (login2Cookie.match(/auth_token=([^;]+)/) || [])[1] || "";

      // Forgot + Reset password via forgot-password & reset-password? Since email delivery isn't configured in sandbox,
      // generate a reset JWT / test phone-reset-password using verifiedToken or direct forgot/reset check:
      const forgotOtpToken = createSignedOtpToken(resetUserEmail, crypto.createHash("sha256").update("554433").digest("hex"), Date.now() + 300_000);
      const vPhone = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "9666655551@phone.mingree.com", otp: "554433", otpToken: createSignedOtpToken("9666655551@phone.mingree.com", crypto.createHash("sha256").update("554433").digest("hex"), Date.now() + 300_000) }),
      });
      assert.ok(forgotOtpToken && vPhone);

      const phoneResetToken = jwt.sign(
        { phone: "9666655551", purpose: "phone_password_reset", jti: crypto.randomBytes(12).toString("hex") },
        jwtSecret,
        { expiresIn: "15m" }
      );
      const pwResetRes = await fetch(`${baseUrl}/api/auth/phone-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9666655551",
          resetVerificationToken: phoneResetToken,
          newPassword: "RotatedPassword999!",
        }),
      });
      const afterResetMe = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${sessionBeforeReset}` },
      });

      const passed =
        logoutRes.status === 200 &&
        afterLogoutMe.status === 401 &&
        pwResetRes.status === 200 &&
        afterResetMe.status === 401;
      record(
        17,
        "Session JWT revoked on logout & invalidated across password reset",
        passed,
        `logout=${logoutRes.status}, postLogoutMe=${afterLogoutMe.status}, pwReset=${pwResetRes.status}, postResetMe=${afterResetMe.status}`
      );
    }

    // 18. SQL injection, Prototype pollution, & SSR HTML XSS escaping checks
    {
      const sqliRes = await fetch(`${baseUrl}/api/admin/users?search=${encodeURIComponent("'; DROP TABLE users; --")}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const sqliDisputes = await fetch(`${baseUrl}/api/admin/disputes?status=${encodeURIComponent("open' OR '1'='1")}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const protoPayload = '{"name":"Safe","__proto__":{"isAdminPolluted":true},"constructor":{"prototype":{"polluted":true}}}';
      const protoRes = await fetch(`${baseUrl}/api/users/${creatorA.id}/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${creatorAToken}`, "Content-Type": "application/json" },
        body: protoPayload,
      });
      const isObjectPolluted = ({} as any).isAdminPolluted === true || ({} as any).polluted === true;

      const xssIgRes = await fetch(`${baseUrl}/api/instagram/login?username=${encodeURIComponent('"><script>alert(1)</script>')}`, {
        headers: { Authorization: `Bearer ${creatorAToken}` },
      });
      const xssHtml = await xssIgRes.text();
      const rawScriptInjected = xssHtml.includes('value=""><script>alert(1)</script>');

      const passed =
        sqliRes.status === 200 &&
        sqliDisputes.status === 200 &&
        protoRes.status === 200 &&
        !isObjectPolluted &&
        xssIgRes.status === 200 &&
        !rawScriptInjected;
      record(
        18,
        "SQL injection, prototype pollution, & HTML XSS injection safely neutralized",
        passed,
        `sqliUsers=${sqliRes.status}, sqliDisputes=${sqliDisputes.status}, polluted=${isObjectPolluted}, rawXss=${rawScriptInjected}`
      );
    }

    // 19. Distributed Redis store shares rate-limit counters & OTP lockout across independent instances
    {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const savedRedisTok = process.env.UPSTASH_REDIS_REST_TOKEN;
      const sharedKv = new Map<string, { val: number | string; expiresAt: number }>();

      const mockRedisRequester = {
        request: async <TResult>(req: { body?: unknown }): Promise<{ result?: TResult }> => {
          const cmd = Array.isArray(req.body) ? req.body : [];
          const op = String(cmd[0] || "").toUpperCase();
          const now = Date.now();
          const pruneKey = (k: string) => {
            const e = sharedKv.get(k);
            if (e && e.expiresAt > 0 && e.expiresAt <= now) sharedKv.delete(k);
          };

          if (op === "EVAL") {
            const script = String(cmd[1] || "");
            const numKeys = Number(cmd[2] || 0);
            const k1 = String(cmd[3] || "");
            if (script.includes("SET") && numKeys === 2) {
              // OTP_FAIL_RECORD_LUA
              const k2 = String(cmd[4] || "");
              const maxAttempts = Number(cmd[5] || 5);
              const lockMs = Number(cmd[6] || 900_000);
              pruneKey(k1);
              const cur = Number(sharedKv.get(k1)?.val || 0) + 1;
              const exp = cur === 1 ? now + lockMs : (sharedKv.get(k1)?.expiresAt || now + lockMs);
              sharedKv.set(k1, { val: cur, expiresAt: exp });
              if (cur >= maxAttempts) {
                sharedKv.set(k2, { val: "1", expiresAt: now + lockMs });
                return { result: [1, 0, cur] as unknown as TResult };
              }
              return { result: [0, maxAttempts - cur, cur] as unknown as TResult };
            }
            // RATE_LIMIT_INCR_LUA
            const windowMs = Number(cmd[4] || 60_000);
            pruneKey(k1);
            const existing = sharedKv.get(k1);
            const cur = Number(existing?.val || 0) + 1;
            const exp = cur === 1 || !existing ? now + windowMs : existing.expiresAt;
            sharedKv.set(k1, { val: cur, expiresAt: exp });
            return { result: [cur, Math.max(1, exp - now)] as unknown as TResult };
          }
          if (op === "PTTL") {
            const k1 = String(cmd[1] || "");
            pruneKey(k1);
            const e = sharedKv.get(k1);
            if (!e) return { result: -2 as unknown as TResult };
            return { result: (e.expiresAt > 0 ? Math.max(1, e.expiresAt - now) : -1) as unknown as TResult };
          }
          if (op === "GET") {
            const k1 = String(cmd[1] || "");
            pruneKey(k1);
            return { result: (sharedKv.get(k1)?.val ?? null) as unknown as TResult };
          }
          if (op === "DEL") {
            let deleted = 0;
            for (let i = 1; i < cmd.length; i++) {
              if (sharedKv.delete(String(cmd[i]))) deleted++;
            }
            return { result: deleted as unknown as TResult };
          }
          if (op === "DECR") {
            const k1 = String(cmd[1] || "");
            const cur = Number(sharedKv.get(k1)?.val || 0) - 1;
            sharedKv.set(k1, { val: cur, expiresAt: sharedKv.get(k1)?.expiresAt || 0 });
            return { result: cur as unknown as TResult };
          }
          throw new Error(`Unsupported mock command: ${op}`);
        },
      };

      try {
        process.env.NODE_ENV = "production";
        process.env.UPSTASH_REDIS_REST_URL = "https://mock-upstash.mingree.invalid";
        process.env.UPSTASH_REDIS_REST_TOKEN = "mock_upstash_token";
        setSecurityRedisRequesterForTest(mockRedisRequester as any);

        // Two distinct instance stores share Redis state via key prefix
        const instanceAStore = new DistributedRateLimitStore("mingree:rl:test:");
        const instanceBStore = new DistributedRateLimitStore("mingree:rl:test:");
        instanceAStore.init({ windowMs: 60_000 } as any);
        instanceBStore.init({ windowMs: 60_000 } as any);

        const hit1 = await instanceAStore.increment("198.51.100.10");
        const hit2 = await instanceBStore.increment("198.51.100.10");
        const hit3 = await instanceAStore.increment("198.51.100.10");

        // OTP failures recorded on instance A (3) + instance B (2) lock out across both!
        const otpKey = "verify:email:dist_test@mingree.internal";
        for (let i = 0; i < 3; i++) await recordOtpFailedAttempt(otpKey, 5, 60_000);
        for (let i = 0; i < 2; i++) await recordOtpFailedAttempt(otpKey, 5, 60_000);
        const distLock = await checkOtpAttemptLock(otpKey);
        await clearOtpAttempts(otpKey);
        const afterClear = await checkOtpAttemptLock(otpKey);

        const passed =
          hit1.totalHits === 1 &&
          hit2.totalHits === 2 &&
          hit3.totalHits === 3 &&
          !distLock.allowed &&
          distLock.retryAfterSec > 0 &&
          afterClear.allowed;
        record(
          19,
          "Distributed Redis store shares rate-limit hits & OTP lockout across instances",
          passed,
          `hits=[${hit1.totalHits},${hit2.totalHits},${hit3.totalHits}], lockedAfter5=${!distLock.allowed}, unlockedAfterClear=${afterClear.allowed}`
        );
      } finally {
        setSecurityRedisRequesterForTest(null);
        if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = savedNodeEnv;
        if (savedRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
        else process.env.UPSTASH_REDIS_REST_URL = savedRedisUrl;
        if (savedRedisTok === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
        else process.env.UPSTASH_REDIS_REST_TOKEN = savedRedisTok;
      }
    }

    // 20. Fail-closed HTTP 503 enforcement when REQUIRE_DISTRIBUTED_RATE_LIMIT=true and Redis is missing/down
    {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedReqDist = process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
      const savedRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const savedRedisTok = process.env.UPSTASH_REDIS_REST_TOKEN;
      try {
        // 20a: Strict distributed mode with NO Redis credentials must fail closed (HTTP 503)
        process.env.NODE_ENV = "production";
        process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = "true";
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        setSecurityRedisRequesterForTest(null);

        const rMissingRedisRate = await fetch(`${baseUrl}/api/health`);
        const rMissingRedisOtp = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "failclosed@test.mingree.internal", otp: "123456" }),
        });

        // 20b: Strict distributed mode with failing/unreachable Redis store must fail closed (HTTP 503)
        process.env.UPSTASH_REDIS_REST_URL = "https://down-upstash.mingree.invalid";
        process.env.UPSTASH_REDIS_REST_TOKEN = "down_token";
        setSecurityRedisRequesterForTest({
          request: async () => {
            throw new Error("Simulated Redis network outage");
          },
        });

        const rDownRedisRate = await fetch(`${baseUrl}/api/health`);
        const rDownRedisOtp = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "failclosed@test.mingree.internal", otp: "123456" }),
        });

        let unitThrew = false;
        try {
          await checkOtpAttemptLock("unit:down");
        } catch (err) {
          unitThrew = err instanceof SecurityStoreUnavailableError;
        }

        const passed =
          rMissingRedisRate.status === 503 &&
          rMissingRedisOtp.status === 503 &&
          rDownRedisRate.status === 503 &&
          rDownRedisOtp.status === 503 &&
          unitThrew;
        record(
          20,
          "Production fails safely (HTTP 503) when Redis is required and missing or unreachable",
          passed,
          `missingRate=${rMissingRedisRate.status}, missingOtp=${rMissingRedisOtp.status}, downRate=${rDownRedisRate.status}, downOtp=${rDownRedisOtp.status}, throws503Error=${unitThrew}`
        );
      } finally {
        setSecurityRedisRequesterForTest(null);
        if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = savedNodeEnv;
        if (savedReqDist === undefined) delete process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
        else process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT = savedReqDist;
        if (savedRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
        else process.env.UPSTASH_REDIS_REST_URL = savedRedisUrl;
        if (savedRedisTok === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
        else process.env.UPSTASH_REDIS_REST_TOKEN = savedRedisTok;
      }
    }

    // 21. Default production & local development mode operate normally without Redis using in-isolate fallback
    {
      const savedNodeEnv = process.env.NODE_ENV;
      const savedRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const savedRedisTok = process.env.UPSTASH_REDIS_REST_TOKEN;
      try {
        process.env.NODE_ENV = "production";
        delete process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT;
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        setSecurityRedisRequesterForTest(null);

        const rProdPublicCreators = await fetch(`${baseUrl}/api/public/creators`);
        const rProdCreatorPanel = await fetch(`${baseUrl}/api/campaigns/creator-panel`);
        process.env.NODE_ENV = "development";
        const rDevHealth = await fetch(`${baseUrl}/api/health`);
        const passed =
          rProdPublicCreators.status === 200 &&
          rProdCreatorPanel.status === 200 &&
          rDevHealth.status === 200;
        record(
          21,
          "Cloudflare+Supabase production & local dev operate normally without Upstash Redis",
          passed,
          `prodCreators=${rProdPublicCreators.status}, prodPanel=${rProdCreatorPanel.status}, devHealth=${rDevHealth.status}`
        );
      } finally {
        if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = savedNodeEnv;
        if (savedRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
        else process.env.UPSTASH_REDIS_REST_URL = savedRedisUrl;
        if (savedRedisTok === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
        else process.env.UPSTASH_REDIS_REST_TOKEN = savedRedisTok;
      }
    }

    // 22. Production-readiness fail-closed DB/JTI/Auth/Health, Worker schema idempotency & Cashfree mode-mismatch blocking
    {
      const savedCfMode = process.env.CASHFREE_MODE;
      const savedCfSecret = process.env.CASHFREE_SECRET_KEY;
      const savedStrictDbSec = process.env.REQUIRE_STRICT_DB_SECURITY_STORE;
      try {
        process.env.REQUIRE_STRICT_DB_SECURITY_STORE = "true";
        // 22a: Worker reconfigureDatabase preserves schemaEnsured on identical URL and resets only on changed URL
        const urlA = "postgres://postgres:postgres@127.0.0.1:59998/mingree_test_a";
        const urlB = "postgres://postgres:postgres@127.0.0.1:59998/mingree_test_b";
        reconfigureDatabase(urlA, true);
        markSchemaEnsuredForTest(urlA);
        const ensuredBeforeRepeat = isSchemaEnsured();
        reconfigureDatabase(urlA, true);
        const ensuredAfterIdenticalUrl = isSchemaEnsured();
        reconfigureDatabase(urlB, true);
        const ensuredAfterChangedUrl = isSchemaEnsured();

        // 22b: When PostgreSQL is configured and unreachable, in-memory fallback is disabled and JTI/session/auth/health fail closed (503)
        const fallbackAllowedWhenDbConfigured = isInMemoryFallbackAllowed();
        let jtiFailedClosed = false;
        let sessionCheckFailedClosed = false;
        let tokenVerFailedClosed = false;
        try {
          await consumeSingleUseJti("jti_failclosed_test", "test", 60_000);
        } catch (err) {
          jtiFailedClosed = err instanceof SecurityStoreUnavailableError;
        }
        try {
          await isSessionJtiRevoked("sess_failclosed_test");
        } catch (err) {
          sessionCheckFailedClosed = err instanceof SecurityStoreUnavailableError;
        }
        try {
          await getUserTokenVersion(creatorA.id);
        } catch (err) {
          tokenVerFailedClosed = err instanceof SecurityStoreUnavailableError;
        }

        const rAuthWithDownDb = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${creatorAToken}` },
        });
        const rHealthWithDownDb = await fetch(`${baseUrl}/api/health`);
        const healthBody: any = await rHealthWithDownDb.json().catch(() => ({}));

        resetDatabaseConfigForTest();

        // 22c: Cashfree production mode with sandbox test key (cfsk_ma_test_*) is blocked across config, create-order, and verify
        process.env.CASHFREE_MODE = "production";
        process.env.CASHFREE_SECRET_KEY = "cfsk_ma_test_mismatch_secret_key";
        const rCfConfig = await fetch(`${baseUrl}/api/cashfree/config`);
        const cfConfigData: any = await rCfConfig.json().catch(() => ({}));
        const rCfCreateMismatch = await fetch(`${baseUrl}/api/cashfree/create-order`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sponsorAToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: 500 }),
        });

        // 22d: Worker production lifecycle validation checks presence only without exposing secret values
        const lifecycleReport = validateWorkerProductionLifecycle({
          NODE_ENV: "production",
          JWT_SECRET: "a".repeat(32),
          ENCRYPTION_KEY: "b".repeat(32),
          CASHFREE_SECRET_KEY: "cfsk_ma_prod_live_secret_value_do_not_log",
          CASHFREE_MODE: "production",
        });

        const passed =
          ensuredBeforeRepeat === true &&
          ensuredAfterIdenticalUrl === true &&
          ensuredAfterChangedUrl === false &&
          fallbackAllowedWhenDbConfigured === false &&
          jtiFailedClosed &&
          sessionCheckFailedClosed &&
          tokenVerFailedClosed &&
          rAuthWithDownDb.status === 503 &&
          rHealthWithDownDb.status === 503 &&
          healthBody.database === "disconnected" &&
          cfConfigData.configured === false &&
          cfConfigData.modeMismatch === true &&
          rCfCreateMismatch.status === 503 &&
          lifecycleReport.isProduction === true &&
          lifecycleReport.databaseConfigured === false;

        record(
          22,
          "Fail-closed DB/Auth/JTI/Health (503), Worker schema idempotency & Cashfree mode-mismatch blocking",
          passed,
          `schemaIdempotent=${ensuredAfterIdenticalUrl && !ensuredAfterChangedUrl}, dbFallback=${fallbackAllowedWhenDbConfigured}, jti503=${jtiFailedClosed}, authMe=${rAuthWithDownDb.status}, health=${rHealthWithDownDb.status}, cfMismatch=${rCfCreateMismatch.status}`
        );
      } finally {
        resetDatabaseConfigForTest();
        if (savedStrictDbSec === undefined) delete process.env.REQUIRE_STRICT_DB_SECURITY_STORE;
        else process.env.REQUIRE_STRICT_DB_SECURITY_STORE = savedStrictDbSec;
        if (savedCfMode === undefined) delete process.env.CASHFREE_MODE;
        else process.env.CASHFREE_MODE = savedCfMode;
        if (savedCfSecret === undefined) delete process.env.CASHFREE_SECRET_KEY;
        else process.env.CASHFREE_SECRET_KEY = savedCfSecret;
      }
    }
  } finally {
    server.close();
    for (const filePath of createdUploadPaths) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log("\n=================================================================");
  console.log(`SECURITY REGRESSION SUMMARY: ${passedCount}/${results.length} PASSED, ${failedCount} FAILED`);
  console.log("=================================================================");
  process.exit(failedCount > 0 ? 1 : 0);
}

runSecurityRegressionSuite().catch((err) => {
  console.error("Fatal security test suite error:", err);
  process.exit(1);
});
