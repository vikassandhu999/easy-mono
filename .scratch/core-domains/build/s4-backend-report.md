# Slice 4 backend and API

Reviews are implemented on the shared record foundation. Work remains in `codex/core-domains`. No commit, push, branch, worktree or clientapp-v2 change was made.

## Changes

- Added client Focus and Review frequency, plus the business default with optional apply-to-existing. New invitations copy the default under a business lock. Existing accounts and records are preserved by additive migrations.
- Added Reviews with tenant foreign keys, assessment validation, fixed author, microsecond review time, screen display time and reviewed journal sequence. A database trigger protects the fixed facts; only assessment, private note and linked reply change.
- The review screen uses `Repo.snapshot` and existing training occurrences, nutrition day reads and Tracker metrics. It returns plans, requests, grouped journal changes, old/new values and links to their records. Removed records retain link metadata and a readable title. Tenant ids are removed from journal JSON.
- Summary counts and nutrition averages come from the server. Unknown intake stays unknown. Empty retained meal headers do not count as a logged day. Tracker metrics cover assigned Trackers, recorded Trackers and open requests, including archived Trackers with history.
- Due and overdue use the client's calendar and current term. The roster includes every visible client once. Latest reviews, unread chat and open-request dates use batch queries. Every roster column supports server sorting, filters and signed cursor pages with id tie-breaks.
- Saving or changing a review reply updates the chat message inside the same transaction. Edits set `edited_at`; deletion removes the message and recomputes the conversation preview. Channel notifications are sent after the transaction. General chat creation cannot make review references.
- Client reply history is a page of chat messages filtered by review reference. It supports a review-id filter. It never serializes assessment or private note. History remains readable when a term ends.
- Typed routes, controller types and retained-app schemas are generated. New path ids use UUID validation.

## Choices

A signed screen token binds the business, coach, client, current term, sequence and seen time. New saves require a term covering today. Tokens expire after 24 hours. The token also identifies a create retry: the same body returns the original Review; a changed body conflicts. A token from a different current term cannot create a Review.

Review edits are allowed after a term ends, as the saved assessment/note/reply remains editable. New reviews are blocked. The latest saved private note and assessment can prefill a returning client's screen, while due and the journal cutoff use only the current term.

The summary allows 366 inclusive dates. It defaults to the latest review in the current term or the term start, capped at 366 days. The journal is independent of that chosen summary range. Nutrition average `known_entries` and `total_entries` count logged days in this summary.

The roster performs bounded database queries and sorts its tenant-visible rows in server memory. It does not use client-side aggregation. Its memory use grows with the business roster; no large-roster load test was requested or run.

## Verification

The added suite covers due boundaries, overdue, client timezone, return/no-current-term behavior, journal additions/corrections/removals and sequence cutoffs, successive review ordering, token retries and tampering, SQL immutability, reply rollback/edit/delete notifications, cross-tenant and coach-scope access, client serialization, all roster sorts in both directions with cursors, filters, defaults and unknown-aware nutrition summaries.

The concurrency test uses separate database connections and pauses the actual review-screen read after its first client query. A writer commits while that screen is open. The screen retains the old sequence and data, and the next Review screen contains the committed change.

`rtk just gen-api` passed with 173 typed routes and generated only coachapp/clientapp schemas. `clientapp-v2` has no diff. Development and test migrations are current through `20261006032000`; no database reset or reseed was needed because data was preserved.

Final precommit result is recorded below after the last run. Frontend builds, lint and browser evidence belong to the integration report.

Final `rtk mix precommit` passed: **772 tests, zero failures**, seed **101312**. Compile with warnings as errors, generated-contract drift, format and Credo all passed. This is 752 prior tests plus 20 Reviews tests. The final command log is `/private/tmp/s4-backend-precommit.log`. Source whitespace validation passed. The final generated API includes journal group titles and UUID path validation.
