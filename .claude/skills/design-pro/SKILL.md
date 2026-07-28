---
name: design-pro
description: Use for ANY visual/design work on the React apps - porting a design-handoff *.dc.html screen, fixing a screen that looks off, changing the theme, adding a component variant, or hunting visual inconsistency. Triggers - /port-screen, "port this screen", "match the design", "the design looks off", "make X consistent", theme/index.css changes.
---

# design-pro — consistency by design, not by discipline

**Doctrine: per-page variation is an artefact, not intent.** When two screens
render the same thing differently, the difference is presumed to be an accident
of two build sessions — it needs justification to KEEP, not to remove. The goal
of every task under this skill is a system where the inconsistency *cannot be
written*, in this order of strength:

1. **Construction** — the mechanism makes the mistake impossible (sizes live in
   `type-*`, a namespace tailwind-merge has no group for, so a colour can never
   eat a size; selection variants set the block's custom properties, so a call
   site has nothing to re-assemble).
2. **Gate** — a mechanical check fails the commit (`check-ui-contract.sh`,
   `check-theme-selectors.sh`, `check-rm.sh`). Every closed rule gets one.
3. **Convention** — prose in a doc. Weakest; use only while graduating to 1 or 2.

If your fix relies on future agents *remembering* something, it is not done.

**The theme wins.** Where a design file disagrees with the theme, the THEME
value is the target and the prototype's px is an input (UI-CONTRACT §3). The
theme is the system, not a transcription of any prototype. It covers the scale
*and* the rules built on it — one control height, the field height, the
selection registers, `--tracking-eyebrow`, the radius steps.

The design still decides structure, layout, copy, iconography, and which
register a screen uses. A register the theme has no rule for is a STOP-and-ask.

Never resolve a conflict at a call site. Writing the design's value into a
className does not remove the disagreement, it hides it across N call sites. If
the theme is genuinely wrong, change the theme, in its own commit.

## Where a design decision lives — the ladder

Every visual decision has exactly one home. Top rung that fits:

1. **Structural / applies to every instance** → a theme rule in `index.css`,
   inside `@layer components`. Layering is not optional: HeroUI's own styles
   arrive as `layer(components)` and Tailwind utilities as `layer(utilities)`,
   so a pin in `@layer components` sits between them — it overrides the vendor
   default AND stays overridable by a call-site utility. An **unlayered** rule
   beats every layer and makes the property dead at every call site.
2. **A genuine variant** (the same component, a second intended look) → a BEM
   modifier class following HeroUI's own convention: `.block--name` sets the
   block's custom properties (`.toggle-button--ink` sets
   `--toggle-button-bg-selected` etc.), plain declarations only for axes the
   vendor doesn't tokenise. NEVER on the base class (a `ToggleButton` is also
   an icon toggle), NEVER re-assembled as a class string at call sites — five
   hand-assembled copies of one pill drifted on three separate axes (RM-136).
3. **Genuinely this-screen-only** → a call-site utility using an **existing**
   token from the closed scale. Snap to the nearest step (±2px); never a px
   literal, never an arbitrary value.
4. **Nothing in the scale fits** → **STOP.** Propose the token; the user lands
   it in its own commit. The scale is closed (`check-ui-contract.sh` enforces):
   per-screen tokens grew the theme 81 → 164 before this fence existed (RM-132).

A register is stated **once**: "selected is ink" is one theme block that every
selection variant shares — if a second place restates it, the two will drift.

## Two modes

**Port mode** (§0–§6 below): a dc.html screen → React, converging to zero
drift. The prototype is a **spec, not source** — never copy its markup,
classes, or `var(--*)`. Even the prototype duplicates its own objects
(`.pill` vs `.daytab`, byte-identical); the port defines the object once.

**Seam mode** (when the ask is "make X consistent" / "fix the theme"): close
one axis of inconsistency app-wide.
1. **Pick ONE seam** — type size, radius, control height, a selection register,
   colour usage, an eyebrow/label treatment. One per pass.
2. **Census mechanically, not by memory** — a small script/grep over `src/`
   listing every call site with its current value. The census IS the evidence;
   17 of 34 radius call sites "knowing" the value proved the default was never
   pinned.
