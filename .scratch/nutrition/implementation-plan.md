# Nutrition implementation plan

Spec: concept.md, CONTEXT.md, workout W13/W14/W32/W35/W36, and the retained nutrition week prototype.

All work stays on the current branch. Do not commit or stage. Preserve skills-lock.json, clientapp-v2, the prototype, and shared training behavior.

- [x] Replace the nutrition storage with exactly eight concept tables. Enforce tenant keys, valid masks, dates, positive amounts, and preset content shape.
- [x] Build one Ctx-first nutrition context and typed coach routes. Test validation, tenant isolation, unknown nutrients, target overlap, and content/schedule history.
- [x] Remove old nutrition branches from shared plans, clients, reviews, chat, trackers, seeds, and tests. Retain training and tracker behavior.
- [x] Build the API-backed coach nutrition week and meal editor from the prototype. Use shared tabs, mutation invalidation, save recovery, focus rules, and eight-second Undo.
- [x] Adapt the food catalogue to basis, servings, supplement kind, and absent unknown values. Remove old coach screens and all client nutrition screens, routes, and API hooks.
- [x] Generate the API and seed a realistic client week. Generation did not change clientapp-v2.
- [x] Run backend precommit and all requested backend commands, frontend lint, and both app builds. Backend: 730 tests, no failures.
- [x] Search retained source for old nutrition terms. Only generic UI menus remain.
- [ ] Run the deterministic nutrition browser script at 375px and 1280px and inspect screenshots. Chromium fails with macOS Mach port permission error 1100; WebKit aborts before navigation. A connected browser or CDP endpoint is needed. Both browser scripts accept PLAYWRIGHT_CDP_URL.

File ownership: backend worker owns nutrition context/schemas, migration, controllers/types/routes, and dedicated tests. Coach worker owns the new nutrition week, its API hooks, tabs, and browser scenarios. Frontend cleanup worker owns old coach/client screen removal and the food catalogue. Root owns cross-domain backend cleanup, seeds, API keys/generation, integration, and final verification.

Review focus: past applicable weekdays rather than merely old creation dates; same-day edits and Undo; competing target assignments; cross-client and cross-tenant nested ids; partial/unknown nutrient totals; unsaved dialog and editor recovery.
