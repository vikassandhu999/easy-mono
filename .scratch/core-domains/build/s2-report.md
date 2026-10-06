# Slice 2: Nutrition

Status: implemented and verified in the existing working tree on `codex/core-domains`. No branch or worktree was created. Nothing was committed or pushed. Existing slice-1 work was preserved. `frontend/apps/clientapp-v2` was not changed.

## Foundation

The record journal no longer checks coaching terms. It takes the actor from Ctx: client membership id for a client, coach membership id for a coach. Record creation uses the same actor tuple. The journal locks the client, runs the operation, then allocates a sequence and writes history only when there are changes. No-op requests do not update the sequence. Failed operations roll back all writes.

The HTTP gate remains the single write-eligibility gate. A final regression test exposed a gap: it checked today's term but accepted an extra meal on a date outside coaching. `RequireCoaching` now checks both today's term and the requested diary date. The journal remains independent of that policy.

Shared schemas and plan behavior moved to `Easy.Plans`: Template, Plan, Revision, Reader, Programming, and Domain. Training and Nutrition use the same assignment, publication, revision lookup, withdrawal, archive, date rules, and coverage. The registry selects each domain's content validator and read projections. Shared queries explicitly scope the domain. The overlap query also scopes the domain, so Training and Nutrition can cover the same client date. Retired Training plan modules were removed, and their consumers were updated.

## Backend and contract

Nutrition uses `foods`, `recipes`, shared plans and revisions, `diary_meals`, and `diary_entries`. The prototype migration removes the old nutrition plans, diary days, diary slots, and recipe ingredient table. The development and test databases are migrated through `20261006000100`.

Foods store nutrient maps per 100 g and servings with stable ids. Recipes store ingredient JSON, yield, and optional cooked weight. Library search, cursor pagination, categories, tags, media, copying, and usage reads use the new model. Foods and recipes are archived. The seed preserves missing and non-numeric nutrients as unknown and imports sugar. Seeds ran successfully and imported 55,228 foods.

Nutrition content contains range targets, meals and tagged items, custom slots, day patterns with complete target overrides, and seven stable schedule entries. Assignment and publication copy names, gram weights, and nutrients. Published values survive library edits. Same-source portion changes scale copied values; notes-only corrections preserve eaten values. Recipe ingredient contributions are also copied so food metrics retain their historical meaning.

Meal replacement uses one client-locked journal transaction. Entries keep their identities, request ids, and removal tombstones. Added, changed, and removed rows appear in history. Replays and unchanged replacements do not allocate another sequence. Constraint errors for duplicate record and request ids become validation responses and roll back the request.

The `records` view includes meals. SQL `expected_meals` uses the shared `plan_covers` rule and the revision in force. Day reads calculate totals, known-entry counts, targets, target revision, and expected/recorded counts. Missing intake is `Not recorded`. Calorie adherence bands and calculated percentages are removed. Food metrics include direct foods and recipe ingredients.

The typed contract and both retained app schemas are regenerated. Plan details and content save in one request. Existing resource paths remain; separate menu-save routes are removed. The contract adds revision withdrawal and food metrics. The type generator and formatter support sparse dictionaries, string-keyed values, tagged portions, and absent optional target bounds. Chat meal references retain the meal name and record revision; request retries do not duplicate notes.

## Coach app

The builder edits target ranges, per-pattern overrides, meals with food or recipe portions, custom slots, and the weekly schedule. It supports assignment, immediate and future publication, scheduled content preview, withdrawal, and the P4 notice. Its form preserves unsaved work after failures and offers conflict recovery.

Food and recipe editors use the nutrient map, stable serving ids, and ingredient JSON. Blank nutrient inputs mean unknown; zero remains a known zero. Food edits preserve micronutrient keys outside the displayed fields. Library maintenance uses archive language.

Client Nutrition history has day and week views, expected/recorded meal counts, `Not recorded`, unknown-aware totals, target ranges, the target revision number, and the target-changed notice. Food metrics show entry counts, day counts, average grams, and supplied nutrients.

## Client app

Today shows expected slot names and recorded counts. The meal logger supports planned options and items, swaps, extra foods, quick adds, portion edits, entry notes, and a note to the coach. The library picker scales its nutrient display to the labeled portion.

Account-scoped drafts retain the exact outgoing meal and entry request ids. An uncertain response keeps the attempt until an explicit `Check meal save`. Reconnection does not send it automatically. Conflict recovery can adopt the record created by another device after the client reviews the draft. Meal-name conflicts preserve the draft for renaming. Planned meal names can be changed without changing the plan slot.

## Choices where the documents were silent

