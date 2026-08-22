# Frontend structure, from first principles

Status: proposed

## What is actually wrong

Not the code. The files I read are well-written and well-commented. What is wrong
is **placement**: 50 directories hold 325 files in coachapp, and 22 of those
directories are `components/`, `lib/`, or `*-form/` buckets whose only meaning is
"more of this feature". The tree records the order things were built, not what they
are.

Measured, not guessed:

| Symptom | Evidence |
| --- | --- |
| Dead code shipped | 4 prototype files unreachable (2 225 L); `api/chat-message.ts` unreachable (49 L); a 5th prototype (394 L) is wired into `router.tsx` behind a route constant |
| Bucket folders | `clients/` alone has 6 competing sub-idioms: `client-screen/`, `components/`, `lib/`, `workbench/`, `clients-list/` (1 file), `client-invite-form/` (2 files) |
| `components/` ≡ `client-screen/` | 11 of 13 files in `clients/components/` are imported only by `clients/client-screen/*`. Two names, one thing |
| Shared UI outside the shared folder | `builder-kit/` is imported by 8 features **including `@components/`** — it is shared UI wearing a feature's clothes |
| Dependency arrows point up | `@components/app-shell.tsx` → `clients/lib/workbench-queues.ts`; `@components/library-usage.tsx` → `foods/lib/library-impact.ts`; `@components/plan-period-card.tsx` → `clients/lib/plan-coverage.ts` |
| Neutral bucket at the root | `src/lib/razorpay.ts` — one file, in the exact folder both AGENTS.md files forbid |
| `api/` is one-file-per-PR | 8 `training-*` files, 5 `nutrition-*` files; four of them are 15–28 lines |
| Same function, three homes | `moveId` in `api/nutrition-menu.ts` **and** `training-plans/builder/plan-tree.ts`; `moveInList` in `checkin-builder.tsx`. `memberName` in `settings/team.tsx` and `clients/client-invite-form/invite-client-form.tsx` |
| Logic locked inside JSX | `answerSummary`, `periodSummary`, `formatPeriodValue`, `summarize`, `conversationName` live in 400–700-line `.tsx` files with no `.check.ts` reachable |
| Duplicated across apps | `api-error.ts`, `socket.ts`, `token-refresh.ts`, `query-client.ts`, `use-go-back.ts`, `use-channel-event.ts` are **byte-identical** in both apps (~190 L) |

clientapp-v2 is healthy by comparison — 82 files, 20 dirs, zero dead files. It gets
the same rules for consistency, but only phases 2 and 5 do real work there.

## What we would have built on day one

A router-driven SPA has exactly three axes. Everything else is accident.

1. **The route surface** — what the user can navigate to. This is the product skeleton.
2. **The server contract** — generated types plus hand-written hooks.
3. **Feature-agnostic UI** — components that know React and design tokens, nothing else.

So: **three kinds of directory, no fourth.**

```
src/
  main.tsx  router.tsx  routes.ts  app-shell.tsx  pwa.ts  index.css
  api/          the server contract — flat, one file per backend resource
  ui/           feature-agnostic components and hooks — flat
  <feature>/    one folder per route group; nests only when the child
                is itself a route group
```

No `components/`. No `lib/`. No `utils/`. No `@`-sigils. A file inside a feature
folder *is* that feature; you tell files apart by their **name**, not by burying
them one level deeper under a generic noun.

### The dependency rule, stated once

> **Arrows point one way: feature → ui → api.**
>
> - `ui/` imports `api/`, `@easy/utils`, and nothing else. Never a feature.
> - A feature imports `ui/`, `api/`, and other features' **`.ts` files only**.
> - `.tsx` inside a feature is private, always. Shared UI moves to `ui/`.
> - `app-shell.tsx` and `router.tsx` are the composition root and may import anything.

This replaces the current prose rule ("a feature's `lib/` is its public surface")
with the same guarantee carried by the **file extension** instead of a folder. That
is what makes it mechanical — and it pushes logic out of `.tsx`, which is exactly
the testability goal: if another feature needs it, it must be pure `.ts`, and pure
`.ts` gets a sibling `.check.ts`.

