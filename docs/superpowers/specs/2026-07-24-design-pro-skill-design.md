# design-pro skill — design

**Goal:** `.claude/skills/design-pro` becomes THE workflow for converting any Claude Design `.dc.html` file into React screens in `coachapp-v2`, converging on the design with a deterministic computed-style diff instead of screenshot eyeballing. General successor to `/port-screen`.

## Problem

Ports of dc.html designs have repeatedly gone wrong in five ways:

1. **Style drift** — spacing/size/color/radius end up slightly off; screenshot eyeballing never fully converges.
2. **Missed states** — state-driven DCs (e.g. `Client Detail.dc.html`: 167 `sc-if` blocks, 7 lifecycle states behind a Preview-state switcher) hide states that never get built.
3. **Wrong placement** — fixes land as one-off inline styles when they should be theme overrides, and vice versa.
4. **Premature coding** — implementation starts before the design→component mapping is complete, then thrashes.
5. **Improvisation** — the result is a design that is simply *different* from the spec.

The old verification mechanism (manually inspecting computed styles in the browser, comparing screenshots) is non-deterministic: an agent samples a few nodes, judges "close enough", and exits the loop early.

## Decisions (ruled by the user)

- **Ground truth = computed-style diff.** A Playwright script compares `getComputedStyle` between the live-rendered dc.html and the running app, per mapped node, per state. Manual inspection is demoted to exploration/debugging; it never decides pass/fail.
- **Design wins over design-system defaults.** UI-CONTRACT §3's "strip the prototype's geometry and let HeroUI defaults apply" is repealed. The dc.html computed values are the target. Systematic differences get fixed once at theme level; deviations exist only in a user-approved ledger.
- **General successor.** design-pro covers every dc.html (Dashboard Redesign, Client Detail, future files). `/port-screen` becomes a thin Dashboard-specific entry point; its field notes move into the skill.
- **Build + prove.** The tooling is part of the deliverable, validated end-to-end on CD/OV against the existing client-detail build before the skill ships.

## Deliverables

```
.claude/skills/design-pro/
  SKILL.md         — the workflow (phases below)
  find-state.md    — how to enumerate & reach every state in a dc.html
  field-notes.md   — HeroUI/app gotchas absorbed from port-screen + route map
design-handoff/scripts/style-diff.mjs   — the ground-truth tool
design-handoff/accepted-diffs.md        — user-approved deviation ledger (starts empty)
```

Plus edits: UI-CONTRACT §3 amendment; `.claude/commands/port-screen.md` slimmed to an entry point that invokes design-pro; `.agents/skills/wayfinder/` (duplicate stub) deleted.

## Workflow (SKILL.md phases)

Each phase names the failure mode it counters.

1. **Preconditions** — theme merged into `src/index.css`, app running on :2021, `chrome-devtools-axi` bridge up. Fail fast, in order.
2. **Read order** — UI-CONTRACT; the screen's handoff doc (badge §8 row, or CLIENT-DETAIL.md); `coachapp-v2/AGENTS.md`; RECIPES/COPY/INTERACTIONS; ref PNGs (actually look at them).
3. **State inventory** *(missed states)* — open the dc.html live in a browser tab. Using `find-state.md`, enumerate every state × breakpoint: logic-class flags (`renderVals`), `sc-if` conditions, Preview-state switcher entries, interactive states (hover/selected/open). Output: a state checklist. Every row must later pass the diff.
4. **Mapping manifest** *(premature coding, improvisation)* — for each visual node in the design block: design selector → §2 component/wrapper → copy → interaction → anticipated style deltas. No §2 mapping → GAPS.md resolution or stop-and-ask; never improvise. **Hard gate: no implementation code until the manifest covers every node and every state.** The manifest is also `style-diff.mjs`'s input (selector pairs + state recipes).
5. **Implement** — from the manifest only. Existing rules carry over: §2 fence, wrappers before raw HeroUI, tokens only, `onPress`, responsive overlays, all loading/empty/error states.
6. **Convergence loop** *(style drift, wrong placement)* — run `style-diff.mjs` per state. For each reported property diff, apply the **placement ladder**:
   1. Value recurs across screens/components → theme token/override in `index.css` `@theme`.
   2. Component-wide → fix the app wrapper once.
   3. This screen only → local Tailwind via tokens; register a new `@theme` token when the exact value isn't tokenized (keeps the §5 grep gate clean — the established pattern).
   4. Design wrong/impossible → propose an `accepted-diffs.md` entry; **only the user approves entries**.
   Exit only when the report is empty or 100%-ledgered at both widths. Then one screenshot-vs-ref pass for what computed styles can't see (structure, layering, iconography).
7. **Gates & finish** — `./scripts/check-ui-contract.sh`, `pnpm lint`, `./scripts/check-rm.sh`, UI-CONTRACT §6 DoD, PORT-TICKET + state checklist + final screenshots + ledger references.

## style-diff.mjs

- **Stack:** Playwright + Node (same as existing `visual-diff.mjs`).
- **Inputs:** a per-screen manifest file (JSON, `design-handoff/manifests/<badge>.json`) with: dc.html path, app route, per-state recipes (clicks/JS to reach the state on each side), and selector pairs `{name, design, app}`.
- **Mechanics:** open dc.html via `file://` (support.js is a relative sibling; web fonts load over the network, which headless Playwright has), execute the design-side state recipe; open the app route (dev login OTP 123456 if needed), execute the app-side recipe; for each pair, diff `getComputedStyle` over the allowlist.
- **Allowlist:** font-family/size/weight/line-height/letter-spacing, color, background-color, border-width/color/radius, padding, margin, gap, box-shadow. Colors normalized to rgb; px compared with 0.5px epsilon. **Width/height excluded** (content-dependent; sample data ≠ real data).
- **Output:** per-node table `property: design-value ≠ app-value`; exit 1 on any diff not present in `accepted-diffs.md`. The epsilon is never raised; the ledger is never agent-written.

## accepted-diffs.md ledger

One entry per approved deviation: screen/state, node, property, design value, app value, reason, approval date. `style-diff.mjs` reads it to filter its report. Agents may *propose* entries in a PR ticket; only the user commits them.

## Validation plan

Run the full skill on **CD/OV** against the existing (uncommitted) client-detail build:

1. State inventory must surface all 7 lifecycle states + tab states.
2. Author the CD/OV manifest.
3. Run `style-diff.mjs`; fix every real drift via the placement ladder; propose ledger entries for genuine deviations.
4. Ship the skill only when CD/OV's report is clean and all repo gates pass.

Findings that reveal skill-prose gaps get folded back into SKILL.md before shipping (RED→GREEN→REFACTOR on the real screen rather than synthetic pressure scenarios).

## Out of scope

- Wiring style-diff into CI / `just lint` (revisit after the workflow is proven on several screens).
- Fixing `visual-diff.mjs` (stale ports/TODOs); it stays as-is, unused by this workflow.
- Porting further Client Detail screens beyond the CD/OV validation run.
