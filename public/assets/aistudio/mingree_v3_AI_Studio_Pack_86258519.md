# Mingree v3: AI Studio Execution Pack

Ye pack AI Studio ko ek hi plan par chalane ke liye hai. Pehle wale pack mein AI Studio ne "kar diya" bola par code andar se khaali tha. Isliye is baar:
- Har step ke end mein **PROOF** maanga hai (kaun si file, kaun sa function, asli command output).
- Database ka exact schema (`001_init.sql`) aur paise ka exact formula (Appendix A) diya hai, taaki AI Studio andaza na lagaye.
- Purana sab kuch hatane ka alag step hai (Step 1).

## Kaise dena hai
1. Naya AI Studio chat/project kholo jisme repo (Mingree-official) loaded ho.
2. **Part A** paste karo. Wo sirf samjhega aur wait karega.
3. `001_init.sql` file AI Studio ko attach karo (repo mein `migrations/001_init.sql` ke naam se).
4. **Step 1, 2, 3 ... 15 ek-ek karke.** Har step ke baad AI Studio ka PROOF padho. Agar kisi line par "NOT DONE" ya "NOT RUN" hai to wahi step dobara bolo, aage mat badho.
5. Har step ke baad preview chalao aur GitHub par commit karo.
6. Secrets prompt mein kabhi mat likhna. AI Studio ke Secrets/env section mein daalo.
7. Order mat badalna.

## Decisions (defaults daale hain, aap badal sakte ho)
| Cheez | Default | Note |
|---|---|---|
| Fee, artist ki taraf se | 7.5% (price ke upar) | Placeholder, asli deals se tay karo |
| Fee, creator ki taraf se | 7.5% (Pro creator: 4%) | Placeholder |
| Creator Pro price | ₹399/mo | ₹299-499 ke beech tay karo |
| Entry limit | 500 followers | Config mein, baad mein badal sakte ho |
| Creator min withdrawal | ₹500 | |
| Artist min withdrawal | ₹1,000 | |
| Review window (auto-approve) | 72 ghante | |
| Reel live rakhne ki avadhi | 7 din | |
| Pehli kisht (go-live approve par) | 50% | |
| Rate badalne ka cooldown | 7 din | |
| Benchmark range (₹ per 1,000 views) | admin khud bharega | Apne market ke andaze se |

---

# PART A: MASTER BRIEF (sirf ek baar, sabse pehle paste karo)

