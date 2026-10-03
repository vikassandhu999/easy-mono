# Check-ins

Status: needs-triage

A check-in is the scheduled moment where the coaching loop closes. The coach looks at what happened in a period, judges whether the plan is working, responds to the client, and sets up the next period. This spec adds two concepts, Check-in and Tracker, and reuses the records, chat and plans the product already has.

The earlier forms and check-ins implementation was removed in the core reset on 2026-09-23 (`c7a89005`). Nothing here restores it. The removed code stays on `codex/checkpoint-rewrite-2026-09-23` for reference only.

The design was settled in a grilling session on 2026-09-23 and 2026-09-24. Each decision carries its question number (Q1 to Q35) so it can be traced. All design questions are closed. The delivery order is agreed provisionally and gets its own session.

## Why check-ins are next

The research pass on 2026-09-23 covered coach behaviour and competing platforms.

* Self-monitoring with feedback from a person is the mechanism with the best evidence for adherence. In a Kaiser Permanente cohort, people who kept a food diary six or more days a week lost about twice as much weight as those who kept none. A 2022 AJCN meta-analysis found a small but significant effect of remote self-monitoring with tailored feedback.
* Industry sources put most client cancellations in months two and three and name poor communication and invisible progress as the main causes. These figures come from vendor blogs, not studies.
* Delivery costs an estimated 30 to 60 minutes per client per week. Check-in review and messaging grow fastest with roster size. Vendors claim good check-in tooling brings review to about five minutes per client, which is what lets a solo coach go past roughly 30 to 40 clients.
* Trainerize, Everfit, Kahunas and CoachRx all market check-ins as their retention feature. No platform publishes data isolating their effect.
* Coaches in reviews switch platforms mostly over programming friction and weak nutrition. The training and nutrition builders must stay good.

Coaches commonly report these failures: clients ignore the form, answers go unread, nobody can see who is overdue, and conversations split across channels. The removed implementation treated the form as the check-in and spread the rest of the loop across queues and follow-ups. This design has no form, no queue object and no follow-up engine.

## Principles

The client records dated facts. A check-in reviews one period of those facts. Training Sessions and Diary Slots are already dated facts, and Tracker entries are a third kind. A check-in never copies or owns a fact; it reads the facts dated inside its period. Corrections to a workout, a meal or a tracker entry appear in the check-in without extra work.

The business sets a default, and the coach makes exceptions per client. Period length, check-in day and the tracker list all follow this pattern.

Time closes the client's side; a review never locks anything. The end of the grace day is the only lock. Whatever changes after a review is marked, and the next review shows it.

Chat is for now; a check-in is for the period.

## Concepts

### Tracker

A Tracker is something a client is asked to record (Q29). Its kind is number with a unit, rating, photo, text or document (Q13b). Comparison over time happens per Tracker, so a weight in March compares with a weight in June whatever else changed.

The library holds curated built-in trackers and custom trackers a coach defines (Q17). A custom tracker has only a name, a kind, a unit where it applies, and a default timing. Built-ins are listed first.

Built-in examples, to be curated into the final list: body weight (number, daily reminder), waist (number, weekly reminder), progress photo front, side and back (three photo trackers, weekly reminder), sleep hours (number, daily reminder), energy after workout (rating, after each workout), bloating after meal (rating, after each meal), blood report (document, on request), note to coach (text, at each check-in). Poses are separate trackers, so there is no pose concept (Q28).

### Tracker entry

A Tracker entry is one recorded value of one Tracker on a local date (Q29). The name is always written in full to keep it apart from Diary Entry. An entry prompted by a workout or meal is also linked to that Training Session or Diary Slot. Photos and documents use the attachment storage chat already has.

### Tracker list

A client's tracker list is the set of Trackers assigned to that client, each with its timing (Q16). It is one list on the client, next to their plans and not inside them, so it survives plan changes. It starts from the business default and the coach edits it per client, including overriding each tracker's default timing.

### Check-in

A Check-in is one client's period, from a start date to an end date in the client's local dates. It holds two things:

* the coach's asks for the period, set by the previous review: an optional one-line focus and any requested trackers (Q33);
* the coach's review of the period: a status, an optional reply, and a private note (Q6, Q9, Q31).

It stores nothing the client did. It reads the Training Sessions, Diary Slots and Tracker entries dated inside the period. The review also writes the asks for the next period into the next check-in.

There is no Check-in Form (Q13b). What the client says at check-in time is the set of trackers timed "at each check-in". The default note to the coach is a built-in text tracker with that timing. The earlier question of how many forms a business has (Q2) no longer exists.

## Decisions

### Who gets check-ins

* Q1. Every client has check-ins by default. The business default is a weekly period and a tracker list with one tracker, the note to coach at each check-in.
* Q5. Check-ins run during a coaching term (`.scratch/coaching-terms/spec.md`). The sequence starts on the term's start date. Periods are contiguous within one term, and time between terms is not reviewed.
* Q30. A first period ends on the client's next check-in day; one shorter than four days extends to the following check-in day. The launch-day rule was dropped because there are no existing clients.

