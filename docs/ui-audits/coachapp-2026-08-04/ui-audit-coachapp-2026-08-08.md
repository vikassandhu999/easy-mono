# CoachApp nutrition plan Add-to-client audit — 2026-08-08

Targeted continuation of the CoachApp UI-quality run. Scope: nutrition builder plan→client picker and assignment, with the nutrition-plan list as the post-action cache surface and the training builder as a shared-control smoke check.

## Coverage

| route | role | viewport | states covered | result | finding ids |
|---|---|---:|---|---|---|
| `/library/nutrition-plans/:id` | coach | 1280 | picker, invited client, cross-discipline Cancel/Choose dates, safe defaults, optional end, presets, reversed-range validation, pending lock, exact request, overlap retry, retained dates/error clearing, assigned-copy title | pass | AC-001, AC-002, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009 |
| `/library/nutrition-plans/:id` | coach | 375 | mobile sheet, grouped/search-empty states, invited/phone-only identity, Escape/focus restoration, same-discipline block, popup semantics | pass for shared picker states; dated write round trip exercised at desktop | AC-001, AC-002, AC-004, AC-005, AC-006, AC-007, AC-008 |
| `/library/nutrition-plans` | coach | 1280 | assigned-client count invalidation after successful assignment | pass: `NB fixture — Lean Bulk` refreshed from `4 clients` to `5 clients` | AC-003 |
| `/library/nutrition-plans` | coach | 375 | list shell and cached-count surface | pass for responsive surface; invalidation round trip exercised at desktop | AC-003 |
| `/library/training-plans/:id` | coach | 1280 | trigger semantics, picker, autofocus, phone-only identity, uncovered client → date step, safe start/open end | pass for shared shell and date defaults | AC-004, AC-005, AC-007, AC-008 |
| `/library/training-plans/:id` | coach | 375 | mobile picker/date step, zero POST on selection, safe defaults, add/clear end, 4/8/12-week presets, Back without POST, pending lock, exact open-ended request, success toast/action, same-discipline block | pass | AC-004, AC-005, AC-007, AC-008 |

The authorized live write-path used pending client `Test Add Client 20260808 Dates` (`b0777a84-f0a7-4dff-af95-0ad424d9b5e8`). Mobile training assignment created copy `b55dba1c-27e3-4432-a6ba-3cae3f97df60` with `start_date: 2026-08-08` and `end_date: null`; desktop nutrition assignment created copy `31b9df89-e530-467a-8402-d85d0892c112` with `start_date: 2026-08-20` and `end_date: 2026-09-17`. Selection itself emitted no POST, pending state removed every dismissal/edit path, each submit emitted exactly one request, the training toast action opened the returned copy, and the nutrition copy title was verified directly. Repeating the nutrition range returned the real 422 overlap shape, retained both dates, announced actionable inline copy, and cleared that stale error when the range changed.

## State checklist

- [x] Default grouped list
- [ ] Loading skeletons
- [ ] Empty roster
- [ ] Error and successful Retry
- [x] Search with no matches
- [x] Invited client row
- [x] Phone-only identity fallback
- [x] Search autofocus
- [ ] Keyboard focus order
- [x] Escape/close and focus restoration
- [x] Uncovered client → date step → assignment — mobile training round trip passed with zero POST on selection
- [x] Safe start-date default and open-ended end default — desktop and mobile live pass
- [x] Add end date plus 4/8/12-week presets
- [x] Same-day range and reversed-range validation — same-day focused check passes; reversed range blocks live submission and announces the field error
- [x] Cross-discipline coverage confirmation → Choose dates — Cancel emitted no request; Choose dates advanced to scheduling
- [x] Same-discipline overlap prevention
- [x] Back to clients without a POST
- [x] Pending lock and exactly one POST
- [x] Success toast and Open their copy — training action reached the returned ID; nutrition assigned-copy title verified directly
- [x] Future/scheduled overlap error — 422 retained the entered dates, announced actionable inline copy, and cleared on edit
- [x] Assigned-copy title
- [x] Nutrition-plan list count refresh without reload — template refreshed from `4 clients` to `5 clients`
- [x] Settled console and relevant network responses — no action-related errors; Chromium reported a non-blocking missing `id`/`name` autofill issue on a search field

## Findings

### AC-001 — eligible clients are filtered after the limited server page

