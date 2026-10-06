# Part 1 test review

Spec compliance: pass for the current API. Test quality: pass. No material gap found in the four new test files.

The review covers the Part 1 requirements in `s3-trackers.md`, the backend contract, and supporting current tests and source. No production or test file was changed during this review.

The additions contain 43 tests: 16 domain contract tests, 21 library contract tests, three correction tests, and three concurrency tests.

| Requirement | Evidence |
| --- | --- |
| Coach tenant and assignment boundaries | Both plan domains reject foreign and unassigned coaches on reads, updates, archive, client lists, and assignment. Session history, meal history, and food metrics also reject those coaches. |
| Client isolation | Tests reject access to another client's plans, sessions, and performed sets. A meal correction with another client's meal id conflicts. The original meal remains unchanged. |
| HTTP errors and pagination | Tests assert validation field envelopes, stale revision details, missing-resource responses, and complete cursor pages. The saved winner remains unchanged after a stale update. |
| Libraries | Tests cover create, update, archive, detail reads, tenant boundaries, search, and pagination for exercises, foods, and recipes. Food categories and exercise muscle and equipment filters have explicit assertions. |
| Library protection and usage | Built-in foods and exercises reject changes and archive requests. Food usage pages return recipe references. Recipe usage returns template and assigned-plan references and supports a kind filter. |
| Corrections and retries | Tests correct a completed session's set, remove the set, and check history, tombstones, exact journal old and new values, and actor identity. Meal tests check correction, entry removal, journal rows, and replay without sequence growth. Session and set retries preserve identity. An altered set retry conflicts. |
| Concurrent writes | Separate unsandboxed database connections wait at a common start barrier. Workout and meal writes must both succeed, produce sequences 1 and 2, and journal both record ids. |
| Concurrent publication | Both plan domains race two updates with expected revision 1. Tests require one winner, one stale conflict, saved revision 2, and exactly revisions 1 and 2 in storage. |
| Write gate | Tests cover an active term today with an uncovered path date, and an ended term with a previously covered path date. Existing route-wide gate tests cover all mutating client routes and the client's last local coaching day. |

The HTTP tests use the actual router and assert returned values. The journal assertions check stored evidence in addition to HTTP status. The concurrency tests use separate database connections, not a shared sandbox connection. Existing training and nutrition tests retain the full prescription journeys and additional domain rules.

Current API limits explain the requested cases that cannot be tested literally:

- `backend/lib/easy_web/router.ex` has no exercise usage endpoint. Exercise history is a separate performed-set history route.
- `Easy.Nutrition.Recipe` requires `business_id` and has no system-source or built-in model. Built-in protection therefore applies to foods and exercises.
- Recipe lists implement search and pagination. The coach query type accepts `categories`, but `RecipeController.index/2` does not pass it, and `Library.base_recipes/2` does not implement that filter. The additions do not claim recipe category filtering.
- Client exercise lists use offset pagination. The tests use cursors on routes that currently support them.
- The meal API removes entries from a meal. It has no meal-header deletion route. The removal test checks the entry tombstone and the meal header's changed journal row.

Verification was not repeated by this reviewer. The implementation report records a successful `rtk mix precommit`: 715 tests, zero failures, seed 32702, and 126 typed routes. The root agent independently reran `rtk mix precommit` and reported exit 0, 715 tests, zero failures, and seed 946774. The recorded baseline is 672 tests. These execution results are reported evidence, not a reviewer run.
