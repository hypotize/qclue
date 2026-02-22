# QClue — Architecture (v1.0)

## 1. System Overview

QClue consists of three frontend surfaces backed by a single API server and database:

```
┌──────────────────────────┐     ┌──────────────────────────┐
│   Player Mobile App      │     │   Admin Desktop Console  │
│        (PWA)             │     │   (Responsive Web App)   │
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
     ┌───────────────────────────────────┐
     │  OpenRouter API → Claude (AI)    │
     └───────────────────────────────────┘
```

---

## 2. Architecture Decisions (Resolved)

### 2.1 Player App: **PWA**

Single Next.js codebase shared with the admin console. QR scanning via `@zxing/browser` (browser `getUserMedia` API). No app store required; instant deploy. If camera reliability proves insufficient on a target device, revisit with a native wrapper.

### 2.2 API Style: **REST**

REST endpoints as defined in `api.md`. GraphQL is not in scope for v1.

### 2.3 QR Token Format: **Compact Base64URL JSON (Option B)**

```
base64url({ "h": "<huntId>", "c": "<clueId>", "s": "<hmac>" })
```

Chosen for lower QR data density, ensuring reliable scanning at 2 cm × 2 cm. See `security.md` for full token spec.

### 2.4 LLM Provider: **Claude via OpenRouter**

- Provider: [OpenRouter](https://openrouter.ai)
- Model: Claude (latest capable model available via OpenRouter; e.g. `anthropic/claude-sonnet-4-5`)
- Auth: `OPENROUTER_API_KEY` environment variable
- API: OpenAI-compatible REST endpoint (`https://openrouter.ai/api/v1/chat/completions`)
- Use: admin-triggered clue variant generation and translation; async job pattern

---

## 3. Frontend Architecture

### 3.1 Admin Console

- Framework: **Next.js** (App Router)
- Auth: Session cookies via `next-auth` (email/password + WebAuthn passkey)
- Styling: TBD (Tailwind CSS recommended)
- QR generation: `qrcode` npm package (server-side, for PDF output)
- PDF generation: `pdfkit` or `puppeteer` (for print-ready QR sheets)

### 3.2 Player App (PWA)

- Framework: **Next.js** (shared codebase with admin console; separate routes/layouts)
- QR scanning: `@zxing/browser`
- Auth: Device-stored session token issued at registration (see `security.md`)
- Language: i18n via `next-intl`
- Service worker: enabled for add-to-homescreen and basic asset caching

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

### 4.4 AI Service Integration (OpenRouter → Claude)

- Provider: OpenRouter (`https://openrouter.ai/api/v1/chat/completions`)
- Model: `anthropic/claude-sonnet-4-5` (or latest Claude model available)
- Auth: `OPENROUTER_API_KEY` environment variable
- Admin-triggered only; no player-facing AI calls
- Requests are async: admin triggers generation → job queued → result saved as `approved = false` ClueContent rows → admin reviews and approves in console
- Prompt templates stored in code (`packages/ai/prompts/`) for v1
- Failure handling: surface error in admin UI; no partial saves; admin retries manually
- OpenRouter headers: include `HTTP-Referer` and `X-Title` as recommended by OpenRouter

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
│   └── web/          # Next.js app (admin console + player PWA + API routes)
├── packages/
│   ├── db/           # Prisma schema + migrations
│   ├── qr/           # QR generation + PDF utilities
│   └── ai/           # OpenRouter/Claude integration + prompt templates
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
