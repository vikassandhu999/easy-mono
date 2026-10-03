# Check-ins

Status: agreed 2026-10-03. Replaces the period-based spec of 2026-09-24.

**During a coaching term, the client records what they do, and the coach regularly looks at it and writes a Review.**

That is the whole feature. A check-in is not a period, a form or a task. It is a coach looking at a client's ongoing record and saving what they thought. The client keeps recording before and after.

The earlier history lives in `archive/`: the Q1–Q35 grilling (`spec-periods-2026-09-24.md`), the V1–V13 validation and the stress tests (`spec-validation.md`). Q and V numbers below point there. Decisions that apply only to periods are retired and not listed here.

## Why this shape

Every attempt to give check-ins periods (open, due, reviewed, grace day, rollover, early-review credit, transition weeks) produced a new edge case. Removing periods removes those rules instead of patching them. Every state is derived from facts, the same as Coaching terms.

## The concepts

| Concept | What it is |
| --- | --- |
| **Tracker** | Something a client records: number with unit, rating, photo, text or document. Built-in or custom. (Q13b, Q17, Q29) |
| **Tracker entry** | One dated value of one Tracker, recorded by the client or a coach. (Q20, Q29) |
| **Tracker list** | The Trackers assigned to one client, each with a timing. Lives on the client, not in plans. (Q16) |
| **Review** | One saved coach assessment: when, who, assessment, private note, optional reply. |
| **Review frequency** | Days between reviews for one client: 1, 3, 7, 14 or 28. |
| **Focus** | One line: the client's current priority, set by the coach. |
| **Tracker request** | A coach asking the client for one Tracker, for example a blood report. |

Only Reviews, Trackers, Tracker entries and Tracker requests are new tables. Focus and Review frequency are fields on the client. Workouts, meals, chat and plans are reused as they are.

## How reviews are scheduled

* Each client has a **Review frequency** in days. The business default is 7. Twice a week is 3.
* A client is **due** when they are in a coaching term today and either:
  * they have no Review since the current term started, or
  * today ≥ the date of their last Review + frequency.
* Saving a Review makes the next due date "today + frequency". Reviewing on Friday with weekly frequency means due again next Friday.
* Missed weeks never pile up. A client three weeks late is one overdue client, shown as "Overdue 14 days".
* A new client is due the day their coaching term starts. A returning client is too, because their old Reviews come from an earlier term.
* There is no check-in weekday, no first-period rule and no four-day minimum. This replaces V3, V4 and V12 and Q3, Q18 and Q30.
* The coach can review any client at any time, whether due or not.

## The coach's day

**Client roster.** Every coached client appears once and can be sorted and filtered by:
* Due / overdue (and by how many days)
* Last reviewed (date, or "Never this term")
* Coach assessment
* Unread chat
* Waiting on client (open Tracker requests)

There is no stored queue, task or follow-up object. Every column is derived. (Q31: assessment on the list.)

**Review screen**, opened from the roster:
1. **New since last review**: records added or changed after the last Review, in any order and whatever their dates. A late correction to an old meal therefore shows up. (Q12)
2. **Summary**: from the last Review until today by default, or any chosen range. Every figure links to its records. (Q14)
   * Training: sessions completed against dated expectations, plus freestyle sessions. (V5)
   * Nutrition: days logged, and average intake against targets. (Q14)
   * Trackers: values in the range, and the change from the previous range. Photos show latest against the previous one, with a switch to the first one. (Q28)
3. **Last Review's private note** at the top. (Q9)
4. **Plans** are one tap away. Edits apply immediately, as today. (V1)
5. **Save a Review**:
   * Assessment: On track, Needs attention or At risk. Coach-only and set by hand, never calculated. Pre-filled from the last one, and the first one starts at On track. (Q31, Q32)
   * Private note: coach-only. (Q9)
   * Reply: optional. It is sent as a chat message linked to the Review. Editing the reply edits that message, which is marked "edited". Deleting the reply deletes the message. (Q6, Q25)
   * Focus, and new Tracker requests, can be set here or anywhere else on the client.

Assessment, note and reply stay editable after saving. The review time does not change.

**"Seen" rule.** When the review screen loads, it records the moment it read the data, and the Review saves that moment. "New since last review" means changed after that moment. Anything that changes while the coach is reading still appears next time.

## Trackers

* Any Tracker entry can be recorded on any day. Nothing is ever late or locked. (Q19)
* Timing is one of:
  * **After each workout / after each meal**: asked inside the workout-finish screen or the diary slot.
  * **Daily** or **weekly**: a reminder only. Weekly reminders fire on the business's reminder weekday, Sunday by default, which a coach can change per client.
  * **On request**: only when the coach asks.