```
PROJECT BRIEF (read carefully, then wait for my step prompts; do not change any code yet)

Mingree is a transparent marketplace where music artists/labels ("Artists", internally role "sponsor") buy Instagram reel/story promotion for their songs from verified creators. It replaces the informal model where a middleman keeps a private list of creators and private prices. Brand deals will come later on the same engine (Phase 3). Do NOT build brand-deal features now (product shipping, script approval, usage rights).

ROLES: creator, sponsor (shown as "Artist" in the UI), admin. (Phase 2: manager.)

PRICING PHILOSOPHY: Mingree does NOT fix rates. Creators set their own rate per deliverable (Reel with song, Story, Collab post). What Mingree standardizes is comparison. Every creator shows verified metrics: median views of the last 10-15 reels, engagement rate, audience India %, followers (small text). The key number is "price per 1,000 views" = rate / median_views * 1000. Tiers are only filter labels, never prices: Starter 500-2,000, Nano 2,000-10,000, Micro 10,000-50,000, Mid 50,000-250,000, Macro 250,000-1,000,000, Mega 1,000,000+ (half-open ranges [min, max) so boundaries never overlap).

HOW ARTISTS BUY (Phase 1):
1. Autopilot campaign: artist enters song link, deadline, genre/language, budget, filters (follower band, min median views, min India audience %) and a pricing mode: (a) fixed price per reel (first-come-first-served slots, like the existing reservation system), or (b) price cap = max INR per 1,000 views. Matching creators are notified. In fixed mode creators accept. In cap mode creators quote their rate. Quotes within the cap are auto-accepted in best-value order until the budget is used, and each acceptance locks that creator's amount in escrow. Quotes above the cap go to a shortlist.
2. Shortlist: ranked by a value score (lower price per 1,000 views, higher median views, engagement, India %, past deal record). Quotes above AUTOPILOT_HIDE_MULTIPLIER x cap are hidden behind a toggle. Bulk select with checkboxes.
3. Direct book: artist picks specific creators from the directory; creator accepts, declines, or counters once.
Guardrails: only verified creators with a low risk score are eligible; hard budget limit; max share of budget per creator (default 30%); artist whitelist/blacklist; a pre-launch estimate of total views and number of creators.

DELIVERY AND MONEY: The artist funds a wallet (Cashfree, server-verified). Campaign budget and accepted deals are held in escrow. The creator posts the reel and submits its Instagram URL; the media must belong to the creator's linked account (verify through the Instagram API). The artist approves go-live, or it auto-approves after REVIEW_WINDOW_HOURS. Rejection is only for objective reasons: wrong audio, missing required caption/tags, not posted by the deadline. On approval release RELEASE_FIRST_PERCENT of the creator's net amount. Release the remainder after LIVE_HOLD_DAYS if the reel is still live; if deleted early, the remainder is refunded to the artist. Store view snapshots at 48h and 7d and show them. Disputes go to admin.

FEES (all configurable): creator sets price P. Artist pays P + FEE_ARTIST_PERCENT of P. Creator receives P - FEE_CREATOR_PERCENT of P. Pro creators have a lower creator fee. GST on Mingree's fee is a separate ledger line. Show both sides the exact breakdown.

SUBSCRIPTIONS: No payment is needed to list or apply. The gate for creators is Instagram verification + minimum followers (500, config) + KYC at payout. Creator Pro (optional): lower fee, featured placement, analytics, early invites. Artists pay only per-deal fees.

RATE GUARDRAILS: a creator can change a rate once per RATE_CHANGE_COOLDOWN_DAYS. When saving a rate, show a warning if price per 1,000 views is above the admin-set benchmark range (BENCHMARK_CPM_MIN / BENCHMARK_CPM_MAX). Warning only, never block, in Phase 1.

NOT IN PHASE 1: Smart Package builder, Manager role, performance bonus, guaranteed views, brand deals.

TECH: React + Vite + Tailwind frontend, Express + TypeScript backend, Postgres via Drizzle ORM, hosted on Render, official Meta Instagram API, Cashfree for payments. Keep the existing UI and design language where possible.

CONFIG DEFAULTS (all in shared/config.ts, overridable by env):
FEE_ARTIST_PERCENT=7.5, FEE_CREATOR_PERCENT=7.5, FEE_CREATOR_PERCENT_PRO=4, CREATOR_PRO_PRICE=399, GST_PERCENT=18, MIN_CREATOR_FOLLOWERS=500, MIN_CREATOR_WITHDRAWAL=500, MIN_ARTIST_WITHDRAWAL=1000, REVIEW_WINDOW_HOURS=72, LIVE_HOLD_DAYS=7, RELEASE_FIRST_PERCENT=50, RATE_CHANGE_COOLDOWN_DAYS=7, AUTOPILOT_HIDE_MULTIPLIER=3, MAX_BUDGET_SHARE_PER_CREATOR=30, MIN_DEAL_AMOUNT=300, BENCHMARK_CPM_MIN and BENCHMARK_CPM_MAX stored in the DB and editable by admin.

CLEAN SLATE: The old v1 code is being replaced. Where old code conflicts with this brief, delete it. Do not keep a second old path "for compatibility". Do not patch around broken legacy logic.

RULES FOR EVERY STEP:
1. Keep existing UI, design and working routes unless I say otherwise.
2. Make minimal, targeted edits. Do not rewrite files you do not need to touch.
3. Never hardcode secrets. Read from process.env. Never log OTPs, tokens or secrets.
4. No fake/demo success in production code paths. If something is not implemented, return a clear error.
5. Every money movement happens inside a DB transaction and writes a ledger entry. All money operations must be idempotent.
6. After each step give the PROOF block I ask for: files changed, DONE/NOT DONE per requirement with file:function, and real command output. Say NOT DONE or NOT RUN honestly. Claiming something is done without showing it is the worst outcome.
7. Use the attached migrations/001_init.sql as the single source of truth for the database. Use the `pg` package with parameterised queries. Do not invent different tables or columns.
8. All money arithmetic is in integer paise in code and numeric(14,2) in the DB. Never use floating point for money.

Reply only with a short summary of how you understood this brief and the list of steps you expect, then wait.
```

