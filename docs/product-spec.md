# QClue — Product Specification (v1.0)

## 1. Purpose

QClue is a QR-code-driven treasure hunt game designed to run inside a house. Players register on a mobile app, are assigned a difficulty level based on age (locked after registration), then progress through a sequence of clues by finding and scanning physical QR codes placed around the house. Completion time is recorded and displayed on leaderboards. The final QR opens a hosted page that plays an embedded YouTube congratulations video and instructs the player to see the clue master for a prize.

---

## 2. Scope

### In Scope (v1)

- Player registration (name, age, preferred language)
- Automatic level assignment based on age + locked level policy
- Admin override of locked level via Admin Credential QR (never shared as plain text)
- Sequential clue progression via QR scanning
- Hints: available after 1 minute (Hint 1) and 3 minutes (Hint 2), logged on reveal
- Leaderboards: Today / This Month / All-Time, filtered by hunt and level
- Admin console (desktop-first) to:
  - Create and manage hunts
  - Author clues and hints per level or shared
  - Generate and print QR codes (2 cm × 2 cm)
  - Configure the final treasure page (YouTube URL)
  - View and manage players and runs
- UI and clue content localization across supported languages
- AI assist for admins: generate level-variant clues and translate content; admin approval required before publishing

### Out of Scope (v1)

| Feature | Notes |
|---|---|
| Multi-house / multi-location mapping | Future |
| Offline mode | Future |
| Anti-cheat via location services | Future |
| Team mode | Future |
| Push notifications | Future |

---

## 3. Target Platforms

| Context | Platform | Primary Use |
|---|---|---|
| Player | Mobile (PWA or native — see architecture.md) | Register, read clues, scan QR, view leaderboard |
| Admin | Desktop web console | Hunt setup, clue authoring, QR printing, player management |

---

## 4. User Roles & Permissions

### 4.1 Player

- Register with name, age, preferred language
- View current clue and unlocked hints
- Scan QR codes to advance through clues
- View leaderboards
- Cannot change difficulty level after registration (may request admin override)

### 4.2 Admin (Clue Master)

- Create, edit, and delete hunts, clues, and hints
- Configure final treasure YouTube URL per hunt
- Generate and print QR codes (clue tokens and admin credential)
- View active players, current step, and run history
- Perform in-person level override via Admin Credential QR
- Manage AI-generated content (generate, review, approve, edit, publish)
- Rotate admin credential QR

---

## 5. Supported Languages (v1)

| Code | Language |
|---|---|
| `en` | English |
| `ja` | Japanese |
| `fr` | French |
| `es` | Spanish |
| `zh-Hans` | Mandarin (Simplified Chinese) |
| `zh-Hant` | Taiwan Chinese (Traditional Chinese) |

> The language list is stored in configuration and can be extended without code changes.

---

## 6. Core Concepts

### 6.1 Difficulty Levels

Levels in ascending order:

1. Basic
2. Elementary
3. Senior Elementary
4. Junior High
5. Senior High
6. Adult

### 6.2 Hunt

A hunt is a configured, ordered set of clues (target: 10–12 clues, not hard-limited) with a defined start and a final treasure clue. At most one hunt is active by default; this is admin-configurable.

A player does not select a hunt — they are automatically placed in the currently active hunt at registration time.

### 6.3 Clue

A piece of text (and optionally an image) that instructs the player where to find the next physical QR code. Clue content is authored per-language and optionally per-difficulty-level. If no level-specific variant exists, the shared variant is shown.

### 6.4 QR Treasure Code

A physical QR code placed in the house at the location a clue points to. Scanning it advances the player to the next clue. Each code encodes a signed token unique to that clue (see security.md).

### 6.5 Hints

Each clue may have up to two hints:

| Hint | Unlocks after |
|---|---|
| Hint 1 | 1 minute from when the clue screen was first shown |
| Hint 2 | 3 minutes from when the clue screen was first shown |

The unlock timer is based on a server-recorded timestamp to prevent phone clock manipulation. The timer resumes from the original server timestamp if the player leaves and returns to the clue screen.

Hints are logged when revealed (see `RunEvent`).

