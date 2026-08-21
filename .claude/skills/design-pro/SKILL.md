---
name: design-pro
description: Use for ANY visual/design work on the React apps - a screen that looks off, theme/index.css changes, a component variant, or app-wide inconsistency ("make X consistent").
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

**The theme wins.** The theme (`frontend/apps/coachapp-v2/src/index.css`) is
the system every screen is measured against — UI-CONTRACT §3 is the
authoritative statement. If the theme is genuinely wrong, change the theme, in
its own commit; a divergent value at a call site hides the disagreement, it
never settles it.

## Read first

1. `frontend/apps/coachapp-v2/UI-CONTRACT.md` — the component fence (§2),
   tokens (§3), prohibitions (§1), DoD (§5).
2. `frontend/apps/coachapp-v2/AGENTS.md` (Canonical Components, Page Anatomy,
   Choosing Containers — wins over the contract on overlap).
3. `field-notes.md` (this skill dir) — HeroUI/theme gotchas that override docs.
4. The scale: `grep -E '^\s*--(type|radius)-' frontend/apps/coachapp-v2/src/index.css`.
   These are the ONLY sizes and radii you may use — a fence, not a starting point.

The app itself is the primary reference for every pattern: before styling
anything, find the screen that already renders that object and match it.

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

## The seam loop — "make X consistent" / "fix the theme"

Close one axis of inconsistency app-wide:

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
verified against a live node (app on `http://localhost:2021`, via
`chrome-devtools-axi`; reuse the authenticated tab, never clear storage),
both halves:

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

Watch for these fossils in your own diff before finishing:
- a responsive pair with the same token both sides (`type-x … sm:type-x`) is a
  missing step or a leftover, never a style (RM-138; gated);
- a theme-neutraliser (`h-auto min-h-0`, `rounded-none` on a control) means the
  element is NOT that component's tier — use the theme's release modifier
  (e.g. `.button--row`) or the right component, never fight the theme;
- an arbitrary colour property — colour is a `text-*` token, always (RM-137;
  gated).

## Gates — all must pass

```
./scripts/check-ui-contract.sh && (cd frontend && pnpm lint) && ./scripts/check-rm.sh
```

(`pnpm lint` runs `check-theme-selectors.sh`.)

## Red flags — STOP, you are rationalizing

| Thought | Reality |
|---|---|
| "I'll register an `@theme` token for this exact value" | The scale is closed. Snap to the nearest token, or STOP and propose it. Per-screen tokens are what grew the theme 81 → 164. |
| "It's not a px literal, so it's fine" | The ban is on per-screen pixel values, not on the characters `[14px]`. A one-off token is the same value wearing a name. |
| "No §2 component fits, I'll style a div" | Stop and ask. The fence is the point. |
| "This row needs `h-auto` to escape the control height" | Then it is not a control. Use the theme's release modifier — never neutralise the theme at a call site. |
| "The other four call sites already write it this way" | Then you found a seam, not a precedent. Name the variant once; delete the copies. |
| "The edit is in the file, done" | A theme rule fails silently on either half. Verify the computed value on a live node. |
| "I'll add the rule as a note in the doc" | Convention is the weakest rung. If it can be a gate, it becomes a gate in the same change. |
| "This page wants its own smaller heading" | Per-page variation is an artefact. Justify keeping the difference, or collapse it. |

If you hit a NEW recurring mistake: fix it, then add it to `field-notes.md` and
`docs/agents/recurring-mistakes.md` (Log & prevent — the instance is not enough).