---

# PART B: STEPS

## Step 0: Aap khud karo (AI ka kaam nahi)
- Meta Developer dashboard mein **Instagram App Secret rotate** karo.
- Instagram (Settings, Apps and websites) mein purana access **revoke** karo.
- GitHub repo se `app_settings.json`, `user_profile.json`, `otp_store.json`, `registered_users.json` hatao (history se bhi, BFG ya `git filter-repo`).
- Ek free Postgres bana lo (Neon ya Supabase) aur `DATABASE_URL` Secrets mein daalo.

## Step 1: Secrets, config aur cleanup
```
STEP 1: Secrets and config cleanup.
- In server.ts remove the hardcoded Instagram app secret fallback and the hardcoded Instagram App IDs. Read INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET from process.env only.
- Stop storing secrets (gmail password, instagram secret, cashfree secret, rapidapi key) in app_settings.json. The admin API-keys endpoints may only show masked values and must never write secrets to disk.
- Compute the Instagram redirect URI from process.env.APP_URL: `${APP_URL}/api/instagram/callback`. Remove the hardcoded ais-dev...run.app URL.
- Remove the duplicate /api/health route.
- Add .gitignore entries for app_settings.json, user_profile.json, otp_store.json, registered_users.json, campaigns.json, reservations.json, security_audit_logs.json, instagram_identities.json, .env*.
- Create .env.example listing every env var used, with empty values.
- Create shared/config.ts exporting every CONFIG DEFAULT from the brief (read from env with the defaults).
- DELETE the old stuff now: the JSON data files (app_settings.json, otp_store.json, user_profile.json, registered_users.json, campaigns.json, reservations.json, any other data json), the global currentUserProfile variable and every use of it, the unauthenticated legacy routes (bank-accounts, withdrawal-requests, reservations and any route that takes the acting userId from the body or query), the public wallet deposit route, POST /api/auth/admin-login, every "debugOtp", every demo or simulated success path, and the old 20-tier table (shared/tiers.ts keeps only the six labels from the brief). If a screen depended on a deleted route, make that screen show "coming soon" for now. It will be rebuilt in Step 15.
- At the end list exactly which routes and files you deleted.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 2: Real login aur roles (sabse zaroori)
```
STEP 2: Real authentication and authorization. Today there is one global `currentUserProfile`, admin-login works for any email without a password, signup accepts role "admin", passwords are plain text, the OTP is returned in the response (debugOtp) and /api/admin/* has no protection. Fix all of it.
- Passwords: bcryptjs. Session: signed JWT in an httpOnly, secure, sameSite=lax cookie (jsonwebtoken + cookie-parser), secret from JWT_SECRET.
- Signup can only create "creator" or "sponsor". Admin accounts are seeded only from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
- Login ALWAYS requires a valid password. Delete the special-casing of emails containing "admin" or "brand". Delete POST /api/auth/admin-login.
- OTP: crypto.randomInt, store only a hash, 10 min expiry, max 5 attempts, delete after success. NEVER return or log the OTP. Remove "debugOtp" everywhere including the frontend.
- Email must be OTP-verified before the account is active. Forgot-password uses a one-time reset token and really updates the password hash.
- Remove the global currentUserProfile. Every handler uses req.user from the JWT.
- Middleware: requireAuth, requireRole("admin"), requireRole("sponsor"), requireRole("creator"). Protect ALL /api/admin/* with requireRole("admin").
- /api/users/:id/* and /api/sponsors/:id/* only work if :id equals req.user.id or the user is admin. Never accept a userId from the request body for the acting user.
- express-rate-limit on /api/auth/* (10 requests per 15 minutes per IP).
- Frontend: fetch with credentials: "include", load the user from /api/users/current at start, redirect to login on 401. In the UI call the sponsor role "Artist".

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 3: Database
```
STEP 3: Database. Replace every JSON file and in-memory array with Postgres.
- Add the `pg` package. Connection string from process.env.DATABASE_URL.
- Put the attached file at migrations/001_init.sql EXACTLY as given. Write server/migrate.ts that applies migrations/*.sql in filename order and records them in a schema_migrations table. Add npm scripts: "migrate" and "seed". It is the single source of truth. Do not redesign the schema. If you believe something must change, tell me instead of changing it.
- Write server/db.ts exporting a `pg` Pool, a helper `tx(fn)` that runs fn inside BEGIN/COMMIT/ROLLBACK with a client, and a helper for parameterised queries. Money in the DB is numeric(14,2); in code convert to integer paise (toPaise/fromPaise) and never use floats.
- Replace every loadX()/saveX() helper and in-memory array (adminWithdrawals, adminTransactions, adminUpiPayments, adminPromoCodes, sponsorWalletBalances, userBankAccounts, userNotifications) with queries on these tables. No wallet gets a free default balance.
- `seed` creates only the admin user (from ADMIN_EMAIL + ADMIN_PASSWORD) and the promo codes LAUNCH50 and PROCREATOR with correct dates. The 001_init.sql already creates a blocked platform user (platform@mingree.internal) that receives Mingree's fees; it can never log in.
- Update render.yaml with DATABASE_URL, JWT_SECRET, TOKEN_ENC_KEY, ADMIN_EMAIL, ADMIN_PASSWORD (sync: false).
- Run the migration against a real Postgres and paste the output of `\dt`.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 4: Instagram connect aur verified metrics
```
STEP 4: Instagram connection and verified metrics.
- Keep the Meta OAuth flow. Followers, media count, username and metrics must come ONLY from the official Instagram API after OAuth. Lock PUT /api/users/:id/instagram so clients can never set followers or verification status (unlinking is still allowed).
- Encrypt the access token at rest (AES-256-GCM, key from TOKEN_ENC_KEY). Never return it to the client. Refresh the long-lived token automatically before it expires (daily job) and notify the user if refresh fails.
- Compute and store median views of the last 10-15 reels (median, not mean), engagement rate (likes+comments / followers), and India audience % when the API provides audience insights (if unavailable, leave null and show "not available"; do not guess). Refresh daily.
- Store follower snapshots in instagram_follower_history on connect and daily; use them for burst detection (more than 15,000 followers in under 6 hours).
- Tier label from followers using the half-open ranges in the brief. Entry requires MIN_CREATOR_FOLLOWERS.
- Risk score 0-39 allow, 40-69 allow with monitoring, 70+ set status "needs_review" (not a silent permanent rejection) so an admin can approve or reject.
- Verify the OAuth state with a full-length HMAC and crypto.timingSafeEqual; never fall back to a default secret. Deauthorize and data-deletion endpoints must verify Meta's signed_request with the app secret before acting.
- One Instagram account binds to exactly one Mingree account (keep the existing binding and anti-farming rules).

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 5: Creator profile, rate card, benchmark
```
STEP 5: Creator profile and rate card.
- Creators have a rate card: price per deliverable type (Reel with song, Story, Collab post). Price is entered by the creator. Only one change per RATE_CHANGE_COOLDOWN_DAYS; show when the next change is allowed.
- Show "price per 1,000 views" = price / median_views * 1000 next to every rate, in the creator's own editor and everywhere creators are listed.
- Admin can edit the benchmark range (BENCHMARK_CPM_MIN / MAX, in app_config). When a creator saves a rate above the range, show a clear warning with the market range. Warning only, never block.
- Creator directory (for artists): list with filters (tier label, genre, language, min median views, min India %, max price per 1,000 views). Cards show median views and price per 1,000 views prominently; followers in small text. Include completed deals count and on-time rate. Pagination and sorting by value score.
- Creator can set availability on/off and choose genres and languages.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 6: Wallet, escrow aur Cashfree
```
STEP 6: Wallet, escrow and payments. Today /api/cashfree/verify credits wallets and activates plans without verifying with Cashfree, /api/sponsors/:id/wallet/deposit credits anyone for free, and create-order silently returns a simulated session when keys are missing.
- Amounts are decided on the SERVER. Never trust an amount from the client for subscription price.
- POST /api/cashfree/create-order (requireAuth): create the order at Cashfree and store it in payment_orders. Remove the simulated fallback unless NODE_ENV !== "production" AND CASHFREE_ALLOW_SIMULATION === "true".
- POST /api/cashfree/verify: call Cashfree GET /pg/orders/{order_id} (x-api-version 2023-08-01), require order_status "PAID" and amount equal to the stored amount. Then, in ONE DB transaction, mark the order paid and credit the wallet or activate the plan for the order's owner. Idempotent: verifying twice must not credit twice.
- Add POST /api/cashfree/webhook that verifies Cashfree's signature (follow Cashfree's docs; use the raw body for this route) and handles payment success with the same idempotent logic.
- Delete the public wallet deposit route. A manual credit is admin-only and writes a ledger entry with a reason.
- Manual UPI top-up as a fallback: store the payer's user_id, unique constraint on UTR, admin approves and the credit goes to THAT user with an audit log.
- Implement ALL wallet changes through ONE function applyEntry exactly as described in APPENDIX A (single place that changes balances; the DB check constraints keep balance, escrow_held and pending_withdrawal >= 0; unique idem_key makes every movement idempotent).
- Wallet has balance and escrow_held. Provide helper functions: lockEscrow(artist, amount, ref), releaseEscrow(from, to, amount, ref), refundEscrow(...). All inside transactions with ledger rows.
- On top-up capture GSTIN, PAN and billing address (for invoices later). Store the GST on Mingree's fee as a separate ledger line type.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 7: Campaign banana (artist)
```
STEP 7: Artist creates a campaign (Autopilot).
- Form: song title and Instagram audio/Reel/Spotify link, genre, language, deadline, budget, required tags and caption note (always include a disclosure instruction such as #ad or the "Paid partnership" label), filters (follower tier labels, min median views, min India %), pricing mode: (a) fixed price per reel, or (b) price cap per 1,000 views.
- Before launch show an estimate: how many eligible creators match and approximate total views the budget can buy (using median views and prices).
- On launch (sponsor only, own account): require wallet balance >= budget, else return 402. Move the budget into escrow_held and write ledger entries. Create the campaign as "active" only after the funds are locked.
- Keep the existing fixed-price slot flow (spots, 48-hour reservation window, expiry restoring the spot) for pricing_mode "fixed", but now with real escrow per accepted creator, and with the auth rules from Step 2. Remove the Pro-subscription requirement to reserve.
- Artist whitelist/blacklist of creators and MAX_BUDGET_SHARE_PER_CREATOR enforced.
- Closing or cancelling a campaign refunds unspent escrow to the artist wallet.
- Artist screens: campaign list, campaign detail with budget used, offers, shortlist, deals and their status.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 8: Matching, offers, shortlist, direct book
```
STEP 8: Offers and selection.
- Matching: when a campaign launches, find eligible creators (active profile, not blocked, filters match, not blacklisted, available) and create "invited" offers + notifications.
- Cap mode: a creator quotes a price (from their rate card by default, editable once for this campaign). If price per 1,000 views <= the cap, auto-accept in best-value order until the budget is used. Each acceptance creates a deal and locks that creator's amount in escrow. Quotes above the cap become "shortlisted".
- Fixed mode: creators click "Accept", first come first served until spots are full.
- Shortlist screen: value score = weighted mix of lower price per 1,000 views, higher median views, engagement, India %, and past on-time/complete rate (put weights in config). Quotes above AUTOPILOT_HIDE_MULTIPLIER x the cap are hidden behind a "show expensive quotes" toggle. Bulk approve with checkboxes; approving creates deals and locks escrow.
- Direct book: artist selects a creator and deliverable; the creator can accept, decline, or counter once; the artist accepts or declines the counter.
- Enforce MIN_DEAL_AMOUNT and the budget limit with a transaction so two simultaneous accepts cannot overspend.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 9: Delivery, review aur payment release
```
STEP 9: Delivery, review and release.
- Creator submits the Instagram post/reel URL (/p/, /reel/ or /tv/ only). Verify via the Instagram API that the media belongs to the creator's linked account and was posted after the deal was accepted; if the API cannot confirm, mark "needs manual check" instead of guessing. Audio cannot be reliably verified automatically, so show the artist a checkbox "audio is correct" and the artist confirms.
- Artist reviews: approve or reject. Rejection needs an objective reason from a fixed list (wrong audio, missing required caption/tags, not posted by deadline, other + text) and lets the creator fix and resubmit once before the deadline. If the artist does nothing within REVIEW_WINDOW_HOURS, auto-approve.
- On approval: release RELEASE_FIRST_PERCENT of creator_net from escrow to the creator's available balance (ledger entries; Mingree's fees to the platform ledger; GST on fee as its own line).
- After LIVE_HOLD_DAYS, a job checks via the API that the reel is still live. If yes release the remainder. If it was deleted early, refund the remainder to the artist and record it on the creator's reliability score.
- Store metric snapshots at about 48 hours and 7 days (views, likes, comments, still_live) and show them to the artist and creator.
- Disputes: either side can open a dispute before final release; this freezes the remaining escrow and goes to the admin console. Deadline missed with no post: deal expires, escrow refunded to the artist, creator gets a reliability strike.
- Implement releases, refunds and dispute outcomes with the single settle() function from APPENDIX A. All of the above must be idempotent: approving twice must not pay twice.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 10: Withdrawals aur KYC
```
STEP 10: Real withdrawals (today these routes are stubs returning fake success).
- Minimums from config: creators MIN_CREATOR_WITHDRAWAL, artists MIN_ARTIST_WITHDRAWAL. Cannot exceed available balance.
- Payout methods: UPI ID or bank account, validated, multiple per user, one default.
- Before a creator's first payout require PAN (format-validated) and name as per PAN. Encrypt it at rest and never return it in full (mask).
- POST /api/withdrawals (requireAuth): in one transaction move the amount from available balance to a pending hold and write a ledger entry.
- Admin screen: list withdrawals; approve with the transfer reference/UTR the admin enters (I will transfer manually for now), or reject with a reason (the hold returns to the balance). Both create notifications.
- Add a tds_amount column on withdrawals (default 0); do not calculate TDS yet.
- Show withdrawal history and statuses in the existing earnings screen.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 11: Fees, Creator Pro, promo, GST
```
STEP 11: Fees, plans and promo codes.
- Fee calculation lives in one function using shared/config.ts: artist pays P + FEE_ARTIST_PERCENT of P; creator gets P - FEE_CREATOR_PERCENT of P (Pro creators use FEE_CREATOR_PERCENT_PRO). Show both sides an exact breakdown before they confirm (price, fee, GST on fee, total or net).
- Creator Pro (CREATOR_PRO_PRICE, 30 days): lower fee, featured placement in the directory, analytics page (views per deal, earnings over time), early campaign invites (24h before others). The price comes from the server, minus a validated promo discount. Payment via Cashfree (Step 6) or manual UPI.
- A creator never needs a paid plan to list, apply or get paid.
- Promo codes: validate isActive, validUntil, maxUsage and one redemption per user; increment usage atomically.
- Artists get a downloadable tax invoice per top-up and per deal fee (GSTIN, PAN, billing address, GST line) as a PDF.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 12: Notifications aur scheduled jobs
```
STEP 12: Notifications and jobs. Store notifications in the DB and create one on each event: campaign invite, offer accepted/shortlisted/declined, deal created, submission received (also to the artist), approved (with amount released), rejected (with reason), final release, deal expiring in 6 hours and 1 hour (once each), deal expired, dispute opened/resolved, withdrawal requested/approved/rejected, top-up success, wallet low, campaign budget nearly used, Pro activated/expiring in 3 days/expired, Instagram token refresh failure.
Jobs with node-cron: every 5 minutes expire deals/reservations and send the 6h/1h warnings; every 15 minutes auto-approve submissions past REVIEW_WINDOW_HOURS; hourly take 48h snapshots; daily take 7-day snapshots and run the still-live check and final release, refresh Instagram metrics and tokens, send Pro-expiry reminders. Optional email for critical events using the existing nodemailer setup, non-blocking and failure-tolerant.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 13: Admin console
```
STEP 13: Admin console (all routes requireRole("admin"), every action writes an audit log row). Sections: users and creator profiles (view metrics, block/unblock), risk review queue (profiles in needs_review: approve or reject), disputes (view deal, evidence, snapshots; decide: release to creator, refund artist, or split), withdrawals (Step 10), manual UPI payments, campaigns and deals overview, benchmark range and fee config editor (app_config), promo codes, support tickets, security logs and Instagram identity binding transfers, and platform revenue (fees collected, GST lines).

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 14: Hardening, deploy aur tests
```
STEP 14: Production hardening and tests.
- Add helmet, a CORS allowlist from APP_URL, a global express-rate-limit, express.json({ limit: "100kb" }), app.set("trust proxy", 1).
- Validate every request body with zod; return 400 with clear messages. Central error handler that never leaks stack traces in production.
- Remove console.log lines that print OTPs, tokens or secrets. Add DB indexes on foreign keys and on (user_id, status) for deals and offers.
- Update render.yaml with every env var from .env.example (sync: false for secrets) and use a paid instance type (the free plan sleeps and is unsuitable for payments). Keep healthCheckPath /api/health. Update DEPLOYMENT_RENDER_GODADDY.md (DB setup, env vars, db:push, db:seed).
- Write scripts/smoke-test.ts that prints PASS/FAIL for: admin routes return 401/403 without admin; signup with role admin is rejected; wrong or empty password fails; OTP never appears in responses; a creator cannot read another user's data; verifying a fake Cashfree order credits nothing and verifying a paid order twice credits once; a campaign with insufficient balance returns 402; two simultaneous accepts cannot overspend the budget; approving a deal twice pays once; the 50/50 release works and a deleted-early reel refunds the remainder; withdrawal below minimum or above balance is rejected and a rejected withdrawal returns the hold; fee maths matches the example (creator price 20,000 gives artist pays 21,500 and creator gets 18,500 at 7.5%/7.5%). Fix any failures.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

---

## Step 15: Frontend screens (sab backend ban jaane ke baad)
```
STEP 15: Build the v2 screens against the REAL API. Keep the existing UI theme exactly (pink #FF3399, current components, Tailwind, Radix, framer-motion). Do not use mock data; every screen reads from the API and shows proper loading, empty and error states. The word "sponsor" is shown as "Artist" everywhere.

Everyone: landing + how it works + pricing; signup with email OTP; login; forgot/reset password; notifications; wallet with ledger history.
Artist: dashboard; new campaign (steps: song and deadline, filters, pricing mode and budget, estimate and launch); campaign detail (budget used, offers, shortlist with value score, hide-expensive toggle, bulk approve); creator directory with filters and price per 1,000 views; deals (review, approve with "audio is correct" checkbox, reject with objective reason, dispute); add money (Cashfree and manual UPI).
Creator: dashboard and earnings; connect Instagram; rate card with price per 1,000 views, benchmark warning and cooldown date; open campaigns and invites with quote or accept; my deals with submit-reel form; KYC, payout methods, withdraw; Creator Pro.
Admin: overview and revenue; risk review queue; disputes (release, refund or split); withdrawals (approve with UTR, reject with reason); manual UPI; config and benchmark CPM; promo codes; audit log.

Show a fee breakdown (price, fee, GST inside fee, total or net) before any confirm button that moves money.
At the end run `npm run build` and paste its output.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

---

# APPENDIX A: Paise ka exact formula (Step 6 aur Step 9 mein isi ko follow karna hai)

Ye bhi AI Studio ko paste karna (Step 6 ke saath).

```
MONEY SPEC. Follow exactly.

Units: integer paise in code. Never floats. DB columns are numeric(14,2).

applyEntry(client, {userId, balance?, escrow?, pending?, kind, refType?, refId?, idemKey?, note?}):
- Inside an open transaction. Ensure the wallet row exists. SELECT ... FOR UPDATE on it.
- If idemKey is given and a ledger_entries row with that idem_key exists, return false and change nothing.
- UPDATE wallets SET balance = balance + $balance, escrow_held = escrow_held + $escrow, pending_withdrawal = pending_withdrawal + $pending (relative deltas, never absolute set).
- INSERT a ledger_entries row with the deltas and the resulting balance_after and escrow_after.
- If a CHECK constraint fails (balance, escrow or pending would go below 0) return HTTP 402 "Insufficient wallet balance".
- When touching two wallets lock them in ascending user_id order to avoid deadlocks.

Fees for a deal with creator price P (Pro creators use the Pro creator fee):
feeArtist = round(P * FEE_ARTIST_PERCENT / 100); feeCreator = round(P * creatorFeePercent / 100)
artistCost = P + feeArtist; creatorNet = P - feeCreator; platformTotal = feeArtist + feeCreator
GST is INCLUDED inside each fee: gst = round(fee * GST_PERCENT / (100 + GST_PERCENT)), recorded as a separate ledger line.
Example: P = 20000 gives artistCost 21500, creatorNet 18500, platform 3000.

Campaign launch (artist): require wallet balance >= budget else 402. Move budget from balance to escrow_held. campaigns.budget_remaining = budget.

Accepting an offer (creates a deal): in one transaction, lock the campaign row, check budget_remaining >= artistCost and the per-creator cap (MAX_BUDGET_SHARE_PER_CREATOR of budget) and MIN_DEAL_AMOUNT and spots, then budget_remaining -= artistCost and insert the deal (unique per campaign + creator). The money is already in escrow from launch; no wallet movement here.

settle(deal, f, label), where f is the fraction to release, 0..1:
remainingArtist  = artistCost - released_artist
remainingCreator = creatorNet - released_creator
remainingPlatform = remainingArtist - remainingCreator
relCreator  = round(remainingCreator * f)
relPlatform = round(remainingPlatform * f)
refund      = remainingArtist - relCreator - relPlatform   (only when f is the final settlement, otherwise 0)
Then, via applyEntry with idemKeys "deal:{id}:{label}:{wallet}":
- artist wallet: escrow_held -= (relCreator + relPlatform + refund); balance += refund
- creator wallet: balance += relCreator
- platform wallet: balance += relPlatform
Update deals.released_artist += relCreator + relPlatform, deals.released_creator += relCreator.

Use of settle:
- Artist approves (or 72h auto-approve): settle(deal, f = RELEASE_FIRST_PERCENT/100, "first"). Status approved.
- After LIVE_HOLD_DAYS if the reel is still live: settle(deal, 1, "final") with refund = 0 for the remaining, status completed.
- Reel deleted early: release nothing more to the creator; refund all remaining to the artist (relCreator = 0), add a creator strike.
- Deadline missed, no post: refund all of artistCost to the artist, status expired.
- Dispute: freezes any further settle on that deal. Admin outcomes: release to creator, refund artist, or split by percent, each using settle with the right amounts. Status becomes completed or refunded.
- Closing a campaign: refund campaigns.budget_remaining to the artist (escrow_held down, balance up).

Invariant that a test must check after every scenario:
for every artist, wallets.escrow_held = sum(budget_remaining of that artist's active campaigns) + sum(artistCost - released_artist of that artist's open deals).
Money in the system is conserved: sum of all wallet balances + escrow + pending changes only by top-ups and withdrawals.

Cashfree top-up: the server decides the amount. Verify with GET /pg/orders/{order_id} (header x-api-version: 2023-08-01); require order_status PAID and the amount equal to the stored amount. Settle with a conditional update: UPDATE payment_orders SET status='paid' WHERE order_id=$1 AND status='created' RETURNING ...; only if a row came back, credit the wallet (idemKey "order:{id}"). Webhook: always verify signature = base64(HMAC-SHA256(timestamp + rawBody, CASHFREE_SECRET)) using the raw body; reject otherwise. Simulation only if NODE_ENV != production AND CASHFREE_ALLOW_SIMULATION=true.
```

# Phase 2 (baad mein, alag prompts)
- **Smart Package:** artist budget + target views daale, system creators ka mix suggest kare.
- **Manager role:** middleman creators ko laaye (creator ki OAuth consent ke saath) aur har deal par chhota hissa kamaye.
- **Performance bonus:** ek views threshold ke baad extra payment.
- **Phase 3, brand deals:** product shipping, script approval, usage rights, TDS/GST invoices.

# Code se bahar ke kaam (CA / lawyer se confirm karo)
- **Escrow / wallet:** dusron ka paisa platform ke paas rakhna payment-regulation ke daayre mein aa sakta hai. Cashfree ke marketplace/split settlement jaisa structure ya legal advice dekho.
- **GST:** Mingree ki fee aur Creator Pro subscription par GST ka treatment.
- **TDS:** creator payouts par kab aur kitna.
- **Ad disclosure:** ASCI/consumer guidelines ke hisaab se #ad ya Paid partnership label.
- **Privacy policy, terms, Meta data-deletion URL:** Meta app review ke liye zaroori.
- **Meta app review:** insights permissions ke liye lagegi, isme samay lagta hai. Isliye jaldi shuru karo.