- Route/state: nutrition builder → Add to client → default list
- Viewport: 375 and 1280
- Severity: behavioral defect
- Evidence: pre-fix AXI rendered 26 client buttons at both widths. A fail-capable live API summary returned `{total: 56, returned: 30, statuses: {active: 25, pending: 1, inactive: 4}}`; the four inactive rows consumed slots before the client-side filter. Post-fix active/pending server pages merge into 30 eligible rows at both widths, including the tail Test row.
- Classification: behavioral defect
- Status: eligibility-before-limit fix remains; a concurrent working-tree edit changed `CLIENT_PICKER_PAGE_SIZE` from the audited 30 to 20 during the AC-008 follow-up, so the 30-row contract is no longer satisfied. This date-step change did not overwrite that external edit.

### AC-002 — same-discipline overlap is offered as a valid Add anyway action

- Route/state: nutrition builder → Add to client → select client with nutrition coverage
- Viewport: 375 and 1280
- Severity: behavioral defect
- Evidence: pre-fix selection of seeded Rowan White opened `Add "NB fixture — Lean Bulk" as well?` with `Add anyway` and promised a second active plan. Post-fix the same selection opens `Can't add "NB fixture — Lean Bulk" yet`, names `Cutting Phase`, provides Close only, and emits zero assignment POSTs.
- Classification: behavioral defect
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/plan-add-to-client.tsx`; live block passes

### AC-003 — nutrition assignment does not invalidate the template list

- Route/state: assign from builder → return to cached nutrition-plan list
- Viewport: 375 and 1280
- Severity: behavioral defect
- Evidence: pre-fix `useAssignNutritionPlanMutation` omitted `nutritionPlanKeys.lists()` invalidation. The mutation now invalidates template lists. During the authorized live round trip, `NB fixture — Lean Bulk` was observed at `4 clients` before assignment and refreshed to `5 clients` after the 201 response without a hard reload.
- Classification: behavioral defect
- Status: fixed@`frontend/apps/coachapp-v2/src/api/nutrition-plans-list.ts`; live round trip passes

### AC-004 — Add-to-client trigger advertises a listbox but opens a dialog

- Route/state: nutrition builder header trigger
- Viewport: 375 and 1280
- Severity: objective accessibility defect
- Evidence: pre-fix AXI reported `button "Add to client" expandable haspopup="listbox"` while the opened surface was a named dialog. Post-fix nutrition and training builders report `haspopup="dialog"` at 375 and 1280.
- Classification: objective visual/accessibility defect
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/plan-add-to-client.tsx`; live AXI semantics pass

### AC-005 — phone-only client identity can render blank/null

