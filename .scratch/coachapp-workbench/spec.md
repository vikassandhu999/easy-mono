# Unified coach workbench specification

Status: resolved
Date: 2026-09-17
Implementation: verified on 2026-09-17; see [the evidence](verification.md).

This specification defines the replacement for the six-choice workbench in coachapp. It records the discovery discussion and the defaults implemented after user authorization on 2026-09-17. The [implementation plan](plan.md) defines the sequence and checks. The [implemented workbench brief](../coachapp-rebuild/workbench.md) remains the record of implemented behavior and prior verification.

## Purpose and evidence

When a coach starts or resumes a work session, they need to see which clients need an action, understand why, and complete that action without inspecting every client.

The user wants the smallest useful workbench, followed by learning after deployment. There is little direct coach research. This specification is a launch hypothesis, not a claim that the design is optimal or coach-validated.

The working persona is a coach responsible for an assigned client roster, using a phone or desktop for asynchronous coaching. Client load, session frequency, and preference for batching are unknown. Business owners retain their authorized wider scope. Custom team task assignment is outside this change.

The direction from the discussion is one primary queue, a quieter follow-up view, reusable task destinations, server-owned selection, and a query-backed implementation. The ordering and defaults below were selected for implementation. They remain hypotheses to validate with coaches. Push and deployment require separate authorization.

## Scope

The workbench has two views that share one row format, pagination behavior, and API contract:

* **Awaiting you** is the default. It contains waiting conversations, unreviewed check-in and intake submissions, and required services with missing or upcoming missing Coverage.
* **Follow-ups** contains invitation follow-up, overdue intake, the latest missed check-in summary, and engagements ending soon. These items deserve a coach decision even when a client response is still outstanding.

The workbench opens existing review, conversation, client, and plan-assignment screens. It does not become a second editor for those workflows.

The first version excludes manual task creation, arbitrary completion buttons, bulk actions, AI scoring, charts, custom priority controls, custom workbench ownership, and persistent workbench task records. Existing snooze and intake-management operations remain available in their supported contexts.

No coachapp-v2 source, UX, screenshots, or references may be consulted. Backend contracts and the coachapp briefs are the behavior sources.

## Queue membership and identity

Use the vocabulary in [CONTEXT.md](../../CONTEXT.md). An item is one unit of coach work. Several reasons for the same work do not create several items. A client can have several items when distinct actions are required.

| Kind | Entry rule | Identity | Primary destination and exit rule |
| --- | --- | --- | --- |
| Reply | An authorized conversation has a waiting client message sequence | Conversation ID | Reply opens the conversation. A successful coach reply or explicit Handled operation resolves waiting under the conversation contract. Reading does not resolve it. |
| Review | An authorized intake or check-in submission is unreviewed | Submission ID | Review opens the appropriate submission reader. Persisting the review removes that submission. |
| Prepare plan | An active visible client requires Training or Nutrition and has a coverage need under the programming rules | Client ID plus service | Prepare training plan or Prepare nutrition plan opens assignment. Recompute coverage after saving. The item remains if a relevant gap remains. |
| Invitation follow-up | The onboarding invitation follow-up rule is satisfied | Invitation/client ID | Open invitation context. Resending can move the follow-up date under the existing rule. Merely opening it does not resolve it. |
| Intake follow-up | The onboarding overdue-intake rule is satisfied | Intake assignment ID | Open intake context with reminder and management actions. A reminder alone does not complete the intake. Source status or date changes control membership. |
| Missed check-in | The latest due check-in for an active visible client is missed and the queue is not snoozed | Client ID plus missed-check-in kind | Follow up opens the conversation. Replying does not itself complete the missed request. Preserve the queue's snooze behavior. |
| Ending engagement | The engagement-ending rule is satisfied and the queue is not snoozed | Client ID plus ending-engagement kind | Update engagement opens client details. Relevant engagement changes or snooze change membership. |

Intake review is a deliberate addition to workbench selection. The implemented check-in review queue does not include intake submissions. The implementation must prove the intake review destination and eligibility against the intake contract.

Prepare-plan items are separate for Training and Nutrition. Completing one must not hide the other. No prerequisite of "intake reviewed" is added to programming eligibility. Required services have no separate requested date in the domain model.

The programming source retains its current local-calendar coverage horizon, today through seven days ahead. The never-programmed reason remains visible under its existing eligibility rule. A never-programmed client whose first gap is in the future uses the upcoming band below. Do not manufacture an earlier waiting timestamp.

The missed-check-in item is a summary of the latest due request, not a count or list of all outstanding requests. The client request screen remains the complete management destination.

