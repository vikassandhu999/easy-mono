# Slice 4 independent review

Reviewed current sources on 6 October 2026. This was a read-only implementation review. The only file written by this review is this report. Other agents were still changing the implementation. Tests and browser checks belong to the main agent; this review did not rerun them.

## Scoped re-review

Re-read `review.ts`, `review-screen.tsx`, and `tests/reviews/review.test.ts` after the two UI fixes. Both original findings are addressed in source. No suites were rerun. The main agent separately reports browser evidence for draft retention and lost-response retry; this review does not claim to have run those checks.

Final scoped closure: the cached-data refresh condition was re-read after its fix. All findings from this review are addressed in source. There are no open findings in this review's scope.

### Addressed: A failed mount refresh with cached data left the Review loading

Location: `frontend/apps/coachapp/src/reviews/review-screen.tsx:74` (the initial loading/error branch).

When a coach revisits a Review with existing query cache data, the hook forces a mount refresh. If that request fails, the query retains its cached `data`, sets `isFetchedAfterMount`, and reports an error. The snapshot effect rejects errors, so `snapshot` stays null. Before the fix, the initial render selected “Loading Review” because `(query.data && query.isFetchedAfterMount)` was true. It did not expose the error or Retry button.

The cached-data loading condition now also requires `!query.isError`. A failed request therefore reaches the error and Retry Review button. Retry calls `query.refetch()`; a successful result meets the snapshot effect conditions and loads the screen. This source fix addresses the finding. The main agent added the browser case for cached data, failed refresh, Retry Review, and successful load. This reviewer did not rerun it.

## Addressed findings

### Addressed: A removed child could label its whole record as removed

Location at review time: `frontend/apps/coachapp/src/reviews/review-screen.tsx:265`, with the visible result at lines 281 and 306.

`ChangeGroup` uses `group.changes.at(-1).action` for the whole record title and for the statement “This record was removed.” The last journal row can be a child row. It does not establish that the workout or meal was removed.

Concrete case: after a Review, the client removes one food from a meal that still contains other foods. `backend/lib/easy/nutrition_meal_writer.ex:53` emits a changed parent meal row and the entry rows. Line 198 emits a `removed` row for the removed entry. `backend/lib/easy/review_screen.ex:83` sorts equal sequence/time rows by the journal UUID. If the removed entry has the last UUID, the screen says that the whole meal was removed. Removing a performed set has the same risk: `backend/lib/easy/training_performed_sets.ex:103` emits the child removal and line 104 also emits a changed parent session.

The fix uses `groupAction` in `review.ts`. It selects the latest parent row, treats a removed parent or discarded session as removed, and otherwise retains Added when the range includes the parent addition. Child changes no longer determine the group title or removed message. The unit tests assert literal outcomes for removed meal entries, sets, and attachments; removed parents; discarded sessions; and addition followed by correction or removal. These source changes address the finding.

### Addressed: Summary range changes discarded the Review draft

The first version keyed `LoadedScreen` by client and summary dates. Changing the summary range unmounted the Review form and discarded the unsaved assessment, private note, and reply. The coach agent changed this to a workspace keyed by client. It now keeps the loaded form while a requested range loads, and replaces only the displayed snapshot after a successful fetch. A failed range request retains the previous snapshot and draft. An uncertain save retains its original payload and snapshot token for retry. The new source addresses the identified remount cause. Browser verification remains with the main agent.

## Checks and limits

- The Review screen read enters one repeatable-read transaction through `Repo.snapshot`. The client sequence, journal, summaries, plans, and last Review use that transaction. A signed token binds the stored sequence to the business, coach, client, term, and read time. The save path uses that sequence instead of reading a later sequence.
- The schema casts only editable Review fields on update. The database trigger also protects the author, client, business, review time, sequence, and seen time. Review and reply changes share a transaction; notifications occur after that transaction returns.
- Due dates use the client timezone and current term. The roster applies coach visibility before assembling rows. Its signed cursor includes the filter signature, selected sort value, and client ID. The reviewed code handles null dates explicitly and supports both directions.
- Client reply history returns chat messages. It does not return Review assessment or private note. General chat creation rejects `review` references; the Review reply writer constructs them. The client UI reads Focus from the client profile and shows the chat reply and edited marker.
- Nutrition averages include unknown logged days in the denominator check. Empty meal headers do not count as logged days. Daily unknown totals remain null. Training, nutrition, and tracker figures use server results.
- Business default updates and client creation share a business lock. Apply-to-existing is tenant-scoped. Client Focus is one line and has a database length/newline constraint.
- The screen now uses the server-provided record date and tracker ID for links. An early concern about missing parent meal journal rows was withdrawn: the current meal writer always emits that parent row with child changes. It is not an additional open finding.

No further material backend or privacy defect was established in this bounded source review. That statement does not claim that concurrent, browser, native, or full-suite checks passed. The main agent owns those results. Existing tests were read to understand coverage; work still in progress was not reported as an implementation failure.