1. Shared domain is a trusted explicit argument, not an editable body field. Domain callbacks provide content validation, summaries, and coverage projections.
2. The coach journal API is `write_for_client(ctx, client_id, operation)`. It prepares for coach Tracker records; no coach workout or meal recording endpoint was added.
3. All food and recipe removals archive, including unused items. This keeps one lifecycle and preserves references.
4. Food serving ids are stable strings; the UI generates UUIDs. Recipes use the standard serving id `serving`. Recipe mass uses cooked weight when supplied, otherwise ingredient mass. A zero-yield recipe may remain a draft but cannot be prescribed or logged.
5. Recipe ingredient contributions are embedded in copied item and entry values. No recipe version table or ingredient history table was added.
6. Totals are unknown if any included entry lacks the nutrient. Empty totals are unknown with zero counts. Known-entry counts remain available in both cases.
7. The target-changed flag requires an actual effective target difference published on the same client-local date. A revision scheduled earlier takes effect at the day boundary and does not set this flag. Pattern overrides are included in the comparison.
8. New planned records must reference an offered slot for that date. Future revisions cannot be used early. Existing records keep their captured revision and its original options after later publication.
9. A request can replace several meals. The meals share one transaction and journal sequence; any failure rolls back all of them.
10. Quick add requires a name and calories. Other registered nutrients are optional. Source, portion, and grams are absent.
11. Slot names are trimmed and unique within a pattern. Recorded meal names remain editable to resolve collisions with extra meals. Slot ids remain unchanged.
12. Date-range reads allow at most 366 inclusive dates. The coach metrics screen uses the week containing the selected date. The API accepts other explicit ranges.
13. New templates start with one empty Everyday pattern and seven schedule entries. Pattern target overrides start as a copy of plan targets. Removing a pattern requires a replacement for its days and retains schedule-entry ids.
14. The UI shows calories, protein, carbs, fat, fiber, and sugar. Food edits retain other nutrient keys. Nutrient display rounds to one decimal place; requests retain entered precision.
15. Foods without a default serving start at 100 g. Recipes start at one standard serving. Planned items start unrecorded until the client selects them or uses `Record all listed items`.
16. Entries are returned in insertion-time order with id as a tie-break. Food metrics count a food once per entry, combining repeated contributions from that entry.
17. When conflict review adopts a different prescription, retained draft foods become extra entries and their old planned-item links are cleared. The UI explains this before confirmation.
18. Draft format version 2 rejects the retired Nutrition shape. It does not convert prototype drafts. Removed browser/native fixtures and development seed scripts referenced deleted models. Current Nutrition test commands use the new retained-app flow. The obsolete root E2E harness that targeted clientapp-v2 was removed; the v2 app itself was untouched.

## Verification

All required checks passed on the final source.

| Check | Result |
|---|---|
| `rtk mix precommit` in backend | Passed: compile, format, generated-contract drift, Credo, **672 tests, zero failures** |
| `rtk just gen-api` | Passed: 126 typed routes; only retained apps generated |
| `rtk pnpm -C frontend/apps/coachapp build` | Passed: TypeScript, unit checks, Vite |
| `rtk pnpm -C frontend/apps/clientapp build` | Passed: TypeScript, unit checks, Vite |
| `rtk pnpm -C frontend lint:ci` | Passed: Biome and design lint |
| Training `tests/training/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375, offline and lost-response recovery, earlier occurrence, weekly results, PRs |
| Nutrition `tests/nutrition/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375, complete requested flow, offline draft and lost-response recovery |
| Recipe `tests/recipes/recipes.browser.mjs` | Passed live at 375/1280, including failed-save recovery |
| Coach `test:visual-hierarchy` with `HIERARCHY_PHASE=s2` | Passed all 16 screen/viewport combinations |
| Source whitespace check | Passed for backend, frontend, and CONTEXT.md |

The Nutrition flow creates a food with unknown fiber, uses a 50 g serving, builds Training day and Rest day patterns with different targets and custom slots, assigns the template, publishes a target change, schedules and withdraws a revision, and records planned intake, a swap, an extra food, and a quick add. It changes library calories and checks that the published item remains 200 kcal. The diary reports 740 kcal, fiber unknown with 1 of 4 entries known, 1 of 2 planned meals recorded, the target-changed notice, and food metrics. It recovers a committed save whose response was lost without a second write.

Evidence: [screenshots and browser results](s2-screens/), [backend check log](s2-precommit.log), and [independent review](s2-review.md). The review's four findings are addressed. Detailed reports are [foundation](s2-foundation-report.md), [shared plans](s2-shared-plans-report.md), [backend](s2-backend-report.md), [coach](s2-coach-report.md), and [client](s2-client-report.md).

## Limits

No requested slice-2 feature is deferred. Trackers, reviews, occurrence exceptions, multi-week cycles, water, supplements, fasting days, and micronutrient target controls remain out of scope.

Native devices and simulators were not tested. Browser results establish the requested browser behavior. Vite reports its existing large-chunk warnings; both builds pass. Local synthetic test accounts remain available. Phoenix runs on port 4000; the retained app servers use 2022 and 1315.
