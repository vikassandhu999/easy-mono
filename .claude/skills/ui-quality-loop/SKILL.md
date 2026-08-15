---
name: ui-quality-loop
description: Use when auditing or repairing UI/UX across one or more easy-mono React routes, including visual regressions, responsive layout, spacing, borders, typography, hover/focus states, accessibility, browser interactions, behavioral bugs found by exercising flows, or design-system inconsistencies.
---

# UI quality loop

Own the full evidence loop: inventory, exercise, inspect, classify, repair, verify,
and write back prevention. The loop's value is exercising REAL flows with real data —
half the highest-severity findings are behavioral (an action that loses data or
does nothing), and those are invisible in screenshots of static states.

## Preconditions

1. Read the root, frontend, and target-app `AGENTS.md` files, `design-handoff/UI-CONTRACT.md`, and the frontend entries in `docs/agents/recurring-mistakes.md`.
2. **REQUIRED SUB-SKILL:** `design-pro` for CoachApp visual/design work; `chrome-devtools-axi` for live browser work.
3. Dev servers are the user's: assume coachapp :2021, clientapp :1314, backend already running — verify with one request, never start/restart them. Reuse the authenticated AXI session first; if a login IS needed, use the standing seed account `admin@example.com` with dev OTP `123456` (any login/signup accepts it in dev — see root AGENTS.md). Never invent a new account when this one serves.
4. Record `git status --short --branch`. Treat every existing change as user-owned.
5. For an implementation run, use a dedicated `ui-quality/<app>-<date>` branch created from a clean tree. Dirty tree → clean worktree or ask; never switch branches over unrelated changes.
6. Never push, merge, rebase, or force-push.

## Worklist file (the loop's spine)

Long runs outlive one context window. Before auditing, write
`<scratchpad>/ui-audit-<app>-<date>.md` and keep it current after EVERY route:

```
| route | role | viewport | states covered | result | finding ids |
```

plus a findings section: one entry per finding with id, route, state, viewport,
severity, evidence (screenshot path or eval output), classification, status
(open / fixed@<file> / reported / excluded-why). Resume runs from this file, not
from memory. "Whole application" means every router entry is accounted for as
tested, blocked, or excluded with a reason — enumerate routes from the real
router file, never from the nav.

## Exercise states, don't just view them

Use 375px and 1280px unless the app defines other widths. For each route cover the
applicable: default, loading, empty, error, hover, keyboard-focus, active,
disabled, overlay/modal, validation (submit empty AND submit invalid), and
post-action states.

- Reaching a state often needs data: create it (a test recipe, a test client),
  exercise it, then DELETE it before finishing. Name test entities `Test <Noun>`
  so leaks are findable. Never mutate real-looking records.
- Every add/edit/delete flow is verified by its OUTCOME, not its animation:
  after "add 2 items" assert 2 items exist; after save, reopen the detail
  route and confirm the round-trip. A flow that renders nicely and drops data
  is a top-severity finding.
- Submit every form once empty and once mid-filled: silent validation (focus
  moves, no message) is a known app-wide defect class.

## Split the tools

Every browser step follows the root `AGENTS.md` **Browser efficiency policy**. Applied to
this loop:

- One one-shot script per route state sweep (default/empty/error/validation/post-action);
  one per root-cause group for post-fix verification (reopen route, re-run flow, both
  viewports, seam consumers).
- Scripts log themselves in: seed account + dev OTP against the running dev server.
- AXI exploration starts with `chrome-devtools-axi pages`; judge only after
  spinners/"Loading more…" settle; leave browser state as you found it.
- Deterministic checks the repo already owns: approved baselines,
  `design-handoff/scripts/style-diff.mjs`, stable scripted flows. Baselines come only
  from approved designs — a UI under investigation proves nothing about itself.
- Without an approved design, screenshot, or prior baseline, a finding is a defect or
  inconsistency, never a regression.

### Browser field notes (hard-won; apply in one-shot scripts AND the rare AXI fallback)

