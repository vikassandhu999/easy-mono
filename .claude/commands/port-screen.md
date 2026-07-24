# /port-screen — port one redesign screen to exact spec

Usage: `/port-screen XX` — badge from `design-handoff/UI-CONTRACT.md` §8
(DB CL IN EX EP ED FO FD FE RC RD RE NP NE NB TR TE TB FM FB ST), or a
Client Detail screen ID from `design-handoff/CLIENT-DETAIL.md` (CD/OV, CD/TR, …).

**Invoke the `design-pro` skill and follow it end-to-end** — it owns the read
order, the state inventory, the mapping-before-code gate, the style-diff
convergence loop, and the gates. This command only pins the inputs:

- Target app: `frontend/apps/coachapp-v2`. Presentation-only port: routing and
  data hooks (RTK Query in `src/api/*`) already exist — never re-architect data,
  never port more than this one screen. One screen per branch.
- Design file: Dashboard badges → `design-handoff/design/Dashboard Redesign.dc.html`
  (find your slice via `grep -n 'data-screen-label="XX"'` — never read it whole).
  CD screens → `design-handoff/design/Client Detail.dc.html` (`data-ref` index in
  CLIENT-DETAIL.md).
- Routes, gotchas: `field-notes.md` in the skill dir.
