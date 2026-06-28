# Recurring mistakes — agent anti-patterns

A running ledger of violations we've actually hit, each written as a **rule** so no
future agent run repeats it. This is prevention, not bug-tracking: when you discover a
violation, the job isn't done when the instance is fixed — add (or update) the rule here.

**How to use**
- Before finishing any change, skim the entries for the area you touched.
- When you find a NEW recurring mistake, add an entry: the rule, why, and **how it's
  enforced**. Prefer a mechanical check (credo / biome / a test) — that's the only thing
  that *guarantees* it won't recur. Doc-only entries are the weakest rung; promote them to
  a check when feasible.
- One-off incomplete features (a screen not built yet) do NOT belong here — only mistakes
  that an agent could plausibly make *again*.

Severity of the rule isn't the point; recurrence is.

---

## Backend (Elixir)

### RM-001 — Ordering query builders must carry an id tie-break
`newest`/`oldest`/etc. must be `order_by: [desc: inserted_at, desc: id]` (see
`backend/AGENTS.md` §Query Builders). Without `:id`, offset/limit pagination is
non-deterministic on same-second timestamps. Hit in `Easy.Landing.Prospect.newest/1`.
**Enforced by:** review + this doc (credo doesn't catch it). Check every ordering builder.

### RM-002 — OpenApiSpex schema ↔ JSON view parity
The OpenApiSpex schema generates the FE types; the JSON view produces the actual response.
They are hand-maintained separately and drift (e.g. `FoodLogEntry` declared `meal_log_id`
but the view emits `nutrition_meal_log_id`; `fiber_g` returned but absent from the schema).
When you change a JSON view, change its OpenApiSpex schema in the same edit (and vice
versa), then `just gen-api`. **Enforced by:** review + this doc.

### RM-003 — Keep function nesting ≤ 2 (credo)
`Repo.transaction(fn -> case ... end)` and nested `with`/`if` trip credo's
nesting-depth check. Extract the inner branch into a named private helper. Hit in
`upsert_landing_page`, `enroll_prospect`, `Coach.update_profile`.
**Enforced by:** `mix credo` (run it on touched files — it's in `mix precommit`).

### RM-004 — OpenApiSpex spec is cached in the running dev server
Editing a schema while `phx.server` runs returns 422 "Unexpected field" on the new field —
the spec is built once at boot. Fully restart the server (not code-reload) after schema
edits. **Enforced by:** this doc / memory.

---

## Frontend

### RM-101 — No dead HeroUI v2 Tailwind tokens
`primary` / `divider` / `content1..4` / `foreground-NNN` are **dead no-ops** under
`@heroui/styles@3.x`. Use only `accent` / `border` / `surface` / `surface-hover` /
`muted` / `success` / `warning` / `danger` / `background`. **Enforced by:** grep both apps'
`src` for `(text|bg|border|divide)-(primary|divider|content[1-4]|foreground-[0-9]{2,3})`
before finishing — must be 0.

### RM-102 — Use the ROUTES constant, never a hardcoded path string
`navigate('/settings/client-profile-fields')` → `navigate(ROUTES.SETTINGS_PROFILE_FIELDS)`.
A literal silently rots into a dead link on any route rename. Hit in `client-profile.tsx`.
**Enforced by:** review + this doc.

### RM-103 — No orphan routes / no dead screens
Every route in `router.tsx` needs an inbound link (nav item or a `navigate()` from another
screen). When you add a screen, wire its entry point in the SAME change. Conversely, don't
delete an "unreachable" screen before checking it isn't the only surface for some field —
the plan-edit screens were the only place a plan's `description` could be edited.
**Enforced by:** review + this doc.

### RM-104 — Stable React keys for editable / reorderable lists
Never `key={index}` for a list whose rows can be added/removed/reordered — removing a middle
row misattributes inputs. Carry an ephemeral `key: crypto.randomUUID()` on each draft row,
separate from any persisted id (see the proof-points / fit-points editors).
**Enforced by:** biome `lint/suspicious/noArrayIndexKey`.

### RM-105 — Run biome + tsc before finishing FE work
`pnpm exec biome check --write <files>` and `pnpm --filter <app> exec tsc --noEmit`.
The trailing biome step in `just gen-api` errors on the generated file by design — that's
expected, not a regression. **Enforced by:** biome + tsc.

---

## Deploy / ops

### RM-201 — Deployable frontends need documented + guarded build-time env
Vite inlines `import.meta.env.VITE_API_BASE_URL` at BUILD time; an unset var on a deployed
(HTTPS) origin makes every request hit `localhost:4000` and fail silently. Each Vite app
ships a `.env.example`, and `api/base.ts` `console.error`s loudly when served from a
non-local origin with the var unset. Keep both when adding a new deployable FE.
**Enforced by:** the guard in `base.ts` (runtime) + `.env.example` (doc).

---

_Add new entries above their section's divider. Keep each to: the rule, the instance, and
how it's enforced._
