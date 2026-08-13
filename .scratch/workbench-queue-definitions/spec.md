# Coach workbench queue definitions

Status: ready-for-agent

## Problem Statement

The coach workbench presents several counts under "Today," but some queue names and predicates mix reporting concepts with work that a coach can act on. A queue should tell the coach who needs attention, why they need it, which item is most urgent, and what action removes it. The calculation must also respect owner and trainer visibility without becoming expensive as client and plan history grows.

The definitions discussed so far are spread across conversation context and source code. They need one durable specification before implementation continues. Quiet uses missed check-ins only because its training signal still needs product validation.

## Solution

Define each accepted queue as a drainable work list with an explicit entry predicate, stable priority, exit action, visibility rule, and database access pattern.

The workbench will distinguish recent-client reporting from onboarding work. Check-ins will remain submission-based. Replies will use a stable waiting clock and support "Mark handled." Programming will calculate Training and Nutrition independently according to each client's required services. Expiring will use a 14-day renewal window. Quiet will use missed check-ins without inferring missed training.

## User Stories

1. As a coach, I want every Today count to represent work I can act on, so that I can trust the workbench.
2. As a coach, I want every queue row to explain why it appears, so that I know what to do without opening several screens.
3. As a coach, I want completing the relevant action to remove an item, so that each queue can be worked to zero.
4. As a coach, I want queue ordering to remain stable while I work, so that repeated activity does not hide the person who has waited longest.
5. As a business owner, I want queue counts across all clients in my business, so that I can oversee the whole coaching operation.
6. As a trainer, I want queue counts limited to clients assigned to me, so that I do not act on another trainer's work.
7. As a coach, I want a client to appear in more than one queue when they need different actions, so that one concern does not hide another.
8. As a coach, I want the onboarding queue to contain clients who need onboarding action, so that recently joined but settled clients do not create noise.
9. As a coach, I want an unanswered invitation to enter Onboarding after three days, so that I remember to follow up.
10. As a coach, I want resending an invitation to restart its follow-up clock, so that the queue reflects the latest outreach.
11. As a coach, I want an overdue intake to appear in Onboarding, so that I can help the client complete it.
12. As a coach, I want completed or dismissed onboarding work to leave the queue, so that the count remains actionable.
13. As a coach, I want recent clients measured by when they joined rather than when their invitation row was created, so that the metric describes actual clients.
14. As a coach, I want an unreviewed check-in submission to appear immediately, so that client feedback is not missed.
15. As a coach, I want each unreviewed submission counted separately, so that two submissions do not look like one task.
16. As a coach, I want the oldest unreviewed check-in first, so that waiting time does not grow unnoticed.
17. As a coach, I want a check-in to leave only when it is explicitly reviewed, so that opening it does not imply completion.
18. As a coach, I want a submitted check-in to remain after client deactivation, so that received work does not disappear silently.
19. As a coach, I want a conversation to enter Replies when the client sends a message after the last reply or handled action, so that the ball-in-court rule is clear.
20. As a coach, I want additional client messages to keep the original waiting time, so that repeated messages do not move a long-waiting conversation backward.
21. As a coach, I want replying to clear a conversation from Replies, so that answered conversations leave automatically.
22. As a coach, I want to mark a message handled without sending a meaningless reply, so that acknowledgements such as "Thanks" do not remain forever.
23. As a coach, I want reading a conversation to leave it in Replies, so that read state is not confused with handled state.
24. As a coach, I want each conversation counted once regardless of unread message count, so that Replies measures conversations awaiting action.
25. As a coach, I want to add a Service type question to Intake so the client's answer sets whether Training, Nutrition, or both are required.
26. As a coach, I want Programming filters for All, Training, and Nutrition, so that I can batch similar planning work.
27. As a coach, I want All to count distinct clients, so that a client needing both services does not inflate the overall count.
28. As a coach, I want Training and Nutrition reasons calculated independently, so that a long nutrition plan does not hide missing training.
29. As a coach, I want a client who has never received a required plan prioritized first, so that initial programming is not delayed.
30. As a coach, I want lapsed coverage prioritized after never-programmed clients, so that clients with an active service gap come before future work.
31. As a coach, I want coverage ending within seven days to appear after lapsed clients, so that I have time to prepare a successor.
32. As a coach, I want a seamless successor plan to keep the client out of Programming, so that scheduled work does not create a false alert.
33. As a coach, I want a gap between consecutive plans to remain visible, so that a later plan does not hide uncovered days.
35. As a coach, I want Programming rows to state whether Training or Nutrition is missing, lapsed, or ending, so that I can choose the right plan workflow.
36. As a coach, I want clients with an open-ended required plan treated as covered, so that indefinite programming does not create repeated alerts.
37. As a coach, I want inactive clients excluded from Programming, so that the queue represents active delivery obligations.
38. As a coach, I want an engagement ending within 14 days to appear in Expiring, so that renewal work starts early enough.
39. As a coach, I want Expiring ordered by the soonest end date, so that the nearest renewal is handled first.
40. As a coach, I want to snooze an Expiring item after contacting the client, so that it leaves the working count until follow-up is due.
41. As a coach, I want extending the engagement to remove it from Expiring, so that a completed renewal drains the item.
42. As a coach, I want an engagement with no end date treated as ongoing, so that it never enters Expiring.
43. As a coach, I want an expired engagement automatically deactivated, so that it leaves Today and remains discoverable in the inactive roster.
44. As a coach, I want queue counts and queue lists to use the same predicate, so that opening a count shows the expected number of rows.
45. As a coach, I want queue queries to remain fast as plan and conversation history grows, so that the dashboard does not become a scaling bottleneck.
46. As a coach, I want a missed due check-in to put an active client in Quiet, so that I can follow up on a clear missed commitment.
47. As a coach, I want future check-in assignments ignored by Quiet, so that scheduling the next check-in does not hide an earlier miss.
48. As a coach, I want training inactivity excluded from Quiet, so that flexible workout schedules do not produce false alerts.

