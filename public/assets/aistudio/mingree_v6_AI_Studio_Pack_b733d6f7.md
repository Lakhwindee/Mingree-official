# Mingree v6: AI Studio Execution Pack

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
| Entry limit | 5,000 followers | Config mein, baad mein badal sakte ho |
| Creator min withdrawal | ₹500 | |
| Artist min withdrawal | ₹1,000 | |
| Review window (auto-approve) | 72 ghante | |
| Reel live rakhne ki avadhi | 7 din | |
| Approve par payout | 100% (config RELEASE_FIRST_PERCENT) | |
| Rate badalne ka cooldown | 7 din | |
| Benchmark range (₹ per 1,000 views) | admin khud bharega | Apne market ke andaze se |

---

# PART A: MASTER BRIEF (sirf ek baar, sabse pehle paste karo)

```
PROJECT BRIEF (read carefully, then wait for my step prompts; do not change any code yet)

Mingree is a transparent marketplace where music artists/labels ("Artists", internally role "sponsor") buy Instagram reel/story promotion for their songs from verified creators. It replaces the informal model where a middleman keeps a private list of creators and private prices. Brand deals will come later on the same engine (Phase 3). Do NOT build brand-deal features now (product shipping, script approval, usage rights).

ROLES: creator, sponsor (shown as "Artist" in the UI), admin. (Phase 2: manager.)

CITY TARGETING: every creator has exactly one home city (the creator\'s own city, not the audience city), chosen from the admin-managed `cities` table when the creator signs up or connects Instagram, and locked afterwards. A creator cannot change it; they can only send a request (city_change_requests) that an admin approves or rejects. The admin may also check the city manually. Tricity places (Chandigarh, Mohali, Panchkula) are separate cities, and the brand can multi-select. A campaign stores selected city_ids in filters. In choose-creators mode and slots mode, only creators whose city is in the brand\'s selected cities AND whose tier is in the selected tiers AND who pass the other filters are shown or invited. A creator\'s tier is computed automatically from their verified followers and cannot be chosen by the creator.

PRICING PHILOSOPHY: Mingree does NOT fix rates. Creators set their own rate per deliverable (Reel with song, Story, Collab post). What Mingree standardizes is comparison. Every creator shows verified metrics: median views of the last 10-15 reels, engagement rate, audience India %, followers (small text). The key number is "price per 1,000 views" = rate / median_views * 1000. Tiers are only filter labels, never prices. The campaign form must also offer free min/max follower and min median views filters, because creators inside one tier can differ a lot: Nano 5,000-10,000, Micro 10,000-50,000, Mid 50,000-100,000, Upper-Mid 100,000-250,000, Macro 250,000-500,000, Large 500,000-1,000,000, Mega 1,000,000-2,500,000, Elite 2,500,000+ (half-open ranges [min, max) so boundaries never overlap).

HOW ARTISTS BUY (Phase 1). EVERY deal is a FIXED price. Payment never depends on views. Views and other metrics are for reporting only and never trigger any payout. There are exactly two booking methods:
1. Fixed-price slots (autopilot): the artist enters song link, deadline, genre/language, required caption/tags, filters (follower band, min median views, min India audience %), one fixed price per approved reel and a budget. The system shows how many slots the budget buys after fees: slots = floor(budget / (price + artist fee)). Matching creators are notified and click Accept; slots are first-come-first-served and allocated atomically so nobody can overspend the budget. Every accepted slot is already covered by escrow from launch.
2. Choose creators (the main new flow): the artist fills the campaign details first (song, deadline, genre, language, deliverable, caption/tags). At the end the artist picks one or more tiers (e.g. Micro, Macro). A side panel then lists ALL eligible creators in the selected follower ranges, each with: username, tier, followers, engagement and median views / India % when available (otherwise a clear "not verified" or "creator-reported" label), completed deals, and the creator's own rate for the chosen deliverable. The artist ticks creators one by one (or "select all in this tier"). A bill at the bottom updates live: each ticked creator's price, platform fee, GST inside the fee and the grand total the artist pays. On Submit: the server re-reads every creator's CURRENT rate, and if any total differs from what the artist saw it returns the new bill for re-confirmation instead of charging. Otherwise the total is deducted from the artist's wallet and locked in escrow (402 if the balance is insufficient), the price of each creator is frozen (price_snapshot), and every ticked creator receives an offer in their inbox and in "Available campaigns".
3. The creator opens the offer and clicks Reserve (accept) or Decline within the deal window (default 48h). There is no counter-offer in Phase 1; the price is the creator's rate card price at submit time. When the creator reserves, a deal is created and the artist is notified "reserved". If the creator declines or the window expires, that creator's reserved amount is refunded to the artist's wallet immediately and the artist is notified. After that, the work, submit, review and payout flow is the same as slots mode.
Guardrails: only verified creators with a low risk score are eligible; hard budget limit; artist whitelist/blacklist; a pre-launch estimate of the number of eligible creators and the number of slots the budget buys (a views estimate is shown as information only, never promised). The artist funds the FULL campaign budget up front; it is locked in escrow at launch.

DELIVERY AND MONEY: The artist funds a wallet (Cashfree, server-verified). The campaign budget is locked in escrow at launch. The creator posts the reel from the linked Instagram account and submits its URL before the deadline; the media must belong to the creator's linked account (verify through the Instagram API; if the API cannot confirm, flag "needs manual check" for the artist and admin). Audio cannot be verified automatically, so the artist confirms it with an "audio is correct" checkbox. The artist approves, or rejects only for objective reasons (wrong audio, missing required caption/tags, posted after the deadline, other + text); the creator may fix and resubmit ONCE before the deadline. Review window is REVIEW_WINDOW_HOURS (72). The artist gets reminders at 24h and 6h before it ends. If the artist does nothing, the deal is auto-approved only when the Instagram API confirmed the reel belongs to the creator and was posted before the deadline; otherwise it goes to the admin review queue. On approval 100% of the creator's agreed payout (RELEASE_FIRST_PERCENT=100) moves to the creator's Mingree balance (not to bank). Withdrawal to bank/UPI is a separate later event with its own statuses (pending, paid, failed, reversed). View snapshots at 48h and 7d are for reporting. The creator agrees that the reel stays live for LIVE_HOLD_DAYS; if it is deleted earlier the creator gets a strike (2 strikes suspends the account) and the artist may open a dispute. Disputes go to admin and freeze any unreleased money. After the campaign closes and all deals and disputes are resolved, unspent budget returns to the artist's wallet.

FEES (all configurable, placeholders until the CA confirms): the agreed fixed price is P. The artist pays P + FEE_ARTIST_PERCENT of P (added on top). The creator receives P - FEE_CREATOR_PERCENT of P (deducted). Pro creators have a lower creator fee. GST is treated as included inside Mingree's fee and is a separate ledger line. Payment-provider charges are paid by Mingree out of its fee and are never deducted from the creator. Show both sides the exact breakdown before they confirm. Example: the artist funds 50,000 and books deals of 5,000, 10,000 and 5,000. Fees at 7.5% add 1,500 so 21,500 is used and 28,500 stays unspent (the 50,000 includes fees). Views never change a payout.

SUBSCRIPTIONS: No payment is needed to list or apply. The gate for creators is Instagram verification + minimum followers (5,000, config) + KYC at payout. Creator Pro (optional): lower fee, featured placement, analytics, early invites. Artists pay only per-deal fees.

RATE GUARDRAILS: a creator can change a rate once per RATE_CHANGE_COOLDOWN_DAYS. When saving a rate, show a warning if price per 1,000 views is above the admin-set benchmark range (BENCHMARK_CPM_MIN / BENCHMARK_CPM_MAX). Warning only, never block, in Phase 1.

NOT IN PHASE 1: price-cap-per-1,000-views pricing, any view-based payment, Smart Package builder, Manager role, performance bonus, guaranteed views, brand deals.

TECH: React + Vite + Tailwind frontend, Express + TypeScript backend, Postgres via Drizzle ORM, hosted on Render, official Meta Instagram API, Cashfree for payments. Keep the existing UI and design language where possible.

CONFIG DEFAULTS (all in shared/config.ts, overridable by env):
FEE_ARTIST_PERCENT=7.5, FEE_CREATOR_PERCENT=7.5, FEE_CREATOR_PERCENT_PRO=4, CREATOR_PRO_PRICE=399, GST_PERCENT=18, MIN_CREATOR_FOLLOWERS=5000, MIN_CREATOR_WITHDRAWAL=500, MIN_ARTIST_WITHDRAWAL=1000, REVIEW_WINDOW_HOURS=72, LIVE_HOLD_DAYS=7, RELEASE_FIRST_PERCENT=100, RATE_CHANGE_COOLDOWN_DAYS=7, MAX_BUDGET_SHARE_PER_CREATOR=30, MIN_DEAL_AMOUNT=300, BENCHMARK_CPM_MIN and BENCHMARK_CPM_MAX stored in the DB and editable by admin.

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
- DELETE the old stuff now: the JSON data files (app_settings.json, otp_store.json, user_profile.json, registered_users.json, campaigns.json, reservations.json, any other data json), the global currentUserProfile variable and every use of it, the unauthenticated legacy routes (bank-accounts, withdrawal-requests, reservations and any route that takes the acting userId from the body or query), the public wallet deposit route, POST /api/auth/admin-login, every "debugOtp", every demo or simulated success path, and the old 20-tier table (shared/tiers.ts keeps only the eight labels from the brief). If a screen depended on a deleted route, make that screen show "coming soon" for now. It will be rebuilt in Step 15.
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
- `seed` also inserts a starter list of Indian cities into `cities` (name, state; at least the top 50 cities plus Chandigarh, Mohali, Panchkula) that the admin can edit.
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
- Home city: required at signup/Instagram connect, picked from the cities list, locked after saving. Show it read-only with a "Request city change" button that creates a city_change_requests row. Tier is shown read-only and computed from followers.

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
STEP 7: Artist creates a campaign (fixed-price slots or choose creators). There is NO price-per-1,000-views pricing mode and no view-based payment anywhere.
- Form: song title and Instagram audio/Reel/Spotify link, genre, language, deliverable, deadline, budget, required tags and caption note (always include a disclosure instruction such as #ad or the "Paid partnership" label), filters (cities: one or many, required; follower tier labels, free min/max followers, min median views, min India %), booking method: (a) fixed-price slots with one fixed price per reel, or (b) choose creators (the tier picker, side panel of creators with tick boxes and live bill described in the brief). For (b) there is no separate budget field: the budget is the total of the ticked creators' bills.
- Before launch show: how many eligible creators match, and for slots mode how many slots the budget buys (floor(budget / (price + artist fee))). Show the fee breakdown. A views estimate may be shown only as information, labelled "not guaranteed".
- On launch/submit (artist only, own account): require wallet balance >= budget (for choose-creators mode: >= the total bill, recomputed by the server from the creators' current rates), else 402. Move the amount into escrow_held, set budget = budget_remaining = that amount, and for choose-creators mode create one campaign_offers row per ticked creator with price_snapshot and reserved_amount = that creator's artist cost. Write ledger entries. The campaign becomes "active" only after the funds are locked.
- Slots mode: first-come-first-served with the 48-hour deal window and expiry that restores the slot, but with real escrow and the auth rules from Step 2. Remove the Pro-subscription requirement to reserve.
- Artist whitelist/blacklist of creators is enforced.
- Closing or cancelling a campaign: open deals continue; once all deals and disputes are resolved, refund budget_remaining to the artist wallet. Cancelling never takes back money from a deal already accepted.
- Artist screens: campaign list, campaign detail with budget used, bookings, deals and their status.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 8: Matching, offers, shortlist, direct book
```
STEP 8: Offers and selection.
- Matching: when a campaign launches, find eligible creators (active profile, not blocked, filters match, not blacklisted, available) and create "invited" offers + notifications. Pro creators are invited 24h earlier.
- Slots mode: creators click "Accept" at the campaign's fixed price. The accept runs in one transaction that locks the campaign row, checks spots_remaining > 0 and budget_remaining >= artistCost and MIN_DEAL_AMOUNT, then decrements both and inserts the deal. First come first served. Two simultaneous accepts for the last slot: exactly one wins, the other gets a clear "slot taken" error.
- Choose-creators mode: the side panel API takes the selected cities, the selected tiers (and optional extra filters: genre, language, min median views, min India %) and returns creators with their details and rate. Sorting: by value score or by price. The bill is computed on the server from the same data (never trust a total sent by the client). On submit: one transaction locks the artist wallet and creates the campaign, all offers (status invited, price_snapshot, reserved_amount) and the escrow lock together, or nothing.
- Reserve: the creator accepts an offer. In one transaction: offer must be invited and unexpired, create the deal from price_snapshot, set campaigns.budget_remaining -= reserved_amount (escrow stays, it now belongs to the deal), offer.status = accepted, reserved_amount = 0, notify the artist. Decline or expiry: refund reserved_amount to the artist wallet (escrow_held down, balance up, budget_remaining down), set offer declined or missed, reserved_amount = 0, notify the artist. Doing it twice must change nothing.
- No counter-offers in Phase 1.
- A creator who does not respond within the deal window: the offer becomes "missed" and nothing is reserved.
- Every confirmation screen shows: creator price, platform fee, GST inside the fee, total artist cost, budget remaining after this booking, deliverables, deadline, approval conditions.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 9: Delivery, review aur payment release
```
STEP 9: Delivery, review and release.
- Creator submits the Instagram post/reel URL (/p/, /reel/ or /tv/ only) before the deal deadline. Verify via the Instagram API that the media belongs to the creator's linked account and was posted after the deal was accepted; if the API cannot confirm, mark "needs manual check" (artist and admin see it) instead of guessing. Audio cannot be verified automatically, so show the artist a checkbox "audio is correct" and the artist confirms.
- Artist reviews: approve or reject. Rejection needs an objective reason from a fixed list (wrong audio, missing required caption/tags, posted after deadline, other + text) and lets the creator fix and resubmit once before the deadline. Review window is REVIEW_WINDOW_HOURS with reminders at 24h and 6h before the end. At the end: if the API confirmed ownership and the post time, auto-approve; otherwise put the deal in the admin review queue. Never auto-approve silently without these conditions. Opening a dispute inside the window blocks auto-approval.
- On approval: settle(deal, RELEASE_FIRST_PERCENT/100, "first"). With the default 100 this releases the full creator payout to the creator's Mingree balance and Mingree's fees to the platform ledger (GST inside the fee as its own line). If RELEASE_FIRST_PERCENT is ever set below 100, the remainder is released after LIVE_HOLD_DAYS if the reel is still live, and refunded to the artist if it was deleted.
- Payout to bank/UPI is NOT part of approval. It happens only through withdrawals (Step 10).
- A daily job checks via the API that reels are still live for LIVE_HOLD_DAYS after approval. If a reel was deleted early: strike the creator (2 strikes suspends), notify the artist, who may open a dispute. Never silently claw back a balance.
- Store metric snapshots at about 48 hours and 7 days (views, likes, comments, still_live), shown as reporting only.
- Disputes: either side can open a dispute before release; it freezes the unreleased escrow and goes to the admin console. Deadline missed with no post: deal expires, the reserved amount stays in the campaign's budget_remaining (or is refunded when the campaign closes), and the creator gets a reliability strike.
- Implement releases, refunds and dispute outcomes with the single settle() function from APPENDIX A. All of this must be idempotent: approving twice, duplicate retries and worker restarts must not pay twice.

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
STEP 12: Notifications and jobs. Store notifications in the DB and create one on each event: campaign invite, offer accepted/shortlisted/declined, deal created, submission received (also to the artist), approved (with amount released), rejected (with reason), final release (only when RELEASE_FIRST_PERCENT < 100), deal expiring in 6 hours and 1 hour (once each), deal expired, dispute opened/resolved, withdrawal requested/approved/rejected, top-up success, wallet low, campaign budget nearly used, Pro activated/expiring in 3 days/expired, Instagram token refresh failure.
Jobs with node-cron: every 5 minutes expire deals/reservations and send the 6h/1h warnings; every 15 minutes handle submissions past REVIEW_WINDOW_HOURS (conditional auto-approve or admin queue, as in Step 9) and send the 24h and 6h review reminders; hourly take 48h snapshots; daily take 7-day snapshots and run the still-live check (strike only when RELEASE_FIRST_PERCENT is 100; final release only if it is below 100), refresh Instagram metrics and tokens, send Pro-expiry reminders. Optional email for critical events using the existing nodemailer setup, non-blocking and failure-tolerant.

PROOF REQUIRED before you say this step is done (do not skip, do not summarise vaguely):
1. List every file you created, changed or deleted.
2. For each requirement above write one line: "DONE: file:function" or "NOT DONE: reason". Never write "completed" for something you did not show.
3. Paste the real output of `npx tsc --noEmit` and of the commands/curl calls that prove this step's behaviour. If you could not run something write "NOT RUN".
4. No try/catch that hides an error and returns fake success or empty data. No mock, placeholder or TODO in auth or money code paths.
```

