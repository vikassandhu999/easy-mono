# Builder and client visual hierarchy

When a coach edits a plan, form, library item or client, they need to identify the current object, scan its sections, and find the next action without reading every label.

Scope: training/nutrition worksheets (templates and client copies), forms, recipes, foods, exercises, coaching-page authoring, client roster, overview and details. Other router entries retain their existing design and are outside this requested pass. Do not consult coachapp-v2.

Approaches considered: more cards and accent treatments, or a consistent type and spacing hierarchy with fewer competing actions. Use the latter, preserving compact variations and borderless exercises. Keep existing behavior, APIs, server-owned values and recovery.

Findings: section headings currently range from 16px to 20px with inconsistent weights; editable names often look like supporting fields; saved-plan maintenance buttons stretch across the page; client plans are interrupted by unrelated sections, and all actions have equal emphasis.

Implemented on `ui-quality/coachapp-hierarchy-2026-09-18`. Screenshots and computed type metrics are under `/tmp/coachapp-hierarchy/{before,after}`. No target-coach usability claim is made by this visual pass.

## Changes

Editable plan and library names use 24px semibold. Compact form names and questions use 18px. Section headings use 20px, item headings 18px, and field labels keep their smaller existing size. The training worksheet keeps a larger plan title, 20px mobile/24px desktop workout names, and borderless 18px exercise headings. Collapsed workouts and day variations remain compact.

Saved-plan maintenance actions sit beside page navigation or the header rather than spanning the page. The client overview puts messaging beside client identity, groups check-ins and weight progress, and places training and nutrition together. Plan history uses text links; assignment remains a button. Onboarding still presents intake first. Counts and all persisted calculations remain server-owned.

Shared styling is limited to the requested page classes and explicit field variants. The ordinary Page/FormField defaults and other route layouts retain their existing presentation. Field variants live in the utilities layer so the input primitive's default typography cannot override them.

## Screen evidence

All rows were captured at 375px and 1280px. Each has full-page and viewport images, computed type metrics, no document overflow, and no uncaught browser errors. Screenshots use realistic content; existing worksheet audits additionally exercise long content.

| Screen / route | Captured state | Result |
| --- | --- | --- |
| Training `/training-plans/:id` | Saved plan, expanded exercises, collapsed variation, schedule | Passed; exercise row borders remain zero |
| Nutrition `/nutrition-plans/:id` | Targets, meal draft, added day variation and schedule | Passed |
| Forms `/forms/:id` | Saved section with required and optional questions | Passed |
| Recipes `/nutrition-recipes/:id` | Saved recipe, ingredient quantities and nutrition | Passed |
| Foods `/nutrition-foods/:id` | Saved food, per-100g values and serving section | Passed |
| Exercises `/training-exercises/:id` | Saved name, instructions and media controls | Passed |
| Coaching page `/coaching-page/edit` | Introduction draft, supporting/program/application sections | Passed |
| Clients `/` | Active client row with identity, filters and server count | Passed |
| Client `/clients/:id` | Active coaching client, missing plans and pending intake | Passed |
| Client details `/clients/:id/profile` | Contact, coaching, goal and access sections | Passed |

Template and client variants share the same training/nutrition worksheets. The client personalization suites verify both assigned-copy routes, saving and returning to the client. Client invitation/intake precedence is exercised separately by the intake follow-up suite. Create states, keyboard focus, overlays, validation, failed requests, dirty navigation, save and reload are covered by the affected behavioral suites rather than claimed from static captures.

`pnpm test:visual-hierarchy` captures all ten screens and checks semantic size relationships. Applying the same comparison to the before metrics fails for nutrition, forms, recipes, foods and coaching-page names at both widths; the after metrics pass. This caught an initial CSS layer mistake before completion. The probe also checks that exercise rows have no borders.

## Verification

All 13 affected regression suites passed: training workspace/worksheet/personalization, nutrition menu editing/worksheet/personalization, forms, recipes, foods, exercises, coaching-page authoring, client profile and intake follow-up. [The result manifest](visual-hierarchy-results-2026-09-18.json) names their logs. Their 42 changed captures were archived under `/tmp/coachapp-hierarchy/regressions/screenshots`; prior checked-in screenshots were restored.

The final visual sweep passed all 20 screen/viewport combinations and removed its eight created library/form/plan records, confirming each returns 404. Test accounts and clients, earlier capture fixtures, and the existing regression suites' retained fixtures remain in their disposable local `.test` businesses. Existing coach records were not used or changed.

The coach production build passes, retaining the existing bundle-size warning. Scoped Biome, `just check-rm` and `git diff --check` pass. Backend `mix precommit` passes: 172 typed routes, no Credo findings, 1,795 tests and zero failures. Gate logs are `/tmp/coachapp-hierarchy-build.log` and `/tmp/coachapp-hierarchy-precommit.log`. Nutrition's worksheet suite was rechecked after placing the day-name error beneath its field; that final log is `/tmp/coachapp-hierarchy/regressions/nutrition-worksheet-final.log`.

This pass does not establish physical-device behavior, deployed-provider configuration or independent coach usability.
