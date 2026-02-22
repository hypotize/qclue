# QClue — UX Flows (v1.0)

## Player App

### Screen Inventory

| # | Screen | Entry Condition |
|---|---|---|
| P1 | Welcome / Register | App launch; no active session |
| P2 | Registration Confirmation | After successful registration |
| P3 | Current Clue | After confirming registration; after each successful scan |
| P4 | QR Scan Overlay | Player taps "Scan" button |
| P5 | Scan Result Feedback | After scan returns non-advance result |
| P6 | Override Scan Mode | Player taps "Request Level Override" |
| P7 | Level Select | After successful admin credential scan |
| P8 | Completion Screen | After final QR validated |
| P9 | Final Treasure Page | Player taps "Claim Prize" (separate web page) |
| P10 | Leaderboards | Player taps leaderboard tab |

---

### P1 — Welcome / Register

**Purpose:** Collect registration data.

**Components:**
- App logo / title
- Name field (text input; required)
- Age field (numeric input; required; min/max enforced)
- Language selector (dropdown or picker; populated from supported list)
- "Start" / "Register" CTA button

**Validation (client-side, then server):**
- Name: required, 1–100 characters
- Age: required, integer, within configured bounds (default 3–120)
- Language: required

**On submit:** Show loading indicator → call `POST /api/players` → navigate to P2 on success.

**On error:**
- `AGE_OUT_OF_RANGE` → inline field error: "Please enter an age between 3 and 120."
- `NO_ACTIVE_HUNT` → full-screen message: "No hunt is running right now. Check back soon!"

---

### P2 — Registration Confirmation

**Purpose:** Show the player their assigned level and lock it.

**Components:**
- Greeting: "Welcome, [Name]!"
- Summary card:
  - Age: [age]
  - Language: [language display name]
  - Difficulty level: **[Level Name]** (prominent)
- Notice: "Your difficulty level is set and cannot be changed." (small, muted text)
- "Start Hunt" CTA button

**On tap "Start Hunt":** Navigate to P3 (Clue 1).

---

### P3 — Current Clue

**Purpose:** Display the current clue and progression controls.

**Components (top to bottom):**

```
┌─────────────────────────────────┐
│  [Hunt Name]      Clue 3 of 12  │
├─────────────────────────────────┤
│                                 │
│   [Optional clue image]         │
│                                 │
│   Clue text displayed here      │
│   in large, readable type.      │
│                                 │
├─────────────────────────────────┤
│  [HINT 1: unlocks in 0:42]      │  ← disabled button with countdown
│  [HINT 2: unlocks in 2:42]      │  ← disabled button with countdown
├─────────────────────────────────┤
│                                 │
│         [ SCAN QR CODE ]        │  ← primary CTA
│                                 │
├─────────────────────────────────┤
│  Request Level Override         │  ← text button; visible until override used
└─────────────────────────────────┘
```

**Hint buttons:**
- Disabled and show countdown (`unlocks in mm:ss`) until threshold reached
- When unlocked, label changes to "Show Hint 1" / "Show Hint 2"
- On tap: hint text expands inline below the button (no modal); button changes to "Hide Hint 1"
- Hint 2 is independent — does not require Hint 1 to be viewed first

**Scan button:** Opens P4.

**"Request Level Override":** Opens P6. Hidden after override is used once.

---

### P4 — QR Scan Overlay

**Purpose:** Camera-based QR code scanning.

**Components:**
- Full-screen camera view
- Targeting reticle (visual guide for alignment)
- "Cancel" button (returns to P3)
- Status text below reticle: "Point at the QR code"

**On successful decode:**
- Camera freezes
- Calls `POST /api/runs/:runId/scan` with decoded token
- Handles response:

| Result | Action |
|---|---|
| `advanced` | Navigate to P3 (next clue) |
| `finished` | Navigate to P8 |
| `wrong_step` / `wrong_hunt` / `already_used` / `unrecognized` | Navigate to P5 with result |

---

### P5 — Scan Result Feedback

**Purpose:** Non-blocking feedback for unsuccessful scans.

**Components:**
- Icon (warning or info)
- Message text (from scan result)
- "Try Again" button (returns to P3)

**Messages:**

| result | Display message |
|---|---|
| `wrong_step` | "Not the right treasure for your current step. Keep looking!" |
| `wrong_hunt` | "This treasure belongs to another hunt." |
| `already_used` | "You've already found this one — keep going!" |
| `unrecognized` | "That QR wasn't recognized. Try scanning again." |

---

### P6 — Override Scan Mode

**Purpose:** Allow the admin to scan their credential QR on the player's device.