### 6.6 Run

A single timed play session by one player for one hunt. A player may start a new run after completing or abandoning a previous one without re-registering.

---

## 7. Player Experience

### 7.1 Registration

**Inputs:**

| Field | Type | Validation |
|---|---|---|
| Name | String | Required; 1–100 characters |
| Age | Integer | Required; 3–120 (bounds admin-configurable) |
| Preferred language | Enum | Required; from supported list |

**System behavior:**

1. Age is mapped to a difficulty level using the admin-configurable level assignment table.
2. Player is shown a confirmation screen: Name, Age, Language, Assigned Level, and a notice that the level is now locked.
3. A session token is issued and stored on device for authenticating subsequent requests.
4. The player's run in the currently active hunt is created on the server.

#### 7.1.1 Default Level Assignment (Admin-Configurable)

| Level | Default Age Range |
|---|---|
| Basic | 3–5 |
| Elementary | 6–8 |
| Senior Elementary | 9–11 |
| Junior High | 12–14 |
| Senior High | 15–17 |
| Adult | 18+ |

The mapping is stored in the database and editable by admins without redeployment.

### 7.2 Locked Level & Admin Override

- The assigned level cannot be changed by the player.
- The confirmation and clue screens display a **Request Level Override** button.
- Tapping it enters **Override Scan Mode**: the app activates the camera and prompts the admin to scan the Admin Credential QR using the player's phone.
- A valid admin credential scan grants a **one-time level-change action** for that run. The player may then select a new level from a picker.
- The override is single-use per run. After use, the button is hidden.
- The admin credential must never be shared as plain text. It exists only as a physical QR code possessed by the admin.

### 7.3 Game Start

After the registration confirmation, the player taps **Start Hunt**. The app displays Clue #1 (server timestamp recorded as `clue_viewed` event).

### 7.4 Clue Progression

For each clue:

1. Player reads the clue text (in their selected language, level-appropriate variant if available).
2. Player searches the house and finds the physical QR code.
3. Player taps **Scan** and scans the code.
4. Server validates the token and advances the run to the next clue.
5. Server records a `qr_scanned_ok` event and a `clue_viewed` event for the next clue.

### 7.5 QR Scan Response Behavior

| Condition | Message Shown |
|---|---|
| Correct next clue token | (advance silently to next clue) |
| Valid token, wrong step | "Not the right treasure for your current step." |
| Token from a different hunt | "This treasure belongs to another hunt." |
| Token already used (correct but already past it) | "You've already found this one." |
| Unrecognized / invalid token | "QR not recognized." |
| Run already finished | "Your run is already complete." |
| Network failure | "Connection error — please try again." |
| Hunt deactivated mid-run | Allow current run to complete; no new runs start. |

### 7.6 Hints

- The hint unlock timer starts from the `clue_viewed` server timestamp for the current clue.
- Hint buttons display a countdown until available (optional UX enhancement).
- When a hint button becomes available, the player taps it to reveal the text; the event is logged.
- Hint 2 is independent of Hint 1 (the player does not need to view Hint 1 to unlock Hint 2).

### 7.7 Completion

- The final clue's QR, when validated by the server, ends the run: `finished_at` and `total_time_ms` are recorded.
- The app displays a completion screen with total time and a link to the **Final Treasure Page**.
- The Final Treasure Page is a QClue-hosted web page (URL: `/treasure/{runId}` or similar) that:
  - Embeds the YouTube video configured by the admin for that hunt
  - Displays the message: *"Congratulations. You've reached the final treasure. Please see the clue master for your prize."*

---

## 8. Leaderboards

### 8.1 Time Ranges

| View | Boundary |
|---|---|
| Today | Local day in the admin-configured hunt timezone |
| This Month | Calendar month in hunt timezone |
| All-Time | No time boundary |

### 8.2 Filters

| Filter | v1 Status |
|---|---|
| By hunt | Required (multiple hunts may exist) |
| By level | Recommended |
| By language | Optional |

### 8.3 Display Fields

| Field | Notes |
|---|---|
| Player name | |
| Level | |
| Completion time | Format: `mm:ss` or `hh:mm:ss` |
| Completed at | Timestamp |
| Hints used | Optional |

