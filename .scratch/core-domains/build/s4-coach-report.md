# Slice 4: coach app

## Screen brief

Clients remains the signed-in daily screen. Each client appears once. The coach can open the client overview, start a Review, open Review history, or open chat. The server owns roster search, filters, ordering, totals and opaque cursors. Loaded rows remain visible after refresh or next-page failure.

The Review screen opens from the roster or client overview. It shows the last private note, changes since the last Review, the selected summary range, plan links, Focus and Tracker requests, and the Review form. The primary action saves assessment, private note and an optional reply against the displayed snapshot. Loading and failed initial reads have explicit states and Retry. No new changes, missing records, unknown nutrients, and empty Tracker history have explicit text.

Review history shows the date, coach, assessment, private note and reply. The coach can edit the Review or delete its reply. Failed writes retain form values.

## Changes

- Replaced Clients' data source with the Review roster. Added due/overdue/next-due, Never this term, latest assessment, unread chat, and waiting-since. All requested sort and filter controls call the server. Coaching state, invitation access and client overview navigation remain available.
- Added `/clients/:clientId/reviews/new` and `/clients/:clientId/reviews`. Kept the existing client overview and added Review client.
- The screen holds its displayed snapshot even when Focus or Tracker requests cause cache refreshes. Save sends the signed snapshot token. A failed transport retains the exact attempted values and offers Check Review save, with fields disabled until the attempt resolves. The server replays an identical token and body.
- Journal groups render readable field-level old → new values. Removed records retain their old facts. Group-level date and Tracker identity from the backend make links work for child-only changes and tombstones. Row keys include sequence, row type and row id.
- Summaries use server-owned training counts, nutrition day counts and averages, daily nutrition totals and targets, target-change notices and target revision numbers. Nutrient names and units use the existing formatter. Figures link to their records. Nutrition history now accepts an explicit from/to range for summary links; training already supported it.
- Moved existing Tracker metrics, trend and private photo/document display into shared UI. The Review screen and Tracker history reuse the same component. Latest/previous/first photo comparison remains available. Shared number/unit functions also moved to UI; existing entry imports remain compatible.
- Added inline Focus updates and Tracker request creation/cancellation. Client details include Focus and Review frequency. Business settings include the default frequency and explicit apply-to-existing choice.
- Added Review history edits and reply deletion. Review chat references open history. Edited replies show edited. Inbox notifications and conversation read mutations refresh the roster along with chat data.
- Query keys and cache invalidation stay in API modules. Generated schemas were not edited by hand.

## Choices

- Roster names continue to open client overview; Review is a separate action. This preserves existing management tasks.
- The last private note is highlighted before the changes. The new Review starts with the latest assessment and blank note/reply fields.
- Focus and requests save independently from the Review. They do not replace the Review's snapshot.
- A removed record links to its history, while the journal card itself retains the removed values.
- Review and Focus form text survives request failures while the page stays open. These coach drafts are not persisted through a full reload, consistent with the existing coach Tracker recorder.

## Verification

- `rtk pnpm -C frontend/apps/coachapp build`: passed TypeScript, all existing behavior suites, the new three Review behavior tests, and Vite. Existing large-chunk warning remains.
- `rtk pnpm -C frontend/apps/coachapp exec biome check src`: passed for all 169 coach source files before final metadata-link simplification. Targeted Biome passed after that change.
- New behavior tests cover nested correction values, removed known-zero/No values, identity-field exclusion, and roster labels from server facts.
- Root owns live Review browser flow, 375/1280 screenshots, prior-slice browser regressions, global frontend lint, and final integration checks. No browser completion claim is made here.

No requested coach feature is deferred. No branch, worktree, commit or push was created. `clientapp-v2` was not touched.

## Audit corrections

- Summary-range changes now keep the mounted Review and Focus forms. A client-scoped workspace holds one displayed snapshot; it replaces the data and token together only after a successful read for an explicitly requested range. Loading and failed range reads retain the prior summary and draft. Failed reads expose Retry summary range. Client changes reset ownership through the workspace key. Save is disabled while the requested range loads.
- An uncertain save retains the full request, including the original snapshot token, as well as the form values. Range controls stay disabled until that save resolves.
- Whole-record labels now use parent journal rows. Removing a food entry, performed set or attachment does not mark its meal, workout or Tracker entry removed. An added parent stays Added after later corrections. A removed parent or discarded workout is Removed. Three additional tests cover these distinctions, bringing Review behavior tests to six.
- Coach build and targeted Biome passed after these fixes. Root will verify range retention in the live browser flow.

- Journal cards now show the backend record title, including the Tracker name after entry removal. This makes removed Body weight entries identifiable.

- A failed initial refetch with cached Review data now shows Retry Review. Cached data does not keep the loading state active after an error.
