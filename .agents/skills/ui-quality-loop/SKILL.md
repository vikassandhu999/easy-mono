---
name: ui-quality-loop
description: Use when auditing or repairing UI/UX across easy-mono React routes — visual defects, design-system inconsistencies, or behavioral bugs surfaced by exercising live flows.
---

# UI quality loop

Inventory, exercise, classify, repair, verify, prevent. The loop's value is
exercising REAL flows with real data: the highest-severity findings are
behavioral — an action that loses data or silently no-ops — and invisible in
screenshots of static states.

## 1. Setup

1. Read the root, frontend, and target-app `AGENTS.md`, `frontend/apps/coachapp-v2/UI-CONTRACT.md`, and the frontend entries in `docs/agents/recurring-mistakes.md`.
2. Required sub-skills: `design-pro` for CoachApp visual/design work; `chrome-devtools-axi` for live browser work.
3. Dev servers are the user's — coachapp :2021, clientapp :1314, backend already up. Verify with one request; if one is down, report and stop rather than starting it. Reuse the authenticated AXI session; when a login is needed, use the standing seed accounts coach: `admin@example.com` and client: `gina.lanetti@example.com` with dev OTP `123456`.
4. Record `git status --short --branch`. Every existing change is user-owned.
5. Implementation runs happen on a dedicated `ui-quality/<app>-<date>` branch created from a clean tree. Dirty tree → clean worktree, or ask.
6. Work stays on the local branch — never push, merge, rebase, or force-push.

## 2. Worklist file (the spine)

Long runs outlive one context window; resume from the worklist file, not from
memory. Before auditing, write `<scratchpad>/ui-audit-<app>-<date>.md` and keep
it current after EVERY route:

```
| route | role | viewport | states covered | result | finding ids |
```

plus a findings section: one entry per finding with id, route, state, viewport,
severity, evidence (screenshot path or eval output), classification, status
(open / fixed@<file> / reported / excluded-why).

Coverage bound: every entry in the real router file is accounted for as tested,
blocked, or excluded with a reason. Enumerate routes from the router, never from
the nav.

## 3. Exercise states, don't just view them

Viewports: 375px and 1280px unless the app defines others. Per route, cover
every applicable state: default, loading, empty, error, hover, keyboard-focus,
active, disabled, overlay/modal, validation (submit empty AND submit
mid-filled), post-action.

- Verify every add/edit/delete flow by its OUTCOME, not its animation: after
  "add 2 items" assert 2 items exist; after save, reopen the detail route and
  confirm the round-trip. A flow that renders nicely and drops data is a
  top-severity finding.
- Silent validation (focus moves, no message) is a known app-wide defect class —
  the empty and mid-filled submits exist to catch it.
- Reaching a state often needs data: create it (a test recipe, a test client),
  exercise it, then DELETE it before finishing. Name test entities `Test <Noun>`
  so leaks are findable; mutate only entities this run created.

### Browser work

Every browser step follows the root `AGENTS.md` Browser efficiency policy.
Applied to this loop:

- One one-shot script per route state sweep; one per root-cause group for
  post-fix verification (reopen route, re-run flow, both viewports, seam
  consumers). Scripts log themselves in with the seed account.
- AXI exploration starts with `chrome-devtools-axi pages`; judge only after
  spinners/"Loading more…" settle; leave browser state as found.
- Prefer deterministic checks the repo already owns: approved baselines, stable scripted flows.

### Field notes (hard-won; apply in one-shot scripts AND the rare AXI fallback)

- Refs go stale on every re-render. Snapshot and act immediately; for multi-step interactions (select two rows then confirm) prefer ONE `eval` with chained `setTimeout` promises over separate CLI calls.
- react-aria/HeroUI widgets ignore synthetic `.click()` for press/selection in ListBox options: dispatch `pointerdown` + `pointerup` (bubbles) then `.click()`. Press-visual states (`data-pressed`) never trigger from synthetic events at all — verify press styling by SETTING the data attribute and reading computed style instead.
- `fill` appends into prefilled inputs ("30" into "0" → "030"). Clear first, or set via the native value setter + `input` event.
- `window.scrollTo` is often a no-op — screens scroll in an inner container. Find the ancestor with `scrollHeight > clientHeight` and scroll that.
- Console evidence: filter out Vite/HMR noise before reporting; a finding needs a message tied to the exercised action.

## 4. Classify before editing (fix in this order)

1. **Behavioral defect:** an interaction whose outcome is wrong — data lost or duplicated, action silently no-ops, wrong navigation, state not persisted, stale error kept. Highest priority.
2. **Objective visual defect:** clipping, overlap, overflow past a container, unreadable contrast, missing focus, layout shift, inaccessible control.
3. **System inconsistency:** violates the UI contract, theme, canonical component (PickerModal for pickers, control-height tiers, `type-*` sizes…), or an established repeated pattern.
4. **Subjective:** a preference without an authority. Report; fix only if the user asked for redesign.

A "regression" claim needs an authority: an approved design, screenshot, or
prior baseline. Without one, the finding is a defect or inconsistency.
Baselines come only from approved designs — a UI under investigation proves
nothing about itself.

## 5. Repair and verify

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
5. Run focused Biome, app typecheck/build, `./scripts/check-rm.sh`, `./scripts/check-ui-contract.sh` when applicable, and `git diff --check`. Record pre-existing failures as pre-existing; a run absorbs only its own.

## 6. Write back prevention

A fixed instance without a prevention rule will recur. For every defect CLASS
found (not each instance): add a rule to `docs/agents/recurring-mistakes.md`
with a "verify by" line, plus a mechanical grep in `scripts/check-rm.sh` when
the pattern is greppable. If the fix changed a canonical component's contract,
update the app `AGENTS.md` canonical-components section in the same run.

## 7. Report

Report from the worklist file: coverage table, fixes by class, prevention rules
added, checks run, commits, subjective suggestions left unchanged, test data
created and confirmed deleted, and every blocked/excluded state. The run is
complete only when coverage has no gaps, validation is green, and every probe
was proven able to fail — otherwise report it as partial.

## Git

Default: **no commits** — fixes stay in the working tree for the user to
review. Only when the user explicitly authorizes commits for the run, follow
[COMMITS.md](COMMITS.md).