### Target tree — coachapp

```
src/
  main.tsx  router.tsx  routes.ts  app-shell.tsx  pwa.ts  index.css
  api/                     ~18 files   (was 30)
  ui/                      ~40 files   (@components + @hooks + builder-kit, minus
                                        the 9 that are library-domain)
  auth/                     7
  dashboard/                7
  clients/                 ~24   client detail, edit, invite, session detail
  workbench/               ~16   lifted out of clients/ — the /clients triage surface
  messages/                 7
  settings/                 8    + razorpay.ts
  landing/                  1
  library/                 ~10   library.tsx + browse-screen + library-* + plan-*
    exercises/              8
    foods/                 11
    recipes/               10
    checkins/              14
    nutrition-plans/        6  +  builder/  ~22
    training-plans/         6  +  builder/  ~18
```

Top level now reads as the nav bar. `library/` nests because the routes already say
`/library/foods`, `/library/recipes`, … — and because it gives the 9 shared-within-
library components (`browse-screen`, `library-media-field`, `library-usage`,
`library-delete-dialog`, `macro-breakdown-card`, `multi-select-autocomplete`,
`plan-actions-menu`, `plan-add-to-client`, `plan-period-card`) an honest home
instead of diluting `ui/`. That is what makes "`ui/` never imports a feature" true
rather than aspirational.

`workbench/` is a sibling, not a child of `clients/`: it is a triage queue with its
own 4 logic modules and its own API resource. It happens to answer `/clients`.

### Directories: 50 → ~19 (coachapp), 20 → ~10 (clientapp)

## Plan

Seven phases. Each is independently shippable and ends green on
`pnpm -C apps/<app> build && check && lint`.

### 1 — Delete what nothing reaches
- `clients/prototypes/` (5 files, 2 619 L) and its route constant + router entry.
- `api/chat-message.ts` + `chat-message.check.ts`.

**Needs a decision:** `required-services-prototype.tsx` is behind a live route
(`/clients/prototypes/required-services`). Deleting it removes a reachable URL.
Confirm before I remove it, or say "keep" and it moves to `clients/`.

### 2 — Flatten the buckets (mechanical; no logic changes)
Pure `git mv` + import rewrite, one app at a time.

- `@components/` + `@hooks/` + `builder-kit/` → `ui/`; `@hoc/` guards inlined into
  `router.tsx` (41 L, two files, one caller each); `@config/routes.ts` → `src/routes.ts`.
- Every feature's `components/`, `lib/`, `*-form/` folder → flat into the feature,
  renamed to say what it is (`clients/components/section-card.tsx` →
  `clients/client-section-card.tsx`).
- `clients/client-screen/*` → `clients/*`; `clients/clients-list/` and
  `clients/client-invite-form/` dissolve.
- `nutrition-plans/builder/components/*` → `nutrition-plans/builder/*`; same for training.
- `src/lib/razorpay.ts` → `settings/razorpay.ts`.
- Same treatment in clientapp (`@components`→`ui`, 5 `components/` folders flattened).

Merge the file pairs that only exist because of the bucket split — the
control/content pairs (`intake-assign-control` 28 L + `intake-assign-content`
153 L; `plan-assign-control` 46 L + `plan-assign-content` 277 L), `auth-footer`
(8 L) into `auth-layout`. **~15 files gone.**

### 3 — Re-home the misplaced
- `clients/workbench/*` + `clients/workbench-*.ts` (4 logic modules, 3 with checks) → `workbench/`.
- Nest `exercises/ foods/ recipes/ checkins/ nutrition-plans/ training-plans/` under `library/`.
- The 9 library-domain components move from `ui/` → `library/`.
- Fix the three upward arrows: `app-shell.tsx` leaves `ui/` for `src/` (it is the
  composition root); `plan-coverage.ts` (3 lines, one exported function) folds into
  its two plan-builder callers or `library/plan-period-card.tsx`.

After this, `ui/` provably imports no feature — grep-checkable.