* A reminder shows under "To record" on the client's Today screen when due, and disappears once recorded or when the day ends. (Q19)
* The review says what exists ("Weight: 5 entries, average 82.1 kg") and "Not recorded" only when there are none. Event trackers show coverage ("Energy after 3 of 4 workouts"). (Q19)
* Coaches can record entries for a client, labelled "Recorded by coach". Workouts and meals stay client-only. (Q20)
* Clients can record any library Tracker through "Add something else". It is not added to their list. (Q21)
* List changes apply immediately. A removed Tracker stops prompting, and its entries stay. (Q22)
* Built-in Trackers are stored in metric and shown in the client's `unit_system`. Custom units are free text with no conversion. (Q26)
* Custom Trackers with entries can be archived and restored, not deleted. Built-ins cannot be archived. (Q27)
* Front, side and back photos are three separate Trackers. (Q28)
* **Reports**: a document entry holds one report as ordered PDFs and/or images. Another report is another entry. The coach reads it by hand. (V7, V8)
* The default Tracker list holds one Tracker, **Reflection**: weekly, text. It replaces the old "note to coach at each check-in".

## Focus and requests

* **Focus** is one line on the client, shown pinned on their Today screen. It stays until the coach changes or clears it. (Q33)
* A **Tracker request** is open from when it is made until the client records an entry of that Tracker or the coach cancels it. It never expires on its own. It shows on the client's Today screen as "Your coach asked for". (Q15, replaced)
* Only requests made during the current term count as open. When a client returns, old requests do not come back.
* The roster shows open requests as "Waiting on client since <date>". This is not coach work, so it is not counted as due.

## Client side

* Today shows Focus, open requests, and "To record" reminders. (Q33, Q19)
* History shows the coach's replies, their own Tracker entries and trends, and the Focus. They never see the assessment or the private note. (Q8)
* Anything urgent goes to chat. There is no urgency flag. (Q7)
* There is no "send" action and no submitted state. (Q34, Q35)
* Native apps schedule local notifications for reminders (`@capacitor/local-notifications`, not installed yet, must be checked on iOS and Android). The web app shows them in-app only. (Q24)

## Coaching terms

* Reviews, reminders, requests and "due" exist only while a coaching term covers today. When coaching ends, the client stops showing as due. History stays readable.
* Client writes need a term covering today, enforced by the existing write gate.

## Defaults and access

* Business settings hold the default Review frequency, the reminder weekday and the default Tracker list. A change always applies to new clients. On saving, the coach chooses whether to apply it to all existing clients too. (Q23)
* Access follows the existing rules. The owner sees every client. Other coaches see the clients they coach. (S-03)

## Decided later, when the build reaches it

These do not block the first steps.

* **Meal comparison** (V6): until it is decided, show recommended calories against recorded calories only.
* **Upload limits** (V9): use the attachment service's current per-file limit until decided. Deferral does not mean unlimited.
* **Dated expectation details** (V5): capture timing, same-day plan edits and matching off-schedule workouts. Settle these when building delivery step 4.

## Future

* Scheduled plan changes on a future date. (V1 follow-up)
* AI parsing of PDF and image reports into structured values, keeping the originals. (Jev AI)
* Event Trackers for one specific workout or meal.
* Copying a Tracker list from another client.
* Photo comparison between two chosen dates.
* Server push notifications.

## Out of scope

* Forms, branching questions, intake questionnaires.
* Calculated adherence or risk scores.
* Automated nudges and follow-ups beyond Tracker reminders.

## Delivery order

Each step ships and is useful on its own.

1. **Review loop.** Review frequency, the roster with due, last reviewed and assessment, and a review screen built from existing workout and meal history. Save a Review with assessment and private note. Reply through the existing chat.
2. **Trackers.** Library, Tracker list, recording by client and coach, after-workout and after-meal prompts, "To record" on Today, Reflection.
3. **Review reply, Focus and requests.** The reply as a linked editable chat message, Focus on Today, Tracker requests and "Waiting on client".
4. **Dated expectations and summaries.** Completed against expected, nutrition against targets, tracker changes, photo comparison, "New since last review".
5. **Client history.**
6. **Phone reminders** through local notifications, tested on real devices.

## Glossary for CONTEXT.md

* **Review**: a coach's saved assessment of a client at a moment: assessment, private note, optional reply. Avoid: check-in period, submission.
* **Review frequency**: days between a client's Reviews. A client is due when today ≥ last Review + frequency.
* **Assessment**: On track, Needs attention or At risk. Set by the coach, coach-only. Avoid: status.
* **Tracker / Tracker entry / Tracker list**: as above. Avoid: measure, metric, form question.
* **Focus**: the client's current one-line priority.
* **Tracker request**: an open ask for one Tracker, closed by an entry or a cancel.
* "Check-ins" stays as the name of the feature and its navigation.
