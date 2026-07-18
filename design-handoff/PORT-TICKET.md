# PORT-TICKET.md — per-screen ticket template

Copy this into each port ticket/PR description and fill it in. One ticket = one badge (or one badge trio like EX/EP/ED when they share a form).

```md
## Port: [BADGE] — [Section name]

**Spec:** design/Dashboard Redesign.dc.html → grep `data-screen-label="[BADGE]"` (or `'============'` markers)
**Reference image:** screens/[BADGE].png
**Copy:** COPY.md § [BADGE]  ·  **Behavior:** INTERACTIONS.md § [BADGE]
**Codebase target:** UI-CONTRACT.md §8 row [BADGE]

### Scope
- [ ] Desktop layout
- [ ] Mobile layout (375px)
- [ ] Overlays: (list each; every one = Popover desktop / KeyboardSheet mobile, AlertDialog for confirms)
- [ ] Out of scope: (anything the section shows that this ticket doesn't cover)

### Definition of done (UI-CONTRACT §6)
- [ ] Only §2 components; app wrappers preferred over raw HeroUI
- [ ] Zero style={{}} / hex / px-rem arbitrary values / numbered color scales — `just check-rm` + contract grep gate pass
- [ ] Copy matches COPY.md verbatim
- [ ] States: loading (ListSkeleton/PageSkeleton), empty, error (ErrorState/Alert), interactive states from INTERACTIONS.md
- [ ] onPress everywhere; icon-only buttons have aria-label; 44px targets on mobile
- [ ] Data via existing RTK Query hooks (src/api/*) — no useEffect fetching, no prototype sample data
- [ ] Screenshot pair (desktop + mobile) attached to PR, eyeballed against screens/[BADGE].png
- [ ] No GAPS.md violations; anything unmapped was raised, not improvised

### Notes / deviations
(agreed departures from the spec, with why)
```

Suggested ticket order (dependencies first):
1. FO + FD + FE (reference PR — must match exercise-screen anatomy)
2. RC + RD + RE (reuses serving-size + ingredient patterns)
3. EX + EP + ED
4. NP + NE, TR + TE (list/form pattern, chips)
5. CL, IN
6. FM, FB
7. NB, TB (builders — biggest; reuse set editor / sheets)
8. ST
9. DB (composes everything; do last)