Only completed runs (status = `finished`) appear on leaderboards.

---

## 9. Admin Console

### 9.1 Authentication

- Admins log in via email + password or passkey (WebAuthn).
- RBAC: at minimum an `admin` role. Additional roles may be added in future.
- The Admin Credential QR is a separate, physical override mechanism distinct from console login.

### 9.2 Hunt Management

- Create hunt: name, description, timezone, active flag, final treasure YouTube URL
- Set clue count and ordering
- Activate / deactivate hunt (only one active by default; configurable to allow multiple)
- A deactivated hunt allows existing active runs to complete but prevents new registrations

### 9.3 Clue Management

- Create, edit, reorder, and delete clues within a hunt
- Each clue has:
  - `sequence_index` (1-based display; admin can drag-reorder)
  - Base clue text (required; serves as fallback)
  - Optional image attachment
  - Level variants (optional per-level overrides of clue text)
  - Hint 1 text (optional; may have level variants)
  - Hint 2 text (optional; may have level variants)
  - Per-language translations (with approval status per row)

#### 9.3.1 AI Assist

| Action | Description |
|---|---|
| Generate Level Variants | Input: base clue text. Output: one variant per difficulty level (Basic = simpler/direct; Adult = more cryptic/indirect). |
| Translate | Input: base text + hints. Output: translations into all supported languages. |

- All AI-generated content is saved with `approved = false` and is not shown to players until an admin approves it.
- Manually entered content is auto-approved (`approved = true`).
- Approved content is editable; editing resets approval status.

### 9.4 QR Code Generation & Printing

- Admin generates a QR for each clue and for the admin credential
- Physical size: 2 cm × 2 cm (enforced in PDF template)
- Color: admin selects foreground and background colors; system warns if contrast is insufficient for reliable scanning
- Printed PDF includes:
  - QR image (2 cm × 2 cm)
  - Optional human-readable label outside the square (e.g., "Clue 5")
  - Optional cut guides

### 9.5 Player & Run Management

- View active players and their current step
- View run history with status and completion time
- Reset a run (clears progress, re-starts from Clue 1)
- Invalidate a run (marks status = `invalid`; excluded from leaderboard)

---

## 10. Edge Cases

| Scenario | Behavior |
|---|---|
| Scan same correct QR twice | "You've already found this one." — no state change |
| QR from a different hunt | "This treasure belongs to another hunt." |
| Run inactive for > 24 hours (configurable) | Automatically marked `abandoned` |
| Admin rotates admin credential | Old credential QR becomes invalid immediately |
| Translation missing for a language | Fall back to English (or admin-configured fallback); log missing translation |
| Hunt deactivated mid-run | Active runs may complete; no new registrations for that hunt |
| Admin approves content, then edits it | Approval reset to `false`; must re-approve |

---

## 11. Acceptance Criteria (MVP)

1. Player can register, receive a locked difficulty level, and start a run.
2. Player can scan the correct QR and advance sequentially through all clues.
3. Hint 1 is locked until 1 minute after the clue was shown; Hint 2 until 3 minutes. Both are logged on reveal.
4. Final QR scan ends run timing and opens the Final Treasure Page with embedded YouTube video.
5. Leaderboards display fastest completion times for Today / This Month / All-Time, filterable by hunt.
6. Admin can create a hunt, author clues, and generate printable QR codes at 2 cm × 2 cm.
7. Admin override works only by scanning the Admin Credential QR on the player's device; grants one-time level change.

---

## 12. Admin-Configurable Settings

| Setting | Default |
|---|---|
| Age → level mapping | See Section 7.1.1 |
| Active hunt(s) | One active at a time |
| Hint timing thresholds | Hint 1: 60 s, Hint 2: 180 s |
| Override duration | One-time use per run |
| Admin credential grace period on rotation | Immediate expiry |
| Run abandonment inactivity threshold | 24 hours |
| Leaderboard timezone | Configurable per hunt |
| Fallback language for missing translations | English |
| Supported language list | Stored in config; expandable |
| Age bounds for registration | 3–120 |
