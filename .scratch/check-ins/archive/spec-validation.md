# Check-ins: proposed spec and validation

Status: needs revision after behavioral validation, 2026-10-03. The proposal below is not ready to implement. Start with the [current decision recall and consistency check](#current-decision-recall-and-consistency-check), then read the earlier [validation of this proposal](#validation-of-this-proposal) for its history. This validation work does not edit [spec.md](spec.md); other workspace work has since changed its coaching-lifecycle references. Proposed replacement rules have not been accepted merely by appearing in this document.

Latest conceptual proposal: [Continuous client record](#continuous-client-record-a-simpler-direction), applying the independence of concerns described in Rich Hickey's *Simple Made Easy*. This direction is under discussion; the earlier draft and visual report have not yet been rewritten to adopt it.

Working vocabulary: [Domain language](#domain-language). This is the current naming proposal for the foundation the user asked to freeze. It introduces no additional attention triggers or deadline rules.

Proposed first proof: [Smallest working review loop](#smallest-working-review-loop). This tests the coach's routine before expanding the feature.

Visual report: [interactive lifecycle prototype](lifecycle-report.prototype.html) and [full lifecycle overview](lifecycle-overview.png). The report distinguishes agreed rules, proposed behavior, and unresolved choices. Guided scenarios illustrate the current draft's reminder and request-expiry problems; they do not silently adopt the audit's recommendations. Scenario logic was checked locally; the browser's local-file policy prevented an in-app HTML preview.

## Smallest working review loop

Proposed on 2026-10-03 in response to the request for the smallest build that can test this approach. This defines an experiment's scope, not implementation authorization or a replacement for the full requirements.

**Question:** Can a coach work from a persistent client roster, inspect existing client activity, and record a useful Review without managing check-in periods?

**Flow:** Client roster -> client activity -> Record a Review -> updated roster. The next review repeats the same flow.

### Two views, one new kind of record

| Part | Minimum behavior |
| --- | --- |
| Client roster | Show every accessible client in the active coaching terms used for the trial, including clients with no activity. Show the scheduled review day, last actual review or Never reviewed, and latest saved Coach assessment. Allow ordering by oldest review, with never-reviewed clients visible. |
| Client review view | Reuse the existing Training Session and nutrition history, with links to the records and their dates. Let the coach choose a Coach assessment, add an optional Private review note, and record the Review. Keep existing chat accessible for feedback. |
| Review | Preserve the client, author, actual review time, Coach assessment, and optional Private review note. Reloading must retain it. Subsequent activity and corrections do not erase or change the historical review time. |

Use the existing Coaching Term and access boundaries. Use the baseline weekly Sunday schedule for this first trial; multiweek configuration and schedule editing are not needed to answer the question. Show the weekday and last actual review as facts. Do not add a rolling review-gap alert or claim that every row must be cleared.

The Review is the only new kind of persisted domain record required by this proof. The Coaching record is assembled from the existing histories and these Reviews. Existing chat is sufficient for sending feedback during the trial; the dedicated Review reply and its editable Record reference remain part of the wider spec, not a prerequisite for this experiment.

### Walk through the behavior

Use three clients in active terms: one newly started with no records, one recording regularly, and one with no recent records.

1. Open the roster. The new and quiet clients must be discoverable without producing new activity or waiting for a period to end.
2. Review the regular client on Friday. Reload and confirm that Friday's actual Review is present. On Sunday, the fixed schedule and Friday review coexist without another generated obligation. On Monday, the client remains in the roster.
3. Review the quiet client after a missed Sunday. Save the actual review date; the next Sunday schedule stays fixed. No reviews are fabricated for missed weeks.
4. Add activity or correct an older source record after a Review. The coach can open the current record and see the changed information while the historical Review remains dated as before. This basic check does not validate automatic discovery or acknowledgement of every correction.

### Success and limits

The coach can identify who they want to review, inspect the available history, record an assessment, give feedback through chat when useful, and resume later without asking which check-in period owns the work. If scheduled-day context and review dates are insufficient for the coach to find clients reliably, that is a finding against this proposal, not a reason to silently add priority rules.

This slice validates the daily review loop and independent review timing. It does not validate request receipt and expiry, change-feed acknowledgement and concurrency, resumed-term baselines, dated-expectation comparisons, or nutrition formulas. Those remain explicit follow-on checks. Trackers, uploads, Focus, native reminders, and the dedicated Review reply stay in the full scope; they are not necessary to test this first question.

Do not treat a static dashboard as proof. The trial needs a saved Review, a reload, and a return to the roster. No product code or prototype was built as part of this scope recommendation.

## Domain language

Proposed on 2026-10-03 after the user asked to stop changing direction and define the language first. Existing vocabulary comes from [CONTEXT.md](../../CONTEXT.md). New canonical names below are proposed for this design; they have not been promoted to the shared glossary. Workflow choices still open in the decision ledger remain open.

The central sentence is: **During a Coaching term, a Coach reviews the Client's Coaching record, records a Review, and gives guidance.** The client's recorded activity continues before and after a Review.

### People and coaching

| Term | Meaning |
| --- | --- |
| Client | The person receiving coaching from a Business. Their identity and history continue across Coaching terms. |
| Coach | A person authorized to coach clients in a Business. |
| Business | The coaching organization within which clients, coaches, and access belong. |
| Coaching term | An inclusive span of client-local dates during which the Business coaches the Client. This is the existing lifecycle concept. |
| Coaching state | The client's derived relationship state, such as invited, active, or ended. It describes access and coaching eligibility, not how the client is progressing. |
| Coaching record | The combined history of a client's guidance, recorded activity, tracker values, and coach reviews. It is the overall view of that history; it does not replace the distinct records that contribute to it. |

### Recording and guidance

| Term | Meaning |
| --- | --- |
| Tracker | A definition of something the client can record, such as weight, sleep, a photo, a reflection, or a document. Its kind determines the form of its value. |
| Tracker entry | One dated recorded value of a Tracker, attributed to the client or an authorized coach. A document Tracker entry may contain the ordered PDFs and images belonging to one report. |
| Tracker list | The Trackers selected for one client, with their recording timings. It belongs to the client independently of their plans. |
| Tracker timing | When a Tracker prompts recording, such as daily, weekly, on the review day, or after an eligible workout or meal. It does not establish whether the client followed their plan. |
| Dated expectation | The training or nutrition guidance expected for a client on a particular local date. It is distinct from what the client recorded and does not imply a settled adherence formula. |
| Focus | The one-line coaching priority the coach sets for the client. |
| Tracker request | A specific coach ask for information recorded through a Tracker, such as a blood report. It is distinct from a recurring recording prompt. |
| Target date | The date by which the coach asks to receive the requested information. The term alone does not imply expiry, cancellation, or automatic follow-up. |
| Reflection | The proposed name of a text Tracker through which the client records how things are going. It is distinct from the existing Note to coach chat action. |

An uploaded report is a document Tracker entry, not a separate kind of review. An individual file is an attachment, not another report. Front, side, and back photos remain separate Trackers.

Retain the established source-record vocabulary without renaming it: **Client Plan** for training, **Client Nutrition Plan**, **Training Session**, **Diary Slot**, and **Diary Entry**. Plans describe guidance; Training Sessions and diary intake describe recorded activity. **Coverage** keeps its existing meaning of a plan's date range subject to Coaching term eligibility. **Assignment** remains the act of creating a client plan from a template; use Tracker list when talking about selected trackers.

### Coach review

| Term | Meaning |
| --- | --- |
| Review | The record of an actual coach assessment of the client at a particular time. It carries the coach's identity, assessment, and any private note or reply. |
| Coach assessment | The coach's private judgment: On track, Needs attention, or At risk. It is separate from Coaching state and is not calculated from dashboard signals. |
| Private review note | Coach-only commentary attached to a Review. |
| Review reply | Optional feedback to the client attached to a Review and delivered as the same referenced chat message. |
| Review schedule | The fixed weekday and cadence that remind the coach to look at the client. An actual Review does not move this schedule. |

Use **Review** as the canonical domain name. **Check-ins** can remain the feature or navigation name; it does not name a second record with a separate lifecycle. Retire Review checkpoint and Check-in period from the new model. A scheduled day is not a Review that already exists and is waiting to be completed.

The existing **Note to coach** remains client commentary sent through chat. The existing **Record reference** remains the source link in a chat message. A Review reply would extend that source-link capability; naming it does not claim current backend support.

### Views and factual labels

These names describe ways to inspect information, not additional coaching obligations.

| Term | Meaning |
| --- | --- |
| Client roster | The coach's list of accessible clients and their relevant coaching facts. |
| Progress summary | A view of recorded activity and available expectations over chosen dates. Its detailed calculations remain a separate decision. |
| Reporting range | The local dates selected for a Progress summary. It does not own records or determine whether a Review is complete. |
| Activity updates | Information about records being added, corrected, or removed, shown by when the change happened. The label does not claim that every update requires another Review. |
| Review age | The elapsed time since an actual Review. This is information, not an approved automatic alert threshold. |
| Waiting on client | A request still needs information from the client. This does not by itself mean the coach has unfinished work. |
| Not recorded | No structured record is available. Keep the existing meaning: this is not evidence of a skipped activity, zero intake, or non-adherence. |

Use explicit time language: a **record date** describes the activity or value's local date; **recorded at** and **changed at** describe when information was saved or corrected; **reviewed at** describes the coach's actual review. A change to an old record date can therefore be a recent Activity update.

### Language boundaries

* Use Coaching state for the relationship and Coach assessment for the coach's judgment. Avoid an unqualified Status spanning both.
* Reserve Needs attention for the manual Coach assessment when used as a formal value. Dashboard facts retain their own names, such as Scheduled today, Unread message, or Waiting on client.
* Use Progress summary for the calculated screen and document Tracker entry for an uploaded report. Avoid Report as a name for both.
* Do not use Reviewed to mean message read, attachment opened, request received, or every obligation finished. Those facts are distinct; an Inspected or Acknowledged state is not introduced by this glossary.
* Retire period-owned asks, next-period guidance, review debt, and a global Done state from the continuous-record language. No extra review-gap trigger follows from Review age.

Natural action phrases are **Start coaching**, **End coaching**, **Record a Tracker entry**, **Record a Review**, **Set the Focus**, and **Request a Tracker**. These are vocabulary examples, not a new command/API specification.

Example: Asha is in a Coaching term. Her Tracker list includes Weight and Reflection. The coach reads her Training Sessions, diary intake, and Tracker entries, then records a Friday Review with an On track Coach assessment and a Review reply. The coach also makes a blood-report Tracker request. The Sunday Review schedule remains Sunday. The request can still be Waiting on client even though Friday's Review exists.

## Current decision recall and consistency check

Recorded on 2026-10-03. Scope: this check-ins discussion and its complete saved decision history, the original spec, and the Coaching Terms work that now supplies the lifecycle boundary. This is a design audit with targeted source checks, not a running-product verification.

### Current state

The user endorsed the continuous client record direction. A coach review records an actual assessment; calendar dates and report ranges do not own the client's records. This endorsement does not approve the six attention predicates, request rules, or evidence-acknowledgement rules proposed afterward. The earlier draft and lifecycle visual still illustrate behavior that this direction would replace.

The broad concept remains coherent. The latest attention proposal is incomplete: it mixes calendar context, elapsed review time, unread information, and waiting on the client under one attention label. These can coexist as independent facts, but they cannot all mean an outstanding coach action or share a completion rule.

### Decision ledger

"Confirmed" below means explicitly chosen in this discussion. "Baseline" means recorded as settled in the original spec, with compatible intent retained; it does not mean the revised implementation is specified or shipped.

| Decision | Current standing | What remains binding or unresolved |
| --- | --- | --- |
| V1: plan edits | Confirmed A | Current edits apply immediately to eligible subsequent activity. Captured workout prescriptions and diary guidance stay frozen. A review does not control effective dates. |
| Future scheduled plan edits | Confirmed future capability | Requested separately from the first release. Detailed scheduling rules remain open. |
| V2: weekday transition | Historically confirmed A; mechanism obsolete in the endorsed direction | Extending a transition period made sense only with periods. Preserve history and predictable future reminders. Do not implement transition periods for the continuous model. Multiweek schedule-change anchoring still needs a rule. |
| V3: first attention | Confirmed early | Do not wait a full 2- or 4-week interval. New coaching clients must be visible immediately. |
| V4: four-day minimum | Confirmed removal here; conflicting shared spec | First selected weekday on or after coaching starts, including the same day. The newer Coaching Terms spec says the minimum stays. That conflict is not an approved reversal of V4 in this discussion. |
| V5: expectations | Confirmed C for training and meals | Preserve dated expectations independently of full plan versions. Later edits cannot rewrite past expectations. Capture timing, same-day changes, matching, and unavailable history remain open. |
| V6: nutrition comparison | Explicitly deferred | Recommended versus recorded calories and meals recorded versus prescribed are a tentative direction. No counting or averaging formula was approved. |
| V7: reports | Confirmed PDFs and images | Preserve originals; coach interprets them manually in the first release. |
| V8: report grouping | Confirmed A | One report is one Tracker entry with ordered PDF/image attachments. Another report is another entry. Front, side, and back photo trackers stay separate. |
| Jev AI parsing | Confirmed future capability | Parsed values should accompany original attachments. Integration, correction, and comparison details remain open. |
| V9: upload limits | Explicitly deferred | Neither 10 files nor 15 MiB was approved. Deferral does not mean unlimited uploads. |
| V10: destination of late asks | Paused; period-destination question dissolves in the new direction | Independent guidance dates are the proposed replacement. Focus persistence and request lifecycle details still need agreement. |
| V11 and continuous client record | Direction endorsed | The user first approved exploration, then said they liked the continuous-record direction. This is not blanket approval of all draft clauses. |
| V12: schedule | Confirmed A | Keep the selected calendar weekday and cadence after early or late actual reviews. A Wednesday review does not move a Sunday schedule. |
| V13: early-review credit | Withdrawn | Neither proposed option was accepted. Do not silently reintroduce credit or scheduled review instances. |
| Latest six attention signals | Proposed only | Never reviewed, review-gap threshold, scheduled today, unread chat, received information, and past-target requests were not separately approved. Existing unread-chat behavior is a baseline; the combined dashboard policy is new. |

### Original decisions still relevant

| Original decisions | Retained baseline or required reconciliation |
| --- | --- |
| Q1, Q3, Q18 | Default weekly Sunday attention, client weekday overrides, and 1/2/4-week cadence remain the baseline. Period generation is being replaced. |
| Q2, Q13b, Q16, Q17, Q29 | No form or form-submission model. Built-in/custom Trackers, typed Tracker entries, and one client assignment list outside plans remain. Rating limits, naming, and multiplicity are not settled by this concept. |
| Q19, Q21, Q22 | Ordinary prompts do not score or make entries late. One-off library entries need not join the assigned list. Assignment changes apply immediately; historical event coverage still needs dated assignment and eligibility rules. |
| Q20 and access | Authorized coaches may record tracker values with attribution. This does not authorize coach-recorded workouts or meals. Business/client access boundaries and private fields remain. |
| Q6, Q9, Q25, Q31, Q32 | Optional reply, one reply/chat-message identity, private note, and private manual On track / Needs attention / At risk assessment remain the baseline. Prior assessment prefill does not fabricate an assessment before the first saved review. Reply editing and review evidence still need implementation rules. |
| Q7, Q8, Q12 | Urgent matters go to chat. Clients see their history without private coach fields. Corrections after review must remain discoverable. A review-history presentation replaces the old archive of period summaries. |
| Q23 | Business defaults and explicit application to existing clients remain intended. Permissions and recurrence anchoring must fit the current owner/coach boundary. |
| Q24 | Client Today prompts and native local reminders remain intended; web prompts stay in-app. Delivery does not prove recording or review. |
| Q26 | Per-client metric/imperial units remain agreed. Current Coaching Terms work now contains `Client.unit_system`; the earlier claim that this field is absent is stale. Custom-unit conversion remains excluded. |
| Q27, Q28 | Archive rather than delete used custom trackers; preserve history and separate photo poses. Archive/request interaction and the replacement for a previous-period comparison range remain open. |
| Q4, Q11, Q15, Q33, Q34, Q35 | Open/due/reviewed periods, grouped closing, next-period asks, and grace-day closure cannot carry into the continuous model unchanged. No Send action still fits. Exact continuous-correction and request-receipt rules remain proposed replacements. |
| Q5, Q30 | Coaching Terms now supplies dated eligibility. No-real-clients means the launch migration scenario is no longer needed. First-attention timing conflicts across the two specs and needs reconciliation. |
| Q10, Q14 | V1 supersedes next-period plan application. V5 preserves expectation history; V6 keeps nutrition formulas deferred. No automated adherence or risk scores were approved. |
| Delivery and future scope | Delivery order was provisional and must be rewritten without period generation. Specific-event trackers, list copying, chosen-date photo comparisons, and server push remain future scope. Generic follow-up automation remains excluded. |

### Five consistency findings

1. **The review-gap alert adds another clock.** Friday review plus a Sunday calendar gives a Sunday reminder and, at seven dates, a Friday gap alert. This does not mathematically move the Sunday schedule, so it is not a direct violation of V12. It is an additional rolling attention policy that the user has not approved. If all reasons mean "review now," it recreates pressure for repeat reviews. Recommendation: retain the actual review date and sortable age; defer the automatic gap threshold, or explicitly accept it as a separate advisory policy. Keeping age as context means no promise that every missed Sunday remains an outstanding obligation.

2. **A late request is not necessarily unfinished coach work.** A report is late; the coach contacts the client; the client needs another week. The request is still pending, but the coach has handled what they can. Calling the client unconditionally in need of coach action repeats PV1's uncleared-reminder problem. Recommendation: display "Waiting on client, target date passed." Keep it visible without claiming another follow-up is owed. An explicit follow-up task would require its own scope and is not inferred here.

3. **"Inspected" is an undefined new fact.** The received-report signal cannot be calculated solely from receipt and review timestamps. Opening a preview, seeing an aggregate, and completing a review are different actions. A report corrected during inspection must remain new, and one coach's older open screen must not erase a newer acknowledgement. Recommendation: choose a precise seen/reviewed boundary and whose boundary it is before using an uninspected label. Until then, "Received Monday" is a factual display, not proof of outstanding review. PV4 remains open; the simpler concept did not solve it.

4. **Lifetime review history is the wrong baseline on return.** A client returns for a new term after a review months ago. The literal Never reviewed predicate is false, while a lifetime review-age calculation counts time outside coaching. Recommendation: retain the full client history, but derive current routine attention from the current Coaching Term. A possible label is "Not reviewed this term." Focus and pending requests need an explicit carry-forward or closure rule; neither should silently revive. This is a proposed correction, not an approved term-reset rule.

5. **The saved documents no longer form one consistent contract.** V4 removes the four-day minimum; current `spec.md` and Coaching Terms retain it. The earlier proposal still clears overdue reminders only through later reviews and expires requests, while the newer direction removes those behaviors. PV2 still refers to the absent Engagement file and removed status/stage fields. The units gap is also stale. Recommendation: use this ledger to consolidate a replacement after the remaining choices are made. Do not treat old draft prose, the lifecycle visual, or the phrase "all design questions are closed" as current approval.

### Scenario check

| Scenario | Result of this audit |
| --- | --- |
| New term Friday, four-week Sunday cadence | Immediate visibility and upcoming Sunday attention fit V3-V4. The shared four-day rule conflicts and must not be silently applied. |
| Review Friday; inspect roster Sunday and Monday | Sunday can show both the schedule and actual Friday review. Monday's calendar label expires. The client and review age remain visible. This works only as advisory context, not a queue of obligations. |
| Miss Sunday; review Wednesday | Next fixed reminder stays Sunday. One actual Wednesday review is recorded. No prior-week review is invented. |
| No client activity for several weeks | Full roster and review-age ordering keep the client accessible. An explicit alert threshold is a policy choice; absence of records is not zero intake or proof of non-adherence. |
| Coach follows up on a late blood report | Still waiting on the client. Completing a coach review cannot truthfully mark the report received, and the lateness alone cannot prove more coach action is needed. |
| Report arrives, then changes while the coach is viewing it | Receipt is known. Whether the current revision was seen is not settled. Must not clear the later change with a save-time shortcut. |
| An old meal changes while last week's report is open | Changed-information discovery must include the older date even though the selected summary range does not. This remains an implementation requirement. |
| Old received evidence is deleted after a new request is issued | Surface removed evidence; do not automatically reopen the old request and create two pending requests. Successor handling remains a request rule. |
| Coaching ends and later restarts | Readable history survives. Current eligibility follows term dates. A new-term review baseline and the fate of pending guidance remain open. |
| Plan edited at midday; only breakfast recorded | Dated expectations preserve context, but no single full-day calorie/adherence conclusion follows. V5 matching and V6 calculation remain open. |

### Shared record and verification limits

The live branch is `codex/coaching-terms`. Commit `f5e79878` contains the saved check-ins proposal, visual artifacts, and Coaching Terms spec. Current staged source includes the Coaching Term schema and services and the per-client unit field. This audit inspected `backend/lib/easy/coaching_terms/coaching_term.ex`, `backend/lib/easy/coaching_terms.ex`, `backend/lib/easy/clients/client.ex`, and `backend/lib/easy/client_access.ex`; it did not run their tests or establish that the branch is merged. Other ongoing changes were left intact.

Current sources: [Coaching Terms](../coaching-terms/spec.md), especially E1-E4, M7, and Effect on the check-ins spec; [Client schema and derived state](../../backend/lib/easy/clients/client.ex); [term date coverage](../../backend/lib/easy/coaching_terms/coaching_term.ex). The old Engagement path no longer exists. Earlier backend findings remain historical unless rechecked here.

Recall used this conversation, V1-V13, the Q1-Q35 source record, and local git history. No chat-export identifier was available to cite, and no unrelated transcripts were mined. The referenced `why` skill and external issue/chat/error tools were unavailable, so no external incident or PR-state claim is made. Code graph tools were unavailable; checks used the known source paths directly. The available `unslop` skill was used for the brief.

Next decision: whether review age is context only or also a second automatic attention trigger. Recommendation: keep it visible and sortable while the calendar remains the sole routine schedule. This recommendation is not approval to rewrite the rest of the spec around it.

## Purpose

The sections from Purpose through Acceptance examples preserve the earlier proposed spec. They are not the consolidated continuous-record contract. Use the current decision ledger above to distinguish accepted requirements from proposals and conflicts.

A coach needs one place to see every client, why each client may need attention, what changed since the coach last reviewed them, and what guidance the client has received. A client should know what to record and what the coach has asked them to do. The coach should be able to complete a review without waiting for a form or managing a series of check-in periods.

This proposal takes the client roster, insight panel, and explicit review-complete action from Everfit's documented beta dashboard. It uses factual signals to guide attention. The coach still makes the private judgment of whether a client is On track, Needs attention, or At risk. [Everfit dashboard settings](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard), [client list](https://help.everfit.io/en/articles/16000579-check-in-dashboard-manage-your-client-list), [review action](https://help.everfit.io/en/articles/16000615-check-in-dashboard-complete-client-check-ins).

## Core concepts

* **Tracker:** A reusable definition of a value a client can record: number, rating, photo, text, or document. A client's tracker list assigns definitions and reminder timing independently of training and nutrition plans.
* **Tracker entry:** A dated value recorded by the client or an authorized coach. It keeps its author, local occurrence date, save time, revision, and attachments where relevant.
* **Attention schedule:** A client-specific weekday and cadence of one, two, or four weeks. It creates calendar reminders for the coach and prompts for trackers timed to the attention day. It does not create check-in period or task rows.
* **Review checkpoint:** An actual coach action, with author and time, that records the coach's assessment, optional private note, optional reply, and the information the coach considered. A checkpoint has no owning date range.
* **Coach assessment:** The coach's private On track, Needs attention, or At risk judgment. The latest assessment is shown with its review date. It is never calculated from activity counts.
* **Focus:** The current one-line coaching priority. It starts when set and lasts until changed or cleared.
* **Tracker request:** A dated request for a tracker entry, with an explicit deadline and outcome. It is independent of the attention schedule.
* **Dated expectation:** What training or nutrition guidance expected for a client-local date, including dates on which the client recorded nothing. Later plan edits do not rewrite its history.

The term **client status** remains reserved for account lifecycle values such as active and inactive. The existing **Note to coach** remains a chat message. The default text tracker is named **Reflection** to keep those actions distinct. These glossary changes are proposed here; update `CONTEXT.md` after approval.

## Coach dashboard

Every authorized client who is active and in the coaching stage appears immediately in the coach roster, including clients who have never recorded anything. The business owner sees all clients. Other coaches see only clients assigned to them. Inactive clients are available in a separate view with their history but no active attention reminders.

Each roster row shows the client, latest coach assessment and its date, last actual review, next or overdue attention date, and factual reasons to look. Reasons are: attention due, new or corrected records, unread chat, an open or expired tracker request, no activity for 14 full client-local days, and plan coverage ending within seven days when an end date exists. A new client is marked Never reviewed. No activity counts structured workouts, diary intake, and tracker entries; chat does not count as activity. The 14-day signal starts only after 14 full days in coaching. A missing record is never treated as zero intake or failed adherence.

The default view keeps all clients accessible and places clients with outstanding attention or new information first. Search and filters narrow the roster by coach assessment and factual reason. Summary cards count clients, not outstanding tasks; one client can appear in several cards. A coach may hide optional signals such as inactivity or ending coverage in their own dashboard settings. Attention due and new information remain visible in the default view. Hiding a signal never removes the client from All clients or changes the coach assessment.

The dashboard shows the current week and four earlier calendar weeks for activity summaries. Switching the reporting week never hides a live attention reason or new correction. A calendar week is a display range, not the lifetime or owner of a record. The proposed scope does not calculate Everfit-style risk thresholds from training or nutrition data.

## Attention schedule

The business default is weekly on Sunday. The business owner can change the default weekday and cadence; the assigned coach can override either for one client. Changing a business default applies to new clients. Applying it to existing clients requires an explicit bulk action that previews each client's next attention date. Business settings follow the existing owner-only permission.

At launch, an active coaching client becomes visible immediately. Their first attention date is the first selected weekday on or after their local launch date. A client who enters coaching later follows the same rule from their coaching start date. A same-day first reminder is valid. After that, the schedule repeats every one, two, or four weeks from that first attention date. There is no four-day minimum or initial full-interval wait.

An attention date is a reason to consider the client, not a mandatory review instance. If the coach reviews Friday and the attention day is Sunday, Sunday's roster still shows that reminder alongside the Friday review date. If the coach reviews Wednesday after a missed Sunday, the review is dated Wednesday and the next reminder stays on the upcoming Sunday. Several missed dates produce one visible client with the last review date and elapsed time, not a backlog of check-in tasks. A review on or after the latest scheduled attention date clears that overdue signal until the next scheduled date. A same-day review counts for that date. Changes to weekday or cadence recalculate future dates from the next selected weekday on or after the change's local date; past reminders and reviews stay historical. The coach sees the resulting next date when saving a change.

Pausing or deactivating coaching stops attention reminders without deleting records. Reactivation restarts attention from the first selected weekday on or after the new coaching start date. An inactive stretch creates no missed activity or review obligation.

## Review workflow

Opening a client shows the current focus, requests, latest private note, prior reviews, relevant plan links, and a feed of information created, corrected, or removed since the last review's acknowledged evidence. The feed includes changes to older occurrence dates. It is separate from date-based progress summaries. Unread chat remains a separate inbox signal.

The coach can choose a report range. Its default is the trailing 7, 14, or 28 client-local dates, matching the client's attention cadence and ending on the current local date. The coach can also compare it with the immediately preceding range of equal length. These ranges summarize activity; they do not assign records to a review. Every summary shows its dates and links to its records. The coach can inspect older history outside the default range.

The coach explicitly selects **Complete review** after assessing the information shown. Completion is valid even when the client recorded nothing and when the coach sends no reply. The first review form suggests On track but does not create an assessment until the coach saves. Later reviews prefill the latest coach assessment. A completed review stores author, time, assessment, optional private note, optional reply, the selected report range, and an evidence boundary identifying the record revisions presented to the coach. Saving can also set the current focus and issue tracker requests. Those changes become visible to the client immediately.

The review acknowledges only information the coach was shown. If a client saves a correction while the coach has the page open, that revision stays in New information after completion; the screen tells the coach that newer information arrived. A later edit to a review's note, reply, or assessment does not move its review time or evidence boundary. Editing an older assessment does not change which assessment is latest. Two coaches can review the same client, but an older open screen must not erase a newer review or acknowledge information it never displayed. Deletions and moved occurrence dates remain discoverable as changes. A review does not lock client records.

The optional reply is one chat message with a Record reference to the review. Editing or deleting the reply edits or removes that same chat message. The private note and coach assessment never enter client API responses. The client sees the review time and any reply in their history; there is no fabricated review for a missed attention date.

## Training and nutrition insight

The review shows completed planned Training Sessions, completed freestyle sessions, dated workout expectations, diary days with recorded intake, recorded Meal Slots, dated meal expectations, and calorie targets beside recorded calories where both exist. It links each figure to the underlying record. A day without intake is **Not recorded**, not zero calories. An average intake uses days with recorded intake and states that denominator. A meal is counted as recorded when its expected Meal Slot contains actual intake; this is a recording count, not proof that the prescribed foods or portions were followed. A completed session is shown as completed; off-schedule and repeated sessions remain visible rather than being silently used to fill an expected date.

Training and nutrition retain dated expectation history independently of full plan-version history. Expectation changes record when they became effective, including a same-day edit, and preserve earlier values. Review summaries do not reconstruct past expectations from the current plan. At rollout, dates without captured expectations display **Expectation unavailable**; the product makes no missed-workout or missed-meal claim for them. The first release shows expected and actual facts together without an automated adherence percentage or risk score. Matching rules for rescheduled workouts, substitutions, and nutrition adherence are separate future decisions.

Plan links open the existing training and nutrition editors. Edits to current plans take effect immediately for subsequent activity under existing plan behavior. Already captured Training Session prescriptions and Diary Slot guidance remain frozen. A future feature will let coaches schedule plan changes for later dates; review timing will not control their effective date.

## Trackers and client recording

The library contains curated built-in trackers and business-specific custom trackers. Built-in examples include body weight, waist, front, side, and back progress photos, sleep, energy after workout, bloating after meal, blood report, and Reflection. Front, side, and back remain separate photo trackers. Custom definitions have a name, kind, optional unit, and default timing. Each client has one assignment list, separate from plans. Its business default contains Reflection, prompted on the attention day. The business owner can change the default list; an authorized coach can edit a client's list. Default-list changes apply to new clients; applying them to existing clients requires an explicit bulk action. Assignment changes take effect when made. Assignment history determines which event prompts existed on a past date.

Timing can be daily, weekly, on the client's attention day, after each eligible workout, after each eligible meal, or an explicit coach request. An eligible workout is a completed Training Session; an eligible meal is a shared Diary Slot with actual intake. Reminder timing prompts recording; it does not score the client or make an entry late. Client Today shows due reminders for that local date and removes an ordinary reminder when recorded or when the date ends. A missed reminder does not erase the coach's independent attention signal. Event-linked trackers show recorded coverage only for eligible events while assigned.

Clients can record an assigned tracker on any date. They may also choose another tracker from the business library for a one-off entry without adding it to their assignment list. An authorized coach may record a tracker entry for a client; the entry is labeled **Recorded by coach** and is visible to the client. This does not grant coaches permission to create client workouts or diary intake. Entries can be corrected later. A correction to an entry the coach already reviewed appears as new information. There is no Send action, client submission state, or grace-day lock.

A document Tracker entry represents one report with ordered PDF and image attachments. Photographed pages stay together; another report is another entry. The coach inspects the original files in the first release. Future Jev AI extraction may add structured values beside, not in place of, the originals. For each photo tracker, the default comparison uses the latest photo in the selected report range against the latest earlier photo; the coach can switch to the first photo as baseline. Missing photos display as missing, without choosing another pose. Operational attachment limits are set before implementation, as previously deferred.

Custom trackers with entries can be archived, not deleted. Their definitions and values remain readable in history. A tracker with an open request must have that request resolved or cancelled before archiving. Archiving removes the tracker from active assignments and stops future prompts; restoring does not recreate past assignments. A custom tracker without entries can be deleted. Built-ins cannot be archived. Recorded entries preserve the tracker label, kind, and unit used when recorded so later definition edits do not reinterpret them. Each client has a metric or imperial display preference; built-in numeric values use canonical storage and convert for display. Custom free-text units are not converted. Workout load-unit behavior stays separate from tracker units.

## Focus, requests, and client history

A coach may set or clear the current focus in a review. The client sees the current focus on Today until it changes; historical reviews keep the guidance that existed then. A coach may request a specific tracker, including one outside the client's assigned list. Each request has an issue date and required deadline. At most one request for a given tracker can be open for a client. The editor suggests the next attention date as the deadline and lets the coach change it. The client sees an open request under **Your coach asked for** until they supply the entry, the deadline ends in the client's local timezone, or the coach cancels it. A matching entry recorded after issue and by the end of the deadline date is linked to the request and marks it received. If that entry is removed, the request returns to open or expired according to its deadline. An entry after the deadline remains in history and appears as new information, but does not silently rewrite an expired request. An expired request remains a reason to look until a coach review acknowledges the missed outcome; it then stays in history. The coach can make another request; the system never renews it automatically.

The client sees their dated tracker history, actual review history, current focus, open requests, and coach replies. The client never sees the private note or coach assessment. Urgent matters go to chat, available beside Reflection and requests. A Reflection is a text tracker prompted on attention day, not a chat message and not a form submission.

## Access and time

All record reads and writes follow the existing business and assigned-coach access boundary. Files, parsed values, review references, and private coach fields follow the same tenant and client scope. Client-local occurrence date, save or correction time, and coach review time remain distinct. A change to an earlier occurrence date is new information when saved while still contributing to the appropriate historical activity range.

Native client apps eventually schedule tracker reminders with Capacitor local notifications; the web client shows Today prompts in-app. Device reminders are delivery only and never prove recording or review. Notification scheduling and upload limits get operational design before those pieces ship.

## Delivery boundaries

1. Tracking foundation: Tracker library, assignment list, entries, document reports, client Today prompts, and coach tracker history. Begin capturing dated training and nutrition expectations before claiming historical comparisons.
2. Coach review loop: Full client roster, factual attention signals, actual review checkpoints, manual assessment, private notes, replies through chat, and client review history. Focus and requests ship with their client visibility and receipt flow, not earlier.
3. Insight and reminders: Date-based training and nutrition summaries once their source history is reliable; photo comparisons; native local notifications verified on iOS and Android.

The proposed check-in scope excludes submitted check-in forms, per-period objects, generated review tasks, automatic risk labels or adherence scores, generic follow-up automation, scheduled plan edits, Jev AI parsing, and server push notifications. Those last three remain requested future capabilities where noted above.

## Acceptance examples

* A client starts on Friday with a four-week Sunday schedule. The coach sees them Friday; Sunday is their first attention date; later dates are four weeks apart.
* A coach reviews a client Friday. Sunday's dashboard still shows the scheduled attention date and Friday's review. It does not require a second formal review.
* A coach misses three Sundays. The client appears once, with the last review date and overdue attention. One Wednesday review does not shift the next Sunday reminder.
* A client records nothing for two weeks. They still appear because of scheduled attention and the factual no-activity signal. No intake or adherence value is invented.
* A coach opens a client at record revision 4. The client saves revision 5 before completion. The review records the evidence presented; revision 5 remains visible for the next review.
* A client corrects last month's meal or moves a completed workout to another date. The correction appears in New information; date-based summaries use the corrected occurrence date.
* A client uploads four photographed pages of one report. The coach sees one dated document entry with four ordered images and can inspect the originals.
* A client records a late Reflection. It appears as new information without reopening a form, changing a past review, or creating a new check-in period.

The proposal makes three replacement choices that were recommended but not separately accepted during validation: use manual coach assessment with factual dashboard signals; allow continuous correction instead of the grace-day lock; give tracker requests explicit deadlines rather than a check-in period's lifetime. The default meal-recording rule above is also a proposal resolving deferred V6 at the level needed for a factual dashboard. Review these choices before treating this as an approved implementation contract.

## Validation of this proposal

Reviewed on 2026-10-03 against the agreed decisions, the complete proposal above, concrete coaching scenarios, the separate Engagement proposal, and targeted backend source. This is a design and source review, not a running-product test. Graph tools were unavailable, so source verification used the named files directly. No product code changed and no tests ran.

### Verdict

Keep the client roster, ongoing dated records, actual review checkpoints, optional chat feedback, and separate coach assessment. These fit the intended daily workflow. Early client visibility, fixed calendar cadence, immediate plan-edit behavior, PDF/image report grouping, and the requested future capabilities are preserved in concept.

The proposal is not an implementation contract yet. Removing check-in periods simplifies record ownership, but does not by itself settle when a coach has handled an attention reminder, which information a review acknowledges, or when a request stops being actionable. The following findings are recommendations for revision, not newly accepted decisions. Manual assessment is already the original Q31 baseline; adopting the dashboard does not require reopening that choice first.

### PV1. An optional calendar reminder still behaves like an owed review

The attention rule says Friday's review does not suppress Sunday's reminder, and only a review on or after Sunday clears it. Suppose Friday's review is sufficient and there is nothing new on Sunday. On Monday the client is still overdue. The coach has no way to treat the reminder as handled without recording another review. This leaves the acceptance claim that no second formal review is required operationally incomplete. A roster can legitimately contain advisory signals, but it cannot also promise that every such signal behaves like work the coach can finish.

Recommended correction: make the fixed calendar day and elapsed time since the last actual review explicit roster context. Keep every client visible, including quiet clients, and do not imply that the coach must empty a list of scheduled obligations. If clearing each reminder is a product requirement, an explicit attention-handled action or early-review rule is still needed. That would be a real additional decision. Changing the weekday must also specify what happens to an already-overdue signal; recalculating only future dates cannot silently erase it.

### PV2. Coaching eligibility conflicts with the Engagement direction

Historical finding: the later recall above found Coaching Terms in the working tree and the old Engagement path absent. The code-state claims and source line locations in this earlier paragraph must not be reused as current evidence.

The proposal depends on active status, coaching stage, pause, and a durable coaching-start date. Current code has the first two but no paused state or separate history of coaching starts and inactive stretches. The [Engagement spec](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/client-engagement/spec.md:5) proposes replacing those lifecycle fields, starting coaching through an Engagement, and retaining read-only client history after it ends. That document is still needs-triage; it is a competing design dependency, not implemented behavior.

Recommended correction: give one model ownership of coaching eligibility and dated coaching intervals. Check-ins should consume that boundary. If Engagement is adopted, first attention, end-of-coaching behavior, client write access, inactive exclusions, and resumption all follow it. If check-ins ship first, define the interim start-date baseline and transition rather than assuming the current client row contains that history. Define or remove pause. Explicitly handle active onboarding clients, ended coaching, and the fate of current focus and requests on return. Evidence: [client lifecycle fields](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:18), [stage changes](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients.ex:26), [reactivation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:259).

### PV3. Request expiry and reopening create contradictory work

The proposal removes a request from client Today at its deadline and refuses to fulfil it from a later entry. A blood report uploaded Monday for a Sunday deadline would therefore appear as new information while the request still says it was not received. That needs an explicit late-receipt outcome or a deliberate product reason for expiry.

There is also a direct invariant failure: request R1 is received, the coach issues R2 for the same tracker, and the client removes R1's entry before R1's deadline. The written rule reopens R1 while R2 is open, violating the one-open-request rule. Treating every open request as a coach attention reason also puts a newly issued request back in the coach's work immediately, even when only the client can act.

Recommended correction: distinguish waiting on the client from something the coach needs to inspect. A request stays visible until received, cancelled, or explicitly replaced; its deadline can produce an overdue label, and later receipt can be labelled late. Keep the agreed no-automatic-renewal rule. Deleting old evidence should surface a change without silently reopening a superseded request. If automatic expiry is retained instead, define late receipt and successor-request precedence before implementation.

### PV4. The review evidence boundary is a requirement, not yet a complete rule

The concurrency example is correct, but the draft does not settle whether seeing a summary acknowledges all its contributing records, whether unvisited pages are included, or how acknowledgements from successive or concurrent reviews combine. A record acknowledged in one review must not become new again merely because the next review considered other records. Nor may an older open screen undo a newer acknowledgement. First-review and reactivation baselines also need a rule for what enters New information.

Recommended correction: define the evidence included in each completed review, accumulate acknowledgement without moving backward, and leave omitted or later revisions visible. Decide whether historical reviews retain a frozen summary of what the coach saw or instead open clearly labelled corrected source data. A revision number alone cannot reproduce the old contents. Existing history pagination uses insertion order, so it cannot discover all recent corrections to old records. Set deletion and diary replacement provide current revisions, not complete old content. Evidence: [training history pagination](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:147), [cursor ordering](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/cursor_page.ex:13), [set removal](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_performed_sets.ex:123), [diary revision](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot.ex:29). This can be designed without adopting full event sourcing.

### PV5. Preserving expectations does not yet define a comparison

The draft stores same-day expectation changes but does not choose what a daily summary compares against. If a calorie target changes after breakfast, or today's workout changes at noon, preserving both versions still leaves the coach-facing value ambiguous. Training also permits planned sessions off schedule, so completed planned-session counts do not prove fulfilment of scheduled occurrences.

Recommended correction: preserve the dated basis approved in V5, explicitly display same-day guidance changes, and define the expectation version used by each comparison before adding a fulfilled-versus-expected claim. Capturing expectation history is new work. Training replaces its schedule; nutrition prioritizes frozen slots and can retain a day's first captured targets. Qualify immediate plan edits accordingly: they do not refresh existing frozen slots or day targets. Evidence: [schedule replacement](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_writer.ex:67), [frozen guidance precedence](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:123), [day target capture](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:196).

### PV6. Deferred nutrition decisions were promoted into the proposal

V6 deliberately deferred meal-counting and nutrition-summary rules. The draft offers a meal-slot rule and an average over days with intake; these remain proposals. One recorded breakfast on each day can still produce a calorie average far below the target without describing full-day intake. The draft also counts saved intake in insight while event prompts require a shared meal, without explaining that distinction in the review. Inactivity does not say whether a correction to last month's record counts as activity today.

Recommended correction: keep the V6 decision explicitly deferred and describe recorded intake, target, and recording coverage together until a comparison policy is chosen. Label saved/unshared information separately from shared meals. Define a no-records signal using either occurrence dates or recording activity, and name it accordingly; neither can silently substitute for the other. Current coach reads include unshared slots, and `last_active_at` can advance on a correction or removal. Evidence: [coach slot reads](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:147), [save activity](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:63), [sharing option](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:114). Lack of a log remains unknown intake, as the draft already states.

### PV7. Dashboard and review date ranges can disagree

The roster uses calendar weeks while opening a client defaults to a trailing 7, 14, or 28 dates. A coach can select last week, open a client, and get a different set of numbers. The default trailing range can also include dates before coaching or expectation capture began. Two equal-length ranges do not automatically provide comparable coverage when one contains only a partial day or partial coaching history.

Recommended correction: carry the selected reporting dates into the client panel, show the client timezone and data cutoff, and identify unavailable history. Use an explicit comparison range with matching eligible coverage, or label the mismatch. Keep the New information feed independent of those dates, as already proposed. A four-week comparison spans 56 dates; the nutrition endpoint accepts at most 31 in one request, so implementation needs deliberate aggregation or bounded multiple reads. Evidence: [nutrition range limit](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:79).

### Delivery and scope corrections

The document adds a 14-day inactivity rule, seven-day ending-coverage rule, four earlier dashboard weeks, optional signal settings, request auto-expiry, and tracker archive restrictions. These are proposed defaults, not decisions from our earlier discussion. They should not all become prerequisites for proving the daily review workflow. A smaller first slice can use the full client roster, visible review dates, existing activity, private assessment, and an explicit review action. Expectation capture and historical comparison have their own dependencies; reporting claims must wait for reliable history.

The following backend changes are normal implementation scope, but need to be named explicitly rather than assumed to be reusable as-is:

* Review-aware reads and change discovery, including removed or date-moved information and acknowledgement across pages.
* Chat references for reviews and editing/deletion of the same reply message. Specify who may amend another coach's reply, how edit attribution works, and whether edits become unread. The [router](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/router.ex:176) has no message-edit/delete route, and [reference validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:112) accepts only training and meal references. A [reference preview](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_references.ex:61) is not a substitute for historical review evidence. Review completion, its reply, and changed guidance must not leave a partially saved result or duplicate replies on retry.
* PDF upload and authorized reading. Existing [attachment validation](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:16) does not accept PDFs. Deferring size limits does not defer this required capability.
* A per-client tracker unit preference with an initial default and an owner who can change it. The [client profile](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/client_account.ex:93) currently exposes the business weight-unit default. Preserving a tracker entry's label and unit is also insufficient for comparisons if the definition changes kind or meaning; incompatible changes need a new tracker identity or an explicit comparison boundary.

Recommended revision order: settle the meaning of calendar attention (PV1); agree the lifecycle boundary (PV2); simplify requests (PV3); define what completion acknowledges (PV4); then refine dated comparisons and reporting (PV5-PV7). Keep manual coach assessment as the existing baseline and leave operational upload limits deferred. This validation does not approve or implement any of these recommendations.

## Continuous client record: a simpler direction

Proposed on 2026-10-03 in response to the request for a concept that untangles the remaining decisions. The user endorsed this direction; the specific replacement rules remain proposals unless separately accepted. This is a proposed correction to the draft, not a claim that its current behavior already follows these rules.

**The client has an ongoing coaching record. A check-in is the coach reviewing that record.**

The governing rule is: **changing when we look must not change what happened, what was prescribed, or what is still requested.** Records belong to the client. Report ranges select information. Reviews record actual coach actions. Calendar reminders suggest when to look.

Hickey distinguishes simplicity from familiarity or convenience: independent concerns can be composed without making one concern's meaning depend on the others. A smaller number of concepts is not itself evidence of simplicity. This product proposal applies that distinction; it is not a product design prescribed by the talk. [Simple Made Easy, especially 3:34–4:12 and 33:08](https://www.infoq.com/presentations/Simple-Made-Easy/).

### Independent meanings

| Information | What it means | What it does not decide |
| --- | --- | --- |
| Guidance and dated expectations | What the coach prescribed, and when it applied | Whether the coach has reviewed the client |
| Client records | What was recorded, when it occurred, and when it changed | Which check-in period owns it |
| Coach review | When the coach assessed the client, their judgment, and any note or feedback | Whether every request is answered or the client's week is complete |
| Tracker request | What the coach asked to receive, its target date, and its receipt or cancellation | When another coach review is allowed |
| Attention schedule | When the coach intends to look | Whether records can be entered, corrected, or included in a report |
| Reporting range | Which dates a particular summary describes | Record ownership, review completion, or request lifetime |

This is one coherent client experience, not one database object containing all these lifecycles. Existing training, nutrition, chat, and attachment responsibilities can stay distinct. No wholesale event-sourcing rewrite follows from this concept.

### Coach's daily loop

Open the full authorized coaching roster. See who has never been reviewed, scheduled attention dates, elapsed time since actual reviews, new information, and outstanding requests. Open a client, inspect the relevant history, record an assessment, and give guidance when needed. The client keeps recording before and after that review.

The roster must support scanning by review age as well as new information; quiet clients cannot depend on producing updates to be noticed. Request labels distinguish waiting on the client from received information ready for the coach. A new coaching client is visible immediately.

### How attention would be calculated

Proposed clarification, 2026-10-03. The user asked how the dashboard calculates what needs attention. The following predicates and defaults have not yet been accepted.

Compute a set of named reasons for each eligible client from current facts. Keep the coach's private assessment separate. No aggregate health score or overall Done state follows from these signals. An absent signal is not proof that the client is doing well.

| Signal | Proposed rule | What changes or removes it |
| --- | --- | --- |
| Never reviewed | No actual coach review exists for the client | First actual review |
| Review gap | Time since the last actual review reaches a chosen review-gap threshold | Another actual review; do not generate one obligation per missed interval |
| Scheduled today | Today is an occurrence of the client's fixed attention schedule | The date changes; this is a routine reminder, not an owed review |
| Unread message | The existing chat read boundary leaves a client message unread | Reading the message; reading does not claim a reply was sent |
| Requested information received | A request has received an entry whose current information has not yet been acknowledged in the coach's view | Acknowledging that information under the change-feed rule; no separate formal review is inherently required |
| Request past target date | The target date has passed and the request is still pending | Receipt, cancellation, explicit replacement, or explicit target-date change; completing a review alone does not resolve the request |

Proposed default for the review-gap threshold: the configured cadence, expressed as 7, 14, or 28 client-local dates. This is an additional advisory policy, not an already agreed requirement. The fixed weekday stays anchored when a review happens early or late. It answers when the coach intended to look; review age answers how long it has actually been. For a newly resumed coaching relationship, the eligibility/start boundary must establish the appropriate baseline; do not count inactive time as neglect. That remains part of PV2.

Ordinary new workouts, meals, and tracker entries show update counts. They do not, by themselves, create an urgent-action label after every log. Corrections to previously reviewed information receive an explicit Changed since review cue. Requested reports can be distinguished from routine logging because the coach explicitly asked for them. The latest manual assessment remains visible and can guide filtering; these predicates never calculate or overwrite it.

Every client appears once in the roster, with whichever reasons apply. The routine view brings scheduled clients and clients with long review gaps forward, with last-review dates visible. Follow-up filters expose unread messages, received requests, and requests past their target date. There is no proposed weighted priority score. No-records and plan-ending signals can be added as independent rules later; the draft's 14-day and seven-day defaults are not accepted by this clarification.

Example with a weekly Sunday schedule: the coach reviews Friday. Sunday shows Scheduled today and Last reviewed two days ago, without a Review gap signal. Monday's scheduled-day label disappears; the client stays in the roster. If no further review happens, the seven-date gap signal appears the following Friday and remains until another actual review. A blood report arriving Monday adds a received-information signal immediately. No weekly instance is opened, closed, credited, or carried forward.

Signal removal is specific to its cause. Reading chat does not clear a request. Receiving a report does not count as a coach review. Reviewing the client does not erase a pending request. Changes arriving during inspection must remain discoverable. Precisely how the coach acknowledges presented changes, across pages and concurrent updates, remains PV4 implementation/design work; using the save time of a review as a blanket acknowledgement would be incorrect.

### Consequences for the difficult cases

* **Friday review, Sunday attention:** Sunday shows the intended attention day beside the actual Friday review. No generated review debt accumulates. On Monday the roster still shows the client and elapsed review age. This explicitly replaces the draft's overdue-until-reviewed rule; it does not introduce early-review credit or shift the fixed calendar.
* **Review missed for several weeks:** one client, an increasingly old review date, and their current information. No fabricated review instances or backlog of periods. The tradeoff is that this model does not certify fulfilment of a weekly review obligation.
* **Late report:** the request remains pending after its target date unless cancelled or replaced. Receipt can occur later and be labelled late. The report belongs to the client's history; no period needs reopening. Removing old evidence surfaces a change without automatically resurrecting an earlier request.
* **Correction during or after review:** the correction remains discoverable. The earlier coach action remains historical; it does not become incomplete. A review is not a claim that every underlying record has been individually inspected. Any relaxation of the draft's exact-evidence acknowledgement requirement needs explicit acceptance. Change discovery and concurrent updates still require a concrete rule; a completion timestamp alone is insufficient.
* **Plan changes:** preserve what was expected when it applied, independently of review timing. Immediate edits remain the agreed baseline; future scheduled edits supply a later effective date. Reports can compare dated guidance and observations without depending on completed check-ins. Same-day comparison policy and nutrition formulas remain unresolved.
* **Coaching ends or resumes:** the authoritative coaching lifecycle controls eligibility and access. The client record retains its history. Check-ins do not invent another active, paused, or ended lifecycle. Adoption of Engagement and treatment of pending requests on return still require agreement.
* **PDFs, images, and future parsing:** the original report is an observation. Later parsed values enrich that report without replacing it or requiring a new review period.

### What this resolves, and what it cannot choose

This direction removes period ownership, early-review credit, rollover, grace locks, request expiry caused only by elapsed time, and cascading completion states. It preserves early visibility, fixed calendar cadence, actual dated reviews, independent expectation history, manual coach assessment, grouped reports, and the requested future capabilities.

It does not choose nutrition formulas, same-day expectation matching, permission rules, or sufficient historical evidence. Those become local decisions with explicit owners rather than rules that change every other workflow. PV1 has a clear proposed resolution; PV3 has a simpler request lifecycle. PV2 and PV4–PV7 retain the concrete requirements identified in the validation above.

The product tradeoff must remain visible: an advisory roster provides continuous oversight, not an inbox that can truthfully certify that every scheduled obligation is complete. If that certification is essential, an explicit obligation model is needed; renaming it a reminder would hide complexity again.

## Validation history

Status: discussion in progress

Started: 2026-09-25

Source: [Check-in spec](spec.md). The source spec remains unchanged.

Latest assessment: [Checkpoint model stress test](#checkpoint-model-stress-test). This assessment distinguishes preserved decisions from proposed replacements; it is not approval to implement every proposal.

This document records the validation discussion and agreed replacement requirements. Recommendations are proposals until accepted. Validation questions use V numbers to distinguish them from the original spec's Q numbers. Resolve one issue at a time, including dependent questions, before moving on. Consolidate the agreed requirements here at the end of the session and confirm shared understanding before implementation.

Session direction: On 2026-09-25 the user asked to prioritize concepts over basic implementation questions. Focus the discussion on the coaching loop, domain ownership, lifecycle, and meaningful behavior. Defer upload limits and similar operational details. Previously agreed decisions remain valid.

### Decisions

#### V1. When plan changes take effect

Related requirement: original Q10.

The spec says a plan change takes effect in the next check-in period. The current plan editors save changes immediately. Training captures the prescription when a session starts; nutrition captures guidance when a diary slot starts. Existing recorded snapshots remain unchanged, but subsequent activity can use the edited plan within the same check-in period.

Options:

* A. Keep the existing plan behavior. A check-in provides access to plan management without changing when plan edits apply. Future-dated plan coverage remains a separate plan-management action.
* B. Require changes made through a review to start with the next check-in period. This adds a workflow for future-effective prescriptions and needs further decisions about late reviews and intervening plan changes.

Recommendation: A. Check-in periods group records for review; they do not control plan editing or coverage.

Decision: A, agreed on 2026-09-25.

Replacement requirement for Q10: The review screen gives direct access to the client's training and nutrition plans. Check-ins do not change plan-editing or coverage rules. Edits to the current plan apply immediately to subsequent activity that captures its prescription or guidance. Already captured workout prescriptions and diary guidance remain unchanged. The reply and private note may explain the change.

Evidence: [training plan updates](../../backend/lib/easy/training_programming.ex), [training start and snapshot](../../backend/lib/easy/training_execution.ex), [nutrition guidance freezing](../../backend/lib/easy/nutrition_diary.ex).

#### V2. Moving the check-in weekday

Related requirements: original Q3 and Q18, contiguous periods, and changes taking effect after the current period.

Whole-week periods preserve their ending weekday. A Sunday-ending period followed by a contiguous 7-, 14-, or 28-day period also ends Sunday. Changing to Wednesday therefore requires an explicitly permitted transition period of a different length.

Options:

* A. Keep the current period's dates. Start the next period the following day and end it on the first occurrence of the new weekday on or after its normal end date, using the selected cadence. The transition period is the selected length plus zero to six days. Later periods use the selected whole-week length.
* B. Keep the current period's dates. End the next period on the first occurrence of the new weekday after the current period ends, even if this creates a very short period. Later periods use the selected whole-week length.

Example: changing a weekly Sunday check-in to Wednesday produces a Monday-through-the-following-Wednesday transition of 10 days under A, or a Monday-through-Wednesday transition of 3 days under B.

Recommendation: A, to preserve a full review interval while avoiding gaps or overlapping dates.

Decision: A, agreed on 2026-09-25.

Replacement period rule: A change to the check-in weekday or cadence leaves the current period's dates unchanged. The next period starts the following day. Calculate its normal end using the newly selected cadence, then extend to the first selected check-in weekday on or after that date. This permits one transition period of the selected length plus zero to six days. Subsequent periods use the selected 1-, 2-, or 4-week cadence. A cadence-only change needs no extension because the ending weekday stays the same. These are system-calculated transitions, not coach-authored custom date ranges.

#### V3. First-period length for a new check-in run

Related requirement: original Q30.

The original rule ends the first period on the next check-in weekday, extending by one week if that produces fewer than four inclusive dates. This creates a first period of 4 to 10 days even when the client's recurring cadence is two or four weeks.

Options:

* A. Keep an early first check-in for every cadence: use the first check-in weekday that gives at least four inclusive dates, then use the configured cadence for subsequent periods.
* B. Give the first period a full configured interval: count 7, 14, or 28 inclusive dates from its start, then extend to the first check-in weekday on or after that end date.

Example: a client starts coaching on Thursday with Sunday check-ins and a four-week cadence. A ends the first period that Sunday, after 4 days. B ends it after 32 days. Subsequent periods are 28 days under either option.

Recommendation: A, preserving the original early first-review rule and providing a first opportunity for feedback without waiting a full multiweek interval.

Decision: A, early first check-in, agreed on 2026-09-25. Apply this to launch clients and later coaching starts. Subsequent periods use the selected cadence.

User rationale: Consistency and coach predictability matter more than a full first interval. A recently added client must not unexpectedly disappear from the coach's expected check-in view while waiting through a full multiweek interval.

Dependent question: The original four-day minimum can still skip the upcoming check-in weekday for clients starting late in the week. V4 checks that exception against the user's stated intent. Coach visibility before a period becomes due also needs an explicit rule in the review-list discussion.

#### V4. Does the first period still need a four-day minimum?

Related requirement: original Q30 and V3's coach-predictability rationale.

A client starting on Friday with Sunday check-ins has only three inclusive dates by Sunday. The original four-day minimum extends their first period to the following Sunday, so the upcoming Sunday is still skipped despite choosing an early first check-in.

Options:

* A. Remove the minimum for first periods. End on the first selected check-in weekday on or after the start date, even if the period contains only one to three dates. A client starting on the check-in weekday has a one-date first period. Subsequent periods use the selected cadence.
* B. Keep the four-day minimum. Starts too close to the selected weekday extend to the following occurrence. Make the actual first-period dates visible to the coach so this exception is explained.

Recommendation: A, based on the user's preference for a predictable first check-in with no skipped upcoming weekday.

Decision: A, agreed on 2026-09-25. This supersedes the original four-day minimum and that part of V3 option A.

Replacement requirement for Q30: At launch, each active coaching client's first period starts on their local launch date. For later coaching starts, it starts on the client's local coaching-start date. The first period ends on the first selected check-in weekday on or after its start date. There is no minimum length; a same-day first period is valid. The first period spans one to seven inclusive local dates regardless of cadence. Subsequent periods follow the selected 1-, 2-, or 4-week cadence. Records dated before the run starts are not included. Run boundaries and coach visibility before a period becomes due will be settled separately.

#### V5. Dated workout and meal expectations in the review

Related requirement: original Q14.

The spec asks for planned workouts completed against the Workout Schedule. The backend replaces the schedule when a prescription is saved. Training Sessions retain the prescription of the workout performed, but they do not preserve the full historical schedule, including workouts never started.

Example: last week prescribed four workouts and the client completed three. This week the coach changes the plan to two workouts per week. Using the current schedule to calculate last week's review would show three completed against two scheduled, changing the historical comparison.

Options:

* A. Preserve dated Workout Schedule history and retain the completed-versus-scheduled comparison. This adds programming-history scope and needs explicit rules for matching completed sessions to scheduled expectations, including off-schedule workouts and plan changes.
* B. For the initial check-in release, show completed planned sessions and completed freestyle sessions, with links to the actual records. Omit the scheduled denominator and missed-workout claims. A historical schedule comparison can be considered separately.

Initial recommendation: B for the initial release, because it can report the recorded facts accurately without adding historical programming behavior to the check-in work.

Discussion: The user values comparison against expectations, is concerned about complexity, and proposed tracking adherence as a running sequence.

Additional option C: Maintain dated training expectations independently of full plan-version history. Preserve what was expected for each client-local date, then compare expectations and completed Training Sessions over the check-in's date range. A running total alone cannot support accurate arbitrary historical periods or corrections; the dated basis must remain available. This is a proposed design, not existing backend behavior.

Revised recommendation: Explore C if expectation-based review is wanted in the initial release. It avoids requiring full prescription-version history solely for the scheduled denominator. Dependent decisions include when expectations become historical, how plan edits affect today and future dates, how off-schedule or repeated workouts count, corrections, and coverage gaps. Historical dates whose expectations were never captured cannot be reconstructed reliably from the current plan.

Scope distinction: A factual completed-versus-expected count is already requested by Q14. Automatically calculated adherence percentages or scores would change the original exclusion of automated adherence scores and require a separate explicit decision. Coach-set review status remains separate.

Decision: C, agreed on 2026-09-25. The user explicitly extends the same dated-expectation principle to meals.

Agreed requirement: Maintain dated expectations for training and nutrition so reviews can compare recorded activity against what was expected during the period. Later plan edits must not rewrite past expectations. Expectations belong to the underlying training and nutrition history; check-ins read the relevant dates. This does not require preserving every full historical plan version solely to support the comparison. Exact expectation capture timing and the criteria for fulfilling workout or meal expectations remain open. Automatically calculated scores have not been approved.

Dependent decisions still to settle: meal comparison meaning (V6), workout matching and repeated or off-schedule sessions, capture timing and same-day plan edits, missing coverage, initial rollout without historical expectations, and whether to show percentages.

Evidence: [schedule replacement](../../backend/lib/easy/training_prescription_writer.ex), [session snapshot](../../backend/lib/easy/training_prescription_snapshot.ex), [off-schedule workout eligibility](../../backend/test/easy/training/execution_test.exs).

#### V7. Supported document formats

Related requirements: document Tracker kind and reusing chat attachment storage.

Decision: PDFs and images, agreed on 2026-09-25. Image uploads are supported within document trackers as well as the separate photo Tracker kind. This permits a report supplied as a PDF or photographed pages.

Initial-release requirement: Store the original uploaded report and make it available for the coach to inspect. The coach interprets the contents manually; automated extraction is not required in the initial release.

Backend impact: Existing attachment storage can be reused, but the attachment service and API contract must be extended to accept PDFs. Existing supported image formats are JPEG, PNG, WebP, and HEIC. File grouping, size limits, and document viewing behavior remain to be settled.

Evidence: [attachment formats and validation](../../backend/lib/easy/attachments/attachment.ex), [attachment API type](../../backend/lib/easy_web/types/chat_message.ex).

#### V8. Grouping report files into a Tracker entry

Decision: A, agreed on 2026-09-25.

Requirement: One document Tracker entry represents one report and may contain multiple ordered attachments, including PDFs and images. A later report is a separate Tracker entry. Photographed pages of one report stay together for manual review and future parsing. This grouping applies to document trackers; front, side, and back photo trackers remain separate. File-count and size limits are addressed in V9.

### Future capabilities requested

Coaches should be able to prepare changes to a training or nutrition plan and schedule those changes to take effect on a future date. This is separate from the existing ability to assign a plan with future-dated coverage. Scheduling plan changes is outside the initial check-in scope. Its detailed behavior will be designed separately; it does not imply that changes must take effect at a check-in boundary.

Use Jev AI to parse uploaded PDFs and images into the product's structured types. Keep the original attachments alongside the parsed information, and use the structured values for comparisons over time. This is a future capability requested by the user, not part of the initial manual document-review release. Integration details, supported report types, extracted fields, and correction behavior will be designed separately.

### Deferred decisions

#### V6. What does the meal comparison measure?

Related requirements: V5 and original Q14.

The nutrition model groups intake into dated Diary Slots such as breakfast, lunch, and dinner. A slot can contain different foods or quantities from the prescribed meal. Recording intake and following the prescription are different facts.

Example: the plan offers chicken and rice for lunch. The client records a sandwich in the lunch slot.

Options:

* A. Measure recording coverage: any actual intake in an expected meal slot counts as that slot recorded, once per slot. The example counts as lunch recorded. Show a label such as "2 of 3 planned meal slots recorded"; it does not assert that the prescribed foods or quantities were followed. Meal details retain the actual foods and quantities. Nutrient comparisons are a separate summary decision.
* B. Measure prescription fulfillment: recorded intake must satisfy defined food and quantity rules before the planned meal counts as fulfilled. This needs further rules for substitutions, portions, partial meals, and offered alternatives.

Recommendation: A for the count, using precise recording language. It reports an observable fact and leaves the actual intake available for the coach's judgement.

Decision: deferred at the user's request on 2026-09-25.

Tentative direction supplied by the user: compare recommended calories with recorded intake where available, alongside meals recorded versus prescribed. This is not approval of either option's exact counting rules. Denominators, missing-data handling, portion or substitution rules, and the final presentation remain undecided. Revisit before implementing the nutrition comparison.

#### V9. Document upload limits

Related requirements: V7 and V8.

Proposed initial limits: up to 10 attachments per document Tracker entry, with each PDF or image at most 15 MiB (15 × 1024 × 1024 bytes). This permits up to 150 MiB per entry. The existing attachment service already uses this per-file byte limit for images; applying it to PDFs would be new behavior. These limits apply to document Tracker entries and do not change chat's attachment-count limit.

Recommendation: Use these limits initially. A multi-page PDF counts as one attachment; photographed pages count individually. Larger limits can be considered if actual report-upload needs require them.

Decision: deferred at the user's request on 2026-09-25. The proposed numbers are not approved requirements. Resolve operational upload limits later; do not interpret deferral as unlimited uploads.

### Paused question

#### V10. Where do the next asks belong when a review is late?

Related requirements: original Q15 and Q33, which say the review sets asks for the next period and the client sees those asks for the whole period.

Example: a client's period ends Sunday. The coach reviews it on Wednesday. The following Monday-through-Sunday period is already underway, so the coach cannot give asks for that whole period prospectively.

Options:

* A. Set the focus and requests for the period already underway, effective from the review onward. The client can act immediately, but has less than a full period. Asks must not be treated as having existed before they were given.
* B. Set the focus and requests for the next period that has not started. The client gets a full period to act, but Wednesday's review does not change this week's asks.

Recommendation: A for the coaching loop: guidance becomes actionable when the coach gives it, rather than waiting for another boundary. This revises the promise that asks are always present for the whole period.

Decision: pending. Early and grouped reviews, existing asks, and attribution of the focus remain dependent questions.

Paused while exploring V11 at the user's request.

### Model under exploration

#### V11. A check-in as a review checkpoint

Status: direction approved for exploration on 2026-09-25. The user wants to test whether review checkpoints simplify the coach's daily work and help the coach work consistently. Approval is to explore this model, not to treat every proposed detail as settled. Earlier period-specific decisions remain recorded but require reconsideration if this replacement model is adopted. The original spec stays unchanged.

Proposed definition: A check-in records the coach reviewing a client's ongoing coaching record at a particular time. It is a review checkpoint, rather than a persistent calendar period that owns feedback and requests. Calendar ranges remain useful for summaries; a recurring schedule determines when review is expected.

The coaching record holds dated expectations and actual records. Coach reviews carry their reply, private note, status, and a boundary identifying what was considered. Focus is current coaching guidance. Requested trackers have an explicit request date and deadline rather than inheriting their lifetime from a period container.

Illustrative behavior: a review expected Sunday but performed Wednesday happens Wednesday. It considers activity and relevant corrections since the previous checkpoint. New guidance starts when given. The coach's original expectation that review was due Sunday remains distinguishable from when the review actually happened.

Potential simplifications:

* Missed review dates produce one overdue client, without generating several period objects that must be closed together.
* Changing the review weekday changes the review schedule, without constructing a transition period of a special length.
* Early and late reviews are the same domain action performed at different times.
* Corrections are tracked relative to the review checkpoint, including corrections to older activity, rather than assuming only records still inside a reviewed date range can change.
* A client's presence in the coaching view does not depend on whether a period has ended. Next review timing is shown separately.

Trade-offs and remaining decisions: This would replace the original one-check-in-per-fixed-period contract. Period-bound reflection and grace-day rules would need reconsideration. The subsequent reminder-only interpretation removes early-completion credit rather than adding rules for it. Requested trackers still need expiration behavior. A checkpoint must reliably identify relevant revisions or changes; a timestamp-only shortcut is not assumed sufficient. Dated historical expectations are still needed for adherence comparisons. No full event-sourcing architecture is proposed.

Recommendation: Explore the checkpoint model before continuing individual period-related patches. Retaining fixed periods preserves the original calendar archive but also preserves its boundary questions. Letting actual reviews define variable coaching cycles avoids some boundaries but can make review windows and request lifetimes drift when the coach is late. The proposed checkpoint model keeps recurring review expectations distinct from actual review events and guidance dates.

Decision: Explore the checkpoint direction. Detailed behavior and final adoption remain pending.

Success criteria for the exploration: The coach can see which clients need review, understand what is new or changed, perform a review without managing period objects, and see when the next review is expected. Late work must not make clients disappear or silently make review timing unpredictable.

#### V12. Fixed review schedule or a rolling interval?

Related requirements: V11 and the user's preference for predictable coaching routines.

Example: a weekly review is due Sunday. The coach performs it Wednesday. A review checkpoint records Wednesday as the actual review time. The next due date still needs a rule.

Options:

* A. Keep the calendar schedule. The next review is due the upcoming Sunday, four days after the late review. A late review does not shift the client's recurring weekday.
* B. Restart the interval from the actual review. The next review is due the following Wednesday, seven days later. Actual review timing can move the client's recurring weekday.

Recommendation: A. The coach can plan a consistent weekly routine, while each review still considers what has changed since the previous actual review.

Decision: A, agreed on 2026-09-25 for the checkpoint model under exploration.

Requirement: Review due dates follow the client's fixed calendar schedule. A late review records its actual completion time and does not move the recurring weekday or cadence. For example, completing a weekly Sunday review on Wednesday leaves the next review due on the upcoming Sunday. The review checkpoint determines what is new or changed; the calendar determines when another review is expected.

Interpretation under the subsequent reminder-only proposal: The selected weekday and cadence remain fixed attention reminders. They do not generate separate review tasks that must be completed. Early and catch-up reviews create actual checkpoints without closing calendar-period objects. The stress test below examines how reminders remain visible without creating a task backlog.

### Withdrawn question

#### V13. Does an early review satisfy the upcoming scheduled review?

Related requirements: V11 and V12.

Example: a client is due for review Sunday. The coach deliberately completes a review Friday, before that due date. Keeping the calendar fixed does not by itself say whether the upcoming Sunday obligation is satisfied.

Options:

* A. An early completed review can satisfy the upcoming scheduled review. In this example the next due date becomes the following Sunday, retaining the Sunday cadence. Records added or corrected after Friday remain available and are considered at the next checkpoint. The coach must be shown which scheduled review is being completed.
* B. An early review is additional attention and does not satisfy the upcoming scheduled review. The client still becomes due Sunday, even though the coach reviewed Friday.

Withdrawn recommendation: A, so the coach can deliberately work ahead without being asked to repeat the review two days later. This recommendation reintroduced a scheduled obligation that the checkpoint model was intended to remove.

Decision: withdrawn after the user challenged the return of period-like scheduling decisions. Neither option was accepted. The assistant proposed treating the calendar as an attention reminder, while actual reviews create checkpoints. The user instructed the assistant to stay on that path and test it against all previous requirements and decisions. This authorizes the stress test, not silent approval of every proposed replacement rule.

### Remaining issues

1. Dated-expectation follow-ups: workout matching, repeated or off-schedule sessions, capture timing and same-day edits, missing coverage, rollout, and whether percentages are wanted. Meal comparison is deferred in V6.
2. Grace-day creation, date membership, and timing-based locks.
3. Coach visibility of open versus due check-ins; early, late, and grouped reviews; destination of asks; ownership of review fields and latest status.
4. Coaching-run boundaries, deactivation, reactivation, and return to onboarding.
5. Changes after review, including removals, moved dates, and acknowledgement.
6. Event eligibility and tracker assignment history for coverage.
7. Nutrition and tracker summary calculations and missing data.
8. Permissions for business defaults and bulk replacement.
9. Per-client units and interaction with workout units.
10. Tracker value rules, multiplicity, definition edits, archive, and restore.
11. Reminder scheduling, timezone, and synchronization behavior.
12. Review-reply authorship, editing, conflicts, and chat references.
13. Delivery dependencies and usable intermediate releases.
14. Terminology: note to coach, review status, and next period.

Further questions may emerge from each decision. An issue is not resolved until its dependent rules are settled or explicitly deferred.

### Checkpoint model stress test

Assessment date: 2026-09-25.

Scope: the complete source spec, validation decisions V1-V13, and the gaps raised in the initial review. This is a conceptual walkthrough supported by source inspection, not an implementation or a browser test. Graph tools were unavailable. Relevant backend source and tests were inspected directly; tests were not executed. The research claims in the source spec were not reassessed.

#### Verdict

The model holds as a simpler foundation for the coach's work. It removes period creation, transition periods, early-review credit, and batches of overdue periods. It preserves actual reviews, ongoing records, and predictable reminder dates.

It does not hold as a drop-in rename of the original Check-in. Fixed-period ownership, grace-day locking, and requests that inherit a period's lifetime would have to change. A reminder that disappears when its day ends would also fail the user's requirement that clients must not seem to disappear.

The largest remaining work is reliable acknowledgement of reviewed information and preservation of dated expectations. Those are real requirements; a checkpoint does not make them free. The recommendations below describe how to keep the model coherent. They are not additional user-approved decisions.

#### The model being tested

Activity and expectations belong to the client's ongoing dated history. Reviews record the coach's actual assessment, with author, review time, reply, private note, status, and the evidence boundary considered. The schedule supplies attention reminders. Current focus and dated requests provide guidance independent of calendar-period containers.

No scheduled review instance or stored attention queue is required by this model. A report window is a way to read dated records, not a lifecycle object that owns them. The same record may provide context in several reviews. This explicitly replaces the original claim that every fact belongs to exactly one check-in.

Three dates must stay distinct: when activity happened, when its information was saved or corrected, and when the coach reviewed it. For example, a workout performed last month but corrected today belongs to last month's activity totals and today's new-change view.

#### A daily workflow that survives the stress test

1. The coach can see every authorized active coaching client. Last review, next or overdue attention date, manual review status, unread chat, and new or changed records explain each client's situation. Filters must not become the only route to a new client.
2. Calendar attention remains visible after its scheduled date until the coach records a review. It is one derived condition on the client, not one owed task per missed week. New-record counts are separate: a client recording nothing can still need attention.
3. Opening a client shows new or corrected information since the previous acknowledged evidence boundary, alongside progress summaries with explicit date ranges. Reading the page alone does not certify a review.
4. The coach records a review when they have assessed the presented information. The reply remains optional; private notes and manual status remain part of the review. A review without new activity is valid. Information arriving during review remains unacknowledged unless it was included in what the coach reviewed.
5. Current guidance becomes visible when given. The client sees actual review history and replies, with private coach fields excluded. Reading chat and reviewing coaching records remain separate actions.

This does not force a new review every Sunday. A Friday review remains visible on Sunday, so the coach can decide whether further attention is useful. The Sunday reminder still exists under the selected fixed schedule. Hiding recently reviewed clients would be a separate prioritization policy, not something the checkpoint definition promises.

#### Concrete scenario checks

| Scenario | Result under the proposed model | Assessment |
| --- | --- | --- |
| Client joins Friday; Sunday attention day; four-week cadence | Client appears immediately. First reminder is Sunday, then every four weeks. No first-period minimum. | Preserves the intent of V3-V4. |
| Client joins on the attention day | Client is visible that day, including a never-reviewed indicator. No empty or one-day period needs creation. | Preserves V4 without period bookkeeping. |
| Coach reviews Friday before Sunday | Friday creates a checkpoint. Sunday still shows the calendar reminder, Friday's review, and later changes. No upcoming task is marked complete. | Simple and consistent with V12; it does not promise reminder suppression for working ahead. |
| Coach misses Sunday and reviews Wednesday | Wednesday creates the checkpoint; guidance starts when given. Next reminder remains Sunday. | Preserves V1 and V12; removes V10's destination-period problem. |
| Coach misses three scheduled dates | One client still needs attention; old last-review time stays visible. One actual review handles the evidence presented, without manufacturing three historical reviews. | Removes grouped-period closing. |
| Client records nothing for two weeks | Scheduled attention persists despite zero new records. Coach sees missing information rather than a fabricated zero-intake or non-adherence score. | Fails if the work list is driven only by activity. Calendar attention must remain independent. |
| Client writes Monday about last week | The saved note becomes new information when saved. Its contextual date does not need to transfer it between period objects. | Works only if the period-specific grace lock is replaced. |
| Coach loads revision 4, client saves revision 5, coach then finishes | The checkpoint acknowledges the presented version or reports a conflict; revision 5 cannot silently be marked reviewed. | Needs evidence-aware checkpointing. Completion time alone fails. |
| Client corrects a record from two months ago | The change appears in new information even if the progress summary shows only the last week. Historical totals use the record's occurrence date. | Requires separate change discovery and date-based summaries. |
| Client moves a completed workout to another date or removes all meal intake | The changed record remains detectable by identity and revision, including removal from a previously displayed date range. | Supported in part by existing parent revisions; tracker deletion needs an equivalent retention rule. |
| Coach views a limited page of records | Saving cannot silently acknowledge unseen information solely because it predates completion time. The evidence scope must be explicit; an aggregate summary may itself be reviewed evidence. | Genuine checkpoint semantics, not a pagination detail to ignore. |
| Two authorized coaches review concurrently | Each review identifies its author and evidence. Saving an older view later must not hide unseen newer changes or regress acknowledgement. | Needs concurrency handling; removing periods does not solve it. |
| Coach edits an old reply or private note | The text can change without creating a fresh review time or acknowledging subsequent client activity. | Keeps editable history separate from new assessment. |
| Coach edits a plan | Subsequent activity uses the eligible edited guidance; captured activity stays frozen. Historical expectations cannot be rewritten by reading the edited plan. | Fits V1; still requires V5 expectation history. |
| Client is deactivated and later returns | Active attention stops during inactivity; history survives. Reactivation makes the client visible again with an explicit starting boundary for renewed attention. | Removes truncated/overlapping periods; does not remove the need to identify inactive stretches. |
| Client uploads photographed pages of a report | Files form one dated document Tracker entry; receipt is new information even if the report itself is older. | Preserves V7-V8 and later Jev AI extraction. Request fulfilment must not rely blindly on the report's date. |
| Coach reviews records but has unread chat | Chat remains unread until its own read action; a reply in chat alone does not mark coaching records reviewed. | Preserves separate meanings of communication and review. |

#### Reconciliation with decisions already made

| Validation decision | Effect of adopting the checkpoint model |
| --- | --- |
| V1: immediate plan edits; future scheduled edits requested | Preserved. A review does not control plan effective dates. Future scheduling remains a separate capability. |
| V2: extend a transition period when weekday changes | The period mechanism becomes unnecessary. Its useful intent survives: preserve history, change future reminders, and show the next date. A replacement schedule still needs an anchor for two- or four-week recurrence. |
| V3-V4: early first check-in, no minimum | Preserve as an early first reminder and immediate roster visibility. There is no first period to generate or lengthen. |
| V5: dated workout and meal expectations | Preserved. Expectations belong to activity history and support any report window. Checkpoints do not replace them. |
| V6: nutrition comparison deferred | Remains deferred. Tentative calorie-target and recorded-versus-planned direction stays documented without invented formulas. |
| V7-V8: PDF/images, grouped report, manual first release | Preserved unchanged. Jev AI extraction remains future scope. |
| V9: upload limits deferred | Remains deferred. Proposed limits are not silently adopted. |
| V10: late guidance belongs to which period? | The container question disappears. Guidance has its own effective date; requests still need an explicit lifetime. |
| V11: checkpoint direction | Supported, with the evidence and attention requirements identified here. |
| V12: fixed schedule | Preserved as fixed calendar attention reminders, independent of actual review times. |
| V13: early completion credit | Withdrawn. It would recreate scheduled review tasks; neither option was accepted. |

#### Coverage of the original spec and review gaps

“Fits” means compatible in concept, not already implemented. “Replacement” identifies an original promise that cannot stay unchanged. “Open” is a real policy or capability gap left by either model.

| Original requirement or finding | Assessment | Consequence |
| --- | --- | --- |
| Q1: default check-ins and note tracker | Fits with changed terminology | Default weekly attention and the client tracker list remain. Client reflection reminders follow the predictable schedule, not whenever the coach happens to review. |
| Q2, Q13b: no forms; tracker kinds | Fits | Number, rating, photo, text, and document trackers remain. No submission or form-response object is required. Value limits and rating scales remain later definition work. |
| Q3, Q18: weekday and 1/2/4-week periods | Replacement | Keep weekday and cadence for reminders. Remove period generation and transition lengths. Multiweek schedules require a known recurrence anchor and client-local calendar. |
| Contiguous, nonoverlapping periods; no one-off periods | Removed from the review lifecycle | Activity keeps its local dates. Report windows may overlap; no fact needs exclusive ownership by one review. A reporting window does not create a custom coaching period. |
| Q4, Q11: open/due/reviewed and grouped overdue periods | Replacement | Actual reviews are historical checkpoints. Attention is derived on the client. No open period changes state and no review must close several period rows. |
| Q5: active/coaching, deactivation, reactivation | Simplifies, still open at the boundaries | Pause attention for ineligible clients, retain history, and resume visibly. Account status, stage, and inactive stretches still matter, including automatic deactivation and return to onboarding. Do not count inactivity as missed expected activity. |
| Q6, Q25: optional reply, one editable chat message | Fits; backend extension remains | Reference the actual review from chat. Add review references and reply editing without exposing private note/status. Reply edits must not move the evidence boundary. Atomic saves, authorship, and conflicts still need handling. |
| Q7: urgent matters go to chat | Fits | A reflection or tracker update does not promise immediate attention. Keep access to chat and its unread state. |
| Q8: client check-in history | Replacement of organization | Show reviews actually performed, plus dated activity/trends. Do not display a review for a week nobody reviewed. Historical source corrections remain distinguishable from the coach's earlier assessment. |
| Q9: private note and previous-note context | Fits | Use the previous actual review as context. Keep notes coach-only. Editing an older note does not reorder the review chronology. |
| Q10 and first review finding: next-period plan changes | Resolved by V1, not by checkpoints alone | Keep immediate plan behavior and frozen recorded guidance. Future-effective plan edits remain requested future work. |
| Q12: changes after review | Better conceptual fit; evidence work remains | Use record identity/revision acknowledgement. Detect older-date changes and removals. Do not use only occurrence dates or the time the coach clicked Save. |
| Q14: workouts against expectations | Open capability, addressed by V5 | Preserve dated expectations even when no workout is started. Specify when those expectations become historical and what counts as fulfilment. A current plan or current schedule cannot reconstruct them. |
| Q14: nutrition averages and tracker comparisons | Open, partly deferred in V6 | Explicit report dates, denominators, missing-data behavior, and comparable windows remain necessary. Unknown intake is not zero. Current targets cannot replace frozen historical targets. |
| Q15: requests belong to next period and expire with it | Replacement | Give each request an issue date and explicit deadline. Keep it visible while actionable; no automatic renewal. Deadline handling and what qualifies as receipt remain real choices. The request need not become a generic task/follow-up engine. |
| Q16: client tracker list outside plans | Fits | Assignment survives plan changes and remains independent of actual review events. |
| Q17: built-in/custom library | Fits | Built-ins and custom definitions remain independent of review scheduling. Curating built-ins is not solved by the checkpoint concept. |
| Q19: reminders do not score; event coverage | Fits; event definitions remain open | Keep due recording prompts and factual coverage separate from review status. Define eligible workouts/meals and assignment intervals before calculating coverage. A saved, shared, and empty meal slot are different states. |
| Q20: coach records tracker entries | Fits | Preserve recorded-by-coach attribution and existing client access restrictions. This grants no workout or diary mutation permission. |
| Q21: record an unassigned tracker | Fits | The record enters dated history and new-change discovery without changing the assigned list or creating recurring prompts. |
| Q22: list changes apply immediately | Fits; history still required | Prompt changes apply when made. Historical event expectations require assignment start/end history; the current list alone is insufficient. |
| Q23: business defaults and bulk replacement | Open permission boundary | Owners currently control business settings. Clarify owner-only defaults/bulk actions or explicitly change that permission. Changes must not rewrite historical review evidence, expectations, or request dates. |
| Q24: native local reminders and Today | Fits independently | Local notifications are a delivery mechanism for scheduled prompts, not proof that a review occurred. Device synchronization, timezone behavior, and plugin verification remain separate work. |
| Q26: per-client units | Open capability | Existing weight preference is business-wide kg/lbs. Per-client metric/imperial still needs explicit ownership and conversion behavior. Review checkpoints do not help or hurt this. |
| Q27: archive/restore trackers | Fits, with remaining request behavior | Preserve definitions needed to interpret historical values. Decide how archiving affects live requests and business defaults; restoring must not silently invent past assignments. |
| Q28: photo comparisons | Fits; baseline must be explicit | Compare dated tracker values. “Previous period” must become a defined comparable date range or explicitly chosen review boundary. Unequal review intervals are not automatically equivalent comparisons. |
| Q29: tracker/entry terminology and local dates | Fits | Keep occurrence date distinct from save time. A document Tracker entry may hold the grouped files approved in V8. Definition edits must not silently change the meaning of historical values. |
| Q30: launch and first start | Simplifies, with a rollout boundary | No historical period generation. Start attention visibly, preserve the early first reminder, and state where the first review's evidence begins. Do not fabricate prelaunch expectations; older history remains accessible. |
| Q31-Q32: coach status and previous status | Fits | Keep status manual and coach-only. Prefill from the latest actual review; do not infer risk from counts. A new client's default form value is not evidence that a coach has already assessed them. Old-review edits must not silently become the latest assessment. |
| Q33: focus, requests, Today, next-period section | Replacement | Current focus applies until changed; requests use their dates. Preserve which guidance existed at each review without storing it in plans or overwriting historical context. Replace “Next week” with current guidance language. |
| Q34-Q35: no Send, grace day, client-side close | Partial fit, explicit replacement needed | No Send still fits. The period-specific grace lock has no natural owner in this model. Recommended direction: continuous correction with changes surfaced after review. Keeping that lock would retain a separate scheduled-response lifecycle and much of the old complexity. |
| Access and private fields | Fits; implementation boundary remains | Owner and currently assigned coach access still applies. Attachments, parsed values, review references, and lists must obey the same tenant/client boundary. Coach-only data must be absent from client responses, not merely hidden in the UI. |
| Existing “Note to coach” and “Status” terminology | Open naming conflict | The glossary already uses note to coach for chat and status for client account lifecycle. Distinguish reflection from chat commentary and review status from account status. |
| Original delivery order | Needs revision | Remove period-generation/grace-lock as a prerequisite. Deliver coherent client visibility with reviews; do not ship coach requests before clients can see and fulfil them. Expectation history must exist before claiming historical adherence. |
| Future features and exclusions | Preserve | Specific-event trackers, list copying, chosen-date photo comparison, and push remain future features. Preserve no forms, no generic follow-up engine, and no automatic status scoring. Scheduled plan changes and Jev AI extraction remain explicitly requested future work. |

This table covers Q1-Q35, including superseded Q2/Q34 and Q13b, plus the original review's issues concerning attachments, permissions, units, calculations, terminology, and delivery. The original “all design questions are closed” statement cannot carry into the revised document.

#### Backend evidence and practical limits

* Training Session updates accept date corrections and increment revision. Performed-set mutations, including deletion, touch the parent session revision. This supports detection of changed records but does not reconstruct every previous value. See [session changesets](../../backend/lib/easy/training/training_session.ex:56), [set mutation](../../backend/lib/easy/training_performed_sets.ex:123), and [completed corrections](../../backend/test/easy/training/completed_corrections_test.exs:68).
* Diary Slot saves advance revision. Removing all intake preserves the slot identity and original share time. Empty corrected slots therefore still need change detection. See [slot changeset](../../backend/lib/easy/nutrition/diary_slot.ex:29) and [meal removal test](../../backend/test/easy/nutrition/meal_publication_test.exs:37).
* One repeatable-read database operation provides a consistent read, but it does not preserve what a coach saw across minutes and later requests. A review must acknowledge the evidence presented, not everything saved before the final click. See [snapshot behavior](../../backend/lib/easy/repo.ex:18). The exact storage mechanism can be designed later; full event sourcing is not required by this finding.
* Existing coach reads can include active training sessions and saved unshared diary slots. Publishing notes to chat is a separate behavior. The review must distinguish incomplete activity from completed activity rather than assuming every readable record is a completed workout or shared meal. See [training reads](../../backend/lib/easy/training_execution.ex:129) and [diary slot reads](../../backend/lib/easy/nutrition_diary_day_assembler.ex:147).
* The nutrition day-list API limits one range to 31 dates. A coach returning after a long absence cannot obtain a complete catch-up view through one unlimited call to that endpoint. This does not invalidate checkpoints, but the new review read must deliberately support its advertised evidence scope. See [range validation](../../backend/lib/easy/nutrition_diary_day_assembler.ex:79).
* The historical Workout Schedule is replaced during prescription writes. Existing session snapshots are insufficient for days with no recorded session. V5's expectation history remains new work. See [schedule replacement](../../backend/lib/easy/training_prescription_writer.ex:67) and [snapshot contents](../../backend/lib/easy/training_prescription_snapshot.ex:8).
* Current business updates reject non-owners, weight-unit defaults belong to the business, and chat attachments do not accept PDFs. Those findings remain unchanged by the conceptual redesign. See [business access](../../backend/lib/easy/orgs.ex:31), [unit preference](../../backend/lib/easy/orgs/business.ex:18), and [attachment validation](../../backend/lib/easy/attachments/attachment.ex:16).

#### Required distinctions before a final rewrite

1. Attention versus activity: fixed reminders must keep quiet or neglected clients visible, without inventing one task per missed date. Record review explicitly; merely opening a page or chatting is not the same action.
2. Reviewed evidence versus current truth: acknowledge what the coach considered, keep later arrivals visible, and distinguish an earlier assessment from subsequently corrected records. Editing the assessment text must not advance the evidence boundary.
3. Changes versus comparisons: a change view can include old records, while progress summaries use explicit local-date ranges. Dated expectations, historical targets, and missing-data rules remain necessary even if review intervals vary.
4. Ongoing client recording versus a closed response: adopt continuous recording/correction or explicitly retain a separate response deadline. The checkpoint model alone does not preserve Q35's grace-day lock. Removing the lock is the simpler recommendation, not yet an independently approved requirement.
5. Current guidance versus request lifetime: focus can persist until replaced. A request still needs a deadline and receipt rule, with original issue/deadline history retained. Giving it those dates is smaller than putting all coaching activity inside periods, but it is still a domain decision.

#### Recommended direction after the audit

Continue with actual review checkpoints and fixed attention reminders. Keep dated activity, dated expectations, tracker assignments, and guidance independent of review timing. Remove period objects instead of reproducing them as reminder-completion tasks. Preserve the decisions about plan edits, early client visibility, grouped reports, and future capabilities.

Before turning this into a final replacement spec, settle the five distinctions above at the product level. Keep operational limits and V6's nutrition formulas deferred as requested. The evidence supports a simpler daily coaching workflow, but not a claim that every original requirement survives unchanged or that all remaining implementation work has disappeared.

### Comparison with coaching platforms

Research date: 2026-09-25. Sources are official help documentation and an official roadmap, not hands-on verification of account features. Product workflows are distinguished from inferred design lessons. This research changes no agreed product decision.

#### Kahunas

Kahunas documents customizable client check-in forms on weekly, biweekly, or monthly schedules. Forms collect ratings, text, and uploads, and selected fields can feed graphs. Daily habits are a separate form category. This documents a scheduled client-response workflow alongside ongoing tracking. [Forms walkthrough](https://help.kahunas.io/en/articles/224-walkthrough-forms).

The client list can be filtered by check-in day, active/archive state, and recent messages. Client dashboards show submitted check-ins, comparisons with previous check-ins, activity, daily habits, and nutrition records. Coaches can reply through chat. [Client filtering](https://help.kahunas.io/en/articles/160-where-can-i-see-clients-checkins-and-filter-clients), [dashboard walkthrough](https://help.kahunas.io/en/articles/223-client-dashboard-walkthrough).

Missed check-ins are an automation trigger, with configurable notification timing and message content. A separate article permits backdated check-in submissions containing previous progress photos, including coach-added check-ins. These facts do not establish a universal post-submission editing or locking rule. [Missed-check-in reminders](https://help.kahunas.io/en/articles/101-are-we-able-to-set-reminder-times-for-checkins), [backdated photos](https://help.kahunas.io/en/articles/79-is-it-possible-to-add-in-progress-pictures-clients-have-sent-previously).

The roadmap lists a check-in review dashboard in beta testing. Do not infer its full behavior or universal availability from the roadmap title. [Kahunas roadmap](https://pipeline.kahunas.io/en/roadmap).

#### ABC Trainerize

Coaches schedule recurring forms in program or individual client calendars. Clients receive them as daily tasks, with optional reminder notifications. Submission can notify the coach. Responses can be opened from several client views and compared across dates or form types. Coaches with profile access can edit submitted answers on web; the latest editor/date appears, and comparisons use updated answers. Changing a form template requires rescheduling existing occurrences to apply the changes. [Scheduling, reviewing, and editing forms](https://help.trainerize.com/hc/en-us/articles/31369316335124-Sharing-Check-In-Forms-with-Clients).

The inspected form guide does not establish a separate coach review-complete action, late-submission cutoff, or complete revision history. Those behaviors remain unverified, not proven absent. Trainerize separately documents attention tags for inactivity, messaging, program expiry, and compliance. Its “Not Responded Lately” tag concerns messages, so it is not evidence of missed-form tracking. [Client attention tags](https://help.trainerize.com/hc/en-us/articles/208689156-Auto-Client-Tags-Attending-To-Clients-Needing-Attention).

#### Everfit

Everfit documents a coach check-in dashboard explicitly labelled beta. It combines client information for weekly review. [Dashboard overview](https://help.everfit.io/en/articles/14495409-check-in-dashboard-overview-beta).

The insight panel brings together workout completion/adherence, average macros against goals, days with food logs, tasks/habits, and form responses. Reviewing a submitted form is an explicit action within that broader client view. This distinguishes reviewing a form from considering the client's ongoing activity. [Client insights](https://help.everfit.io/en/articles/16000596-check-in-dashboard-review-client-insights).

After reviewing the client, the coach can message them and separately mark the client checked in. The completion count then updates. The same documentation describes manual status overrides for the current week. [Completing client check-ins](https://help.everfit.io/en/articles/16000615-check-in-dashboard-complete-client-check-ins).

Clients needing attention appear higher in the list; checked-in clients move lower. The dashboard also supports weekly data views, with Monday-Sunday windows. This is still a weekly dashboard, not evidence of the exact period-free checkpoint model proposed here. [Client list and weekly views](https://help.everfit.io/en/articles/16000579-check-in-dashboard-manage-your-client-list).

The documented status calculation uses configurable training/nutrition signals. Separate cards identify unreviewed forms, completed check-ins, and clients with no activity for 14 days. Our spec's manual-only status is a deliberate difference. [Status settings and dashboard cards](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard).

#### Implications for this design

Inference from the documented workflows: client-supplied information and coach review are different events. A form can be one input to a review; it does not have to define the whole review lifecycle. Everfit's client-level review action is the closest documented example among these sources to the direction under exploration, while retaining forms, weekly views, and automated signals.

Recommended lesson: keep an explicit coach review checkpoint and a visible client roster, even if client reflection is collected through trackers instead of forms. Keep recording, reminders, messaging, and reviewing distinct. Do not interpret the checkpoint proposal as removing the coach's ability to record that their work is done.

Limits: These sources do not verify the platforms' database models, acknowledgement of concurrent edits, complete historical expectation storage, or whether a Friday review satisfies a Sunday schedule. They support workflow comparisons, not claims that competitors already implement every proposed rule or that any model improves retention by a proven amount.

#### Everfit-style dashboard proposal (2026-10-03; pending decision)

The dashboard layout could work for this product. Show every active coaching client in one roster, with reasons to look: scheduled attention due, new or corrected records, unread chat, an unanswered coach request, prolonged inactivity, and a plan ending soon. Open a client to see training, nutrition, trackers, current guidance, previous review, and private notes. A coach records an actual review after assessing the information presented. This borrows Everfit's client-level review workflow without requiring a submitted form or a stored check-in period. [Everfit settings](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard), [client list](https://help.everfit.io/en/articles/16000579-check-in-dashboard-manage-your-client-list), [review completion](https://help.everfit.io/en/articles/16000615-check-in-dashboard-complete-client-check-ins).

Keep calendar attention and new information as separate reasons. A silent client stays visible after the attention date; a new report or late correction stays visible even when its activity date falls outside the selected reporting week. Marking a client reviewed acknowledges only the information the coach saw. A Friday review remains an actual Friday checkpoint; Sunday's fixed attention reminder still displays the recent review rather than creating an owed Sunday review task. Weekly views can summarize dated activity, but should not control the lifetime of records or reviews.

Everfit calculates At Risk / Needs Attention / On Track from configurable training and nutrition thresholds. Copying that behavior would reverse Q31's explicit manual-only coach status and the exclusion of automated adherence or progress scores. Recommended separation: derived **reasons to look** prioritize the roster; coach-set **assessment** remains a separate private judgment. Avoid automated risk labels in the first release. Workout adherence signals also require V5's dated expectations; nutrition thresholds need V6's deferred comparison rules. [Everfit settings](https://help.everfit.io/en/articles/15999847-configure-your-check-in-dashboard), [client insights](https://help.everfit.io/en/articles/16000596-check-in-dashboard-review-client-insights).

Product decision to settle next: whether to retain Q31's manual status while adopting dashboard attention signals, or intentionally replace it with calculated status. This proposal recommends retaining manual status; it is not yet an agreed change to the source spec.