## Implementation Decisions

### Shared queue rules

* Queue membership and counts are tenant-scoped. Owners see every client in their business. Trainers see only assigned clients.
* Counts and lists must be derived from the same domain predicate.
* A client may belong to several queues at once. Each queue represents a separate action.
* Date-only rules use UTC dates. Business-local date handling is deferred until businesses have an authoritative time zone.
* Queue responses must carry machine-readable reasons. User-facing labels derive from those reasons rather than reimplementing membership logic in the frontend.

### Recent clients and onboarding

* Replace the Today label "New clients" with "Onboarding."
* Onboarding contains lifecycle-gated actionable work. A client can have only one assigned Intake form. Before `joined_at` is set, only an invitation still pending more than three days after its latest send may appear. After `joined_at` is set, only that Intake may appear when its due date has passed and its status is not completed or dismissed. Never return invitation and intake work for the same client at the same time.
* Resending an invitation resets the pending follow-up clock.
* Completing or dismissing the relevant onboarding work removes the client.
* Inactive clients are excluded.
* "Recent clients" remains a separate reporting concept. It means clients whose invitation was accepted within the last 14 days.
* Add a canonical `joined_at` timestamp set when invitation acceptance succeeds. Do not use the client row's insertion time as the join date.
* Placement of the separate Recent clients metric is not part of this effort.

### Check-ins

* Count form submissions, not distinct clients.
* A submission enters when its assignment purpose is check-in and `reviewed_at` is empty.
* Order by submission time, oldest first, with a deterministic id tie-break.
* Reading or opening a submission does not clear it. Explicit review clears it.
* Client deactivation does not remove an already submitted, unreviewed check-in.
* Preserve the indexed aggregate query rather than loading submissions into application memory for counting.

### Replies

* Count conversations, not messages.
* Add a nullable `waiting_since` timestamp to the conversation.
* Set `waiting_since` when a client message starts an unanswered sequence. Additional client messages must not change it.
* Clear `waiting_since` when a coach replies or explicitly marks the conversation handled.
* Reading a conversation does not clear `waiting_since`.
* Order Replies by `waiting_since`, oldest first, with deterministic tie-breaks.
* Add a coach-facing "Mark handled" action and include it in the OpenAPI contract.
* Preserve a waiting conversation across client deactivation until a coach replies or marks it handled.
* Add a partial index beginning with business id and waiting time for rows whose `waiting_since` is not null.

### Required services

* Add explicit per-client requirements for Training and Nutrition. A client may require either service or both.
* Store one canonical, undated required-services set. Do not add separate requested, confirmed, or actor-owned states.
* Let a coach set the services directly during Invite or later client editing. Invite selection is optional; a later service edit requires at least one service.
* Add `Service type` as a special Intake-only form question. A coach may add it at most once to an Intake form, and the client answer must be Training, Nutrition, or both.
* On Intake submission, immediately replace the client's required-services set with the `Service type` answer. If the Intake does not contain the question, leave the set unchanged. The latest direct coach edit or submitted Intake answer wins.
* Do not offer `Service type` in Check-in forms and never update required services from a Check-in submission.
* Treat an empty set as unclassified and exclude that client from Programming until a service is selected.

### Programming