Review and reply visibility retain their source contracts. Do not silently apply the active-client rule from programming to every kind. Every target operation reauthorizes access.

## Ordering

The default label is "Needs attention". The workbench must not describe its entire order as "Oldest waiting first" because plan needs do not have equivalent waiting timestamps.

| Band | Items | Order within the band |
| --- | --- | --- |
| 0 | Required service has no coverage today | Client ID, then Training before Nutrition |
| 1 | Waiting conversations and unreviewed submissions | Earliest waiting/submission timestamp first |
| 2 | Coverage exists today but a required service has a gap within the horizon | Earliest uncovered local date first |

A small, accessible explanation states that missing plans come first, then replies and reviews by waiting time, then upcoming plan gaps. Show each item's actual reason and date. Do not label all first-band items urgent.

This policy can starve replies if many clients lack plans. Treat that as a specific rollout question. There is no claim that these bands represent observed coach priorities.

Follow-ups use earliest attention date first, then kind and source identity. Preserve each source's date policy for v1. Invitation timing uses its timestamp. Date-only sources use their authoritative dates. UTC midnight can normalize date-only values for ordering, but must not be presented as an observed event time. A calendar-policy change requires separate explicit review.

The SQL order and cursor comparison use the same total key. The proposed key is `band, order_value, kind_rank, source_id, service_rank`, all non-null with fixed types. `order_value` is zero for band 0, integer epoch microseconds for band 1, and integer days since 1970-01-01 for band 2. Band separation makes those units unambiguous. Follow-ups use a separate view-scoped order with epoch microseconds after the normalization described above.

Kind ranks and service ranks exist only as deterministic tie-breakers. Record their fixed mapping in the implementation's contract tests. A row's opaque ID includes its kind and source identity, plus service where applicable.

## Interaction

On desktop, render a single compact column. Each row has a linked client name, the complete reason, a relevant date or waiting time, and one primary action. A message preview is optional display context. Attachment-only messages need a meaningful fallback. Long reasons wrap without hiding their meaning.

On mobile, stack the identity and reason above the date and action. Use the project's shadcn controls, shared list search, and infinite-list behavior. Verify keyboard access and both 375px and 1280px layouts.

An illustrative primary view follows the proposed bands:

```text
Workbench
See who needs your attention.

Awaiting you                         Follow-ups · 4
Search clients                       Refresh

Maya Patel                          [Prepare training plan]
Training coverage missing today

Sarah Chen                                      [Review]
Weekly check-in submitted · Waiting 2 days

James Wilson                                     [Reply]
"Can we change Thursday's workout?" · Waiting 1 day

Alex Morgan                        [Prepare nutrition plan]
Nutrition coverage ends tomorrow
```

The names and counts are examples. The interface renders server-owned item counts, never a sum of overlapping client totals. Search v1 matches client name and email across every source, with percent and underscore treated literally. Message-body and form-title search are outside the shared search contract.

Store view and search in the URL. Opening an action carries the workbench return location through the task flow. Ordinary Back preserves cached position. After a mutation, refresh from the first cursor and restore the nearest surviving item or scroll position where possible. Announce successful work without moving keyboard focus to an unrelated row.

Rows open existing destinations. They do not disappear merely because the coach clicked an action. Server-confirmed state determines resolution. A rejected or uncertain mutation retains recovery behavior in the destination screen.

## Empty, loading, and recovery states

* An empty unfiltered primary view says "No replies, reviews, or plans waiting on you." Follow-ups stays accessible.
* An empty search says "No matching work." It must not imply all work is complete.
* An empty follow-up view says "No follow-ups in this view." It must not claim that no outstanding client requests exist.
* Initial failure offers Retry and never masquerades as an empty queue.
* Next-page failure retains loaded rows and offers explicit retry through the shared list behavior.
* Refresh failure retains loaded rows, marks them stale, and leaves task destinations accessible to recheck current state.
* Summary-count failure leaves the queue usable. Display an unavailable count, not zero.
* A no-longer-eligible target explains the changed state and provides the return link. Unauthorized or removed records reveal no extra client details.
* Logout or account replacement clears the queue and rejects late reads and mutations from the previous session.

Snooze remains limited to its supported follow-up kinds. Preserve the established inclusive date behavior and validation. Snoozing one kind for a client must not hide another kind. A reminder means delivery was requested, not verified receipt.

## API contract

Add `GET /v1/coach/workbench/items` with `view=awaiting|follow-ups`, `search`, `cursor`, `limit`, and `include_count`. The default view is `awaiting`. Use `cursor=start` for the first page. The proposed page-size default is 25 and the maximum is 100.