**Components:**
- Instruction text: "Ask the clue master to scan their credential QR here."
- Full-screen camera view with targeting reticle
- "Cancel" button (returns to P3; override not granted)

**On successful decode of admin credential:**
- Calls `POST /api/runs/:runId/override`
- On `overrideGranted: true` → navigate to P7
- On `INVALID_CREDENTIAL` → show toast: "Invalid credential. Please ask the clue master to try again." → remain on P6

---

### P7 — Level Select (Post-Override)

**Purpose:** Let the player pick a new difficulty level.

**Components:**
- Heading: "Choose your new difficulty level"
- Level list (all 6 levels; current level highlighted)
- "Confirm" CTA button

**On confirm:**
- Calls `PATCH /api/runs/:runId/level`
- On success → navigate to P3 (clue content refreshes for new level)

---

### P8 — Completion Screen

**Purpose:** Celebrate completion and show timing.

**Components:**
- Congratulations heading
- Total time: **mm:ss** (or hh:mm:ss)
- Hints used count
- "Claim Your Prize →" button (opens P9 / Final Treasure Page)
- "View Leaderboard" secondary link

---

### P9 — Final Treasure Page

**Purpose:** YouTube celebration video + prize instruction.

This is a standard web page (not a native screen), opened in the browser.

**Content:**
- Embedded YouTube player (autoplay if permissions allow)
- Message: *"Congratulations. You've reached the final treasure. Please see the clue master for your prize."*

---

### P10 — Leaderboards

**Purpose:** View fastest completion times.

**Components:**
- Tab bar: Today / This Month / All-Time
- Optional filters: Level, Language (if multiple options exist)
- Ranked list:
  - Rank, Name, Level, Time (mm:ss), Hints used
- Player's own run highlighted if present (based on stored runId)

---

## Admin Console

### Section Inventory

| Section | URL | Purpose |
|---|---|---|
| Hunts | `/admin/hunts` | Create and manage hunts |
| Clues | `/admin/hunts/:huntId/clues` | Author and order clues |
| QR Printing | `/admin/hunts/:huntId/qr` | Generate and print QR sheets |
| Players | `/admin/players` | View registered players |
| Runs | `/admin/runs` | View and manage run history |
| Leaderboards | `/admin/leaderboards` | View leaderboard data |
| Admin Credential | `/admin/credential` | Generate and rotate admin credential QR |
| Settings | `/admin/settings` | Configure age mapping, hint thresholds, etc. |

---

### A1 — Hunt List

- Table: name, status (active/inactive), clue count, created date
- "New Hunt" button → opens create form
- Row actions: Edit, Activate/Deactivate, Delete (blocked if active runs exist)

---

### A2 — Clue Editor

**Left panel:** Ordered list of clues (drag-to-reorder). Add clue button. Each row shows sequence number and first 60 chars of base text.

**Right panel (selected clue):**

```
Clue #3                             [ Mark as Final ]

Base Text
┌─────────────────────────────────────┐
│ Find the place where...             │
└─────────────────────────────────────┘
[ Upload Image ]

Level Variants
  Basic:          [ text area ]
  Elementary:     [ text area ]
  ...
  Adult:          [ text area ]
  [ ✨ Generate with AI ]

Hint 1
┌─────────────────────────────────────┐
│ Think about sunrise...              │
└─────────────────────────────────────┘
  [ Level-specific variants ]

Hint 2
┌─────────────────────────────────────┐
│ It's in the east-facing room.       │
└─────────────────────────────────────┘

Translations
  [ Translate All with AI ]
  Japanese: [ status: approved | pending review | missing ]
  French:   [ status: approved | pending review | missing ]
  ...
```

**AI Generation flow:**
1. Admin clicks "Generate with AI" or "Translate All with AI"
2. Spinner while async job runs
3. Results appear below with `pending review` badges
4. Admin reviews each → clicks "Approve" or edits and then approves
5. Approved content becomes visible to players

---

### A3 — QR Printing

- Grid of clue QR previews (thumbnail)
- Per-clue: color picker (foreground/background), contrast warning if low
- "Print All" generates a single PDF with all QR codes on a sheet
- "Print Single" per clue
- Admin credential QR shown separately with rotate action

---

### A4 — Admin Credential

- Shows whether an active credential exists (does not show the raw token)
- "Print Credential QR" → PDF (same format as clue QR print)
- "Rotate Credential" → confirmation dialog → old QR immediately invalid → new QR generated

---

### A5 — Settings

- Age → Level Mapping table (editable rows)
- Hint timing thresholds (Hint 1, Hint 2 in seconds)
- Run abandonment threshold (hours)
- Active hunt selector (if multiple-active-hunt mode enabled)
- Fallback language selector