3. **Collapse**: state the rule once in the theme (rung 1), name real variants
   (rung 2), then **delete the now-redundant call-site classes in the same
   change** — a surviving duplicate is the seed of the next drift.
4. **Gate it** (`check-rm.sh` / `check-ui-contract.sh` / `check-theme-selectors.sh`)
   so the seam cannot reopen. A seam without a gate will be re-opened by the
   next session that never read this file.
5. **Verify the EFFECT, not the edit** — see Verification.

## Verification — the edit landing is not the edit working

Theme rules fail **silently**; nothing builds red. Every theme change is
verified against a live node, both halves:

- **Selector half**: does it match anything?
  `document.querySelectorAll(sel).length` — HeroUI names are BEM-ish
  (`block__element`), and the natural-reading hyphenated guess
  (`.search-field-group`) matches nothing (RM-133).
- **Value half**: does it resolve? `var(--x)` with no fallback invalidates the
  whole declaration at computed-value time — the property silently inherits,
  which looks exactly like "the rule doesn't apply" (RM-135). Renames must
  grep `var(--old-name)` too, not just utilities.
- **Read the computed value** off the real node (`getComputedStyle`) and
  confirm it changed to the intended value. Then check the call sites you did
  NOT edit — a new default changes every page, including the ones that were
  already correct by accident.

`check-theme-selectors.sh` gates both halves mechanically; the live read is
still required because it also catches the *wrong-but-existing* selector.

## 0. Preconditions — fail fast, in order

1. App running on `http://localhost:2021`; `chrome-devtools-axi pages` responds;
   reuse the authenticated tab, never clear storage.

## 1. Read — in this order

0. **The scale — your closed vocabulary.** `grep -E '^\s*--(type|radius)-'
   frontend/apps/coachapp-v2/src/index.css`. These are the ONLY sizes and radii
   you may use. It is a fence, not a starting point (ladder rung 4). Know the
   list before you map, so the manifest targets real tokens instead of
   prototype pixel values.
1. `design-handoff/UI-CONTRACT.md` — the component fence (§2), tokens (§3),
   prohibitions (§1), DoD (§6).
2. The screen's handoff doc: badge row in UI-CONTRACT §8 (Dashboard file) or
   `design-handoff/CLIENT-DETAIL.md` (Client Detail file) — names the exact
   codebase files and the `data-ref`/flag index.
3. `frontend/apps/coachapp-v2/AGENTS.md` (Canonical Components, Page Anatomy,
   Choosing Containers — wins over the contract on overlap).
4. `design-handoff/RECIPES.md`, `COPY.md` § screen (verbatim strings),
   `INTERACTIONS.md` § screen.
5. `design-handoff/refs/*.png` for the screen — actually look at them (Read tool).
6. `field-notes.md` (this skill dir) — gotchas that override the docs.

## 2. State inventory — counters missed states

Follow `find-state.md` (this skill dir): enumerate every state × breakpoint from
the file's logic class, `sc-if` flags, and preview switcher; open the dc.html
live and record the click recipe that reaches each state. Output: a state
checklist. A state you can't reach or that the handoff doc doesn't mention →
ask the user; never silently drop it.

## 3. Mapping manifest — counters premature coding & improvisation

Write `design-handoff/manifests/<ID>.json` (shape documented at the top of
`style-diff.mjs`) plus a short mapping table in the ticket: for every visual
node — design selector → UI-CONTRACT §2 component/wrapper → copy → interaction.

- No §2 mapping for a node → check `design-handoff/GAPS.md`; not listed → STOP
  and ask. Never improvise a component or hand-style a div.
- **HARD GATE: no implementation code until the manifest covers every node of
  every state on the checklist.** "I'll map as I build" is the failure mode
  that produces designs that are *just different* — it is not allowed.

## 4. Implement — from the manifest only

§2 components, app wrappers before raw HeroUI. Zero `style={{}}`, hex, px/rem
literals, numbered scales. `onPress` not `onClick`; `aria-label` on icon-only
buttons; responsive overlays (`Popover` desktop / `KeyboardSheet` mobile,
`AlertDialog` confirms). All loading (`ListSkeleton`/`PageSkeleton`), empty,
error states — the prototype never shows these; UI-CONTRACT §6 defines them.
Data through existing React Query hooks; never `useEffect` fetching.

