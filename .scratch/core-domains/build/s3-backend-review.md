# Slice 3 backend review

Final verdict: **spec compliance passed; code quality passed**. The finding below is addressed. The focused re-review evidence is recorded at the end of this file.

## Initial review

Reviewed 6 October 2026. Scope: Tracker backend, typed routes, migrations, shared integrations, and the two new Tracker test files. The review used the backend contract and the Elixir production-quality skill. No application code was changed. No full test gate was repeated.

**Spec compliance: one change required.** The core implementation follows the frozen Tracker model. One reproduced retry defect breaks the API contract for partial corrections.

**Code quality: acceptable after the retry defect is fixed.** The implementation reuses the shared template, journal, attachment, and unit modules. It keeps Tracker assignments separate from Plans. Controllers delegate domain work. The database protects fixed definitions, tenant references, assignment overlap, entry value kinds, and event links. This bounded review found no other material defect.

## P2: an accepted partial correction fails on an identical retry

Location: `backend/lib/easy/tracker_records.ex:241-245`, with the update path at lines 71-80.

The typed PATCH body permits omitted value and event fields. The changeset keeps those fields from the existing entry. However, `retry_matches?/2` compares every stored field against the submitted body and treats an omitted field as `nil`. Thus the accepted mutation and its identical retry have different results.

Reproduction against the local test database, in an SQL Sandbox transaction:

1. Create a text Tracker entry with `text_value: "Original"`.
2. Correct it with only `request_id: <new UUID>`, `expected_revision: 1`, and `local_date: yesterday`.
3. Send the identical correction again, including the same request id.

Observed output:

```elixir
{:first_patch, 2, "Original"}
identical_retry: {:error, :conflict}
```

The first call succeeds and preserves the text. The retry must return the accepted entry without a new journal sequence. It instead returns a conflict, which prevents recovery after a lost response. The same comparison also affects omitted event links that a correction preserves.

Compare retries using the accepted PATCH semantics, including retained fields, and keep rejection of changed mutation payloads. Add a regression that repeats a partial correction with the same request id and checks the entry and journal sequence.

## Evidence and limits

Source inspection covered immutable Tracker definitions; archive and unused deletion; dated assignments and exclusion constraints; first-term copy on coach start and invitation acceptance; new-business defaults and seed integration; shared template validation; coach/client record authorization; ordered private attachments; journal and historical request-id lookup; due items, requests, prompts, metrics, and distinct event coverage; unit conversion; PDF limits; and typed routes.

The existing Tracker tests cover the main paths above, including same-day assignment changes, first-term rollback, tenant denial, same-second requests, attachment order, distinct workout/meal coverage, and exact retries with complete values. They do not cover the reproduced partial-correction retry.

The focused reproduction ran with `MIX_ENV=test` and checked the Sandbox connection back in, so its fixture writes were rolled back. The backend owner is responsible for the final full precommit result; this review does not claim that gate passed.

## Re-review: ADDRESSED

The partial PATCH retry finding is addressed. The updated correction path preserves omitted values, event links, and ordered attachments. PATCH retry checks compare supplied fields against the accepted journal snapshot. Create retries retain the full comparison. Numeric corrections use the accepted unit and do not convert a retained base value again.

The three new regressions in `backend/test/easy/trackers_test.exs:442-483` cover partial text with an event link, partial numeric correction, and partial document correction. They check unchanged journal sequences on retries, rejection of a changed supplied value, retained attachment order, and a retry after a later correction.

The reviewer repeated the original rollback-only reproduction against the updated source. It now returns:

```elixir
{:first_patch, 2, "Original"}
{:identical_retry, 2, "Original"}
sequence: 2
```

The saved backend precommit log reports **752 tests, zero failures**. The backend report records 37 focused tests and 165 generated routes. No full gate was repeated during this re-review.

**Final bounded verdict: spec compliance and code quality accepted. No review finding remains open.**
