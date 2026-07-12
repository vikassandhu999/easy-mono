# CoachEasy Client App Redesign — Handoff

Deliverable: **`CoachEasy Prototype.dc.html`** — one interactive prototype, every screen state-driven
in a single `Component` logic class. This is the spec for migrating `clientapp-v2` (React + HeroUI v3
+ Tailwind v4 + Lucide, Capacitor, mobile-only) from the old dark+periwinkle UI to **light premium**.

See `REDESIGN-PLAN.md` for the phased checklist and screen inventory. This file is the **design-token
map + per-screen change notes** for engineering.

---

## Token map (old dark → new light)

Define these as Tailwind theme tokens / CSS vars; the prototype hardcodes the hex values inline.

| Role | Token (suggested) | Value |
|---|---|---|
| Page background | `--bg` | `#f4f4f2` |
| Card surface | `--surface` | `#fff` |
| Inset / well | `--surface-inset` | `#f6f7f9` (also `#fafbfc`, `#f0f4f9`) |
| Focal dark card | `--ink-card` | `#121419` |
| Text primary | `--fg` | `#12141a` |
| Text secondary | `--fg-2` | `#4b5563` |
| Text muted | `--fg-muted` | `#767b85` |
| Text faint | `--fg-faint` | `#9498a1` |
| Text disabled | `--fg-disabled` | `#b3b8c0` / `#c3c7ce` |
| Card border (hairline) | `--border` | `#ececef` |
| Divider (in-card) | `--border-soft` | `#f0f0ee` / `#e6e7e4` |
| Control border | `--border-control` | `#e2e4e8` |
| Input border | `--border-input` | `#e6e8ec` |
| **Accent** | `--accent` | `#0485f7` |
| Accent tint bg | `--accent-tint` | `#eef4fb` |
| Accent tint border | `--accent-tint-border` | `#d6e6fb` |
| Success | `--success` | `#17a768` (dark text `#127c4e`) |
| Success tint | `--success-tint` | `#eaf7f0` / `#eef7f1`, border `#b9e2cc` |
| Destructive (text) | `--danger` | `#c0392b` |

- **Font:** Plus Jakarta Sans 400/500/600/700/800. Headings letter-spacing −.01 to −.025em.
  All metrics use `font-variant-numeric: tabular-nums`; big numbers are weight 800.
- **Radii:** cards 16–24px, controls 10–13px, sheets 28px (top corners only), pills 999px.
- **Shadow:** subtle neutral only, e.g. `0 10px 24px -18px rgba(18,20,26,.28)`. Active/focal card =
  azure ring `0 0 0 1.5px #0485f7`. **No gradients, no colored glow, no dark mode.**
- **Patterns:** sticky blurred header `rgba(244,244,242,.96)` + hairline; bottom sheets over
  `rgba(8,8,11,.5)` scrim; 44px+ hit targets; section labels 11px/800/.12em uppercase `#9498a1`;
  press feedback `transform: scale(.98)`. Focus ring on inputs `0 0 0 3px rgba(4,133,247,.14)`.
- **Rule:** one focal action per screen gets the big/dark button; everything else stays quiet.

## Nav model (decided)
Bottom tab bar **5 tabs: Today · Train · Eat · Check-ins · Coach** (Coach has unread badge).
Settings lives behind the Today header avatar. Progress screen exists but currently has **no tab
entry** — needs a home (link from Today or Check-ins) before code migration. Full-screen routes
(active workout, pickers) cover the tab bar.

## Per-screen notes (map to `clientapp-v2/src/*`)

- **Today** (`training/training-home.tsx`) — greeting + avatar→Settings; check-in-due ink hero (#1
  focal, only when `checkinDue`) or "check-in sent" confirmation; Today's-plan workout peer card with
  Start/Resume/Done state; This-week inline stats; Coach slim row. Resume banner when a session is active.
- **Train** (`training/training-home.tsx`) — current-plan card (block · week x/n), full weekly list
  (today = azure date-pill + accent bar + View/Start; other days View; rest muted), Recent history →
  session detail. `trainState` drives default / rest-day / no-plan empty states.
- **Active workout** (`workout/active-workout.tsx`) — full-screen, minimizable (chevron). Sticky header
  (elapsed clock + progress bar + Finish). Rest-timer card (ring, +15s/Skip). Focal current-exercise
  card renders **4 row types by `tracking_type`**: `weight,reps` · `reps` · `duration` (Play/Pause
  hold-timer + steppers) · `distance,duration`. Per-row ✓ completes (row turns green). Swap / Next +
  **Add exercise** open the full-screen exercise picker (search, muscle·type rows; swap sets
  `swapped_from` and shows a chip). Up-next / Completed lists. Finish sheet with soreness rating.
- **Workout history** (`history/workout-history.tsx`) — month-grouped rows (date · workout · duration ·
  sets · volume · soreness emoji) → session detail.
- **Session detail** (`history/session-detail.tsx`) — read-only plan-vs-actual per set (✓/↑/↓/skipped/
  added) + coach note.
- **Eat** (`nutrition/nutrition-today.tsx`) — date-navigable; macro hero (calorie + 3 macro bars, live);
  meal slots with items; item→amount sheet (portion, live recompute, Log/Save/Replace/Not eaten); food
  picker (full-screen search, Foods/Recipes, slot chooser); option sheet (swap meal option, confirm when
  logged). Past days show adherence verdict (see deviation below); future days read-only.
- **Nutrition history** (`nutrition/nutrition-history.tsx`) — last-7-days adherence dots + recent-days
  list → opens that day.
- **Progress** (`progress/progress-home.tsx`) — current/goal header, SVG trend line + dashed goal line,
  reverse-chron history rows; **log-weight sheet** (kg/lb toggle w/ conversion, +/− stepper,
  Today/Yesterday, note) appends entry + success toast.
- **Check-ins** (`checkins/list-checkins.tsx` + `fill-checkin.tsx`) — own tab; pending on top (Due
  today / To do), history below (Completed / Reviewed ✓ / Missed). Fill = weekly form (weight/energy/
  sleep/training/note + progress-photo slots); submitted check-ins viewable read-only with coach note.
- **Coach chat** (`messages/coach-chat.tsx`) — day separators, client/coach bubbles, sticky composer
  (Enter to send), online dot; unread badge on tab.
- **Settings** (`settings/settings.tsx`) — profile edit rows, coach card (WhatsApp/Call), membership
  status card, account/logout → returns to Login.
- **Auth & blockers** — Login (email) → verify OTP (6-box, auto-advance, resend); Accept invite →
  verify (30s resend cooldown, "Change it"); awaiting-seat blocker; splash (staged logo→spinner→retry);
  profile-error retry. Selectable via `startScreen` tweak prop.

## Loading / feedback
- Tab switches show a `tabLoading` skeleton before content paints.
- Toast component (dark pill, success/danger) wired to: OTP resend, seat-activated, weight-logged.

## Deviations from the real app (confirm with backend before migration)
- **Eat past days:** prototype shows past days read-only with an adherence verdict; the real app allows
  editing past days. Decide which is intended.
- **Membership card:** start/renew dates are design-only — the API exposes only `status`. Needs a
  backend field or drop the dates.
- **Progress entry point:** no tab; needs a home surfaced from Today or Check-ins.
- Rest timer and tap-to-type set entry are added by this design; the current code defers both.

## Tweak props (prototype state, in `data-props`)
`clientName`, `coachName`, `checkinDue`, `startScreen` (today/train/eat/checkins/coach/splash/login/
accept-invite/awaiting-seat/profile-error), `trainState` (default/rest-day/no-plan).