- Route/state: picker row and assignment success toast
- Viewport: 375 and 1280
- Severity: behavioral/accessibility defect
- Evidence: pre-fix row rendered only nullable `email` and the toast fallback stopped at nullable `email`. Post-fix the phone-only Test row renders `+15550120808` in nutrition and training pickers at both widths; the assignment recipient shares full-name → email → phone → `Client` fallback.
- Classification: behavioral defect
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/client-picker-data.ts`; live identity and focused check pass

### AC-006 — assigned nutrition copy omits client identity in the page title

- Route/state: Open their copy
- Viewport: 375 and 1280
- Severity: system inconsistency
- Evidence: pre-fix nutrition builder rendered only `plan.name`; training builder and `design-handoff/COPY.md` use `{plan} — {client}`. The assigned Test copy rendered `NB fixture — Lean Bulk — Test Add Client 20260808 Phone` at `/library/nutrition-plans/19460f2f-5c0f-4738-9011-54635114f316`.
- Classification: system inconsistency
- Status: fixed@`frontend/apps/coachapp-v2/src/nutrition-plans/builder/index.tsx`; live title passes

### AC-007 — open-ended training plans disappear from current-plan enrichment

- Route/state: nutrition builder → Add to client → pending client with active open-ended training plan
- Viewport: 375 and 1280
- Severity: behavioral defect
- Evidence: the Test client had active training copy `e5992636-6a04-4c8b-be86-7be703a5ddf5` with `start_date: 2026-08-08`, `end_date: null`, but `include_plans=true` returned `training_plan_name: null`, so the nutrition picker bypassed cross-discipline confirmation. Training's in-force queries used `end_date >= today`; SQL NULL made the predicate unknown. Post-fix the same live response returns `training_plan_name: "TB fixture — Push Pull Legs"`.
- Classification: behavioral defect
- Status: fixed@`backend/lib/easy/training/training_plan.ex`; fail-capable focused tests and live API pass

### AC-008 — builder assignment hides the effective date range

- Route/state: nutrition and training builder → Add to client → select an eligible client
- Viewport: 375 and 1280
- Severity: behavioral/product defect
- Evidence: after client selection the builder adapter immediately posted an invisible safe-today start with no end date, so the coach could neither schedule a future start nor choose a bounded period before creating the assigned copy. The user corrected the product decision on 2026-08-08: both builders now advance to a shared date step with a required safe-today start, optional/open-ended end, direct date input, and 4/8/12-week presets. Same-discipline current plans remain blocked; other-discipline confirmation advances to dates rather than assigning.
- Classification: behavioral defect
- Status: fixed in code at `frontend/apps/coachapp-v2/src/@components/plan-add-to-client.tsx` and `frontend/apps/coachapp-v2/src/@components/plan-schedule-step.tsx`; focused checks, typecheck/build, review, and the authorized mobile-training/desktop-nutrition round trips pass. Exact requests carried the chosen dates, pending state was non-dismissible, reversed and backend-overlap failures retained the surface, and success reached the returned copy.

### AC-009 — pending clients with open-ended plans are labelled as uncovered

- Route/state: builder → Add to client → pending invitation with an in-force open-ended plan
- Viewport: 1280
- Severity: behavioral/accessibility defect
- Evidence: after the open-ended training assignment, the enriched client response carried `training_plan_name: "TB fixture — Push Pull Legs"` and `covered_until: null`, while the picker row announced `No plan in force`. The row derived open-ended coverage from `status === "active"` instead of the enriched plan-name fields, so pending clients with assigned plans received contradictory status copy even though overlap decisions still used the plan name. After the fix and nutrition-copy cleanup, the same pending Test row announced `On an open-ended plan` while its training copy remained.
- Classification: behavioral/accessibility defect
- Status: fixed@`frontend/apps/coachapp-v2/src/@components/client-picker.tsx` and `frontend/apps/coachapp-v2/src/@components/client-picker-data.ts`; focused check and live AXI row pass

## Test-data ledger

| entity | purpose | created | cleanup status |
|---|---|---|---|
| `Test Add Client 20260808 Phone` (`f41df2cd-ceb0-4d3b-a6e0-8aa3fa9a7648`) | phone fallback, cross-discipline confirm, nutrition assignment | yes | revoked, HTTP 204; detail now 404 |
| training copy `e5992636-6a04-4c8b-be86-7be703a5ddf5` | cross-discipline coverage fixture | yes | deleted, HTTP 204; detail now 404 |
| nutrition copy `19460f2f-5c0f-4738-9011-54635114f316` | success toast, start date, assigned-copy title | yes | deleted, HTTP 204; detail now 404 |
| `Test Add Client 20260808 Dates` (`b0777a84-f0a7-4dff-af95-0ad424d9b5e8`) | dated training/nutrition assignment and overlap retry | yes | revoked, HTTP 204; detail now 404 |
| training copy `b55dba1c-27e3-4432-a6ba-3cae3f97df60` | mobile open-ended assignment, pending lock, toast action, same-discipline block | yes | deleted, HTTP 204; detail now 404 |
| nutrition copy `31b9df89-e530-467a-8402-d85d0892c112` | desktop bounded assignment, count refresh, overlap retry, assigned-copy title | yes | deleted, HTTP 204; detail now 404 |

Cleanup completed after verification. Detail probes for the three AC-008 IDs each return 404, and client/training/nutrition searches for `Test Add Client 20260808` each return count 0.

## Checks

- `pnpm -C frontend/apps/coachapp-v2 check` — pass, including `client-picker-data` and `plan-assignment-dates`
- `pnpm -C frontend/apps/coachapp-v2 build` — pass; existing HeroUI-generated CSS syntax and bundle-size warnings remain
- focused `biome check` over touched frontend files — pass
- dated-flow review found and fixed a duplicate-submit window plus an unannounced async error; follow-up review reports no findings
- AXI browser follow-up — authorized mobile training and desktop nutrition writes passed with exact request bodies and exactly one POST per submit. Training used `2026-08-08` → open-ended; nutrition used `2026-08-20` → `2026-09-17`. Pending locks, presets, Back without POST, cross-/same-discipline branches, reversed-range validation, success navigation/title, list-count refresh, 422 overlap retention/announcement/error clearing, and pending-client open-ended row copy all passed. Slow 4G was intentionally retained to observe pending controls. No dated-flow HMR/runtime error remained
- `mix test test/easy/clients/list_plan_names_test.exs test/easy/training_plans_test.exs` — failed twice before query fix, then 22 tests / 0 failures
- `mix precommit` — 1,096 tests / 0 failures; existing Credo refactoring opportunity at `backend/lib/easy/clients.ex:401` and existing unused test helper warning remain
- `./scripts/check-rm.sh` — pass
- `./scripts/check-ui-contract.sh` — pre-existing failure in unchanged `frontend/apps/coachapp-v2/src/@components/today-card.tsx:78,177`
- `git diff --check` — pass
- cleanup verification — all three Test IDs return 404; client/training/nutrition prefix searches each return count 0