Watch for these fossils in your own diff before finishing:
- a responsive pair with the same token both sides (`type-x … sm:type-x`) is a
  missing step or a leftover, never a style (RM-138; gated);
- a theme-neutraliser (`h-auto min-h-0`, `rounded-none` on a control) means the
  element is NOT that component's tier — use the theme's release modifier
  (e.g. `.button--row`) or the right component, never fight the theme;
- an arbitrary colour property — colour is a `text-*` token, always (RM-137;
  gated).

## 5. Convergence loop — the verdict

The verdict on fidelity is **`design-handoff/scripts/style-diff.mjs`** — a
deterministic computed-style comparison between the live-rendered dc.html and
the running app, per mapped node, per state. Eyeballing screenshots explores;
it never decides pass/fail.

```
cd frontend/apps/coachapp-v2   # playwright resolves from here
APP_TOKEN=$(npx -y chrome-devtools-axi eval "localStorage.getItem('coachapp.accessToken')" \
  | sed -n 's/^result: "\(.*\)"$/\1/p' | sed 's/\\"//g' | tr -d '\n') \
node ../../../design-handoff/scripts/style-diff.mjs \
  ../../../design-handoff/manifests/<ID>.json          # [--state x] [--width y] [--json]
```

Access tokens live ~5 min — grab a fresh APP_TOKEN right before every run
(reload the app tab first if it's been idle).

For EVERY reported diff, place the fix with the ladder (§Where a design
decision lives). Additionally:

- **Design wrong/impossible** → flag the conflict in the ticket (key format
  `` `ID:state:pair:prop` ``). The theme wins on conflict; the user decides,
  never you.

Re-run until the script prints PASS for every state at both widths. `MISSING
NODE` findings are structure drift — fix the DOM or the manifest selector,
whichever is wrong. Then ONE screenshot-vs-ref pass (both widths, viewport
emulation per field-notes) for what computed styles can't see: layout structure,
layering, iconography, hover/focus states. Fixed-point: a fresh comparison names
zero differences.

## 6. Gates — all must pass

```
./scripts/check-ui-contract.sh && (cd frontend && pnpm lint) && ./scripts/check-rm.sh
```

(`pnpm lint` runs `check-theme-selectors.sh`.) Then UI-CONTRACT §6 DoD
line-by-line, copy verbatim vs COPY.md. PR/commit body carries: the state
checklist (each row PASS), final screenshots, and any flagged design conflicts.

## Red flags — STOP, you are rationalizing

| Thought | Reality |
|---|---|
| "Close enough, the diff is tiny" | The script decides, not you. Fix it or flag the conflict in the ticket. |
| "I'll raise EPS / trim the allowlist" | Forbidden. That's deleting the test because it fails. |
| "I'll register an `@theme` token for this exact value" | The scale is closed. Snap to the nearest token, or STOP and propose it. Per-screen tokens are what grew the theme 81 → 164. |
| "It's not a px literal, so it's fine" | The ban is on per-screen pixel values, not on the characters `[14px]`. A one-off token is the same value wearing a name. |
| "I'll accept the deviation myself" | Design↔theme conflicts are user decisions. Flag in the ticket. |
| "I'll start coding, mapping as I go" | Phase-3 gate exists because this produced different designs. |
| "This state is unreachable/edge-case" | Ask the user. Silent drops are missed states. |
| "No §2 component fits, I'll style a div" | GAPS.md or stop-and-ask. The fence is the point. |
| "The design says 42px, so I'll write 42px here" | The theme wins. Snap to it. A call-site value hides the conflict, it does not settle it. |
| "This row needs `h-auto` to escape the control height" | Then it is not a control. Use the theme's release modifier — never neutralise the theme at a call site. |
| "The other four call sites already write it this way" | Then you found a seam, not a precedent. Name the variant once; delete the copies. |
| "The edit is in the file, done" | A theme rule fails silently on either half. Verify the computed value on a live node. |
| "I'll add the rule as a note in the doc" | Convention is the weakest rung. If it can be a gate, it becomes a gate in the same change. |
| "This page wants its own smaller heading" | Per-page variation is an artefact. Justify keeping the difference, or collapse it. |

If you hit a NEW recurring mistake: fix it, then add it to `field-notes.md` and
`docs/agents/recurring-mistakes.md` (Log & prevent — the instance is not enough).