### Periods

* Q3. The business sets a check-in day, the weekday on which periods end, defaulting to Sunday. The coach can move an individual client to another day.
* Q18. A period is 1, 2 or 4 weeks, set per client, with weekly as the business default. Periods always end on the client's check-in day.
* A client's periods are contiguous within one run of coaching and never overlap. Each starts the day after the previous one ends, so every date and every record belongs to exactly one check-in.
* A change to period length or check-in day takes effect after the open period. The open period keeps its dates.
* There are no one-off periods or custom date ranges.
* Q23. The coach can change the business defaults (period length, check-in day, default tracker list) in business settings. A change always applies to new clients. On saving, the coach chooses whether to also apply it to all existing clients, which replaces their current setting. There is no hidden "still on default" state.

### Trackers and timing

* Any tracker entry can be recorded on any day, whether or not a check-in is running.
* A tracker's timing is one of three kinds (settled in the discussion leading to Q15):
    * Tied to an event: after each workout or after each meal. The tracker only makes sense then, so the client is prompted inside the workout-finish screen or the diary slot.
    * Free, with a reminder: daily, weekly, or at each check-in. The client needs a nudge, not a rule. Recording on another day is fine.
    * Requested: infrequent items such as blood reports, asked for by the coach in a review.
* Q19. Reminders prompt and never score. A reminder tracker appears on Today under "To record" when it is due and drops off when recorded or when the day ends. Nothing is marked late. The review shows what exists ("Weight: 5 entries, average 82.1 kg") and says "Not recorded" only when the period has no entries at all. Event-tied trackers show coverage ("Energy recorded after 3 of 4 workouts"), because each event expects exactly one answer.
* Q15. A request belongs to the next check-in. In a review the coach picks trackers to request, including ones not on the client's list. The client sees "Your coach asked for" them on Today for the whole next period and can record them on any day. The next check-in shows each request as received or not received. A missing item is requested again only if the coach chooses to. Nothing stays open beyond one period.
* Q20. A coach can record a tracker entry on the client's behalf, for example a waist measurement or photos taken in person. It is labelled "Recorded by coach", counts in check-ins like any other entry, and is visible to the client. This is an exception to S-04 for tracker entries only. Workouts and meals stay client-recorded.
* Q21. A client can record any tracker from the business library through "Add something else", for example a blood report nobody requested. It appears in that period's check-in like any other entry. It is not added to their list, so it brings no reminders.
* Q22. Changes to a client's tracker list apply immediately. An added tracker prompts from that moment, and its coverage counts only events after it was added. A removed tracker stops prompting; its entries stay in history and still show in the check-in for their period.
* Q24. Due trackers appear on the client's Today screen. The native client apps also schedule local notifications on the device for reminders, using the official Capacitor local-notifications plugin. The plugin is not installed yet and must be verified on iOS and Android. This needs no push server and does not depend on the separate push-notifications plan. The web client gets in-app reminders only. Every reminder has a due time, which is what the device schedules.
* Q26. Each client has one unit system, metric or imperial, shared by the client and their coach. Built-in trackers are stored in metric and shown in the client's system. Custom trackers keep the coach's free-text unit with no conversion. The existing default workout load unit should be checked and reused if it already covers this.
* Q27. A custom tracker with entries can be archived but never deleted. Archiving removes it from the library and from every client's list, so it stops prompting, while its entries stay in history and past check-ins. An archived tracker can be restored. A custom tracker with no entries can be deleted. Built-in trackers cannot be archived; a coach simply does not assign them.

### The client's side of a check-in

* Q35. The client can edit the entries of trackers timed at each check-in for the whole period, until the end of the grace day, the day after the period ends. Then that side closes automatically. There is no send action and no submitted state or flag. This replaces the explicit "Send to coach" action proposed in Q34 and the early-submission trigger first agreed in Q4.
* Q33. The focus and the requested trackers for the period are pinned on the client's Today screen for the whole period.
* Q7. Anything urgent goes to chat. There is no urgency flag on check-ins. The client's check-in screen links to chat next to the note.
* Q8. The client sees their own check-in history: each past period's summary, their check-in entries, the focus they were given, and the coach's reply. The coach's private note and status are never shown to the client. Tracker trends and photos appear in the same history.

### Review

