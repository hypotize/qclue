# QClue — API Reference (v1.0)

## Overview

Base URL: `/api`

All player endpoints require a `Bearer` session token in the `Authorization` header, issued at registration. All admin endpoints require an admin session cookie.

**Response envelope (all endpoints):**

```json
{ "data": {}, "error": null }
{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

---

## Player API

### `POST /api/players`

Register a new player and create their run in the active hunt.

**Auth:** None (public)

**Request:**
```json
{
  "name": "Alice",
  "age": 9,
  "language": "en"
}
```

**Response `201`:**
```json
{
  "data": {
    "playerId": "uuid",
    "name": "Alice",
    "age": 9,
    "language": "en",
    "assignedLevel": "senior_elementary",
    "runId": "uuid",
    "sessionToken": "opaque-token"   // store on device; not stored server-side in plain form
  }
}
```

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `NO_ACTIVE_HUNT` | 409 | No hunt is currently active |
| `AGE_OUT_OF_RANGE` | 422 | Age outside configured bounds |
| `INVALID_LANGUAGE` | 422 | Language code not supported |

---

### `GET /api/runs/:runId/current`

Get the current clue content and hint availability for an active run.

**Auth:** Player session token

**Response `200`:**
```json
{
  "data": {
    "runId": "uuid",
    "huntId": "uuid",
    "clueIndex": 3,
    "totalClues": 12,
    "isFinal": false,
    "clue": {
      "id": "uuid",
      "text": "Find the place where mornings begin...",
      "imageUrl": null
    },
    "hints": {
      "hint1": {
        "available": false,
        "availableAt": "2024-01-15T10:01:30Z",   // server timestamp; client derives countdown
        "text": null                               // null until revealed
      },
      "hint2": {
        "available": false,
        "availableAt": "2024-01-15T10:03:30Z",
        "text": null
      }
    },
    "clueViewedAt": "2024-01-15T10:00:30Z"
  }
}
```

**Notes:**
- `availableAt` is `clueViewedAt + threshold` computed server-side. Client uses this for countdown display.
- Hint `text` is `null` until the player requests it via `POST /hint`.
- `available: true` means the server will accept a hint request; the client should unlock the button.

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `RUN_NOT_FOUND` | 404 | runId not found or does not belong to this player |
| `RUN_NOT_ACTIVE` | 409 | Run status is not `active` |

---

### `POST /api/runs/:runId/scan`

Submit a scanned QR token.

**Auth:** Player session token

**Rate limit:** 10 requests / 30 seconds per player

**Request:**
```json
{
  "token": "opaque-qr-payload"
}
```

**Response `200` (correct, not final):**
```json
{
  "data": {
    "result": "advanced",
    "nextClueIndex": 4,
    "totalClues": 12,
    "isFinal": false
  }
}
```

**Response `200` (correct, final clue):**
```json
{
  "data": {
    "result": "finished",
    "totalTimeMs": 724000,
    "treasureUrl": "/treasure/uuid"
  }
}
```

**Response `200` (wrong but valid token):**
```json
{
  "data": {
    "result": "wrong_step",
    "message": "Not the right treasure for your current step."
  }
}
```

**Response `200` (valid token, different hunt):**
```json
{
  "data": {
    "result": "wrong_hunt",
    "message": "This treasure belongs to another hunt."
  }
}
```

**Response `200` (already used):**
```json
{
  "data": {
    "result": "already_used",
    "message": "You've already found this one."
  }
}
```

**Response `200` (unrecognized):**
```json
{
  "data": {
    "result": "unrecognized",
    "message": "QR not recognized."
  }
}
```

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `RUN_NOT_ACTIVE` | 409 | Run already finished, abandoned, or invalid |
| `RATE_LIMITED` | 429 | Too many scan attempts |

---

### `POST /api/runs/:runId/hint`

Request a hint for the current clue.

**Auth:** Player session token

**Request:**
```json
{
  "hintNumber": 1
}
```

**Response `200`:**
```json
{
  "data": {
    "hintNumber": 1,
    "text": "Look near where the sun rises in the house."
  }
}
```

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `HINT_NOT_AVAILABLE` | 409 | Time threshold not yet reached |
| `HINT_NOT_FOUND` | 404 | No hint content configured for this clue |
| `RUN_NOT_ACTIVE` | 409 | Run not in active state |

---

### `POST /api/runs/:runId/override`

Validate an admin credential token and grant a one-time level override for this run.

**Auth:** Player session token

**Request:**
```json
{
  "adminCredentialToken": "raw-token-from-admin-qr"
}
```

**Response `200`:**
```json
{
  "data": {
    "overrideGranted": true,
    "availableLevels": ["basic", "elementary", "senior_elementary", "junior_high", "senior_high", "adult"]
  }
}
```

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_CREDENTIAL` | 401 | Token invalid or expired |
| `OVERRIDE_ALREADY_USED` | 409 | This run already had an override |

---

### `PATCH /api/runs/:runId/level`

Set the player's level after a successful override.

**Auth:** Player session token

**Request:**
```json
{
  "level": "junior_high"
}
```

**Response `200`:**
```json
{
  "data": { "level": "junior_high" }
}
```

**Errors:**

| Code | HTTP | Meaning |
|---|---|---|
| `OVERRIDE_NOT_GRANTED` | 403 | No active override grant for this run |
| `INVALID_LEVEL` | 422 | Unknown level value |

