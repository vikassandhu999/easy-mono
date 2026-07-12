# CoachEasy Client App — Redesign Plan

> **How to use this doc (for humans and for Claude in any future conversation):**
> This file is the single source of truth for the redesign. It contains the design language,
> the full screen inventory from the production codebase (`clientapp-v2`, attach as local folder),
> and a phased checklist. Work top-to-bottom; check off items as they land in
> **`CoachEasy Prototype.dc.html`** (the interactive prototype — the design deliverable).
> When starting a new conversation: attach the `clientapp-v2` folder, open this file, and say
> which phase item to do next.

---

## 1. Goal

Revamp the entire CoachEasy **client app** (mobile-only, Capacitor: iOS/Android/PWA) from the
current **dark + periwinkle** implementation to the new **light premium** design language, as an
interactive prototype covering every screen and interaction in the real app. The prototype is the
spec for the eventual code migration.

## 2. Design language (locked — do not deviate)

Established in `CoachEasy Prototype.dc.html`. Lift values from there when in doubt.

- **Font:** Plus Jakarta Sans (400/500/600/700/800), tight letter-spacing on headings (−.01 to −.025em), `font-variant-numeric: tabular-nums` for all metrics.
- **Colors:**
  - Background `#f4f4f2` · Cards `#fff` · Inset/wells `#f6f7f9`, `#fafbfc`
  - Text `#12141a` · Secondary `#4b5563` · Muted `#767b85` · Faint `#9498a1` · Disabled `#b3b8c0`/`#c3c7ce`
  - Borders: hairline `#ececef` (cards), `#e2e4e8` (controls), `#e6e8ec` (inputs)
  - **Accent azure `#0485f7`** — used precisely (primary buttons, active states, progress, links). Tint `#eef4fb`, tint border `#d6e6fb`
  - Success green `#17a768` (bg `#eaf7f0`/`#eef7f1`, border `#b9e2cc`) — completion, Finish pill
  - Warning/destructive: red `#c0392b` (text-only on white)
- **Shape & depth:** radii 10–24px (cards 16–24, controls 10–13); shadows subtle & neutral only (e.g. `0 10px 24px -18px rgba(18,20,26,.28)`); active card = azure ring `0 0 0 1.5px #0485f7`. **No gradients, no colored glow shadows, no dark mode.**
- **Patterns:** sticky blurred header `rgba(244,244,242,.96)` + hairline; bottom sheets `#f4f4f2`, radius 28 top, drag handle; 44px+ hit targets; section labels 11px/800/`.12em` uppercase `#9498a1`; press feedback `transform: scale(.98)`.
- **Set logging = Hevy-style** (settled after iteration): every set row identical & editable (typed inputs, no steppers), per-row ✓ checkbox completes the set (row turns green), auto rest-timer card with ring + "+15s / Skip", no big Log button. Swap / Next actions below.

## 3. Screen inventory (from `clientapp-v2/src` — real app, real interactions)

Nav shell (`@components/app-shell.tsx`): bottom tab bar with **6 tabs — Training `/`, Nutrition, Progress, Check-ins, Coach (unread badge), Settings**. Full-screen routes hide the tab bar (`/workout`). Deep pages use their own back button. Global states: splash screen (staged: logo → spinner → retry), awaiting-seat blocker, profile-error retry.

