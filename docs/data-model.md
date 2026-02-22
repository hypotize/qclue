# QClue — Data Model (v1.0)

## 1. Enums

```sql
CREATE TYPE difficulty_level AS ENUM (
  'basic',
  'elementary',
  'senior_elementary',
  'junior_high',
  'senior_high',
  'adult'
);

CREATE TYPE language_code AS ENUM (
  'en',
  'ja',
  'fr',
  'es',
  'zh-Hans',
  'zh-Hant'
);

CREATE TYPE run_status AS ENUM (
  'active',
  'finished',
  'abandoned',
  'invalid'
);

CREATE TYPE run_event_type AS ENUM (
  'clue_viewed',
  'hint1_shown',
  'hint2_shown',
  'qr_scanned_ok',
  'qr_scanned_wrong',
  'qr_unrecognized',
  'level_override',
  'finished'
);

CREATE TYPE admin_role AS ENUM (
  'admin'
);
```

---

## 2. Entities

### 2.1 Admin

Admins who can access the admin console.

```sql
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,                    -- NULL if using passkey only
  role          admin_role NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Passkey (WebAuthn) credentials are stored in a separate `admin_passkeys` table linked by `admin_id` (standard WebAuthn credential storage — omitted here for brevity; use a library like `@simplewebauthn/server`).

---

### 2.2 Player

A registered game participant.

```sql
CREATE TABLE players (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  age                INT NOT NULL,
  preferred_language language_code NOT NULL,
  assigned_level     difficulty_level NOT NULL,
  session_token_hash TEXT NOT NULL,      -- hashed device session token
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON players (session_token_hash);
```

> **Note:** `session_token_hash` stores a bcrypt hash of the token issued to the device at registration. Raw token is returned once and never stored.

---

### 2.3 Hunt

A configured treasure hunt.

```sql
CREATE TABLE hunts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  description               TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT false,
  timezone                  TEXT NOT NULL DEFAULT 'UTC',   -- IANA timezone string
  final_treasure_youtube_id TEXT NOT NULL,                 -- YouTube video ID (not full URL)
  fallback_language         language_code NOT NULL DEFAULT 'en',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> Only one hunt should be active by default; the application layer enforces this constraint (or a partial unique index can be used: `CREATE UNIQUE INDEX ON hunts (is_active) WHERE is_active = true;` if single-active-hunt is a hard requirement).

---

### 2.4 LevelAgeMapping

Admin-configurable age → level mapping. Stored as rows, one per level.

```sql
CREATE TABLE level_age_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level       difficulty_level NOT NULL UNIQUE,
  min_age     INT NOT NULL,
  max_age     INT,                          -- NULL means "no upper bound"
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES admins(id)
);
```

Default seed data:

| level | min_age | max_age |
|---|---|---|
| basic | 3 | 5 |
| elementary | 6 | 8 |
| senior_elementary | 9 | 11 |
| junior_high | 12 | 14 |
| senior_high | 15 | 17 |
| adult | 18 | NULL |

---

### 2.5 Clue

An ordered step within a hunt. The `token` is embedded in the physical QR code.

```sql
CREATE TABLE clues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id        UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  sequence_index INT NOT NULL,               -- 1-based; unique within a hunt
  token          TEXT NOT NULL UNIQUE,       -- opaque, signed; embedded in QR
  is_final       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hunt_id, sequence_index)
);

CREATE INDEX ON clues (hunt_id, sequence_index);
CREATE INDEX ON clues (token);
```

---

### 2.6 ClueContent

Localized and/or level-specific content for a clue. A single clue may have many content rows (one per language × level combination).

```sql
CREATE TABLE clue_contents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clue_id          UUID NOT NULL REFERENCES clues(id) ON DELETE CASCADE,
  language         language_code NOT NULL,
  level            difficulty_level,          -- NULL = shared across all levels
  clue_text        TEXT NOT NULL,
  hint1_text       TEXT,
  hint2_text       TEXT,
  image_url        TEXT,                      -- optional image attachment (CDN URL)
  approved         BOOLEAN NOT NULL DEFAULT true,  -- false for AI-generated; true for manual
  created_by       UUID REFERENCES admins(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clue_id, language, level)            -- level NULL allowed only once per clue+language
);

CREATE INDEX ON clue_contents (clue_id, language, level);
```

**Content resolution order** (for a given clue, player language `L`, player level `V`):
1. Row where `language = L` AND `level = V` AND `approved = true`
2. Row where `language = L` AND `level IS NULL` AND `approved = true`
3. Row where `language = 'en'` AND `level = V` AND `approved = true`
4. Row where `language = 'en'` AND `level IS NULL` AND `approved = true`
5. Error: log and surface to admin (missing content)

---

### 2.7 Run

A single timed play session.

```sql
CREATE TABLE runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID NOT NULL REFERENCES players(id),
  hunt_id             UUID NOT NULL REFERENCES hunts(id),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ,
  status              run_status NOT NULL DEFAULT 'active',
  total_time_ms       BIGINT,                   -- populated on finish
  current_clue_index  INT NOT NULL DEFAULT 1,   -- mirrors clue.sequence_index of current clue
  last_progressed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  hints_used_count    INT NOT NULL DEFAULT 0,
  level_overridden    BOOLEAN NOT NULL DEFAULT false,
  level_at_start      difficulty_level NOT NULL,
  level_at_finish     difficulty_level,          -- may differ if override used
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON runs (player_id);
CREATE INDEX ON runs (hunt_id, status, total_time_ms); -- leaderboard queries
CREATE INDEX ON runs (status, last_progressed_at);      -- abandonment sweep
```

---

### 2.8 RunEvent

Append-only event log for a run. Used for hint timing, audit trail, and analytics.

```sql
CREATE TABLE run_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  event_type run_event_type NOT NULL,
  clue_id    UUID REFERENCES clues(id),
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata   JSONB
);

CREATE INDEX ON run_events (run_id, event_type, timestamp);
CREATE INDEX ON run_events (run_id, clue_id, event_type);
```

**Key events and their metadata:**

| event_type | metadata keys |
|---|---|
| `clue_viewed` | `{ clue_index: int }` |
| `hint1_shown` | `{ clue_index: int }` |
| `hint2_shown` | `{ clue_index: int }` |
| `qr_scanned_ok` | `{ clue_index: int, scanned_token: string (omit in logs) }` |
| `qr_scanned_wrong` | `{ expected_index: int }` |
| `qr_unrecognized` | `{}` |
| `level_override` | `{ from_level: string, to_level: string }` |
| `finished` | `{ total_time_ms: int }` |

> **Security:** Raw QR token values must never be stored in `run_events.metadata`. Log only indexes and result codes.

---

### 2.9 AdminCredential

A signed credential token used to perform in-person level overrides. Only the hash is stored.

```sql
CREATE TABLE admin_credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_hash     TEXT NOT NULL,            -- bcrypt hash of raw token
  is_active           BOOLEAN NOT NULL DEFAULT true,
  scope               TEXT NOT NULL DEFAULT 'global',  -- 'global' for v1
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES admins(id),
  rotated_at          TIMESTAMPTZ,
  rotated_by          UUID REFERENCES admins(id)
);
```

> At most one `is_active = true` row should exist for v1. Rotation deactivates the current row and creates a new one.

---

## 3. Entity Relationship Summary

```
admins ──< admin_credentials
admins ──< level_age_mappings
admins ──< clue_contents (created_by)

hunts ──< clues ──< clue_contents
hunts ──< runs

players ──< runs ──< run_events
              │
              └── clue_id ──> clues
```

---

## 4. Conventions

| Convention | Value |
|---|---|
| All timestamps | UTC (`TIMESTAMPTZ`) |
| Primary keys | UUIDv4 (`gen_random_uuid()`) |
| Soft delete | Not used in v1; records are hard-deleted where supported |
| Approval default | `true` for manually entered content; `false` for AI-generated |
| Token storage | All credential tokens stored as bcrypt hashes only |
