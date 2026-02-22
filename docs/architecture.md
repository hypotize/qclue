# QClue — Architecture (v1.0)

## 1. System Overview

QClue consists of three frontend surfaces backed by a single API server and database:

```
┌──────────────────────────┐     ┌──────────────────────────┐
│   Player Mobile App      │     │   Admin Desktop Console  │
│  (PWA or React Native)   │     │   (Responsive Web App)   │
└────────────┬─────────────┘     └────────────┬─────────────┘
             │                                │
             ▼                                ▼
     ┌────────────────────────────────────────────┐
     │              REST API Server               │
     │         (Next.js API Routes or             │
     │          standalone Node service)          │
     └───────────┬────────────────┬───────────────┘
                 │                │
     ┌───────────▼───┐    ┌───────▼────────┐
     │  PostgreSQL   │    │  Redis (opt.)  │
     │  (primary DB) │    │  (cache/rate)  │
     └───────────────┘    └────────────────┘
                 │
     ┌───────────▼───────────┐
     │   LLM API (AI Assist) │
     └───────────────────────┘
```

---

## 2. Open Architecture Decisions

> These decisions must be resolved before implementation begins.

### 2.1 Player App: PWA vs. React Native

> **DECISION REQUIRED**

| Option | Pros | Cons |
|---|---|---|
| **PWA** (mobile web) | Single codebase with admin console; no app store; instant deploy | Camera/QR API limited to browser `getUserMedia`; less native feel |
| **React Native** | Native camera access; offline capability possible; native UX | Separate codebase; app store required; longer build cycle |

**Recommendation:** PWA using Next.js (same stack as admin), leveraging `@zxing/library` or similar for browser-based QR scanning. Revisit if camera reliability proves insufficient.

### 2.2 API Style: REST vs. GraphQL

> **DECISION REQUIRED** (this document proceeds with REST as the default based on the spec's example endpoints)

If GraphQL is chosen, the endpoint list in `api.md` must be redesigned as a schema + resolver map.

### 2.3 QR Token Format

> **DECISION REQUIRED** — see `security.md` for full analysis.

The chosen format affects QR data density (and thus scanability at 2 cm × 2 cm), mobile parsing logic, and backend validation.

### 2.4 LLM Provider for AI Assist

> **DECISION REQUIRED**

Candidates: Anthropic Claude API, OpenAI GPT-4o. Selection should consider:
- API cost per generation
- Language quality for all 6 supported languages
- Rate limits and latency acceptable for admin UX

---

## 3. Frontend Architecture

### 3.1 Admin Console

- Framework: **Next.js** (App Router)
- Auth: Session cookies via `next-auth` (email/password + WebAuthn passkey)
- Styling: TBD (Tailwind CSS recommended)
- QR generation: `qrcode` npm package (server-side, for PDF output)
- PDF generation: `pdfkit` or `puppeteer` (for print-ready QR sheets)

### 3.2 Player App

- **If PWA:** Next.js with service worker; QR scanning via `@zxing/browser`
- **If React Native:** Expo; QR scanning via `expo-camera` + `expo-barcode-scanner`
- Auth: Device-stored session token issued at registration (see `security.md`)
- Language: i18n via `next-intl` (PWA) or `i18next` (RN)

---

## 4. Backend Architecture

### 4.1 API Server

- Runtime: **Node.js**
- Framework: **Next.js API Routes** (if monorepo with admin) or standalone **Express/Fastify** service
- Auth middleware: JWT or session cookie validation on all protected routes
- QR validation: HMAC-SHA256 signature verification on scan endpoint

### 4.2 Database

- **PostgreSQL** (primary datastore)
- ORM: **Prisma** (recommended for type safety and migration management)
- Migrations: Prisma Migrate

### 4.3 Redis (Optional)

If included, Redis serves the following purposes:

| Use Case | Notes |
|---|---|
| Session store | Admin console sessions |
| Scan rate limiting | Sliding window per player/IP |
| Leaderboard cache | TTL-based cache for expensive leaderboard queries |

Redis is optional for v1. Implement rate limiting in-process (e.g., `express-rate-limit` in-memory) first; add Redis if horizontal scaling is required.

### 4.4 AI Service Integration

- Admin-triggered only (no player-facing AI calls)
- Requests are async: admin triggers generation, result is saved as `approved = false` content rows, admin reviews in the console
- Prompt templates are stored in code (not in DB) for v1; configurable in a future version
- Failure handling: display error in admin UI, no partial saves; admin retries manually

---

## 5. File / Image Storage

Clues support optional images (see data-model.md — `ClueContent.image_url`).

| Option | Notes |
|---|---|
| **AWS S3 / Cloudflare R2** | Recommended; CDN-backed; pre-signed upload URLs |
| Local filesystem | Acceptable for local/self-hosted deployments only |

Image uploads go through the API (not directly to S3) to allow auth validation before storage.

---

## 6. Deployment

### 6.1 Environments

| Environment | Purpose |
|---|---|
| Local dev | `next dev` + local Postgres + local Redis (optional via Docker Compose) |
| Staging | Mirror of production; used for QR print testing |
| Production | TBD (Vercel + managed Postgres, or self-hosted VPS) |

### 6.2 Environment Variables

All secrets (DB connection string, JWT secret, HMAC signing key, LLM API key) must be stored as environment variables, never committed to the repository.

---

## 7. Monorepo vs. Separate Repos

**Recommendation:** Monorepo with the following packages:

```
qclue/
├── apps/
│   ├── web/          # Next.js app (admin console + player PWA + API routes)
│   └── native/       # React Native app (if RN chosen; otherwise omit)
├── packages/
│   ├── db/           # Prisma schema + migrations
│   ├── qr/           # QR generation + PDF utilities
│   └── ai/           # LLM integration + prompt templates
└── docs/
```

---

## 8. Key Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Run timing accuracy | Server timestamps only; client clock never trusted |
| QR scan reliability | Validate HMAC server-side on every scan |
| Admin credential security | Token stored as bcrypt hash; raw value never logged |
| Leaderboard correctness | Only `finished` runs included; server-recorded `total_time_ms` |
| Translation fallback | Missing locale falls back to `en`; missing entry logged |
| Hint timer resumability | Timer derived from `clue_viewed` event timestamp, not client state |