---

### `GET /api/leaderboards`

Fetch leaderboard entries.

**Auth:** None (public)

**Query parameters:**

| Param | Required | Values | Notes |
|---|---|---|---|
| `huntId` | Yes | UUID | |
| `range` | Yes | `today`, `month`, `all` | |
| `level` | No | difficulty level enum | |
| `language` | No | language code | |
| `page` | No | int (default 1) | |
| `pageSize` | No | int (default 50, max 100) | |

**Response `200`:**
```json
{
  "data": {
    "entries": [
      {
        "rank": 1,
        "playerName": "Alice",
        "level": "senior_elementary",
        "totalTimeMs": 724000,
        "hintsUsed": 1,
        "finishedAt": "2024-01-15T10:12:10Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 50
  }
}
```

---

## Admin API

All admin endpoints require an authenticated admin session (cookie-based).

### `POST /api/admin/auth/login`

```json
// Request
{ "email": "admin@example.com", "password": "..." }

// Response 200
{ "data": { "adminId": "uuid", "role": "admin" } }
```

### `POST /api/admin/auth/logout`

Clears the session cookie.

---

### Hunts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/hunts` | List all hunts |
| `POST` | `/api/admin/hunts` | Create a hunt |
| `GET` | `/api/admin/hunts/:huntId` | Get a hunt |
| `PATCH` | `/api/admin/hunts/:huntId` | Update a hunt |
| `DELETE` | `/api/admin/hunts/:huntId` | Delete a hunt (only if no active runs) |

**Create / Update hunt body:**
```json
{
  "name": "Easter 2025",
  "description": "...",
  "isActive": true,
  "timezone": "America/New_York",
  "finalTreasureYoutubeId": "dQw4w9WgXcQ",
  "fallbackLanguage": "en"
}
```

---

### Clues

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/hunts/:huntId/clues` | List clues in order |
| `POST` | `/api/admin/hunts/:huntId/clues` | Create a clue |
| `PATCH` | `/api/admin/clues/:clueId` | Update a clue |
| `DELETE` | `/api/admin/clues/:clueId` | Delete a clue |
| `POST` | `/api/admin/hunts/:huntId/clues/reorder` | Reorder clues |

**Create clue body:**
```json
{
  "sequenceIndex": 3,
  "isFinal": false
}
```

**Reorder body:**
```json
{ "orderedIds": ["uuid1", "uuid2", "uuid3"] }
```

---

### Clue Content

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/clues/:clueId/contents` | List all content rows for a clue |
| `POST` | `/api/admin/clues/:clueId/contents` | Create a content row |
| `PATCH` | `/api/admin/clue-contents/:contentId` | Update a content row |
| `DELETE` | `/api/admin/clue-contents/:contentId` | Delete a content row |
| `POST` | `/api/admin/clue-contents/:contentId/approve` | Approve content for publishing |

**Create / update content body:**
```json
{
  "language": "en",
  "level": "senior_elementary",   // null for shared
  "clueText": "Find the place where...",
  "hint1Text": "Think about sunrise...",
  "hint2Text": "It's in the east-facing room.",
  "imageUrl": null
}
```

---

### AI Assist

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/clues/:clueId/generate-variants` | Generate per-level clue text variants |
| `POST` | `/api/admin/clues/:clueId/translate` | Translate base text into all languages |

**Generate variants request:**
```json
{ "baseText": "Find the place where mornings begin...", "language": "en" }
```

**Response `202` (async):**
```json
{ "data": { "jobId": "uuid", "status": "pending" } }
```

Results are polled via `GET /api/admin/ai-jobs/:jobId` and saved as `approved = false` content rows when complete.

---

### QR Codes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/clues/:clueId/qr` | Get QR token payload for a clue |
| `POST` | `/api/admin/clues/:clueId/qr/print` | Generate printable PDF for a clue QR |
| `POST` | `/api/admin/hunts/:huntId/qr/print-all` | Generate PDF sheet for all clues in a hunt |
| `GET` | `/api/admin/credential/qr` | Get current admin credential QR data |
| `POST` | `/api/admin/credential/qr/print` | Generate printable PDF for admin credential QR |
| `POST` | `/api/admin/credential/rotate` | Rotate admin credential (old immediately invalid) |

**Print request body:**
```json
{
  "foregroundColor": "#000000",
  "backgroundColor": "#ffffff",
  "includeLabel": true,
  "includeCutGuides": true
}
```

**Print response:** `application/pdf`

---

### Players & Runs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/players` | List players (paginated) |
| `GET` | `/api/admin/runs` | List runs (paginated, filterable by status/hunt) |
| `GET` | `/api/admin/runs/:runId` | Get run detail with events |
| `POST` | `/api/admin/runs/:runId/reset` | Reset run to Clue 1 |
| `POST` | `/api/admin/runs/:runId/invalidate` | Mark run as invalid |

---

### Configuration

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/config/level-mapping` | Get age→level mapping |
| `PUT` | `/api/admin/config/level-mapping` | Replace age→level mapping |

**Level mapping body:**
```json
[
  { "level": "basic", "minAge": 3, "maxAge": 5 },
  { "level": "adult", "minAge": 18, "maxAge": null }
]
```

---

## Error Codes Reference

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | State conflict (run already finished, etc.) |
| `UNPROCESSABLE` | 422 | Validation error |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL` | 500 | Unexpected server error |
