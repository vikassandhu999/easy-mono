# Slice 4: Check-ins and Reviews

Implemented and verified in the existing working tree on `codex/core-domains`. No branch or worktree was created. Nothing was committed or pushed. Prior slice work was preserved. `frontend/apps/clientapp-v2` has no changes.

## Backend and contract

Clients have Focus and Review frequency. Businesses have a default frequency, copied when a client is invited. Owners can apply a changed default to existing clients in the same business.

Reviews store the coach, fixed review time, seen time, and the sequence read by the screen. Assessment, private note, and reply remain editable. Database constraints protect tenant relationships and fixed facts. Additive migrations preserve accounts and records; dev and test are current through `20261006032000`. No reset or reseed was needed.

The screen reads its client sequence, journal changes, and summaries in one `Repo.snapshot` transaction. It reuses Training occurrences, Nutrition day totals and targets, Tracker metrics and coverage, requests, and plans. It does not add another journal or record model. Changes are grouped by record, with old/new values, readable titles, and link metadata retained after removal.

Due dates use the client's timezone and current Coaching term. New and returning clients are due at the term start. The roster calculates overdue days, last reviewed this term, latest assessment, unread chat, and waiting-since. Search, sorting, filters, counts, and cursor pages run on the server. Database reads are batched.

Review replies are chat messages with a `review` reference. Creation, editing, and deletion share the Review transaction. Edits set `edited_at`; deletion removes the message and updates the conversation preview. Notifications occur after commit. General chat creation cannot create Review references. Client reply history returns chat messages without assessment or private note.

The typed contract has **173 routes**. Both retained app schemas were generated. Details: [API contract](s4-api.md), [backend report](s4-backend-report.md).

## Coach app

Clients is the daily Review roster. Each row has Review and history actions, due information, assessment, unread chat, and waiting requests. All requested sort and filter controls use the API. Client names still open the existing overview.

The Review screen shows the last private note, journal changes, a selectable summary range, plan links, Focus and requests, and the Review form. Training shows expected, completed, and extra counts. Nutrition shows days logged, unknown-aware averages, daily totals, targets, revision, and target-change notices. Tracker values, changes, event coverage, and photo comparison reuse the existing shared display. Figures link to the associated history.

Review history shows date, coach, assessment, private note, and reply. It supports edits and reply deletion. Client details include frequency and Focus. Business settings include default frequency and an explicit apply-to-existing choice.

Changing the summary range preserves Review and Focus drafts. A successful range read replaces the displayed data and token together. Focus and request saves do not advance the displayed sequence. An uncertain Review save keeps its exact request and offers **Check Review save**. Failed reads have a Retry action. Details: [coach report](s4-coach-report.md).

## Client app

Today pins Focus above the existing cards, requests, and To record reminders. Check-ins opens reply history and current Focus. A Review link in chat opens its reply. Edited and deleted replies update an open conversation. The client does not request coach Review data. There is no check-in send action or submitted state. Details: [client report](s4-client-report.md).

## Choices where the spec was silent

1. A signed snapshot token binds the business, coach, client, Coaching term, sequence, and seen time. It expires after 24 hours. The same token and body replay the original Review; a changed body conflicts. A token from an earlier term cannot clear work in a later term.
2. New Reviews require a term covering today. Existing Review assessment, note, and reply can still be edited after a term ends. Fixed facts remain unchanged.
3. A returning client's latest historical assessment and private note remain visible. Due dates and the new-change cutoff use the current term. A new Review starts with blank note and reply fields.
4. Summary ranges allow 366 inclusive dates. The default starts at the current term's last Review or term start, capped at 366 days. Journal changes remain independent of the summary range.
5. Nutrition averages use logged days. Any unknown daily value makes that nutrient's average unknown. Empty meal headers do not count as logged days. The average's known/total counters count days.
6. Focus and requests save independently from the Review. Focus is nullable, one line, and at most 255 characters. Private notes allow 10,000 characters; replies retain chat's 4,000-character limit.
7. A removed record links to its history; its journal card retains the removed values. Group labels describe the parent, so removing one food or set does not mark the whole meal or workout removed.
8. The roster uses batched queries and sorts visible rows in server memory. Memory use grows with roster size. No large-roster load test was run.
9. Coach drafts survive request failures and range changes while the page stays open. They do not survive a full reload, consistent with the coach Tracker recorder.

## Verification

All required checks passed against the final source.

| Check | Result |
| --- | --- |
| `rtk mix precommit` in `backend/` | **772 tests, zero failures**, seed `466093`; compile, format, contract drift, and Credo passed |
| `rtk just gen-api` | Passed; **173 typed routes**, retained apps only |
| `rtk pnpm -C frontend/apps/coachapp build` | Passed TypeScript, behavior checks, six Review tests, and Vite |
| `rtk pnpm -C frontend/apps/clientapp build` | Passed TypeScript, behavior checks, and Vite |
| `rtk pnpm -C frontend lint:ci` | Passed Biome on 473 files and design lint |
| Training `tests/training/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Nutrition `tests/nutrition/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Trackers `tests/trackers/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Reviews `tests/reviews/core-domains.browser.mjs` | Passed live: coach 1280/375, client 375 |
| Source whitespace, branch, excluded app | Passed; correct branch, no clientapp-v2 diff |

The backend count is **752 prior tests + 20 Review tests**. Coverage includes due boundaries, timezone, returning clients, no current term, journal corrections/removals and cutoffs, SQL immutability, reply rollback/edit/delete, access, privacy, roster sorting/filtering/cursors, and default application. The concurrency test pauses the actual screen read while a writer on a separate database connection commits. The next Review includes that change.

The Review browser flow records a completed freestyle workout, a meal on the previous day, and Body weight. It verifies Never this term, summaries, Needs attention, private note, reply, Focus, and a Tracker request. The client corrects the earlier meal and removes Body weight; the next Review contains exactly those two groups with old/new values, while the weekly roster remains not due. Reply editing shows edited in the open client chat; deletion removes the message. The client reply response contains no assessment or private note.

Additional browser checks cover draft retention after a range change, a lost save response with one Review after retry, the corrected meal's date link, roster filters, defaults for new clients, optional application to existing clients, per-client frequency, clearing Focus, and failed cached-load recovery through Retry Review. The script is also available as `rtk pnpm -C frontend/apps/coachapp test:reviews`.

Evidence: [backend log](s4-precommit.log), [screenshots](s4-screens/), [browser result](s4-screens/results.json), and [independent review](s4-review.md). The review has no open findings. Earlier browser attempts exposed test selector errors and a pending migration; final runs pass. Source review found and resolved draft loss, incorrect whole-record removal labels, and a failed-refresh loading state. Phoenix was restarted after final contract generation because its cached response type omitted journal record titles; the browser flow explicitly checks those titles.

## Limits

No requested slice-4 feature is deferred. Native devices, simulators, and push notifications were not tested. Existing Vite large-chunk warnings remain; both builds exit successfully. Synthetic test accounts remain for inspection. Phoenix runs on 4000, coachapp on 2022, and clientapp on 1315.
