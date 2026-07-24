---
name: design-pro
description: Use when porting any screen from a design-handoff *.dc.html prototype into the React apps, fixing a ported screen that looks different from its reference, or verifying design fidelity. Triggers - /port-screen, "port this screen", "match the design", "the design looks off", Client Detail or Dashboard Redesign work.
---

# design-pro — dc.html → React, converging to zero drift

The prototype is a **spec, not source** (never copy its markup/classes/`var(--*)`).
The verdict on fidelity is **`design-handoff/scripts/style-diff.mjs`** — a
deterministic computed-style comparison between the live-rendered dc.html and the
running app, per mapped node, per state. Eyeballing screenshots explores;
it never decides pass/fail.

**Design wins.** Where a HeroUI/app default disagrees with the dc.html's computed
values, the design value is the target (UI-CONTRACT §3). The ONLY sanctioned
deviations live in `design-handoff/accepted-diffs.md` — and only the user writes
entries there.

## 0. Preconditions — fail fast, in order

1. Theme merged: `grep -q 'canvas' frontend/apps/coachapp-v2/src/index.css` (else
   STOP — merging `design-handoff/theme.css` lands first, its own change).
2. App running on `http://localhost:2021`; `chrome-devtools-axi pages` responds;
   reuse the authenticated tab, never clear storage.

## 1. Read — in this order

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
Data through existing RTK Query hooks; never `useEffect` fetching.

## 5. Convergence loop — the verdict

```
cd frontend/apps/coachapp-v2   # playwright resolves from here
APP_TOKEN=$(npx -y chrome-devtools-axi eval "localStorage.getItem('coachapp.accessToken')" \
  | sed -n 's/^result: "\(.*\)"$/\1/p' | sed 's/\\"//g' | tr -d '\n') \
node ../../../design-handoff/scripts/style-diff.mjs \
  ../../../design-handoff/manifests/<ID>.json          # [--state x] [--width y] [--json]
```

Access tokens live ~5 min — grab a fresh APP_TOKEN right before every run
(reload the app tab first if it's been idle).

For EVERY reported diff, place the fix with this ladder (top rung that holds):

1. **Value recurs across screens/components** → theme token/override in
   `src/index.css` `@theme` (fix once, everywhere).
2. **Component-wide** → fix the app wrapper (`@/@components/*`) once.
3. **This screen only** → local Tailwind via tokens; register a new `@theme`
   token for an exact spec value (never a px literal — keeps the §5 gate green).
4. **Design wrong/impossible** → propose a ledger entry (key format
   `` `ID:state:pair:prop` ``) in the ticket. The user decides; you never edit
   `accepted-diffs.md` yourself.

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

Then UI-CONTRACT §6 DoD line-by-line, copy verbatim vs COPY.md, and fill
`design-handoff/PORT-TICKET.md` into the PR/commit body with: the state
checklist (each row PASS/ledgered), final screenshots, proposed ledger entries.

## Red flags — STOP, you are rationalizing

| Thought | Reality |
|---|---|
| "Close enough, the diff is tiny" | The script decides, not you. Fix it or propose a ledger entry. |
| "I'll raise EPS / trim the allowlist" | Forbidden. That's deleting the test because it fails. |
| "I'll add the ledger entry myself" | Ledger is user-only. Propose in the ticket. |
| "I'll start coding, mapping as I go" | Phase-3 gate exists because this produced different designs. |
| "This state is unreachable/edge-case" | Ask the user. Silent drops are missed states. |
| "No §2 component fits, I'll style a div" | GAPS.md or stop-and-ask. The fence is the point. |
| "Defaults are close to the design" | Design wins. Rung 1–3 the difference. |

If you hit a NEW recurring mistake: fix it, then add it to `field-notes.md` and
`docs/agents/recurring-mistakes.md` (Log & prevent — the instance is not enough).
