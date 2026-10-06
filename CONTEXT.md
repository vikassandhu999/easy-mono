# Easy coaching

Easy supports coaches who manage clients, training and nutrition plans, workout and meal history, conversations, and coaching terms.

## Language

**Client**:
A person invited to a coaching business. Direct invitation and acceptance establish access. A coach manages the client's profile, plans, history, and conversation.

**Coaching term**:
An inclusive span of local dates during which a business coaches a client. A client may have many terms; terms never overlap. A missing end date means open-ended coaching. The client's timezone applies, falling back to the business timezone.

Lifecycle states are derived: no linked account means invited; a term covering today means active (ending soon within 14 days); a linked account with no current or earlier term means joined, not started; an earlier term with no current term means ended. Only active clients use seats. Ending coaching today keeps access through today, then preserves read-only history. Coaches are active when their account is linked and they have no removal date.

**Coverage**:
The inclusive local-date range for which a client-owned plan supplies training or nutrition. A plan is in force only when its own dates and a Coaching term cover the date, and no term ended between its creation date and that date. A plan prepared before acceptance can begin with coaching; a returning client needs a new plan.

**Note to coach**:
Client commentary sent as a chat message with an optional reference to a workout or meal record. Draft saving is separate from completing a workout or sharing a meal.

**Record reference**:
One optional source link per message, carrying a frozen summary and revision. Opening it shows the source record. Source corrections do not rewrite the message preview.

**Not recorded**:
No structured record is available. This is not evidence of non-adherence or a skipped meal.

**Training Template**:
A reusable training prescription that can be copied for a client. It is never itself assigned to a client.
_Avoid_: Reusable training plan, template plan

**Client Plan**:
An independent training prescription owned by one client. It may originate from a Training Template, but later changes never affect its source or another Client Plan.
_Avoid_: Assigned copy, assigned training plan

**Plan assignment**:
The act of creating a client-owned plan from a reusable template. It is not a persistent object separate from the resulting plan.
_Avoid_: Assigned plan

**Plan Revision**:
A published training or nutrition prescription that never changes. A future revision can be withdrawn before it takes effect.

**Expected workout occurrence**:
One scheduled workout for an original local date. The client explicitly selects the occurrence that a completed Training Session fulfils; an occurrence counts once.

**Training block**:
A group of exercises in a workout, performed as straight sets, a superset, or a circuit.

**Training Session**:
One client's record of performing a planned or freestyle workout. Completion records that the activity happened and first shares it. Clients may correct recorded facts afterward using the current revision; the captured prescription remains unchanged. Discarded sessions remain closed.
_Avoid_: Workout log

**Planned Training Session**:
A Training Session that uses a published Plan Revision and one of its workouts. The client can select an Expected workout occurrence, including one from an earlier date, or record a workout from the plan covering today without an occurrence.

**Freestyle Training Session**:
A Training Session begun without a Client Plan workout.

**Workout Schedule**:
The repeating weekly guidance in a Training Template or Plan Revision. Each weekday has zero or more schedule entries; each entry identifies one workout.
_Avoid_: Calendar, workout calendar

**Prescription**:
The ordered workouts, blocks, Prescribed Exercises, Prescribed Sets, and Workout Schedule in a Training Template or published Plan Revision.
_Avoid_: Plan structure

**Prescribed Exercise**:
An exercise selected inside a workout with its ordered Prescribed Sets.
_Avoid_: Workout element

**Prescribed Set**:
A target set within a Prescribed Exercise. It describes intended work and has no lifecycle outside that prescription.
_Avoid_: Planned set

**Performed Set**:
A record of a done, failed, or skipped set in a Training Session. It can identify its Prescribed Set or describe extra work, with measurements in base units and the units entered by the client.
_Avoid_: Logged set

### Nutrition

**Nutrition Template**:
A reusable nutrition prescription that can be copied for a client. It is never itself assigned to a client.
_Avoid_: Reusable nutrition plan, template plan

**Client Nutrition Plan**:
An independent nutrition prescription owned by one client. It may originate from a Nutrition Template, but later changes never affect its source or another Client Nutrition Plan.
_Avoid_: Assigned nutrition plan