* Q4 and Q35. A check-in is due when its period has ended and it has not been reviewed. The coach can open a check-in and see it live at any time, and can review it at any time, including before the period ends. The period's dates decide what is reviewed.
* A check-in has three states: open while its period runs, due once the period has ended without a review, and reviewed.
* Q11. The due list has at most one row per client. When a client has several unreviewed check-ins, the review screen shows those periods together and one review closes all of them.
* Q14. The review shows facts, not scores. Training shows planned workouts completed against the Workout Schedule, plus freestyle sessions. Nutrition shows diary days logged and average intake against targets. Trackers show their values for the period and the change from the previous period. Every figure links to its records.
* Q28. For each photo tracker, the review shows the latest photo in the period next to the latest from the previous period, with a switch to compare against the first photo.
* Q33. The top of the review shows the period's asks: the focus the client was given and each requested tracker as received or not received.
* Q31. The coach sets a status at each review: On track, Needs attention or At risk. It is visible only to coaches. There is no automated scoring. Its job is a roster-wide early warning for retention.
* Q32. The status is pre-filled with the client's previous status, and a client's first review starts at On track. The coach changes it only when something shifts. The review screen shows it next to the reply.
* Q6. The reply is optional. A reply is posted to chat as a message with a Record reference to the check-in, the way messages reference workouts and meals. Without a reply, the check-in closes and the client sees "Reviewed".
* Q25. The reply and its chat message are one thing shown in two places. Editing the reply updates the chat message, which is marked "edited". Deleting the reply removes the chat message. Chat has no message editing today, so this adds editing for review replies only.
* Q9. Each check-in has one private coach note, visible only to coaches. The next review shows it at the top. In a client's list of check-ins, the private note is the highlighted field of each row, shown with the status.
* Q33. The review has a "Next week" section: the focus line, pre-filled from the current focus, and any trackers to request. Both are stored on the next check-in. The focus is not stored in plans, because plans last longer than a period and do not cover goals such as sleep or steps.
* Q10. The review screen gives direct access to the client's training and nutrition plans. Plans apply to future dates, so a change takes effect in the next period. The reply and the private note explain the change; nothing else is recorded.
* Q12 and Q35. A review never locks anything. Records stay live because they belong to the period. Any tracker entry or record created or edited inside a reviewed period after the review is marked "changed after review", and the next review shows it. The coach's reply, private note and status stay editable.

### Coach attention

* The client list shows each client's latest status (Q31).
* The coach's attention comes from two derived lists: unread chat, and due check-ins. There is no stored queue, task, reminder or follow-up object.

### Access

* Access follows the existing rules (S-03 in `.scratch/training-nutrition-requirements/requirements.md`). The business owner sees every client's check-ins. Other coaches see check-ins only for clients they coach at the time of the action.
* A client records only their own tracker entries. A coach can also record tracker entries for clients they can access (Q20).

## Facts checked in the codebase

* Clients have a status (pending, active, inactive) and a stage (onboarding, coaching) in `backend/lib/easy/clients/client.ex`. Q5 relies on both.
* Chat messages cannot be edited today (Q25).
* The client apps use Capacitor 8 on iOS and Android. `@capacitor/local-notifications` is not installed (Q24).

## Future features

* An event-tied tracker that prompts only for a specific workout or a specific meal. The tracker still lives in the client's list.
* Copying a tracker list from another client, if coaches ask for reusable sets.
* Comparing photos from two chosen dates in the client history screen.
* Server push notifications, once the separate push-notifications plan ships.

## Out of scope

* Conditional or branching questions.
* Automated nudges and follow-ups beyond tracker reminders.
* Intake or onboarding questionnaires.
* Lead capture and public coach pages.
* Automated adherence or progress scores.

## Delivery order

Agreed provisionally on 2026-09-24. A separate session will revisit it. Each step ships and is useful on its own.

1. Trackers. The library with built-in and custom trackers, each client's tracker list with timings, the unit system, recording on any day by the client or the coach, prompts after workouts and meals, and the "To record" list on Today. Coaches get tracker history per client before check-ins exist.
2. Check-in periods. Business defaults with the option to apply to existing clients, per-client period length and check-in day, automatic period generation including the launch start, and client editing of check-in trackers until the grace day ends.
3. Coach review. The due list, the period summary with comparisons and photos, status, private note, reply to chat with editing, the "Next week" focus and requests, and plan access.
4. The client's side of the loop. Focus and requests pinned on Today, check-in history, and tracker trends.
5. Phone reminders through Capacitor local notifications, verified on real iOS and Android devices.

## Glossary additions for CONTEXT.md

These terms go into `CONTEXT.md` when the spec is approved.

Check-in: one client's period between two local dates. It holds the coach's asks for the period and the coach's review, and reads the Training Sessions, Diary Slots and Tracker entries dated inside it. Avoid: submission, form response.

Tracker: something a client is asked to record, with a kind and a timing. Avoid: measure, metric, tracking field, question.

Tracker entry: one recorded value of one Tracker on a local date, recorded by the client or by the coach. Avoid: measurement, log, bare "entry".

Tracker list: the Trackers assigned to one client, each with its timing.

Check-in day: the weekday on which a client's periods end.

Focus: the one-line target a review sets for the next period. It is stored on that period's check-in.

Status: the coach's judgement of a client at a review: On track, Needs attention or At risk. Visible only to coaches.
