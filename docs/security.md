# QClue — Security Model (v1.0)

## 1. QR Token Format

> **DECISION REQUIRED:** Choose Option A or Option B before implementation. Analysis below.

### Option A — URL Scheme

```
qclue://hunt/{huntId}/clue/{clueId}?sig={hmac}
```

- Human-readable; debuggable with a standard QR scanner app
- Longer payload → higher QR data density → may reduce reliability at 2 cm × 2 cm
- Requires a custom URL scheme (or HTTPS URL) for mobile parsing

### Option B — Compact Base64URL JSON

```
base64url({ "h": "<huntId>", "c": "<clueId>", "s": "<hmac>" })
```

- Shorter payload → lower QR density → more reliable at 2 cm × 2 cm (recommended)
- Opaque to casual inspection (acceptable; QR codes are not user-readable anyway)
- Parsed as a JSON blob server-side

**Recommendation:** Option B. At 2 cm × 2 cm with a standard camera, minimizing QR data density is critical for reliable scanning. Use `QR_ERROR_CORRECTION_LEVEL_M` (15% error correction) with Option B.

### HMAC Signing

- Algorithm: **HMAC-SHA256**
- Secret key: stored as an environment variable (`QR_SIGNING_KEY`); never committed
- Signed payload: `{huntId}:{clueId}` (concatenated with colon)
- Signature: first 16 bytes of HMAC output, base64url-encoded (sufficient for anti-guessing; truncation is safe here)

**Validation (server-side on every scan):**
1. Decode base64url payload
2. Extract `h`, `c`, `s`
3. Recompute HMAC of `{h}:{c}` using `QR_SIGNING_KEY`
4. Compare computed signature to `s` using constant-time comparison
5. If valid, look up `clue` by `id = c` and `hunt_id = h`
6. Apply scan business logic (correct step, wrong step, etc.)

---

## 2. Admin Credential QR

### Purpose

Used exclusively for in-person level override on a player's device. Not related to admin console authentication.

### Format

Same signing scheme as clue QRs, with a different payload type:

```json
base64url({ "type": "admin_cred", "id": "<credentialId>", "s": "<hmac>" })
```

### Lifecycle

1. Admin generates credential in the console → raw token created (random 32-byte value, `crypto.randomBytes(32)`)
2. Raw token is hashed with **bcrypt** (`bcrypt.hash(rawToken, 12)`) and stored in `admin_credentials.credential_hash`
3. Raw token is encoded into a QR and shown once (or available as a printable PDF)
4. **Raw token is never stored** on the server after generation
5. When a player's device scans the credential QR, the server:
   - Looks up active `admin_credentials` rows
   - Compares raw token against `credential_hash` using `bcrypt.compare`
   - If valid: grants one-time override for that run; logs `level_override` event
6. **Rotation:** Admin clicks "Rotate" → existing row set `is_active = false` → new credential generated → old QR immediately invalid

### Scope (v1)

One global admin credential. All admins use the same physical QR. Per-admin credentials are a future enhancement.

### Override Grant Expiry

An override grant is **single-use per run**:
- After `POST /api/runs/:runId/override` succeeds, the grant is consumed
- The `runs.level_overridden` flag is set to `true`; subsequent override attempts return `OVERRIDE_ALREADY_USED`
- No time-based expiry on the grant (the admin is physically present; time limit adds friction without security benefit)

---

## 3. Player Session Security

### Session Token

- Issued once at `POST /api/players` registration
- Random 32-byte value (`crypto.randomBytes(32)`), base64url-encoded
- Stored on device (localStorage for PWA; SecureStore for React Native)
- Server stores `bcrypt.hash(token, 10)` in `players.session_token_hash`
- Sent on all player requests as `Authorization: Bearer <token>`

### Run Ownership Assertion

- On every player API request, the server:
  1. Extracts `Bearer` token from header
  2. Looks up `Player` where `bcrypt.compare(token, session_token_hash)` is true
  3. Verifies the `runId` in the URL belongs to that player
  4. Proceeds or returns `UNAUTHORIZED` / `FORBIDDEN`

### No Login Screen

- Players do not log in after registration; their device stores the session token
- If a player loses their token (clears app data), they must re-register; this is by design (no account recovery in v1)
- Runs are tied to `player_id`; a new registration creates a new player and new run

---

## 4. Admin Console Auth

### Methods

- Email + bcrypt-hashed password (argon2id preferred; bcrypt acceptable)
- Passkey (WebAuthn) via `@simplewebauthn/server`

### Sessions

- Server-side sessions stored in database (or Redis if available)
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
- Session expiry: 8 hours (configurable)

### RBAC

- v1 has a single `admin` role
- All admin API routes check for a valid admin session; no public admin endpoints

---

## 5. Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/runs/:runId/scan` | 10 requests | 30 seconds per player |
| `POST /api/players` | 5 requests | 60 seconds per IP |
| `POST /api/admin/auth/login` | 10 requests | 5 minutes per IP |
| `POST /api/runs/:runId/override` | 3 requests | 5 minutes per run |

Rate limit responses return HTTP 429 with a `Retry-After` header.

---

## 6. Logging Policy

| Data | Logged? | Notes |
|---|---|---|
| Raw QR token payload | Never | Only result code and clue index logged |
| Raw admin credential token | Never | Only `credentialId` and result logged |
| Player session token | Never | Only `playerId` logged |
| Admin password | Never | Only `adminId` logged |
| Player name and age | Yes (server logs) | PII; apply log retention policy |
| Run events | Yes (DB) | `run_events` table; see data model |
| Scan results | Yes (DB) | `qr_scanned_ok`, `qr_scanned_wrong` event types |

---

## 7. Additional Controls

| Control | Implementation |
|---|---|
| HTTPS everywhere | Enforce at reverse proxy / hosting layer; no HTTP |
| CORS | Admin console: same-origin only. Player API: restrict to app origin. |
| Input sanitization | Validate all inputs server-side; use parameterized queries (Prisma handles this) |
| SQL injection | Prevented by Prisma ORM (parameterized queries) |
| Secrets in env vars | `QR_SIGNING_KEY`, `DB_URL`, `LLM_API_KEY`, `SESSION_SECRET` — never committed |
| Dependency scanning | Run `npm audit` in CI; fail on high-severity vulnerabilities |

---

## 8. Threat Model Summary

| Threat | Mitigation |
|---|---|
| Player guesses a QR token | HMAC signature makes tokens unguessable |
| Player scans another player's run QR | Server validates run ownership before advancing |
| Player fakes clock to unlock hints early | Server uses `clue_viewed` timestamp from DB, not client |
| Player uses admin credential QR directly | Raw token never shown in UI; only as printed QR; one-time per run |
| Admin credential QR photographed by player | Rotation invalidates old QR immediately; one-time use per run |
| Brute-force scan endpoint | Rate limited to 10 req / 30 s per player |
| Replay attack on scan | QR advances state; re-sending same token returns `already_used` |
| Admin console session hijack | HttpOnly + Secure cookie; short session expiry |