This is an additive route. Keep the six queue routes and their existing contracts until consumer retirement is verified. The new coachapp screen stops calling them after cutover.

The response has `data`, `next_cursor`, and `count`. `count` is nullable when not requested and otherwise counts all filtered items before the cursor. It never counts unique clients. `include_count` defaults to true for a simple direct request. The coachapp sends `include_count=true` on the first page and explicit refresh, and `include_count=false` on appended pages. A first-page count reflects the time of that response, not a frozen collection during scrolling.

Use the same item query with `view=follow-ups`, no search, `limit=1`, and `include_count=true` for the primary view's follow-up badge. Keep its cache key and failure state separate from the displayed queue. Do not call the six-count endpoint for this badge. If measurement justifies a dedicated summary endpoint later, preserve the badge semantics.

Each item contains these structured fields:

| Field | Contract |
| --- | --- |
| `id` | Opaque stable queue-item identity |
| `kind` | Closed discriminant for the kinds in the membership table |
| `client` | Authorized client ID and display identity |
| `reasons` | Nonempty typed domain facts, including applicable dates and service |
| `waiting_since` | Real conversation/submission timestamp, otherwise null |
| `due_on` | Authoritative date where applicable, otherwise null |
| `target` | Typed source identifiers needed to open the existing destination |
| `preview` | Optional compact display context, otherwise null |

The exact nested schemas follow the source JSON contracts during implementation. Reasons contain facts, not button labels, colors, or arbitrary frontend URLs. The frontend maps kinds to labels and routes. `business_id` is never returned.

Validate unknown views, invalid limits, malformed cursors, and unsupported offset parameters through the public contract. Return the established validation response, with 422 for incompatible or malformed cursor requests. Never turn user strings into atoms dynamically.

## Cursor and consistency contract

Encode the complete total-order position, view, normalized filters, ordering version, authorized scope binding, and calendar evaluation instant in an opaque cursor. Reapply authorization on every request. A cursor is not an authorization credential.

Use one captured evaluation instant for date-derived membership across a page and its count. Reuse that instant through its cursor chain to avoid midnight alone changing bands between pages. Client-local dates still use the client's effective timezone. Source writes and timezone edits remain live changes. Refresh begins a new chain and evaluation instant.

Read requested count, page selection, and batched display details from one short database snapshot per response. A single statement or a read-only repeatable-read transaction can provide that snapshot. Never keep a transaction open between HTTP requests.

Keyset pagination tolerates a deleted anchor without looking it up. It does not freeze the source records. Completion, new messages, reassignment, and changed dates can alter membership or order between pages. Refresh after task mutations restarts the chain. Client cache merging may deduplicate by item ID for rendering, but must not compute eligibility, order, or totals.

Reject cursors from another view, filter set, scope, or ordering version. The UI recovers by fetching `start`, with clear feedback if the former position cannot be restored.

## PostgreSQL design and performance requirements

`Easy.Workbench` owns the public operation. Pure source queries project compatible narrow columns for identity, eligibility facts, target, and ordering. Scope each source by business and authorized client visibility before limiting it. Combine sources with `UNION ALL`, then order and page globally.

Source joins must yield one row per identity before the union. Do not use broad duplicate elimination to hide accidental multiplicity. Fetch display details in batches by selected page keys. Do not preload submission answers, chat history, or plan documents for the queue.

The first implementation uses a live query. It adds no persisted workbench tasks, materialized view, cache service, or generic provider registry. Replies, reviews, and coverage keep their domain authority.

Candidate indexes follow measured query plans. Waiting conversations already have a partial tenant-leading waiting index in migrations. The unreviewed-submission candidate is `(business_id, submitted_at, id) WHERE reviewed_at IS NULL`. Coverage and assigned-coach indexes require inspection against the actual query shape. Do not add duplicate indexes or promise index use without `EXPLAIN` evidence.

If a global sort is expensive, benchmark source-local `limit + 1` selection followed by the same global selection. This is valid only after all authorization, search, eligibility, cursor, and deduplication rules are applied with the same total order. It bounds candidate merging, not necessarily the work of deriving coverage.

Measure page selection, requested counts, enrichment, and end-to-end API latency separately. Extend the existing representative query-plan fixtures with a large single business, sparse coach assignments, deep plan history, varied waiting rates, empty and search results, and later cursor pages. Record dataset shape, PostgreSQL version, query plans, buffers, rows examined, and repeated timings. Set a latency budget from that baseline before release. No numerical performance improvement is claimed by this specification.

## Future changes