## Step 13: Admin console
```
STEP 13: Admin console (all routes requireRole("admin"), every action writes an audit log row). Sections: cities list (add/edit/disable), city change requests (approve/reject with note), users and creator profiles (view metrics, block/unblock), risk review queue (profiles in needs_review: approve or reject), disputes (view deal, evidence, snapshots; decide: release to creator, refund artist, or split), withdrawals (Step 10), manual UPI payments, campaigns and deals overview, benchmark range and fee config editor (app_config), promo codes, support tickets, security logs and Instagram identity binding transfers, and platform revenue (fees collected, GST lines).

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
- Write scripts/smoke-test.ts that prints PASS/FAIL for: admin routes return 401/403 without admin; signup with role admin is rejected; wrong or empty password fails; OTP never appears in responses; a creator cannot read another user's data; verifying a fake Cashfree order credits nothing and verifying a paid order twice credits once; a campaign with insufficient balance returns 402; two simultaneous accepts cannot overspend the budget; approving a deal twice pays once; the full payout is released once on approval and repeated approval pays nothing more; a deal that expires (creator never posts) frees its budget; campaign cancellation refunds only the unspent budget after deals close; a payout failure returns the hold; a duplicate Cashfree webhook credits once; after restarting the server mid-flow no amount is lost or doubled; a deal with views of 1,000 or 1,000,000 pays the same; withdrawal below minimum or above balance is rejected and a rejected withdrawal returns the hold; fee maths matches the example (creator price 20,000 gives artist pays 21,500 and creator gets 18,500 at 7.5%/7.5%; budget 50,000 with deals 5,000 + 10,000 + 5,000 leaves 28,500 unspent). Fix any failures.

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
Artist: dashboard; new campaign (steps: song and deadline, cities, tier picker with the side panel of creators and live bill, filters, pricing mode and budget, estimate and launch); campaign detail (budget used, offers, shortlist with value score, hide-expensive toggle, bulk approve); creator directory with filters and price per 1,000 views; deals (review, approve with "audio is correct" checkbox, reject with objective reason, dispute); add money (Cashfree and manual UPI).
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
- Artist approves (or conditional auto-approve as in Step 9): settle(deal, f = RELEASE_FIRST_PERCENT/100, "first"). With the default 100 this is the whole payout and the deal is completed.
- Only if RELEASE_FIRST_PERCENT < 100: after LIVE_HOLD_DAYS if the reel is still live: settle(deal, 1, "final"), status completed.
- Reel deleted early: if some payout is still unreleased (only when RELEASE_FIRST_PERCENT < 100) refund it to the artist and add a creator strike. With 100% already released: strike only.
- Deadline missed, no post: status expired; artistCost goes back into campaigns.budget_remaining (no wallet movement, the money stays in escrow); it returns to the wallet when the campaign closes.
- Dispute: freezes any further settle on that deal. Admin outcomes: release to creator, refund artist, or split by percent, each using settle with the right amounts. Status becomes completed or refunded.
- Closing a campaign: refund campaigns.budget_remaining to the artist (escrow_held down, balance up).

Invariant that a test must check after every scenario:
for every artist, wallets.escrow_held = sum(budget_remaining of that artist's active campaigns) + sum(artistCost - released_artist of that artist's open deals).
Money in the system is conserved: sum of all wallet balances + escrow + pending changes only by top-ups and withdrawals.

Cashfree top-up: the server decides the amount. Verify with GET /pg/orders/{order_id} (header x-api-version: 2023-08-01); require order_status PAID and the amount equal to the stored amount. Settle with a conditional update: UPDATE payment_orders SET status='paid' WHERE order_id=$1 AND status='created' RETURNING ...; only if a row came back, credit the wallet (idemKey "order:{id}"). Webhook: always verify signature = base64(HMAC-SHA256(timestamp + rawBody, CASHFREE_SECRET)) using the raw body; reject otherwise. Simulation only if NODE_ENV != production AND CASHFREE_ALLOW_SIMULATION=true.
```

