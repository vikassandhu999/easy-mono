# Client weight progress

When reviewing a client's progress, a coach needs to see the direction of their measurements and inspect the underlying records. Enter from Client Overview. Keep values, dates and units explicit; a lower number is not automatically a better outcome. The coach reads client-entered and form-derived measurements without changing them from this screen.

Use a 90-day view with editable From and To dates, plus a kg/lbs selector for the trend and summary. The API owns the default dates and permits up to one year per request. Older records remain accessible by choosing earlier dates. A latest-only summary was considered but cannot show fluctuations; use a compact trend followed by the full measurement history. The chart uses the latest measurement on each date, selected and converted on the server. The history preserves every recorded measurement and its original unit, date, note and source. Show the goal without grading individual readings.

The API supplies the range, unit, first/latest/change summary, goal, chart scale and daily points. The list uses date/creation/id cursor ordering, server totals and the shared InfiniteList. Paginated rows must never determine summary or chart values. Keep the existing client weight endpoint unchanged. Add a coach-scoped progress endpoint with UUID/date validation and tenant/trainer isolation. No all-history download is needed for the chart or summary.

Loading, empty, one-reading and constant-value charts are normal states. Unknown or absent goals have plain copy. Date errors focus the input, filters survive reload, and a failed next page retains rows and chart. Refresh restarts the query; delayed responses after date or account changes cannot restore another record. Form-derived readings are labelled as form responses without assuming every response is a check-in.

Verify real client measurements and form submissions, mixed units, same-day readings, server chart selection and counts, backdated inserts, cursor boundaries/deleted anchors, date bounds, empty/constant charts, failure/retry, URL reload, client return navigation and account isolation at 375px and 1280px.

Source evidence: `weight_entries.ex`, `weight_entries_history.ex`, `fitness/weight_entry.ex`, coach ClientWeightEntryController, client WeightEntryController, `types/weight_entry.ex`, and the coach controller tests. Graph tools remain unavailable; task-directed source reads are the evidence.

Verified 2026-09-12: the browser suite passes at 375px and 1280px with real client measurements and form submissions, mixed units, empty and constant trends, pagination and retries, return position, date validation, reload, deletion refresh and account isolation. Screenshots are in `frontend/apps/coachapp/tests/weight-progress/artifacts/`. The API tests cover same-day ordering and daily chart selection, deleted cursor anchors, date and unit validation, and tenant/trainer isolation.


## Current route audit — 2026-09-15

The complete weight-progress suite passes again against normal API 4000/app 2022 at 375px/1280px, including server chart/totals, mixed units, form provenance, date filters, cursor history, recovery and account isolation. No production change was needed. Build, scoped Biome, repository checks and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. Full application coverage is tracked separately in ui-audit-coachapp-2026-09-15.md.
