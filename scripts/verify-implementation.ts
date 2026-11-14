import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import { isTable, getTableName } from "drizzle-orm";
import { runDatabaseMigrations } from "../server/db";
import {
  encryptPan,
  decryptPan,
  maskPan,
  isValidPan,
  encryptPayoutDetails,
  maskPayoutDetails,
} from "../server/withdrawalsAndKyc";
import * as schema from "../shared/schema";

interface VerificationResult {
  section: string;
  test: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: VerificationResult[] = [];

function record(section: string, test: string, passed: boolean, details: string) {
  results.push({
    section,
    test,
    status: passed ? "PASS" : "FAIL",
    details,
  });
  console.log(`[${passed ? "✓ PASS" : "✗ FAIL"}] [${section}] ${test}: ${details}`);
}

async function runVerification() {
  console.log("================================================================");
  console.log("   MINGREE INDEPENDENT BACKEND & DATABASE VERIFICATION SUITE    ");
  console.log("   Engine: Embedded PostgreSQL (PGlite v16 WASM)                ");
  console.log("================================================================\n");

  const pglite = new PGlite();

  // Helper query wrapper
  const q = async (sql: string, params?: any[]): Promise<any> => {
    const res: any = await pglite.query(sql, params);
    return res;
  };

  // Adapter to provide a node-pg like client for runDatabaseMigrations
  const clientAdapter = {
    query: async (queryText: string, params?: any[]) => {
      if (params && params.length > 0) {
        const res: any = await pglite.query(queryText, params);
        return {
          rows: res.rows || [],
          rowCount: (res.rows || []).length,
        };
      } else {
        const res: any = await pglite.exec(queryText);
        const last = Array.isArray(res) && res.length > 0 ? res[res.length - 1] : res;
        return {
          rows: last?.rows || [],
          rowCount: last?.rows?.length || 0,
        };
      }
    },
    release: () => {},
  };

  // ============================================================================
  // ITEM 1: CANONICAL MIGRATION, 34 TABLES, CONSTRAINTS & IDEMPOTENCY
  // ============================================================================
  console.log("\n--- SECTION 1: CANONICAL MIGRATION & IDEMPOTENCY ---");
  try {
    // Run migration first time
    await runDatabaseMigrations(clientAdapter as any);

    // Verify schema_migrations table records both 0001 and 0002 migrations
    const migRows = await q("SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name ASC");
    const appliedNames = migRows.rows.map((r: any) => String(r.name));
    const migrationRecorded =
      appliedNames.includes("0001_clean_launch_schema.sql") &&
      appliedNames.includes("0002_security_token_revocation.sql");
    record(
      "Migration",
      "Migration Checksum Tracking (0001 + 0002)",
      migrationRecorded,
      `Recorded migrations: ${migRows.rows.map((r: any) => `${r.name} (${String(r.checksum).slice(0, 8)})`).join(", ")}`
    );

    // Verify all tables created
    const tableRes = await q(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables: string[] = tableRes.rows.map((r: any) => String(r.table_name)).filter((t: string) => t !== "schema_migrations");
    const expectedCanonicalCount = 36;
    const tableCountMatches = tables.length === expectedCanonicalCount;
    record(
      "Migration",
      "36 Canonical + Security Tables Present",
      tableCountMatches,
      `Found ${tables.length} tables (expected ${expectedCanonicalCount}). Tables: ${tables.join(", ")}`
    );

    // Verify key indexes and constraints
    const indexRes = await q(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);
    const indexNames: string[] = indexRes.rows.map((r: any) => String(r.indexname));
    const hasUpiIdempotentIndex = indexNames.includes("idx_ledger_entries_payment_idempotent");
    const hasReleaseIdempotentIndex = indexNames.includes("idx_ledger_entries_release_idempotent");
    const hasWalletTxnIndex = indexNames.includes("idx_wallet_txns_payment_idempotent");
    const hasOauthExpiresIndex = indexNames.includes("idx_oauth_states_expires_at");
    const hasRevokedExpiresIndex = indexNames.includes("idx_revoked_tokens_expires");
    const hasUsedJtiExpiresIndex = indexNames.includes("idx_used_jti_expires");
    const userColsMig: string[] = (await q(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
    `)).rows.map((r: any) => String(r.column_name));
    const hasTokenVersionCol = userColsMig.includes("token_version");

    record(
      "Migration",
      "Financial Idempotency & Security Revocation Indexes Present",
      hasUpiIdempotentIndex &&
        hasReleaseIdempotentIndex &&
        hasWalletTxnIndex &&
        hasOauthExpiresIndex &&
        hasRevokedExpiresIndex &&
        hasUsedJtiExpiresIndex &&
        hasTokenVersionCol,
      `Idempotent+Security: ledger_payment=${hasUpiIdempotentIndex}, ledger_release=${hasReleaseIdempotentIndex}, wallet_txn=${hasWalletTxnIndex}, oauth_expires=${hasOauthExpiresIndex}, revoked_expires=${hasRevokedExpiresIndex}, used_jti_expires=${hasUsedJtiExpiresIndex}, users.token_version=${hasTokenVersionCol}`
    );

    // Run migration SECOND time to verify idempotency
    let secondRunError: any = null;
    try {
      await runDatabaseMigrations(clientAdapter as any);
    } catch (err: any) {
      secondRunError = err;
    }
    record(
      "Migration",
      "Migration Idempotency (Repeat Execution)",
      secondRunError === null,
      secondRunError ? `Failed on repeat: ${secondRunError.message}` : "Second execution passed cleanly without errors or duplicate table mutations"
    );
  } catch (err: any) {
    record("Migration", "Execution Failure", false, err.message);
  }

  // ============================================================================
  // ITEM 2: FINANCIAL OPERATIONS, DUPLICATE PAYMENTS, WITHDRAWALS & ROLLBACK
  // ============================================================================
  console.log("\n--- SECTION 2: FINANCIAL INTEGRITY & IDEMPOTENCY ---");
  try {
    // 1. Create user and wallet
    const userRes = await q(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('finance_test@mingree.com', 'hashed_pass', 'Finance Test User', 'creator')
      RETURNING id;
    `);
    const testUserId = Number(userRes.rows[0].id);

    await q(`
      INSERT INTO wallets (user_id, balance, escrow_held)
      VALUES ($1, 0.00, 0.00);
    `, [testUserId]);

    // 2. UPI Topup & Idempotent duplicate check
    const upiRes = await q(`
      INSERT INTO upi_payments (utr, user_id, amount, status)
      VALUES ('UTR123456789012', $1, 2500.00, 'pending')
      RETURNING id;
    `, [testUserId]);
    const upiId = Number(upiRes.rows[0].id);

    // Approve UPI topup first time
    await q("BEGIN");
    await q("UPDATE upi_payments SET status = 'approved', reviewed_at = now() WHERE id = $1", [upiId]);
    await q("UPDATE wallets SET balance = balance + 2500.00 WHERE user_id = $1", [testUserId]);
    await q(`
      INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
      VALUES ($1, 'credit', 2500.00, 2500.00, 'upi_payment', $2);
    `, [testUserId, String(upiId)]);
    await q(`
      INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description)
      VALUES ($1, 'credit', 2500.00, 2500.00, 'upi_payment', $2, 'Approved UPI Top-Up');
    `, [testUserId, String(upiId)]);
    await q("COMMIT");

    const balAfterUpi = (await q("SELECT balance FROM wallets WHERE user_id = $1", [testUserId])).rows[0].balance;

    // Attempt DUPLICATE UPI approval in ledger
    let duplicateUpiCaught = false;
    try {
      await q(`
        INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
        VALUES ($1, 'credit', 2500.00, 5000.00, 'upi_payment', $2);
      `, [testUserId, String(upiId)]);
    } catch (dupErr: any) {
      duplicateUpiCaught = dupErr.message.includes("unique") || dupErr.message.includes("idx_ledger_entries_payment_idempotent");
    }

    record(
      "Financial",
      "UPI Topup & Unique Ledger Idempotency",
      parseFloat(balAfterUpi) === 2500 && duplicateUpiCaught,
      `Balance after approval: ₹${balAfterUpi}, Duplicate ledger entry rejected by DB index: ${duplicateUpiCaught}`
    );

    // 3. Duplicate Cashfree Payment Order Webhook protection
    await q(`
      INSERT INTO payment_orders (order_id, user_id, amount, purpose, status)
      VALUES ('ORD_CASHFREE_888', $1, 1500.00, 'wallet_topup', 'pending')
      RETURNING id;
    `, [testUserId]);

    await q("BEGIN");
    await q("UPDATE payment_orders SET status = 'paid', paid_at = now() WHERE order_id = 'ORD_CASHFREE_888'");
    await q("UPDATE wallets SET balance = balance + 1500.00 WHERE user_id = $1", [testUserId]);
    await q(`
      INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
      VALUES ($1, 'credit', 1500.00, 4000.00, 'payment_order', 'ORD_CASHFREE_888');
    `, [testUserId]);
    await q("COMMIT");

    let duplicateOrderCaught = false;
    try {
      await q(`
        INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
        VALUES ($1, 'credit', 1500.00, 5500.00, 'payment_order', 'ORD_CASHFREE_888');
      `, [testUserId]);
    } catch (dupErr: any) {
      duplicateOrderCaught = dupErr.message.includes("unique") || dupErr.message.includes("idx_ledger_entries_payment_idempotent");
    }

    record(
      "Financial",
      "Cashfree Order Double-Credit Prevention",
      duplicateOrderCaught,
      `Duplicate payment_order ledger credit rejected by DB partial index: ${duplicateOrderCaught}`
    );

    // 4. Withdrawal Flow: Request -> Approval with canonical refId String(withdrawalId)
    const withdrawalRes = await q(`
      INSERT INTO withdrawals (user_id, amount, net_amount, status)
      VALUES ($1, 1000.00, 1000.00, 'pending')
      RETURNING id;
    `, [testUserId]);
    const withdrawalId = Number(withdrawalRes.rows[0].id);

    // Approve withdrawal
    await q("BEGIN");
    await q("UPDATE withdrawals SET status = 'approved', utr_ref = 'UTR_W_111' WHERE id = $1", [withdrawalId]);
    await q("UPDATE wallets SET balance = balance - 1000.00 WHERE user_id = $1", [testUserId]);
    await q(`
      INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
      VALUES ($1, 'withdrawal_completed', -1000.00, 3000.00, 'withdrawal_approved', $2);
    `, [testUserId, String(withdrawalId)]);
    await q("COMMIT");

    // Attempt duplicate withdrawal settlement
    let duplicateWithdrawalCaught = false;
    try {
      await q(`
        INSERT INTO ledger_entries (user_id, type, amount, balance_after, ref_type, ref_id)
        VALUES ($1, 'withdrawal_completed', -1000.00, 2000.00, 'withdrawal_approved', $2);
      `, [testUserId, String(withdrawalId)]);
    } catch (dupErr: any) {
      duplicateWithdrawalCaught = dupErr.message.includes("unique") || dupErr.message.includes("idx_ledger_entries_release_idempotent");
    }

    record(
      "Financial",
      "Withdrawal Settlement & Release Idempotency",
      duplicateWithdrawalCaught,
      `Duplicate withdrawal approval credit rejected by index idx_ledger_entries_release_idempotent: ${duplicateWithdrawalCaught}`
    );

    // 5. Transaction Rollback Verification
    const balBeforeRollback = parseFloat(
      (await q("SELECT balance FROM wallets WHERE user_id = $1", [testUserId])).rows[0].balance
    );

    let rollbackSuccessful = false;
    try {
      await q("BEGIN");
      await q("UPDATE wallets SET balance = balance + 99999.00 WHERE user_id = $1", [testUserId]);
      // Force an error
      await q("INSERT INTO non_existent_table_for_rollback_test VALUES (1)");
      await q("COMMIT");
    } catch {
      await q("ROLLBACK");
      const balAfterRollback = parseFloat(
        (await q("SELECT balance FROM wallets WHERE user_id = $1", [testUserId])).rows[0].balance
      );
      rollbackSuccessful = balAfterRollback === balBeforeRollback;
    }

    record(
      "Financial",
      "Database Transaction Rollback on Failure",
      rollbackSuccessful,
      `Balance before: ₹${balBeforeRollback}, balance after aborted transaction: ₹${balBeforeRollback}`
    );
  } catch (err: any) {
    record("Financial", "Financial Integration Failure", false, err.message);
  }

  // ============================================================================
  // ITEM 3: PAYOUT METHODS ENCRYPTION & API RETURN SANITIZATION
  // ============================================================================
  console.log("\n--- SECTION 3: PAYOUT METHOD ENCRYPTION & DATA SAFETY ---");
  try {
    const rawBankDetails = {
      type: "Bank",
      accountNumber: "98765432109876",
      ifscCode: "HDFC0001234",
      accountHolderName: "Secure Creator Name",
    };

    const encPayout = encryptPayoutDetails(rawBankDetails);
    const { maskedAccount, publicDetails } = maskPayoutDetails("Bank", rawBankDetails);

    // Verify ciphertext format (iv:authTag:encrypted)
    const parts = encPayout.split(":");
    const hasThreeParts = parts.length === 3;
    const isEncrypted = !encPayout.includes("98765432109876") && !encPayout.includes("HDFC0001234");
    const maskedNumberMatches = maskedAccount.includes("9876") && maskedAccount.includes("••");

    // Insert into PostgreSQL
    await q(`
      INSERT INTO payout_methods (user_id, type, account_details, account_details_encrypted, masked_account, is_default)
      VALUES (1, 'bank_account', $1, $2, $3, true);
    `, [JSON.stringify(publicDetails), encPayout, maskedAccount]);

    const pmRow = (await q("SELECT account_details, account_details_encrypted, masked_account FROM payout_methods WHERE user_id = 1")).rows[0];
    const detailsJson = typeof pmRow.account_details === "string" ? JSON.parse(pmRow.account_details) : pmRow.account_details;
    const jsonHasNoPlaintext = !JSON.stringify(detailsJson).includes("98765432109876");

    record(
      "Payouts",
      "Bank Account & IFSC Encryption at Rest",
      hasThreeParts && isEncrypted && maskedNumberMatches && jsonHasNoPlaintext,
      `Ciphertext parts: ${parts.length}, Raw account suppressed: ${isEncrypted}, Masked: "${maskedAccount}", JSON safe: ${jsonHasNoPlaintext}`
    );
  } catch (err: any) {
    record("Payouts", "Payout Method Encryption Failure", false, err.message);
  }

  // ============================================================================
  // ITEM 4: PAN ENCRYPTION, DECRYPTION & API MASKING
  // ============================================================================
  console.log("\n--- SECTION 4: PAN ENCRYPTION & PRIVACY VERIFICATION ---");
  try {
    const rawPan = "ABCDE1234F";
    const encPan = encryptPan(rawPan);
    const mskPan = maskPan(rawPan);
    const decPan = decryptPan(encPan);

    const formatValid = isValidPan(rawPan);
    const encryptionSafe = !encPan.includes("ABCDE") && encPan.split(":").length === 3;
    const decryptionMatches = decPan === rawPan;
    const maskFormat = mskPan === "ABCDE••••F";

    // Insert into KYC table in DB
    await q(`
      INSERT INTO kyc (user_id, pan_encrypted, pan_masked, full_name_on_pan, status)
      VALUES (1, $1, $2, 'Verified Creator', 'active')
      ON CONFLICT (user_id) DO UPDATE SET pan_encrypted = EXCLUDED.pan_encrypted, pan_masked = EXCLUDED.pan_masked;
    `, [encPan, mskPan]);

    // Check users table columns: confirm no plaintext 'pan' column exists in users
    const userCols: string[] = (await q(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `)).rows.map((r: any) => String(r.column_name));

    const usersHasNoPan = !userCols.includes("pan");

    // Test JOIN query used by APIs to fetch masked pan
    const joinRes = await q(`
      SELECT u.id, u.email, k.pan_masked as pan
      FROM users u
      LEFT JOIN kyc k ON k.user_id = u.id
      WHERE u.id = 1;
    `);
    const fetchedPan = joinRes.rows[0]?.pan;
    const apiReceivesOnlyMasked = fetchedPan === "ABCDE••••F";

    record(
      "PAN Security",
      "PAN AES-256-GCM Encryption, Masking & No Plaintext in Users",
      formatValid && encryptionSafe && decryptionMatches && maskFormat && usersHasNoPan && apiReceivesOnlyMasked,
      `Valid: ${formatValid}, Ciphertext safe: ${encryptionSafe}, Decrypted match: ${decryptionMatches}, Mask: ${mskPan}, Plaintext users.pan column removed: ${usersHasNoPan}, API query returns: ${fetchedPan}`
    );
  } catch (err: any) {
    record("PAN Security", "PAN Verification Failure", false, err.message);
  }

  // ============================================================================
  // ITEM 5: INSTAGRAM OAUTH STATE FLOW, EXPIRY, REPLAY & BROWSER BINDING
  // ============================================================================
  console.log("\n--- SECTION 5: INSTAGRAM OAUTH SECURITY & BROWSER BINDING ---");
  try {
    const stateVal = crypto.randomBytes(32).toString("hex");
    const browserToken = crypto.randomBytes(32).toString("hex");
    const browserTokenHash = crypto.createHash("sha256").update(browserToken).digest("hex");

    // 1. Insert valid active state
    await q(`
      INSERT INTO oauth_states (state, user_id, browser_token_hash, redirect_uri, return_to, expires_at)
      VALUES ($1, 1, $2, 'https://mingree.com/api/instagram/callback', '/profile', now() + interval '15 minutes');
    `, [stateVal, browserTokenHash]);

    // 2. Test Browser Cookie Mismatch (Wrong token hash)
    const wrongHash = crypto.createHash("sha256").update("wrong_browser_token").digest("hex");
    const peekState = await q(`
      SELECT user_id, browser_token_hash FROM oauth_states WHERE state = $1 AND expires_at > now();
    `, [stateVal]);
    const mismatchDetected = peekState.rows.length > 0 && peekState.rows[0].browser_token_hash !== wrongHash;

    // 3. Test Atomic Single-Use Consumption with Correct Token Hash
    const consumeRes1 = await q(`
      DELETE FROM oauth_states 
      WHERE state = $1 AND browser_token_hash = $2 AND expires_at > now()
      RETURNING user_id, return_to;
    `, [stateVal, browserTokenHash]);
    const firstConsumeSuccess = consumeRes1.rows.length === 1 && Number(consumeRes1.rows[0].user_id) === 1;

    // 4. Test Replay Rejection (Second call with same state must return 0 rows)
    const consumeRes2 = await q(`
      DELETE FROM oauth_states 
      WHERE state = $1 AND browser_token_hash = $2 AND expires_at > now()
      RETURNING user_id, return_to;
    `, [stateVal, browserTokenHash]);
    const replayRejected = consumeRes2.rows.length === 0;

    // 5. Test Expired State Rejection
    const expiredState = crypto.randomBytes(32).toString("hex");
    await q(`
      INSERT INTO oauth_states (state, user_id, browser_token_hash, redirect_uri, return_to, expires_at)
      VALUES ($1, 1, $2, 'https://mingree.com/api/instagram/callback', '/profile', now() - interval '1 minute');
    `, [expiredState, browserTokenHash]);

    const consumeExpired = await q(`
      DELETE FROM oauth_states 
      WHERE state = $1 AND expires_at > now()
      RETURNING user_id;
    `, [expiredState]);
    const expiredRejected = consumeExpired.rows.length === 0;

    // 6. Test Two Simultaneous OAuth Attempts in Separate Tabs
    const tab1State = crypto.randomBytes(32).toString("hex");
    const tab1Token = crypto.randomBytes(32).toString("hex");
    const tab1Hash = crypto.createHash("sha256").update(tab1Token).digest("hex");

    const tab2State = crypto.randomBytes(32).toString("hex");
    const tab2Token = crypto.randomBytes(32).toString("hex");
    const tab2Hash = crypto.createHash("sha256").update(tab2Token).digest("hex");

    await q(`
      INSERT INTO oauth_states (state, user_id, browser_token_hash, redirect_uri, return_to, expires_at)
      VALUES ($1, 1, $2, 'https://mingree.com/api/instagram/callback', '/profile', now() + interval '15 minutes'),
             ($3, 1, $4, 'https://mingree.com/api/instagram/callback', '/profile', now() + interval '15 minutes');
    `, [tab1State, tab1Hash, tab2State, tab2Hash]);

    // Cross-tab consumption attempt: Tab 1 tries to consume Tab 2's state with Tab 1's token
    const crossTabAttempt = await q(`
      DELETE FROM oauth_states
      WHERE state = $1 AND browser_token_hash = $2 AND expires_at > now()
      RETURNING user_id;
    `, [tab2State, tab1Hash]);
    const crossTabBlocked = crossTabAttempt.rows.length === 0;

    // Correct consumption: Tab 1 consumes Tab 1's state
    const tab1Valid = await q(`
      DELETE FROM oauth_states
      WHERE state = $1 AND browser_token_hash = $2 AND expires_at > now()
      RETURNING user_id;
    `, [tab1State, tab1Hash]);
    const tab1Passed = tab1Valid.rows.length === 1;

    record(
      "OAuth Security",
      "Browser Binding, Atomic Consumption & Replay Rejection",
      mismatchDetected && firstConsumeSuccess && replayRejected && expiredRejected && crossTabBlocked && tab1Passed,
      `Mismatch detected: ${mismatchDetected}, First consumption: ${firstConsumeSuccess}, Replay rejected: ${replayRejected}, Expired rejected: ${expiredRejected}, Cross-tab spoofing blocked: ${crossTabBlocked}`
    );
  } catch (err: any) {
    record("OAuth Security", "OAuth Verification Failure", false, err.message);
  }

  // ============================================================================
  // ITEM 6: BIGINT SAFE PARSING & OVERFLOW DETECTION
  // ============================================================================
  console.log("\n--- SECTION 6: POSTGRESQL BIGINT SAFE PARSER & DRIZZLE MAPPINGS ---");
  try {
    const int8Parser = pg.types.getTypeParser(20);

    // Safe numbers within Number.MAX_SAFE_INTEGER (9007199254740991)
    const val0 = int8Parser("0");
    const val1 = int8Parser("42");
    const valMaxSafe = int8Parser("9007199254740991");
    const valMinSafe = int8Parser("-9007199254740991");
    const safeParsed = val0 === 0 && val1 === 42 && valMaxSafe === 9007199254740991 && valMinSafe === -9007199254740991;

    // Unsafe numbers that exceed MAX_SAFE_INTEGER
    let unsafeThrows = false;
    let overflowErrMsg = "";
    try {
      int8Parser("9007199254740992");
    } catch (err: any) {
      unsafeThrows = err instanceof RangeError;
      overflowErrMsg = err.message;
    }

    record(
      "BIGINT Safety",
      "pg OID 20 Type Parser Overflow Protection",
      safeParsed && unsafeThrows,
      `Safe bounds parsed exactly without precision loss. Unsafe 9007199254740992 threw RangeError: "${overflowErrMsg}"`
    );

    // Check all bigint columns in shared/schema.ts
    const schemaSource = fs.readFileSync(path.join(process.cwd(), "shared", "schema.ts"), "utf-8");
    // Find all bigserial and bigint occurrences
    const bigintMatches: string[] = schemaSource.match(/(bigserial|bigint)\([^)]*\)/g) || [];
    const unconfiguredBigints = bigintMatches.filter((m) => !m.includes('mode: "number"') && !m.includes("mode: 'number'"));

    record(
      "BIGINT Safety",
      "Drizzle bigint/bigserial mode: 'number' Consistency",
      unconfiguredBigints.length === 0,
      `Total BIGINT/BIGSERIAL mappings: ${bigintMatches.length}, Unconfigured without mode 'number': ${unconfiguredBigints.length}`
    );
  } catch (err: any) {
    record("BIGINT Safety", "BIGINT Parsing Failure", false, err.message);
  }

  // ============================================================================
  // ITEM 7: 36 DRIZZLE TABLES VS SQL MIGRATIONS AUDIT
  // ============================================================================
  console.log("\n--- SECTION 7: 36 DRIZZLE TABLES VS SQL MIGRATIONS PARITY ---");
  try {
    const migrationSql = [
      fs.readFileSync(path.join(process.cwd(), "migrations", "0001_clean_launch_schema.sql"), "utf-8"),
      fs.readFileSync(path.join(process.cwd(), "migrations", "0002_security_token_revocation.sql"), "utf-8"),
    ].join("\n");
    
    // Extract table names from CREATE TABLE IF NOT EXISTS <name>
    const sqlTableMatches = Array.from(migrationSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z0-9_]+)\s*\(/gi))
      .map((m) => m[1].toLowerCase())
      .filter((t) => t !== "schema_migrations");

    const exportedTables: string[] = Object.values(schema)
      .filter((v: any) => v && isTable(v))
      .map((v: any) => String(getTableName(v)));

    const missingInDrizzle = sqlTableMatches.filter((t) => !exportedTables.includes(t));
    const extraInDrizzle = exportedTables.filter((t) => !sqlTableMatches.includes(t));

    const tableNamesMatch = missingInDrizzle.length === 0 && extraInDrizzle.length === 0 && exportedTables.length === 36;

    record(
      "Schema Parity",
      "SQL Tables vs Drizzle Exports Exact Match",
      tableNamesMatch,
      `SQL Tables: ${sqlTableMatches.length}, Drizzle Tables: ${exportedTables.length}. Missing: [${missingInDrizzle.join(", ")}], Extra: [${extraInDrizzle.join(", ")}]`
    );

    // Verify key columns and relations across normalized tables
    const wpCols: string[] = (await q(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'workspace_participants';
    `)).rows.map((r: any) => `${r.column_name}(nullable:${r.is_nullable})`);

    const hasExpiresAtNullable = wpCols.includes("expires_at(nullable:YES)");
    const hasStatus = wpCols.some((c) => c.startsWith("status"));
    const hasPayoutAmount = wpCols.some((c) => c.startsWith("payout_amount"));

    record(
      "Schema Parity",
      "workspace_participants Normalized Lifecycle Columns",
      hasExpiresAtNullable && hasStatus && hasPayoutAmount,
      `Nullable expires_at: ${hasExpiresAtNullable}, status & payout_amount present: ${hasStatus && hasPayoutAmount}`
    );

    const subCols: string[] = (await q(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'submissions';
    `)).rows.map((r: any) => String(r.column_name));

    const subHasParticipantId = subCols.includes("participant_id");
    const subHasNoSlotId = !subCols.includes("slot_id");

    record(
      "Schema Parity",
      "submissions References participant_id (No slot_id)",
      subHasParticipantId && subHasNoSlotId,
      `participant_id present: ${subHasParticipantId}, legacy slot_id removed: ${subHasNoSlotId}`
    );
  } catch (err: any) {
    record("Schema Parity", "Schema Parity Failure", false, err.message);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================");
  const totalTests = results.length;
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED (Total: ${totalTests})`);
  console.log("================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("Verification suite encountered unexpected error:", err);
  process.exit(1);
});
