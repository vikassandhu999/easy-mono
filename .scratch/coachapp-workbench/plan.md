# Implement the unified coach workbench

Status: resolved
Date: 2026-09-17
Execution: local implementation verified on 2026-09-17; [evidence](verification.md). Deployment and coach feedback remain separate.

Implement the [workbench specification](spec.md) as one vertical feature. The steps below record the implementation sequence. The [verification record](verification.md) supplies completion evidence; [deployment learning](deployment-learning.md) records the remaining external validation.

## 1. Confirm defaults and establish the baseline

Review the proposed defaults at the end of the specification. Record any adjustment before coding. In particular, confirm missing-plan precedence, separate items per service, intake review inclusion, and first-page count refresh.

Read the root, backend, frontend, and coachapp instructions. Use `.scratch/coachapp-rebuild/plan.md` and `CONTEXT.md` for UX and domain constraints. Do not consult coachapp-v2. Preserve running development services and unrelated working-tree changes.

For an implementation session, create individual issue files under `issues/` using [the issue-tracker conventions](../../docs/agents/issue-tracker.md). Claim one issue and use its branch naming convention. These documents are planning artifacts, not ready or claimed implementation tickets. Do not infer push or deployment authorization from this plan.

Recheck graph availability and project freshness. Follow the repository's graph and coverage rules when available. If unavailable, document targeted source fallback. Inspect the concrete callers before removing any API or shared behavior.

Capture representative performance through the public context operations using `backend/test/easy/workbench_query_plan_test.exs`. Run fixtures only in a verified test database. Record SQL, parameters with sensitive values removed, plans, and timings. Establish owner and assigned-coach baselines separately.

Exit evidence: recorded defaults, source/consumer map, reproducible baseline, and fixture database isolation.

## 2. Define the item contract and reusable eligibility queries

Keep `backend/lib/easy/workbench.ex` as the context entry. Introduce an explicit item-list operation and source query functions. Follow the backend direction from controller to context to query to Repo.

Reuse the eligibility rules in the check-in, reply, programming, onboarding, quiet, and expiring sources. Extract query composition only where the unified operation needs it. Preserve the public legacy queue responses during the additive phase.

Add an authorized unreviewed-intake source. Verify actual intake submission linkage and review eligibility before finalizing its query. Split programming output into client/service items without duplicating the coverage algorithm.

Specify fixed kinds, typed reasons and targets, opaque identities, nullability, tie-break ranks, and the SQL ordering normalization described in the spec. Encode the discriminated response in OpenApiSpex and the JSON renderer together. Keep UI labels and route construction in coachapp.

Write meaningful tests for membership, one-row-per-identity, intake review, two required services, and tenant/coach visibility. Preserve review and conversation source-specific lifecycle rules.

Exit evidence: focused query tests, source predicates shared with legacy behavior where appropriate, and schema/renderer agreement.

## 3. Implement database paging, counts, and the additive API

Add the proposed item route through `backend/lib/easy_web/controllers/coaches/workbench_controller.ex` and the router. Keep the controller to parameter handling, one context call, and rendering. Confirm the correct OpenAPI location from the real implementation before editing it.

Build the narrow `UNION ALL` projection and its total order. Apply authorization, eligibility, and search before pagination. Use `limit + 1` for continuation. Batch display enrichment by the selected IDs without a query per row.

Extend or reuse `backend/lib/easy/workbench_page.ex` without changing legacy cursor semantics. Add version, scope binding, view, filter, total-order position, and evaluation instant to the unified cursor. Validate all fields and recover malformed/incompatible requests through the established 422 response.

Implement nullable counts and `include_count` explicitly. Count the complete filtered item relation before applying the cursor. Use one short snapshot for requested count, row selection, and enrichment. Compare a single-statement approach with a short read-only repeatable-read transaction if both remain small and understandable.

Test tied ordering values, all kind boundaries, empty pages, deleted anchors, cross-view and cross-scope cursors, wildcard search, changed records, and midnight evaluation. Verify that current authorization always applies, even with an older cursor.

Run API generation and the repository's [API-change workflow](../../.claude/skills/api-change/SKILL.md) when actual JSON changes exist. The user's prohibition on consulting coachapp-v2 takes precedence over legacy inspection paths in that workflow. Keep generated consumer updates mechanical and do not consult old-app handwritten source or UX. Document any resulting retirement-evidence limitation.

Exit evidence: focused controller/schema tests and generated coachapp types matching the actual response. Legacy contracts remain unchanged.

## 4. Measure the unified operation

Extend the query-plan test with first and later cursor pages for both views. Include counts on and off, search, many businesses, one large business, sparse assignments, deep plan history, and different waiting-work proportions.

Separate time spent on eligibility, count, sort/page, and display enrichment. Inspect `EXPLAIN (ANALYZE, BUFFERS)` and request timings. Track buffers, examined rows, query count, and spill behavior. Treat useful sequential scans on small inputs as valid plans.

Add an index only when measurements demonstrate its purpose. Compare the unreviewed-submission candidate against existing indexes. Verify partial-index predicates and the owner/coach join plans. Measure before and after each change using the same fixtures.

