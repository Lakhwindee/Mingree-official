import fs from "fs";
import path from "path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

interface RuleTestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: RuleTestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`[RULES] ${passed ? "✓ PASS" : "✗ FAIL"} — ${name}: ${details}`);
}

async function runFirestoreRulesTests() {
  console.log("=================================================================");
  console.log("   MINGREE FIRESTORE SECURITY RULES EMULATOR TEST SUITE          ");
  console.log("=================================================================\n");

  const rulesPath = path.join(process.cwd(), "firestore.rules");
  const rulesSource = fs.readFileSync(rulesPath, "utf-8");

  const projectId = process.env.GCLOUD_PROJECT || "demo-mingree-rules";

  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: rulesSource,
      },
    });
  } catch (err: any) {
    console.error("Could not connect to Firestore Emulator:", err?.message || err);
    console.error("Run via: npm run test:rules (requires Firebase Emulator & Java 17+)");
    process.exit(1);
    return;
  }

  try {
    await testEnv.clearFirestore();

    // Seed baseline documents with security rules disabled
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await adminDb.collection("users").doc("alice_uid").set({
        uid: "alice_uid",
        displayName: "Alice Creator",
        role: "creator",
        balance: 500,
        escrowHeld: 0,
        tier: "Micro",
        status: "active",
      });
      await adminDb.collection("users").doc("bob_uid").set({
        uid: "bob_uid",
        displayName: "Bob Sponsor",
        role: "sponsor",
        balance: 2500,
      });
      await adminDb.collection("test").doc("connection").set({ ok: true });
    });

    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const aliceDb = testEnv.authenticatedContext("alice_uid").firestore();

    // 1. Unauthenticated read, list, create, update, delete denied
    await assertFails(unauthDb.collection("users").doc("alice_uid").get());
    await assertFails(unauthDb.collection("users").get());
    await assertFails(
      unauthDb.collection("users").doc("anon_uid").set({ uid: "anon_uid", displayName: "Anon" })
    );
    await assertFails(
      unauthDb.collection("users").doc("alice_uid").update({ displayName: "Hacked" })
    );
    await assertFails(unauthDb.collection("users").doc("alice_uid").delete());
    record("Unauthenticated access denied", true, "get/list/create/update/delete all denied for unauthenticated client");

    // 2. Users cannot read, list, create, update, or delete other users' documents
    await assertFails(aliceDb.collection("users").doc("bob_uid").get());
    await assertFails(aliceDb.collection("users").get());
    await assertFails(
      aliceDb.collection("users").doc("bob_uid").set({ uid: "bob_uid", displayName: "Spoof" })
    );
    await assertFails(
      aliceDb.collection("users").doc("bob_uid").update({ displayName: "Hacked Bob" })
    );
    await assertFails(aliceDb.collection("users").doc("bob_uid").delete());
    record("Cross-user access denied", true, "Alice blocked from reading, listing, creating, updating, or deleting Bob's doc");

    // 3. Owners cannot create or modify privileged fields
    const privilegedFields = ["role", "isAdmin", "balance", "escrowHeld", "isInstagramVerified", "tier", "status"];
    for (const field of privilegedFields) {
      await assertFails(
        aliceDb.collection("users").doc("alice_uid").update({ [field]: field === "balance" ? 999999 : true })
      );
      await assertFails(
        testEnv
          .authenticatedContext("charlie_uid")
          .firestore()
          .collection("users")
          .doc("charlie_uid")
          .set({ uid: "charlie_uid", displayName: "Charlie", [field]: "forged" })
      );
    }
    record(
      "Privileged field modification denied",
      true,
      `All privileged fields (${privilegedFields.join(", ")}) blocked on owner create and update`
    );

    // 4. Valid owner profile operations succeed (get, create without privileged fields, update safe fields)
    await assertSucceeds(aliceDb.collection("users").doc("alice_uid").get());
    await assertSucceeds(
      aliceDb.collection("users").doc("alice_uid").update({ displayName: "Alice Verified Name", bio: "Updated bio" })
    );
    const newOwnerDb = testEnv.authenticatedContext("new_creator_01").firestore();
    await assertSucceeds(
      newOwnerDb.collection("users").doc("new_creator_01").set({
        uid: "new_creator_01",
        displayName: "New Creator",
        phoneNumber: "+919876543210",
      })
    );
    await assertFails(aliceDb.collection("users").doc("alice_uid").delete());
    record("Valid owner profile operations", true, "Owner get, safe create, and safe update succeed; owner delete denied");

    // 5. Connection probe doc allowed for get only, denied for list/write
    await assertSucceeds(unauthDb.collection("test").doc("connection").get());
    await assertFails(unauthDb.collection("test").get());
    await assertFails(unauthDb.collection("test").doc("connection").set({ ok: false }));
    record("Connection health probe", true, "test/connection get allowed; list and write denied");
  } finally {
    await testEnv.cleanup();
  }

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\nFIRESTORE RULES SUMMARY: ${results.length - failed}/${results.length} PASSED, ${failed} FAILED`);
  process.exit(failed > 0 ? 1 : 0);
}

runFirestoreRulesTests().catch((err) => {
  console.error("Firestore rules test error:", err);
  process.exit(1);
});
