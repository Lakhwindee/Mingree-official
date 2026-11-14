# Mingree Complete Security & Architecture Manifest

Mingree's production infrastructure runs on **Cloudflare Workers + Cloudflare R2 + Cloudflare Hyperdrive + Supabase PostgreSQL + Upstash Redis**. All legacy/experimental Firebase and Firestore files, dependencies, and dead code paths have been completely removed.

---

## Included Files

### 1. Deployment, Dependencies, Templates & Container Build
| Path | Purpose |
| :--- | :--- |
| `Dockerfile` | Multi-stage Docker build/runtime pinned to `node:24-alpine` (`>= 24.12.0`) and `bun install --frozen-lockfile` |
| `package.json` | Runtime engine (`node >= 24.12.0`), dependency vulnerability overrides, security/DB test scripts (`test:security`, `test:verify`, `test:smoke`) |
| `bun.lock` | Locked dependency tree matching `package.json` (clean of Firebase packages) |
| `.env.production.template` | Secret-free production deployment environment variable template |
| `.env.example` | Secret-free general environment variable template documenting Supabase PostgreSQL, Upstash Redis, Cloudflare R2, Cashfree webhook, JWT, and encryption keys |
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
| `server.ts` | Express application entrypoint: Helmet/CSP headers, CORS origin validation, `authRateLimiter` ordering, Upstash distributed rate limiters, HMAC-signed single-use OTP verification tokens, Cashfree canonical webhook `/api/cashfree/webhook`, R2 upload magic-byte checks, signed campaign billing |
| `server/security.ts` | `DistributedRateLimitStore` (Upstash Redis REST), fail-closed `SecurityStoreUnavailableError` (HTTP `503`), distributed OTP lockout, JWT/JTI revocation, `tokenVersion` checks, signed bill tokens, magic-byte upload validation, `escapeHtml` |
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
| `src/**/*` | Full frontend React/TypeScript source including hardened auth (`src/lib/auth-context.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/ForgotPassword.tsx`), admin security panel (`src/components/admin/SecurityAuditPanel.tsx`), and legal/MSME identity pages (`src/pages/legal/*`) |

### 5. Verification Suites (`scripts/`)
| Path | Purpose |
| :--- | :--- |
| `scripts/migrate.ts` | Canonical database migration runner (`npm run db:migrate`) |
| `scripts/security-regression.test.ts` | 21-check security regression suite (`npm run test:security`) |
| `scripts/verify-implementation.ts` | 16-check PGlite v16 WASM schema, migration checksum, and encryption suite (`npm run test:verify`) |
| `scripts/smoke-test.ts` | 10-check PostgreSQL-backed integration & concurrency smoke suite (`npm run test:smoke`) |

---

## Explicitly Excluded
- Real environment files containing secrets (`.env`, `.env.local`, `.env.production`, `.env.staging`)
- `node_modules/`
- `dist/`, `.wrangler/`, `server.js`, `server.js.map`
- Private credentials and keys (`*.pem`, `*.key`)
