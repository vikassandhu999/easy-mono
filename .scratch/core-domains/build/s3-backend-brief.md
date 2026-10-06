# Tracker backend and contract task

Read the owner's complete Part 2 request and the frozen documents before implementation. This brief adds code pointers; it does not replace those requirements.

Own the backend Tracker domain, migration, seeds, typed routes, backend tests and generated retained-app schemas. Preserve the Part 1 coverage and fixes. No edits to clientapp-v2. All commands start with rtk; no commit, push, branch or worktree.

Reuse these pieces:

- `Easy.RecordJournal.write/2`, `write_for_client/3`, `actor/1` and `change/5`. Record changes already permit tracker_entry and attachment row types. No-op retries must not allocate a sequence.
- `Easy.Plans.Template` on shared templates already permits domain trackers. `Easy.Plans.Programming` and `Reader` support shared template creation, editing and listing through `Domain`; do not create another templates table or clone the shared template workflow. Tracker assignment must never create a Plan or PlanRevision.
- `Easy.Units` for conversion. Extend the registry for cm/in and ml/fl oz as needed. Custom units stay literal without conversion.
- `Easy.CoachingTerms.insert_term/1` is the shared insertion point for both invite acceptance and coach start. The default assignment copy must be in this transaction and only for the first term.
- `Easy.Orgs.create_business_transaction/2` creates business, billing and owner coach. New businesses need the default weekly Reflection template as well as existing seeded businesses.
- `Easy.Attachments` handles private upload/download scope and signing. Add PDF with a 15 MiB limit, `captured_on`, MediaType extension and typed Upload fields. Retain existing formats.

Keep public functions Ctx-first and errors compatible with FallbackController. Add database tenant/client foreign keys, checks and assignment exclusion constraints. Use stable built-in identities and idempotent seeds. Kind, unit and scale cannot change after creation, including direct database updates. Preserve entries when a tracker is archived. Deleting an unused custom tracker must handle references without leaking an FK exception.

Calculated reads must provide all data the frontend needs without client-side aggregation: due items, event prompts, request openness, counts, entry pages, latest/previous/first, numeric metrics/series and event coverage. Include tracker metadata with assignments, requests and entries. Distinct completed sessions count only in the dates when the event assignment applies; repeated entries for one session must not inflate coverage. Apply the same rule for meals. Archived trackers leave recording pickers/prompts but retain readable history.

Watch these edge cases: two timing changes on the same local date; empty same-day assignment periods; a template with duplicate trackers or inaccessible/archived trackers; end/start terms and the first-term transaction rollback; request and entry in the same second; tombstoned entries do not satisfy due items or requests; session/meal links require the same business and client; photo entries accept images only, documents accept ordered PDFs/images; attachment ids must be unique and client-scoped. At most one event link is allowed in SQL.

Tests must cover the complete owner Part 2 list plus typed route authorization and meaningful JSON values. Run focused tests, `rtk just gen-api`, then `rtk mix precommit`. Migrate dev/test and rerun seeds when ready. Save the final route/function contract, choices and test evidence to `s3-backend-report.md`; frontend agents will use it.