* Calculate Training and Nutrition independently. Do not collapse their end dates into one combined coverage date.
* Use a seven-day lookahead.
* A required service needs programming when at least one day from today through the lookahead is uncovered by an active assigned plan.
* A successor removes the alert only when it provides continuous coverage. A future plan after a gap does not hide the gap.
* Open-ended active plans provide indefinite coverage for their service.
* For v1, an active assigned plan counts as coverage according to its dates even when its scheduled content is empty. Plan readiness and publishing rules are deferred until after v1.
* Return one row per client with per-service reason data. Supported reasons include never programmed, coverage missing, and coverage ending soon.
* Provide All, Training, and Nutrition filters. All counts distinct clients. A client may contribute to both service-specific counts.
* Default priority is: never had a required plan, coverage already missing, coverage ending today, then future uncovered date ascending. Use a stable client tie-break within equal priority.
* Exclude inactive clients.
* Build the calculation as one tenant-scoped database query. Expand each eligible client into no more than two required-service rows, combine Training and Nutrition plan intervals into one common fact shape, examine the bounded eight-day range, and aggregate back to distinct clients.
* Add partial coverage indexes on assigned active Training and Nutrition plans, keyed by business, client, start date, and end date. Add or retain an active-client assignment index that supports trainer visibility.
* Counts for All, Training, and Nutrition should be produced from the same service-status result rather than by three independent query implementations.

### Expiring

* Include active clients whose engagement end date falls from today through 14 days from today, inclusive.
* Treat a missing end date as an ongoing engagement.
* Order by end date ascending with a deterministic id tie-break.
* Extending the end date beyond the window removes the item.
* Snoozing removes the client from the queue and count through the snooze date. The underlying expiry fact remains available to roster displays.
* After the end date passes, the engagement leaves Expiring and the subscription sweeper deactivates the client with the subscription-expired reason.
* Retain the tenant-scoped aggregate and partial active-subscription index pattern.

### Quiet

* Quiet is check-in based for v1. Training activity and inferred training misses do not affect membership.
* Include an active client when their most recent check-in that has become due is marked missed.
* Ignore future check-in assignments when choosing the most recent due check-in.
* A later completed due check-in clears the client from Quiet.
* Snoozing removes the client from Quiet and its count through the snooze date.
* Order by the missed check-in due date, oldest first, with a deterministic client tie-break.
* Return a `missed_check_in` reason so the row explains why the client appears.
* Future workouts, rest days, and raw inactivity duration never count.

## Testing Decisions

* Test public behavior rather than private query composition. A good test creates domain records, calls the public coach API, and asserts count, membership, order, reason, visibility, and drain behavior.
* Use the workbench counts endpoint and the corresponding public queue list endpoints as the primary seam. Counts and lists must agree for the same fixture set.
* Use focused context tests for date-boundary and ordering cases that would be cumbersome to express repeatedly through controllers. Keep those cases behind public context functions.
* Follow the established check-in review controller tests for submission-level membership, owner/trainer visibility, oldest-first order, and explicit review.
* Follow the established chat and workbench controller tests for conversation-level counts and reply-driven draining. Add cases proving that repeated client messages preserve `waiting_since` and Mark handled drains the item.
* Follow the established workbench queue context tests for Programming and Expiring date fixtures. Derive all dates from the test date rather than hardcoding calendar dates.
* Onboarding tests must cover a fresh invitation, a pending invitation over three days, resend clock reset, suppression of intake work before invitation acceptance, overdue intake after acceptance, completed intake, dismissed intake, inactive clients, and owner/trainer visibility.
* Required-services tests must cover optional Invite selection, one `Service type` question per Intake, Intake submission replacing the canonical set, Intake without the question leaving it unchanged, direct coach edits, and rejection of `Service type` in Check-in forms.
* Programming tests must cover Training-only, Nutrition-only, both services, unclassified clients, never programmed, lapsed coverage, coverage ending on each window boundary, seamless successors, successor gaps, open-ended plans, inactive clients, overlapping service-specific filters, and distinct All counts.
* Expiring tests must cover today, day 14, day 15, no end date, renewed dates, active snoozes, expired snoozes, automatic deactivation, and tenant visibility.
* Database migration tests or query-plan checks must confirm the intended partial indexes exist. Performance acceptance should use representative per-tenant data and `EXPLAIN ANALYZE`; the implementation must avoid per-client application queries.
* OpenAPI schema tests must cover added reason fields, service filters, joined date semantics, waiting state, and Mark handled.

## Out of Scope

* Adding a training-derived Quiet signal.
* Adding plan readiness, publishing, or structural-content validation. For v1, an active assigned plan counts as coverage even when empty.
* Adding business time zones or changing UTC date boundaries.
* Choosing where a Recent clients metric appears outside the Today queues.
* Redesigning client notes or changing coach/client ownership of profile fields.
* Implementing per-coach message read cursors. Replies is about responsibility, not unread state.

## Further Notes

The Programming query relies on assigned plan date ranges for v1. This deliberately allows an empty active plan to report coverage. A post-v1 plan readiness system should define when a plan is complete enough to assign and publish.

Quiet does not use the source implementation's inferred training rule. Training-based follow-up can return after the product stores reliable due-session expectations.
