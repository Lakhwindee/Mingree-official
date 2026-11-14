# Mingree Complete Security Patch Manifest

Because the workspace does not contain a `.git` repository, this archive provides a clean, secret-free export of the latest complete security patch (including all modified/added backend, frontend, schema, rule, test, Docker, dependency, and database migration files) ready to import onto your `security/authentication-hardening` branch.

## Verification Checksums of Current Workspace Target Files
- `.env.production.template` (`2,629` bytes): `sha256:05866093f1c501e897bd99650ca8e897d446a231df1d4d1bc2adebfc43c4de03`
- `bun.lock` (`239,961` bytes): `sha256:33438aafe3d1098f0a72b2187d725efacf51bc863df75cb080c4b19fcf90c30d`

---

## Included Files

### 1. Deployment, Dependencies, Templates & Container Build
| Path | Purpose |
| :--- | :--- |
| `Dockerfile` | Multi-stage Docker build/runtime pinned to `node:24-alpine` (`>= 24.12.0`) and `bun install --frozen-lockfile` |
| `package.json` | Runtime engine (`node >= 24.12.0`), dependency vulnerability overrides, security/DB/rules test scripts (`test:security`, `test:verify`, `test:smoke`, `lint:rules`, `test:rules`) |
| `bun.lock` | Locked dependency tree matching `package.json` (exported directly from current `/app/applet/bun.lock`) |
| `.env.production.template` | Secret-free production deployment environment variable template (exported directly from current `/app/applet/.env.production.template`) |
| `.env.example` | Secret-free general environment variable template documenting Upstash Redis, R2, Cashfree webhook, JWT, and encryption keys |
| `drizzle.config.ts` | Drizzle Kit migration configuration |
| `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` | Application TypeScript, Vite build, HTML entry, and ignore rules |
| `vercel.json`, `wrangler.jsonc` | Hosting/worker configuration templates (**note**: `wrangler.jsonc` targets production `mingree-official`; do not deploy bare config to staging) |

### 2. Database Migrations (`migrations/` — Full Directory)
| Path | Purpose |
| :--- | :--- |
| `migrations/0001_clean_launch_schema.sql` | Canonical 34-table launch schema |
| `migrations/0002_security_token_revocation.sql` | Additive idempotent security migration adding `users.token_version`, `revoked_tokens`, and `used_jti_tokens` |
| `migrations/001_init.sql` | Legacy initial SQL reference retained in `migrations/` |
| `migrations/002_phase1_consolidation.sql` | Phase 1 consolidation SQL retained in `migrations/` |

### 3. Security, Backend, Schema & API Source Files
| Path(s) | Purpose |
| :--- | :--- |
| `server.ts` | Express application entrypoint: Helmet/CSP headers, CORS origin validation, `authRateLimiter` ordering, Upstash distributed rate limiters, Firebase phone ID token enforcement, Cashfree canonical webhook `/api/cashfree/webhook`, R2 upload magic-byte checks, signed campaign billing |
| `server/security.ts` | `DistributedRateLimitStore` (Upstash Redis REST), fail-closed `SecurityStoreUnavailableError` (HTTP `503`), distributed OTP lockout, JWT/JTI revocation, `tokenVersion` checks, signed bill tokens, Firebase phone ID token verification, magic-byte upload validation, `escapeHtml` |
| `server/envValidation.ts` | Production preflight checks enforcing `DATABASE_URL`/Hyperdrive, `UPSTASH_REDIS_REST_URL`/`TOKEN`, `JWT_SECRET`, `TOKEN_ENC_KEY`, and warning on storage/Cashfree/OAuth |
| `server/db.ts` | PostgreSQL pool/Hyperdrive setup, `pg` OID 20 BIGINT overflow guard, `ensureDatabaseSchema()`, tracked runner for `0001` & `0002` |
| `server/walletAndPayments.ts` | Transactional `SELECT FOR UPDATE` wallet locking, Cashfree order creation & idempotent webhook processing, encrypted PAN storage |
| `server/withdrawalsAndKyc.ts` | AES-256-GCM encryption/masking for PAN and bank/UPI payout details, transactional withdrawal ledger enforcement |
| `server/instagramMetrics.ts`, `server/instagramSecurity.ts` | Encrypted Instagram OAuth tokens, identity binding & farming/risk protections |
| `server/promoAndInvoices.ts` | Server-side tax invoice generation with `escapeHtml` XSS prevention |
| `server/storage.ts`, `server/worker.ts` | Cloudflare R2 storage enforcement (local disk disabled in production) and Cloudflare Workers HTTP/cron adapter |
| `server/*.ts` (remaining backend modules) | `adminConsole.ts`, `campaignWorkspaces.ts`, `cloudflare.d.ts`, `creatorSearch.ts`, `cronJobs.ts`, `deliveryAndReviews.ts`, `index.ts`, `landingShowcase.ts`, `offersAndDeals.ts`, `seed.ts` |
| `shared/*.ts` | Canonical Drizzle schema (`shared/schema.ts` — 36 tables with BIGINT `mode: "number"`), `config.ts`, `fees.ts`, `tiers.ts`, `cities.ts`, `countries.ts`, `genres.ts`, `languages.ts` |
| `api/index.ts`, `api/instagram/callback.ts` | Serverless route handlers delegating to Express app |

### 4. Client Source Files (`src/`)
| Path(s) | Purpose |
| :--- | :--- |
| `src/**/*` | Full frontend React/TypeScript source including hardened auth (`src/components/auth/PhoneOtpLogin.tsx`, `src/lib/auth-context.tsx`), admin security panel (`src/components/admin/SecurityAuditPanel.tsx`), and legal/MSME identity pages (`src/pages/legal/*`) |

### 5. Firebase Security Rules & Verification Suites
| Path | Purpose |
| :--- | :--- |
| `firestore.rules` | Hardened owner-only Firestore security rules blocking unauthenticated reads/writes and privileged field tampering |
| `firebase.json` | Isolated Firestore emulator configuration (port `8085` / websocket `9155`) |
| `eslint.rules.config.mjs` | ESLint config using `@firebase/eslint-plugin-security-rules` |
| `scripts/migrate.ts` | Canonical database migration runner (`npm run db:migrate`) |
| `scripts/security-regression.test.ts` | 21-check security regression suite (`npm run test:security`) |
| `scripts/verify-implementation.ts` | 16-check PGlite v16 WASM schema, migration checksum, and encryption suite (`npm run test:verify`) |
| `scripts/smoke-test.ts` | 10-check PostgreSQL-backed integration & concurrency smoke suite (`npm run test:smoke`) |
| `scripts/firestore.rules.test.ts` | 5-check `@firebase/rules-unit-testing` Firestore rules suite (`npm run test:rules`) |

---

## Explicitly Excluded
- Real environment files containing secrets (`.env`, `.env.local`, `.env.production`, `.env.staging`)
- `node_modules/`
- `dist/`, `.wrangler/`, `server.js`, `server.js.map`, `firestore-debug.log`
- Private credentials, keys (`*.pem`, `*.key`), and Firebase project config (`firebase-applet-config.json`)
