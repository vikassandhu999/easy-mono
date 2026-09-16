# Personalize a client nutrition plan

When a client's needs change, the coach needs to adjust daily targets, meal choices and portions in their assigned copy while preserving the reusable template. This is an occasional follow-up task on a phone or desktop, entered from Client Overview.

## Screen brief

Open an assigned current or upcoming plan and choose Personalize nutrition plan. The worksheet identifies the client and plan dates, explains whose copy changes, and keeps daily targets above the meals. Compact day variations show one menu at a time. Optional guidance stays collapsed. Preview meals resolves nutrients on the server; Save client plan updates the copy and returns to the overview with a saved message.

A step-by-step targets/meals wizard and a single worksheet were considered. Choose the worksheet: portions and targets need to remain available together, and a coach changing one meal should not traverse unrelated steps. Reuse the nutrition worksheet for both templates and client copies, separating route loading and ownership checks from editing.

Loading supports retry. A plan from another client or a template in the client route never opens an editor. Archived plans cannot be edited. Unsaved navigation prompts before leaving. Partial writes keep the successful revision; conflicts and uncertain writes retain the draft and offer the saved version. Client coverage refreshes after mutations. Nutrient values and persisted selections stay on the server. Assignment dates, nutrition logs, and creating foods/recipes remain separate tasks.

## Verification plan

Use the real API at 375px and 1280px: entry and return, changed targets and portions, preview retry, compact variations, persistence and client access, unchanged template, partial-save retry, conflict recovery, lost response, ownership mismatch and account switching during a save. Run the shared nutrition browser suites, build, Biome, check-rm and backend precommit. Inspect screenshots at both widths.

## Results

Verified on 2026-09-11. Client nutrition editing and both shared nutrition browser suites passed at 375px and 1280px. The tests cover current and upcoming copies, server meal nutrients, nullable targets, independent day variations, preview retry, partial writes, conflicting revisions, lost responses, ownership mismatches, archived plans and session changes during a save. Template comparison uses the post-assignment snapshot because the server's assigned-client count changes when a client receives a plan.

Screenshots were inspected at both widths. The mobile meal worksheet keeps portions and the save action visible; names, meal headings and optional guidance retain their hierarchy. This is browser verification, not a target-coach usability session or a physical-device keyboard check.

Build, Biome, check-rm and backend precommit passed (1,645 tests, zero failures). No backend contract changed. Vite retains its bundle-size warning. Graph reference lookup timed out, so bounded source reads and reference searches supplied the evidence. No legacy app UI was inspected or copied.


The 2026-09-16 recovery audit verifies failed saved-version reloads retain edited targets, close the dialog, focus the error, and offer keyboard retry. Successful reloads focus their result. Full client personalization and shared nutrition regressions pass at 375px/1280px against the normal API/app; see NUTRITION-01 in the route audit.

The subsequent worksheet audit verifies hidden day/meal/portion validation and long-content wrapping at both widths. The shared worksheet reveals and focuses an invalid field once per Save or Preview attempt, preserving navigation between day menus. Shared preview wrapping also applies to client overview and assignment. Full client personalization and authoring/assignment regressions pass; see NUTRITION-02 for evidence and local verification limits.
