---
name: implement-claude-design
description: Use when implementing, porting, or matching Claude Design or .dc.html screens inside an existing React, Tailwind, or HeroUI application, before editing UI code.
---

# Implement Claude Design

Translate a Claude Design handoff bundle into the app faithfully: design decisions come from the reference, product decisions from the user — never invented silently.

**Project.** Design refs live only in `design/projects/<project>/` (bundle = `README.md` + `project/*.dc.html` + design-side `CLAUDE.md`; read those first — they name the primary screen, palette, and per-file status). Bundle docs describe the prototypes; this skill governs the process: read source fully first, but interactive states, ambiguous values, and all verification go through the browser (`chrome-devtools-axi` drives; Insider inspects the app when present). Prototype inline styles never carry into app code. All evidence is source and computed styles — screenshots play no role (per the handoff; ignore the bundle's `screenshots/` dir). Authority order: app code/specs for behavior → `.dc.html` for composition → CSS/computed values for numbers.

**Plan.** No UI edit before `design/plans/<screen>.md` exists, every section present (`none` if empty), plus a `planned` row in `design/progress.md`:

```markdown
# Plan: <screen> — design refs, app route + owning files, viewports, states + interaction path to reach each
## Measured Values   | Element | Property | Design value | Source (CSS/computed) | App choice (token/variant/utility) |
## Differences   | # | Difference | Type | Action (autonomous / decision N / request reference) |
## Decisions   | N | Question | Frozen answer |
## Mapping   design selector -> UI role -> existing owner -> structure rung -> style rung -> preserved behavior
## Slices   ordered checklist; each names files, states, and the Measured Values rows its verification re-checks
```

**Decisions.** Visual and clearly-drawn responsive differences proceed autonomously. Structural, route, interaction, or workflow differences stop: present observed design vs existing app with a recommendation, wait, then freeze the answer in the plan and `design/progress.md`'s decisions log — frozen answers are never re-asked. Never ask about values readable from CSS or behavior the app already defines.

**Ladders** — stop at the first rung that fits.
Structure: keep shell/route → reuse component → add variant/slot → compose primitives → page-local → shared component only on real repetition. Boundaries follow app concepts, never the design's HTML hierarchy.
Style: existing component variant → existing semantic token (raw-value delta = accepted mapping, verify against the token) → new token for a system-wide themable role only → component-level token → Tailwind utility → arbitrary one-off → inline style for runtime values only.

**Execute + progress.** Slices in plan order, each vertical: behavior guard → tokens → variants → structure → data wiring → states (populated/loading/empty/error/permission) → responsive → polish. After each slice, verify in the browser: replay the recorded design and app interaction paths at identical viewports and compare computed values to the slice's Measured Values rows — colors/typography/radius/border exact, geometry within 1px. Check a slice off only after it passes. First slice flips the progress row to in-progress; mismatches get fixed or logged as approved deviations (with decision number) in the plan and progress.md's deviations log; new differences mid-slice reopen classification before further edits. Complete = every slice checked, every row re-verified or logged, repo checks pass, progress row verified with decisions, deviations, and reviewer-relevant changes logged.