Keep the item contract and public workbench operation stable when changing source query implementations. A later kind adds an explicit discriminated schema and eligibility query. A later ordering policy increments the cursor version.

If measurements identify coverage as a bottleneck, a stored per-client/service summary can replace only that source. Such a change needs transactional invalidation or updates, calendar-driven recomputation, reassignment and timezone handling, observable freshness, and a rebuild path. The source records remain authoritative. Custom task ownership and manual work require their own domain requirements before persistence is added.

## Acceptance scenarios

| ID | Scenario | Required result |
| --- | --- | --- |
| WB-01 | A coach opens mixed work | All eligible primary kinds appear in the documented order without choosing a task category. |
| WB-02 | One client has a reply, a review, and two service needs | Four independent items appear. Completing one does not hide the others. |
| WB-03 | A client submits an intake | An unreviewed intake enters Awaiting you, opens the right reader, and leaves after successful review. |
| WB-04 | A coach reads, replies, or marks a conversation handled | Reading keeps the item. Successful reply/handled follows existing waiting and concurrent-message rules. |
| WB-05 | A coach assigns a plan | Coverage recomputes. A remaining gap stays visible. Training does not resolve Nutrition. |
| WB-06 | A coach sends a missed-check-in follow-up | The request is not falsely completed. Snooze applies only to its supported client/kind. |
| WB-07 | The primary view is empty but follow-ups exist | The narrow empty message and follow-up access remain visible. |
| WB-08 | More than three pages include tied order values | Each unchanged item appears once in deterministic order. Deleted anchors, searches beyond page one, and cursor mismatches behave as specified. |
| WB-09 | A request fails or the session changes | Recovery retains appropriate data. Late cross-account results cannot repopulate the queue. |
| WB-10 | Work changes while the coach is in a destination | The destination rechecks state. Return refreshes the chain and restores a useful position. |
| WB-11 | Midnight occurs in different client timezones | Date-derived rules use the captured instant and the right source calendar. Refresh advances the calendar without inventing waiting ages. |
| WB-12 | An owner and two assigned coaches access the same business | Each sees only authorized items and counts. Cross-business targets and forged cursors cannot expand access. |
| WB-13 | Counts fail or change after first-page load | Items remain usable. Counts are never fabricated from loaded rows or represented as zero after failure. |

## Deployment learning and remaining decisions

Deployment is a later authorized action. For the first coach cohort, record workbench opens, action opens by kind, successful source outcomes where attribution is available, return navigation, and request latency/errors. Reuse an established telemetry path if one exists. Keep message content, answers, client names, and search text out of analytics. Do not build an analytics platform for this feature.

Combine usage with short coach conversations about work still tracked elsewhere, missed obligations, difficult priority choices, repeated navigation, and interruptions. Opening a row is not a completed outcome, and usage alone does not prove that work was not missed.

These implemented defaults remain questions for actual coach use:

* Missing coverage appears before waiting replies and reviews.
* Work is separate by action, including one item per required service, rather than grouped by client.
* The existing seven-day coverage horizon and follow-up date policies remain unchanged.
* Submitted intake belongs in Awaiting you, and plan preparation is not gated on intake review.
* Exact totals refresh on first-page loads and explicit refresh, rather than every appended page.

No further feature is implied by this list. Record later changes to the defaults in this specification and version the order when necessary.

## Evidence

Source inspection on 2026-09-17 supports the implementation observations. Graph lookup did not return results, so targeted source reads were used. No application code, database state, or tests were changed or executed to establish performance during this discovery task.

* [Workbench context](../../backend/lib/easy/workbench.ex), [cursor helper](../../backend/lib/easy/workbench_page.ex), and [programming rules](../../backend/lib/easy/workbench_programming_queue.ex).
* [Check-in selection](../../backend/lib/easy/workbench_check_in_queue.ex), [reply selection](../../backend/lib/easy/workbench_replies_queue.ex), and [query-plan tests](../../backend/test/easy/workbench_query_plan_test.exs).
* [Shared list contract](../coachapp-rebuild/lists.md), [intake follow-up](../coachapp-rebuild/intake-follow-up.md), and [individual check-in requests](../coachapp-rebuild/check-in-requests.md).
* PostgreSQL documents [UNION ALL](https://www.postgresql.org/docs/current/queries-union.html), [partial-index predicates](https://www.postgresql.org/docs/current/indexes-partial.html), [exact count work](https://www.postgresql.org/docs/current/functions-aggregate.html), and [query-plan measurement](https://www.postgresql.org/docs/current/using-explain.html). These explain database mechanisms, not this application's measured performance.