| # | Screen | Route | Source | Key content & interactions |
|---|--------|-------|--------|---------------------------|
| 1 | Training home | `/` | `training/training-home.tsx` | Greeting + weekday; intake-form nudge card; check-in nudge card; **Today hero** (workout name, exercise count, ~min, Start) OR resume banner (active session, sets logged) OR rest-day OR "plan on the way" empty state; 7-day week strip (dots + names); History link row |
| 2 | Active workout | `/workout` | `workout/active-workout.tsx` (800 lines) | Full-screen, no tabs. Elapsed clock; continuous exercise list; per-set logging driven by `tracking_type` (weight/reps/time/distance — time has a hold-timer with Play/Pause); pre-filled from plan; Swap / Skip per exercise (library picker, `swapped_from`); **Add exercise** at list bottom; finish/discard confirm dialogs; soreness rating. *Code defers: rest timer, tap-to-type — our design already adds both.* |
| 3 | Workout history | `/history` | `history/workout-history.tsx` | Reverse-chron, grouped by month; rows: date · workout · duration · sets · volume · soreness; tap → detail |
| 4 | Session detail | `/history/:id` | `history/session-detail.tsx` | Plan-vs-actual per set: matched ✓ / beat ↑ / missed ↓ / skipped / added; coach note; read-only |
| 5 | Nutrition today | `/nutrition` | `nutrition/nutrition-today.tsx` | Date-navigable; **macro hero** (calorie ring + 3 macro bars, live); meal slots with items; tap item → **amount sheet** (portion input, live macro recompute, Log/Save/Replace/Not eaten); **food picker** (full-screen search, Foods/Recipes toggle, slot chooser); **option sheet** (swap slot's meal option); past days editable, future read-only |
| 6 | Nutrition history | `/nutrition/history` | `nutrition/nutrition-history.tsx` | Weekly adherence rings (on/under/over/no-log); recent-days list; tap day → Today at date |
| 7 | Progress | `/progress` | `progress/progress-home.tsx` | Current weight + SVG trend chart vs optional goal line; **log-weight sheet** (value + unit toggle, date, note); recent entries list |
| 8 | Check-ins list | `/check-ins` | `checkins/list-checkins.tsx` | Assignments with status chips (assigned/in-progress/completed/closed); tap → fill |
| 9 | Fill check-in | `/check-ins/:id` | `checkins/fill-checkin.tsx` | Back button; question-per-type fields (text/number/boolean/select/multi-select/date/**photo upload**); completed & closed states |
| 10 | Coach chat | `/messages` | `messages/coach-chat.tsx` | Real-time thread; day separators; bubbles (client vs coach); composer; unread badge on tab |
| 11 | Settings | `/settings` | `settings/settings.tsx` | Profile section (avatar initials, editable name rows); Coach section (contact, WhatsApp deep link); Account (email, logout) |
| 12 | Login | `/login` | `auth/login.tsx` | Email → OTP request |
| 13 | Verify login OTP | `/verify-login` | `auth/verify-login-otp.tsx` | OTP field, resend w/ 30s cooldown |
| 14 | Accept invite | `/invite/:token` | `auth/accept-invite.tsx` | Coach-prefilled email, editable ("Change it" preserves typed email) |
| 15 | Verify invite OTP | `/invite/:token/verify` | `auth/verify-invite-otp.tsx` | Same OTP pattern |
| 16 | Awaiting seat | (blocker) | `@components/awaiting-seat-screen.tsx` | Blocks all routes until coach activates seat |
| 17 | Splash | (fallback) | `@components/splash-screen.tsx` | Logo → +spinner (500ms) → retry (3s) |

## 4. Current prototype status

`CoachEasy Prototype.dc.html` already has (light premium, interactive): **Today home, Train, Eat, Progress, Coach tabs · View workout · Active workout (final Hevy-style logging + rest timer + finish sheet) · Check-in fill (partial)**.

Gaps vs the real app: prototype's tab set (Today/Train/Eat/Progress/Coach) ≠ real 6-tab nav (no Settings tab, no separate Check-ins tab, "Today" merges things); missing screens 3, 4, 6, 8, 11–17; missing interactions: swap/add exercise pickers, food picker & option sheet, tracking types beyond weight×reps, resume banner, empty/loading states.

## 5. Phased plan (check off as done)

### Phase 0 — Alignment (decide before building)
- [x] Decide nav model: **Decision (user, 12 Jul): Progress tab replaced by Check-ins tab** (Today/Train/Eat/Check-ins/Coach). Progress screen still exists in the file but has no entry point — needs a new home (e.g. link from Today or Check-ins).
- [x] Confirm prototype remains one file (`CoachEasy Prototype.dc.html`) with all screens — all screens are state-driven within the single DC.

### Phase 1 — Core training loop (mostly done)
- [x] Training home hero + week strip + Start
- [x] Active workout — Hevy-style set logging, rest timer, finish/discard sheet
- [x] Resume-banner state (active session on home) — minimize (chevron-down) on active workout; banner on Train, Resume button on Today card + week row
- [x] Tracking types: time (hold-timer) & distance set rows — active workout renders 4 row types by `tracking_type` (weight×reps, reps-only, duration w/ Play-Pause hold-timer +/− steppers, distance+duration)
- [x] Swap exercise → library picker (search list) — Swap button opens full-screen exercise picker (search + muscle·type rows); sets `swappedFrom`, shows "Swapped from" chip
- [x] Add exercise (list bottom) → same picker — dashed "Add exercise" button below list opens the same picker in add mode
- [x] Rest-day / no-plan empty states on home — Train tab only, via `trainState` tweak prop (default / rest-day / no-plan)

### Phase 2 — History
- [x] Workout history list (month groups, metric rows) — `history` screen, month-grouped rows (date · workout · duration · sets · volume + soreness emoji), reached via "View all history" on Train; tap → session detail.
- [x] Session detail (plan-vs-actual ✓/↑/↓, skipped, coach note) — reached from tappable Recent rows on Train; full month-grouped history list still open

### Phase 3 — Nutrition
- [x] Nutrition today: macro hero (bars) + meal slots + date nav — prev/next day working; past days read-only w/ adherence verdict (deviation: real app allows editing past days), future day read-only planned
- [x] Amount sheet (portion, live macros, Log/Save/Replace/Not eaten)
- [x] Food picker (full-screen search, Foods/Recipes, slot chooser)
- [x] Option sheet (swap meal option, confirm dialog when logs exist)
- [x] Nutrition history (last-7-days adherence dots + recent days list → tap opens that day)

### Phase 4 — Progress & check-ins
- [x] Progress home: weight chart (SVG line + goal), entries list — current/goal header, SVG trend line + dashed goal line, reverse-chron history rows
- [x] Log-weight sheet (value/unit/date/note) — bottom sheet w/ kg/lb toggle (converts), +/− stepper, Today/Yesterday, note; appends entry + success toast
- [x] Check-ins list (status chips) — own tab; pending (Due today / To do) on top, history below (Completed / Reviewed ✓ / Missed); weekly check-in moves to history after submit
- [x] Fill check-in: all field types incl. photo upload; completed/closed states — PARTIAL: weekly form (weight/energy/sleep/training/note) done; submitted check-ins viewable read-only (answers + coach note); photo upload + other field types still open

### Phase 5 — Coach & settings
- [x] Coach chat (bubbles, day separators, composer, unread badge) — own tab; day separators, client/coach bubbles, sticky composer (Enter to send), unread badge on tab
- [x] Settings (profile edit rows, coach card + WhatsApp/Call, membership status card, account/logout) — reached via avatar on Today (no Settings tab). NOTE: membership start/renew dates are design-only; API exposes only `status`, needs backend field.

### Phase 6 — Entry & edge states
- [x] Login + verify OTP — `login` (email) → `verifyLogin` (6-box OTP, auto-advance/backspace, masked email, Resend→toast). Reached via Settings → Log out.
- [x] Accept invite + verify OTP — `acceptInvite` (business/coach, email) → `verifyInvite` (OTP, 30s Resend cooldown, "Change it" → back to email). Verify → awaiting-seat. Reached via Login "Have an invitation link?".
- [x] Awaiting-seat blocker · splash · profile-error retry — `awaitingSeat` (Check again → seat activated → Today + toast; Log out), `splash` (staged logo → spinner → Retry), `profileError` (Try again spinner → Today). All selectable via `startScreen` tweak.
- [x] Loading skeletons/spinners + toasts styled to system — tab switches show `tabLoading` skeleton; toast component (dark pill, success/danger) wired to resend + seat-activated + weight-logged

### Phase 7 — Handoff
- [x] Sweep: consistency pass against §2 across all screens — Today/Train/active workout/picker/Coach verified against §2 (ink focal card, precise azure, hairline cards, Plus Jakarta, tabular nums); on-system
- [x] Update `HANDOFF.md` → token map + per-screen change notes for the code migration — rewritten: old→new token table, nav model, per-screen → `src/*` notes, deviations, tweak props

## 6. Working agreement

- All new screens go **into the existing prototype** as navigable screens (state-driven), not separate files.
- Real data shapes from `clientapp-v2/src/api/*` guide content (e.g. `tracking_type`, `plan_items`, assignment statuses) — don't invent features the app doesn't have.
- Small iterations over rewrites; verify interactively after each screen.