- Refs go stale on every re-render. Snapshot and act immediately; for multi-step interactions (select two rows then confirm) prefer ONE `eval` with chained `setTimeout` promises over separate CLI calls.
- react-aria/HeroUI widgets ignore synthetic `.click()` for press/selection in ListBox options: dispatch `pointerdown` + `pointerup` (bubbles) then `.click()`. Press-visual states (`data-pressed`) never trigger from synthetic events at all — verify press styling by SETTING the data attribute and reading computed style instead.
- `fill` appends into prefilled inputs ("30" into "0" → "030"). Clear first, or set via the native value setter + `input` event.
- `window.scrollTo` is often a no-op — screens scroll in an inner container. Find the ancestor with `scrollHeight > clientHeight` and scroll that.
- Console evidence: filter out Vite/HMR noise before reporting; a finding needs a message tied to the exercised action.

## Classify before editing (fix in this order)

1. **Behavioral defect:** an interaction whose outcome is wrong — data lost or duplicated, action silently no-ops, wrong navigation, state not persisted, stale error kept. Highest priority.
2. **Objective visual defect:** clipping, overlap, overflow/spill past a container, unreadable contrast, missing focus, layout shift, inaccessible control.
3. **System inconsistency:** violates the UI contract, theme, canonical component (PickerModal for pickers, control-height tiers, `type-*` sizes…), or an established repeated pattern.
4. **Subjective:** a preference without an authority. Report; don't fix unless the user asked for redesign.

## Repair and verify

Handle one coherent root-cause group at a time. Before changing a shared seam
(theme rule, `@components`, `builder-kit`), enumerate ALL its consumers
(`rg -l`) and spot-check each in the browser after the fix — a seam fix that
helps one route and breaks four is worse than no fix.

**Prove the probe before trusting it.** A verification that cannot detect the
defect proves nothing. Before declaring a fix verified, show the same probe
FAILING on a control: an unfixed sibling element, the pre-fix behavior, or a
deliberately broken input. (Example: a computed-style check for a press-scale
fix passed while the bug persisted — synthetic events never triggered the
pressed state. The valid probe forced `data-pressed` and showed identity on the
fixed element and scale(0.97) on a stock one.)

After each group:

1. Run its smallest relevant check.
2. Reopen the exact route, state, and viewport with fresh browser evidence; re-run the flow end-to-end when the fix touched behavior.
3. Check the other required viewport and every consumer of a changed shared seam.
4. Check console and relevant network failures.
5. Run focused Biome, app typecheck/build, `./scripts/check-rm.sh`, `./scripts/check-ui-contract.sh` when applicable, and `git diff --check` before completion. Pre-existing failures are recorded, not silently absorbed into the run.

## Write back prevention

A fixed instance without a prevention rule will recur. For every defect CLASS
found (not each instance): add a rule to `docs/agents/recurring-mistakes.md`
with a "verify by" line, plus a mechanical grep in `scripts/check-rm.sh` when
the pattern is greppable. If the fix changed a canonical component's contract,
update the app `AGENTS.md` canonical-components section in the same run.

## Git policy

Default to **no commits**. Commit only when the user explicitly authorizes commits for the run.

When authorized:

- One commit per coherent root-cause group: shared component, theme seam, or complete interaction flow.
- Commit once the group compiles and renders so work cannot be lost; amend only the latest unpushed agent-owned commit until its verification is green.
- Never commit per screenshot, route, CSS property, or tiny follow-up. Never hide unrelated defects in one giant commit.
- Stage explicit paths only; never `git add -A` or include baseline-dirty files.
- State the cause, affected routes/states, and validation in the commit body.
- After the branch passes its full audit, present the commit list and diff; prefer a squash merge so the target branch gets one clean commit while the audit branch keeps reversible checkpoints.

## Completion

Report from the worklist file: coverage table, fixes by class, prevention rules
added, checks run, commits, subjective suggestions left unchanged, test data
created and confirmed deleted, and every blocked/excluded state. Never claim
the whole UI is fixed while coverage has gaps, validation is red, or a probe
was never proven able to fail.