---

# DECISIONS: jo aap tay karoge (default maine daale hain, AI Studio isi default par chalega)

| # | Sawal | Default | Kyu |
|---|---|---|---|
| 1 | Artist full budget pehle daale ya har booking par? | Full budget launch par escrow mein | Simple, overspend possible nahi |
| 2 | Approve par kitna payout? | 100% creator balance mein (config 100) | Aapka naya rule. Config se baad mein 80 ya 50 ho sakta hai |
| 3 | Artist chup rahe to? (auto ya admin) | 72h ke baad auto-approve sirf tab jab Instagram API ne reel ownership aur post time confirm kiya, warna admin queue | Creator ko ghosting se bachata hai bina bina-check ke paisa diye |
| 4 | Reel jaldi delete ho gayi (paisa mil chuka) | Strike, 2 strikes par suspend, artist dispute khol sakta hai, balance se zabardasti katna nahi | Paisa vapas lene ka koi safe tareeka nahi jab creator withdraw kar chuka |
| 5 | Resubmit | Ek baar, deadline se pehle | |
| 6 | Counter | Phase 1 mein nahi. Creator ka rate submit ke waqt freeze hota hai | Simple, jhagda kam |
| 7 | Payment provider charges | Mingree apni fee se bharta hai | CA se confirm |
| 8 | Fee, GST, TDS | 7.5% + 7.5%, GST fee ke andar | Placeholder, CA se confirm |
| 9 | Payout ka matlab | Pehle creator balance, bank/UPI alag withdrawal se | Do alag events |
| 10 | Refund timeline | Campaign close aur saare deals/disputes khatam hone ke baad, turant wallet mein. Cashfree se bank refund alag | Provider rules ke hisaab se |

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