If the final sort is material, compare source-local candidate limits with the unrestricted reference query. Use equivalence tests covering ties, filters, empty sources, and cursor boundaries. Do not use limited candidates for exact counts. Leave this optimization out if it adds complexity without meaningful benefit.

Check whether optional count calculation requires a small backward-compatible extension to shared pagination metadata. Avoid a second pagination implementation. Record a realistic latency budget before release and evaluate it with repeated measurements. Do not promise a fixed percentage improvement from fewer endpoints alone.

Exit evidence: benchmark report with raw reproduction commands, environment details, query plans, and a justified index decision. Any unmet budget has a measured cause and a bounded follow-up.

## 5. Replace the coachapp workbench interaction

Update `frontend/apps/coachapp/src/api/workbench.ts` and the owning query-key definitions to use generated types. Preserve abort signals and session guards. Add view-specific infinite keys and a separate lightweight follow-up badge query. Use the generated nullable count contract explicitly.

Update the workbench screen and row rendering under `frontend/apps/coachapp/src/workbench/`. Render Awaiting you by default, Follow-ups as the secondary view, server-side client search, and one primary action per item. Remove the six-choice UI and its unused screen state once the replacement works.

Reuse `api/pagination.ts`, `ui/infinite-list.tsx`, and `ui/list-location.ts`. If first-page count metadata needs shared support, preserve other lists' behavior and add a focused compatibility test. Never derive totals from downloaded rows.

Map typed targets to existing review, intake, conversation, client-details, and service-assignment routes. Preserve return location through intermediate screens and save/cancel actions. Keep supported snooze controls in Follow-ups. Retain full reasons and dates at mobile widths.

Update mutation invalidation in API hooks for reviews, conversation outcomes, required-service changes, plan changes, intake status, engagement changes, snooze, access changes, and coach reassignment. Reuse applicable socket invalidation. Avoid feature-component invalidation and duplicate subscription machinery.

Refresh from `start` after workbench-affecting actions and maintain usable focus/scroll restoration. Handle stale, removed, or unauthorized targets at their destination. Ensure account changes discard prior requests and caches.

Exit evidence: one shared row/list interaction, working complete task journeys, and no six-queue fetch fan-out from the replacement screen.

## 6. Verify behavior and retire proven-unused code

Run all acceptance scenarios in the spec. Extend `frontend/apps/coachapp/tests/workbench/workbench.browser.mjs` at 375px and 1280px. Cover search beyond page one, keyboard loading/retry, three pages, both services, intake review, full return flows, count failure, refresh failure, and delayed account replacement.

Run affected destination regressions for reviews, intake follow-up, conversations, plan assignment, engagement updates, and shared lists. Select additional regressions from the actual diff. Browser automation uses disposable local data and must not send messages to real clients.

Run the required backend and frontend gates after the focused checks pass. Commands below run from the repository root except where a working directory is specified:

```sh
rtk just gen-api
rtk just check-rm
rtk pnpm -C frontend/apps/coachapp build
rtk pnpm -C frontend/apps/coachapp test:workbench
rtk pnpm -C frontend/apps/coachapp test:lists
```

Run `rtk mix test` with the touched backend test paths and `rtk mix precommit` with `backend/` as the command working directory. Inspect the configured browser environment before running suites. Never stop another service to free a port. No command in this section was executed as part of writing this plan.

Remove obsolete coachapp-only queue components, hooks, adapters, and tests when their replacement coverage passes and callers are known. Preserve source query rules that other endpoints still need.

Retire old backend routes only with verified consumer evidence. The live legacy consumer and the prohibition on inspecting its source make removal a separate decision if evidence is incomplete. Keeping compatibility endpoints does not require keeping a second coachapp UX.

Update the implemented workbench brief and completion ledger only after implementation verification. Mark historical behavior as superseded and link the new evidence without erasing prior results. Review relevant documentation references when retiring an artifact.

Exit evidence: focused and required checks pass, cleanup is supported by caller evidence, limitations are explicit, and no implementation status is inferred from this planning task.

## 7. Prepare deployment learning

Record the chosen ordering version and feature behavior in release notes. Keep backend changes additive until the new frontend and its rollback path are verified. This plan does not require a permanent feature-flag framework or database task table.

Use existing telemetry for action opens, source-confirmed outcomes, returns, and latency where available. If no telemetry exists, specify the smallest measurement addition as a separate scoped task. No sensitive message, answer, client identity, or search content belongs in analytics.

Before deployment, obtain the separate authorization required for that action. Prepare a small coach review using WB-01 through WB-07 and an interrupted-session scenario. After use, record specific missed work, unclear priority, repeated client rows, and work tracked elsewhere.

Change the workbench based on those observations. A preference for batching may justify a kind filter. Repeated client switching may justify grouping. Neither is included solely because it might be useful later.

Exit evidence: deployment readiness, a concrete review script, and a named location for observations. Actual coach feedback and deployed performance remain outstanding until collected.