### 4 — Collapse `api/` (30 → ~18)
One file per backend resource, as the contract already says:
- `training-plans.ts` ← list + builder + lifecycle + requests
- `training-sessions.ts` ← session-history + prescription + prescription-mapper
- `nutrition-plans.ts` ← list + builder + lifecycle
- `nutrition.ts` ← foods + menu
- `workbench.ts` ← + workbench-targets
- `errors.ts` ← api-error + seat-limit-error + the error half of `shared.ts`

`schema.ts` and `keys.ts` untouched. `.check.ts` files merge alongside their subject.

### 5 — Pull the logic out of the JSX
This is the testability half of the ask. Targeted, not a sweep — the files that
actually hold derived logic:

| From | Extract to |
| --- | --- |
| `checkin-builder.tsx` (733 L) — `summarize`, `moveInList`, `pluralize` | `checkins/checkin-draft.ts` + `.check.ts` |
| `client-access-strip.tsx` (640 L) — `periodSummary`, `formatPeriodValue`, `EXTEND_PRESETS` | `clients/client-access.ts` + `.check.ts` |
| `overview-tab.tsx` (515 L) — `answerSummary`, `weightTrend` usage | `clients/client-overview-data.ts` + `.check.ts` |
| `replies-view.tsx` (427 L) — `conversationName` | `workbench/replies-data.ts` + `.check.ts` |
| `settings/team.tsx` (564 L) — `memberName`, `STATUS_LABEL/COLOR` | `settings/team-presentation.ts` + `.check.ts` |
| clientapp `active-workout.tsx` (859 L), `nutrition-today.tsx` (578 L) | extend the existing `workout/session-utils.ts` / `nutrition/nutrition-utils.ts` |

Fold the three `moveId`/`moveInList` copies into one `moveId` in `@easy/utils`
(it is product-agnostic — exactly what that package is for).

### 6 — Stop duplicating across the two apps
Six byte-identical modules (~190 L) → `@easy/utils`:
`api-error.ts`, `query-client.ts`, `use-go-back.ts` move as-is (zero app imports).
`authStorage.ts` / `token-refresh.ts` / `socket.ts` / `use-channel-event.ts` form a
chain that differs only by the localStorage key prefix — one `createAuthStorage(prefix)`
and the chain moves too. Lowest value, highest coordination cost; last on purpose,
and droppable.

### 7 — Make the shape self-enforcing
Without this, phase 2 is undone by the next agent. Add to `just check-rm`:

- **R1** no directory named `components` / `lib` / `utils` / `helpers` / `domain` under `src/`
- **R2** no file under `ui/` imports `@/<feature>/…`
- **R3** cross-feature imports resolve to `.ts`, never `.tsx`
- **R4** no `@`-prefixed directory
- **R5** a feature `.ts` exporting a function has a sibling `.check.ts` (warn)

Then rewrite the **Source Layout** section of `frontend/AGENTS.md`,
`apps/coachapp-v2/AGENTS.md`, and `apps/clientapp-v2/AGENTS.md` to state the
three-directory rule and the arrow rule, and delete the superseded RM-144 prose.

## What this is not

- **No unifying the two plan builders.** `nutrition-plans/builder/` and
  `training-plans/builder/` are shaped alike but the domains are genuinely
  different (day patterns + meal slots vs. workouts + prescriptions). I read both
  `plan-tree.ts`, both `schedule.ts`, both `use-plan-builder.ts`: an abstraction
  over them would be a parameterised nothing. They stay separate.
- **No new dependencies, no barrels, no index re-exports.** Direct `@/…` imports stay.
- **No behavior changes.** Phases 1–4 and 6 are moves. Phase 5 moves functions and
  adds tests for them. Nothing renders differently.

## Order and cost

| Phase | Risk | Value |
| --- | --- | --- |
| 1 delete | none | 2 700 L, one fake route |
| 2 flatten | low (mechanical, compiler-checked) | 22 dirs, ~15 files |
| 3 re-home | low | the dependency direction becomes true |
| 4 api merge | low, wide diff | 12 files |
| 5 extract logic | medium (real edits) | the testability ask |
| 6 cross-app | medium (touches auth) | ~190 L, droppable |
| 7 enforce | none | it stays fixed |

Phases 1–3 are the ones that change how the tree reads. 7 is what keeps it that way.
