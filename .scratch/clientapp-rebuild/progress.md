# Mobile weight and progress

## Situation and action

The client wants to record a weight and see how their measurements changed over time. Weight & progress opens from Today and Account. Record weight is the primary action. Training, nutrition and check-in history retain their own saved readers and entry points.

Two arrangements were considered: a combined dashboard of all history, and a focused weight screen linking to the established histories. Use the focused screen. A latest measurement, goal when present, server-calculated change, compact trend and dated records answer the immediate question without adding another dashboard. Phones, tablets and wide browsers use the same 480px-capped layout.

The record editor uses the client's local date, a decimal keypad, explicit kg/lb units and an optional note. Picking a date with a self-recorded measurement opens that value for replacement instead of silently creating a second entry. Form measurements retain their provenance and link to the submitted response; the self-recording action must not replace those records. Show the saved value/date after confirmation and return to the filtered history.

## Contract evidence and prerequisites

The client weight index returns an unbounded list with goal and summary. The coach's `weight-progress` query already provides opaque cursor pages, server count, mixed-unit conversion, full-range summary and daily chart points. Expose the same calculation through a client-self context function and typed route. A direct date lookup returns only the client's self-recorded measurement, so the editor and lost-response recovery do not depend on paginated history. History rows include the tenant-scoped form assignment reference for opening their saved source. Keep the legacy index compatible. Date ranges are bounded to one year; the client passes its local date as the end date.

Self-recorded weights have one row per date. The context locks the client before upsert or deletion, and form measurements are separate rows. The current upsert overwrites a competing edit without checking what the caller observed. Add optional expected-entry identity and revision for safe mobile writes, retaining compatibility for callers that omit it. The database owns the revision. A stale create/edit/delete must return conflict without overwriting another device's change. Recreating a date must not make an earlier entry's revision valid again.

Profile GET/PATCH supports a goal value/unit. Email, timezone, default weight unit and notification preferences have no profile write contract. Implement only supported account fields. A display-unit choice may be local and account-scoped, with clear ownership; it is not a change to the coach's default unit.

## Reading and recovery

Provide loading, no measurements, failed initial read and failed older-page states. Preserve the selected date range and loaded records on retry. Counts, chart scale, conversion and total change come from the server, never from downloaded pages. A single or constant measurement must remain readable.

Persist unsaved date/value/unit/note and the observed entry before claiming the draft is saved. Restore the verified account's draft after backgrounding, restart or offline reload. Cached progress is visibly dated. Saving remains deliberate and requires connectivity. After a lost response, read the authoritative day before retrying; matching saved content confirms the result. A competing value requires explicit review. Deletion requires confirmation and reconciles an already-absent entry. Logout clears private drafts and cache; stale work must not cross accounts.

## Verification plan

Router tests cover client/tenant isolation, page continuity, filtered counts, unit conversion and chart independence from pages. Write tests cover simultaneous creates, competing updates, delete/recreate identity, stale deletion, form provenance and legacy compatibility. Generate contracts and run full backend precommit before the contract checkpoint.

Browser scenarios cover empty/history states, record/edit/delete, form provenance, mixed units, filters/cursors, lost responses, conflict review, storage failure and offline draft recovery at 375/768/1280px. Native checks cover the decimal keyboard, reachable save, process restart and saved read-back on iOS and Android. Physical-device and real-client observations remain separate.

Source evidence: bounded reads of `Easy.WeightEntries`, `WeightEntries.Progress`, `WeightEntries.Input`, `Fitness.WeightEntry`, client/coach weight controllers, shared typed responses and coach progress router tests. Graph tools were unavailable in the current catalog; source fallback was used. No v2 implementation was consulted.

## Contract checkpoint evidence

The typed client progress/date reads and observed writes are implemented. Sixty-six focused tests pass, including simultaneous creates/updates with one winner, stale deletion, delete/recreate identity, database revision constraints, form provenance, client/tenant isolation, server counts, bounded ranges and cursor continuation. Full backend precommit passes 1,844 tests and validates 175 typed routes. Generated schemas, strict client/coach builds, Biome, repository shape checks and API review pass. The isolated development API is migrated and restarted. Logs: `/tmp/easy-clientapp-progress-{contract-tests,precommit,gen-api,build,coach-build,shape}.log`. This checkpoint supplies contracts and hooks; weight screens and their recovery verification remain pending.
