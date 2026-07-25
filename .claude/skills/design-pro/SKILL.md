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

**The theme wins.** Where the dc.html disagrees with the theme, the THEME value is
the target and the prototype's px is an input (UI-CONTRACT §3). This reverses the
old "design wins" rule: the theme is now the system, not a transcription of the
prototype. It covers the scale *and* the rules built on it — one control height,
the field height, the selection registers, `--tracking-eyebrow`, the radius steps.

The design still decides structure, layout, copy, iconography, and which register a
screen uses. A register the theme has no rule for is a STOP-and-ask.

Never resolve a conflict at a call site. Writing the design's value into a
className does not remove the disagreement, it hides it across N call sites. If the
theme is genuinely wrong, change the theme, in its own commit.

## 0. Preconditions — fail fast, in order

1. App running on `http://localhost:2021`; `chrome-devtools-axi pages` responds;
   reuse the authenticated tab, never clear storage.

## 1. Read — in this order

0. **The scale — your closed vocabulary.** `grep -E '^\s*--(text|radius)-'
   frontend/apps/coachapp-v2/src/index.css`. These are the ONLY sizes and radii
   you may use. It is a fence, not a starting point: you may not add to it (§5
   rung 3). Know the list before you map, so the manifest targets real tokens
   instead of prototype pixel values.
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

1. **Component-wide** → fix the app wrapper (`@/@components/*`) once.
2. **This screen only** → local Tailwind using an **existing** token from the
   scale (§1.0). Snap to the nearest one; never a px literal.
3. **Nothing in the scale is within ±2px** → **STOP.** Propose the new token in
   the ticket and let the user land it. **You never add a token to
   `src/index.css` yourself** — the scale is closed, and `check-ui-contract.sh` fails the diff if you try.
4. **Design wrong/impossible** → flag the conflict in the ticket (key format
   `` `ID:state:pair:prop` ``). The theme wins on conflict (UI-CONTRACT §3);
   the user decides, never you.

Why rung 3 is a stop and not a token: the old ladder told ports to register an
`@theme` token for any exact spec value, justified as keeping the §1 px-literal
gate green. That did not remove per-screen pixel values — it *relocated* them
into the theme, one per screen, forever. Nine ports took the scale from 81 to
164 tokens and the design stopped being a system. The component fence already
works this way ("no §2 match → STOP and ask"); the value fence now matches it.

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

Then UI-CONTRACT §6 DoD line-by-line, copy verbatim vs COPY.md. PR/commit body
carries: the state checklist (each row PASS), final screenshots, and any
flagged design conflicts.

## Red flags — STOP, you are rationalizing

| Thought | Reality |
|---|---|
| "Close enough, the diff is tiny" | The script decides, not you. Fix it or flag the conflict in the ticket. |
| "I'll raise EPS / trim the allowlist" | Forbidden. That's deleting the test because it fails. |
| "I'll register an `@theme` token for this exact value" | The scale is closed. Snap to the nearest token, or STOP and propose it. Per-screen tokens are what grew the theme 81 → 164. |
| "It's not a px literal, so it's fine" | The §1 ban is on per-screen pixel values, not on the characters `[14px]`. A one-off token is the same value wearing a name. |
| "I'll accept the deviation myself" | Design↔theme conflicts are user decisions. Flag in the ticket. |
| "I'll start coding, mapping as I go" | Phase-3 gate exists because this produced different designs. |
| "This state is unreachable/edge-case" | Ask the user. Silent drops are missed states. |
| "No §2 component fits, I'll style a div" | GAPS.md or stop-and-ask. The fence is the point. |
| "The design says 42px, so I'll write 42px here" | The theme wins. Snap to it. A call-site value hides the conflict, it does not settle it. |
| "This row needs `h-auto` to escape the control height" | Then it is not a control. Use the theme's release modifier — never neutralise the theme at a call site. |

If you hit a NEW recurring mistake: fix it, then add it to `field-notes.md` and
`docs/agents/recurring-mistakes.md` (Log & prevent — the instance is not enough).