**Nutrition content**:
The document of targets, meals, items, day patterns, and a weekly schedule in a template or plan revision. A save writes the whole document. Publication and assignment copy each item's name, grams, and nutrients from the library.

**Day Pattern**:
A named set of slots. It can supply its own targets, which replace the plan targets as a whole.

**Slot**:
A named entry in a day pattern with a stable id and an ordered list of offered meal ids. Its name is free text. Common meal times are suggestions.

**Week Schedule**:
Seven entries, one for each weekday. Each entry has a stable id and identifies a day pattern. Day zero is Monday.

**Expected meal**:
One planned slot on a client-local date under the revision in force. Its identity is the plan, date, and slot id. A slot without a diary meal is Not recorded.

**Diary Meal**:
One client's recorded meal on a local date. Its name is unique for that client and date. A planned meal points to the immutable plan revision and slot used; an extra meal has neither reference.

**Diary Entry**:
One recorded intake item in a diary meal. It can identify a planned item, a food or recipe swap, extra intake, or a quick add. It stores the portion, grams, nutrients as eaten, and notes. Removed entries keep a tombstone and journal history.

**Quick add**:
Recorded nutrients with no library food or recipe. Calories are required; other nutrients can be unknown.

**Nutrient value**:
A number keyed by a nutrient code and its registered unit. An absent key is unknown. Zero is a known value. Food library values are per 100 g; prescription and diary values are for the stated portion.

**Nutrition Day**:
Expected and recorded meals, daily nutrient totals with known-entry counts, and the targets from the revision in force at the end of the date. If the target changed during the date, the view says so. Targets and adherence scores are not stored on diary records.

### Trackers

**Tracker**:
Something recorded about a client: a number, rating, yes/no answer, text, photo, or document. A Tracker is built-in or belongs to a coaching business. Its kind, unit, and rating scale are fixed at creation.
_Avoid_: Measure, metric, form question

**Tracker list**:
The Trackers assigned to a client, each with a timing. A timing is daily, weekly on a selected weekday, after each workout, or after each meal. The list is separate from Training and Nutrition plans.
_Avoid_: Tracker plan

**Tracker assignment**:
One Tracker's timing for a client over a date range. A timing change ends the old assignment and starts a new one. Removing an assignment preserves its entries.

**Tracker template**:
A reusable list of Trackers and their timings. Applying it copies the list to a client. Later template edits do not change that client's list. The business default is copied when the client's first Coaching term starts.

**Tracker entry**:
One dated value of one Tracker, recorded by the client or a coach. An entry can refer to a workout or meal. Coach entries are labelled "Recorded by coach". A document entry holds one report as ordered PDFs, images, or both.

**Tracker request**:
A coach's request for one Tracker. It stays open until an entry is recorded or the coach cancels it. Only requests from the current Coaching term are open.

**To record**:
Tracker reminders for today during a Coaching term. Daily and weekly reminders disappear after an entry for the date, or when the date ends. A reminder is never late.

**Tracker coverage**:
The number of distinct workouts or meals with a linked Tracker entry, out of the events that occurred while that Tracker was assigned. Repeated entries for one event count once.

### Check-ins

**Review**:
A coach's saved assessment of a client's ongoing record during a Coaching term, with a private note and an optional reply in chat. The assessment, note, and reply can be edited; the review time and the records seen stay fixed.
_Avoid_: Check-in period, submission

**Review frequency**:
The number of days between a client's Reviews: 1, 3, 7, 14, or 28. A client is due on the current Coaching term's start date, then on the date of their last Review plus this frequency.

**Assessment**:
On track, Needs attention, or At risk, chosen by the coach. Only coaches can see it.
_Avoid_: Status, score

**Focus**:
The client's current priority in one line, set by the coach. It stays on the client's Today screen until the coach changes or clears it.

**New since last review**:
Records added, corrected, or removed after the coach read the record for their last Review, including corrections to older records. Changes made while the coach reads remain new for the next Review.

**Review reply**:
A chat message from a coach with a reference to a Review, without the assessment or private note. Editing the reply marks the message as edited; deleting the reply removes the message.
