# Personalize a client training plan

When a client needs different exercises or targets, the coach needs to adjust their assigned copy while preserving the reusable template. The user requested continuing the rebuild with confident simplifications for maintenance.

## Screen brief

Enter from an expanded assigned plan on Client Overview. A dedicated worksheet identifies the client, explains which copy is being edited, and shows its dates. The coach adjusts workouts, movements, set targets and weekday scheduling, previews the draft, then chooses Save client plan. Success returns to the client overview with updated plan details and a saved message.

A separate client editor and a shared worksheet were considered. Use the same worksheet so target editing, validation, Undo and recovery behave consistently. Split route loading and ownership checks from editing; keep both in the training feature. Generalize the resource mutation name from useSaveTrainingTemplate to useSaveTrainingPlan and invalidate client summaries for client writes. No generic form framework or folder reshuffle is needed.

The API already supports revisioned client-plan details and prescriptions. Initial loading supports retry. Route client identity must match the server plan before mounting the worksheet. Archived plans are unavailable for editing. Unsaved navigation prompts, partial writes retain the successful revision, and conflicts or uncertain writes offer loading the saved version. Drafts are kept in memory, not across reload. Plan dates and workout logs are separate tasks.

## Verification

The browser scenario in tests/training/personalize.browser.mjs covers the real API at 375px and 1280px, template independence, client access, partial saves, conflicting revisions, lost responses, unsaved navigation and route ownership. Run test:client-training, the template regression suites, the app build, and `rtk pnpm -C frontend lint:ci`. The real API scenario and all three template worksheet suites passed at both widths on 2026-09-11. The app build, Biome and repository shape checks passed. Backend precommit passed 1,645 tests with zero failures; this slice changes no backend code or API contracts. Vite retains its bundle-size warning.

Browser-test recovery waits for the closing dialog to unmount before typing in the worksheet. Without that wait, programmatic typing could run while the background was still inert. Screenshots were inspected on mobile and desktop. A target-coach usability review and physical-device testing remain separate.

Graph discovery failed because the local MCP process exited. Bounded source reads and reference searches supplied the implementation evidence. No legacy UI was inspected or copied.


The 2026-09-16 worksheet audit reran client personalization against the normal API/app at both widths. Failed-save feedback and saved-version reload confirmations now have explicit focus assertions; independent template preservation, lost-save recovery, route ownership and archived access remain green. The shared worksheet also passes long-content and repeated reload checks in `worksheet-audit.browser.mjs`; see TRAINING-02 in the route audit.
