# Project instructions — CoachEasy client app redesign

**Before doing ANY design work in this project, read `REDESIGN-PLAN.md` in full.** It is the
single source of truth: locked design language (§2), screen inventory from the real codebase (§3),
and the phased checklist (§5).

## Protocol (every conversation)

1. Read `REDESIGN-PLAN.md` first. Never design from memory.
2. Work on the **first unchecked item** in §5 unless the user names a different one.
3. The design language in §2 is **locked** — light premium, azure `#0485f7`, no dark mode, no
   gradients, no glow shadows. Lift exact values from `CoachEasy Prototype.dc.html` when unsure.
4. All screens go **into `CoachEasy Prototype.dc.html`** as navigable, interactive screens —
   no separate files, no forks unless the user asks.
5. Ground content in the real app: the user attaches the `clientapp-v2` local folder; read the
   relevant `src/` file (listed per screen in §3) before designing that screen. Don't invent
   features the app doesn't have. If the folder isn't attached and you need it, ask.
6. **After finishing an item, immediately update `REDESIGN-PLAN.md`**: tick the checkbox
   (`- [ ]` → `- [x]`) and add a one-line note if anything deviated from the plan.
7. If a decision changes scope (e.g. nav model), record it in the plan (§5 Phase 0 or a
   "Decisions" line), so later conversations inherit it.

## Open decisions

- Nav model: real app has 6 tabs (Training/Nutrition/Progress/Check-ins/Coach/Settings);
  prototype currently has 5 (Today/Train/Eat/Progress/Coach). Awaiting user choice — ask if
  still open when it blocks work.
