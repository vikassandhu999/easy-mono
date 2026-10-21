# Easy coaching

Easy supports coaches who manage clients, workouts, nutrition, trackers, conversations, Reviews, and coaching terms.

## Language

**Client**:
A person invited to a coaching business. Direct invitation and acceptance establish access. A coach manages the client's profile, workouts, nutrition, trackers, history, and conversation.

**Coaching term**:
An inclusive span of local dates during which a business coaches a client. A client may have many terms; terms never overlap. A missing end date means open-ended coaching. The client's timezone applies, falling back to the business timezone.

Lifecycle states are derived: no linked account means invited; a term covering today means active (ending soon within 14 days); a linked account with no current or earlier term means joined, not started; an earlier term with no current term means ended. Only active clients use seats. Ending coaching today keeps access through today, then preserves read-only history. Coaches are active when their account is linked and they have no removal date.

**Note to coach**:
Client commentary sent as a chat message with an optional reference to a workout or meal record. Draft saving is separate from completing a workout or sharing a meal.

**Record reference**:
One optional source link per message, carrying a frozen summary and revision. Opening it shows the source record. Source corrections do not rewrite the message preview.

**Not recorded**:
No structured record is available. This is not evidence of non-adherence or a skipped meal.

**Attachment**:
An uploaded file or an external link used in coaching content or a client record. It can be an image, video, audio recording, or document.
_Avoid_: Media as a separate name for the same asset

### Workouts

**Exercise**:
A named movement, activity, sport, or practice with optional written instructions. Its goals and places describe its use; equipment is described in free text and muscles are listed by name. Its ordered metrics describe the values a coach can prescribe. Built-in exercises are available to every business; a coach's own exercises belong to that business.

**Exercise media**:
An item in an exercise's ordered demonstration gallery, with an optional caption. It describes how an attachment is used to explain the exercise.

**Exercise metric**:
A measurement selected from the shared catalogue for an exercise, in the order the coach wants it shown. Each metric can have its own label without changing its meaning or units.

**Archived exercise**:
An exercise hidden from new selection while its existing workouts, demonstrations, and recorded activity remain available. Restoring it makes it selectable again.

**Workout**:
Instructions for one training occasion. A prescribed workout contains exercise groups and targets; a video workout supplies a video; an open session leaves the activity to the coach who leads. Timing, place, meeting link, and the coach who leads belong to the schedule.

**Library workout**:
A reusable workout owned by a coaching business. Adding it to a client copies it. Later edits to either workout do not affect the other.
_Avoid_: Training Template, reusable training plan

**Client workout**:
An independent workout owned by one client. It can be used on several days and can have different session details on different schedules.
_Avoid_: Client Plan, assigned plan

**Exercise group**:
One or more ordered exercises performed for a number of rounds. One exercise means straight sets; two mean a superset; more mean a circuit. The UI uses its name or letter and never says group.

**Workout exercise**:
An exercise within a prescribed workout, with targets and rest shared by every round or specified per round. The coach chooses whether repetitions and duration cover the whole round or apply to each side separately.
_Avoid_: Prescribed Set, content item

**Side mode**:
The coach's choice to record one combined result for a round or separate left and right results. For separate results, each side receives the activity targets, rest follows both sides, and the number of rounds stays the same.

**Target**:
An exact value, a range, as much as possible, or no prescribed value. No target means the client chooses. Targets use only the exercise's metrics.

**Round targets**:
The metric instructions and rest for one exercise in one round. A selected metric can have no prescribed target, and rest does not depend on the selected metrics.

**Rest**:
The rest after completing an exercise, including both sides when performed separately. Rest after the last exercise in a card is rest between rounds. An unspecified duration is chosen by the client; "no rest" is an explicit instruction.

**Workout schedule**:
The repeating weekdays and optional live-session details for a client workout. Several weekdays with the same details share one schedule. Changes apply from today and keep earlier prescriptions.
_Avoid_: Workout calendar, plan revision

**Expected workout occurrence**:
One workout expected on one date under a schedule. It is calculated from the schedule.

**Workout log**:
A record of one client's workout session. It can follow a scheduled workout, use a saved workout outside its schedule, or record training without a saved workout. The actual training date can differ from the planned date.

**Exercise log**:
A record of one selected exercise or activity as it is recorded within a workout session. It holds the activity's session instructions and reported overall result, with optional details for individual sets or intervals. Beginning a record does not mean the activity was performed. Overall measurements and their interval breakdown describe the same work. Recorded intervals can cover only part of the activity; their presence does not establish its whole result. An unfinished activity can remain in a finished workout without being treated as completed or skipped.

**Exercise set**:
One detailed outcome for a set or interval within an exercise log. It records performed work, with or without measurements, or an explicit skip. Missing records do not establish that work was skipped. A prescribed round keeps its identity when the exercise changes; separate left and right outcomes can belong to different selected exercises.

**Workout recorder**:
The client or coach who originally created a workout log. Later edits and reopening do not change its recorder. A recording coach can differ from the coach assigned to lead the session.

**Workout feedback**:
The client's account of how a session felt, used by the coach to decide what to prescribe next. It can include whole-session effort, reported pain or discomfort, and a note. A coach may enter the client's answers. Feedback is optional; a missing answer remains unknown.

**Exercise swap**:
A replacement selected for the remaining unrecorded sets of one prescribed workout entry in a session. The person recording can adjust its targets, remaining set count, and rest for that session. It leaves the coach's prescription, other workout entries, and previously recorded work intact. The same prescribed exercise can have a different replacement in another entry or session.

**Prescription history**:
The workout instructions and schedule that applied on a past date. Later edits preserve those instructions and change future uses. A date before today is a fact even when no workout has been recorded.

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

### Nutrition concept under design

The following terms belong to the nutrition redesign. The Nutrition Template, Client Nutrition Plan, Day Pattern, Slot, and Diary terms above describe the implemented model while the redesign is in progress.

**NutritionPreset**:
A nutrition instruction of type meal, food, or supplement. A meal contains complete alternatives. A food or supplement prescribes one item and amount. Internal term: the UI says Meal, or names the food or supplement.

**MealOption**:
One complete choice within a meal NutritionPreset. Its name is optional; without one, it is shown by its foods.

**MealItem**:
A food or supplement and its prescribed amount within a MealOption.

**NutritionSchedule**:
The weekdays, optional time and validity dates at which a NutritionPreset applies. It has no label or content of its own. Several schedules can use the same preset; shared content edits affect its future uses. Weekday groups are a planning view.

**NutritionTargets**:
One complete set of daily nutrient targets, independent of presets. Each nutrient target is stored as a minimum, a maximum, or both; exact, at least, at most and between are editor views of those bounds. Target schedules give the weekdays, apart from the values. One client-local date has one applicable target set; a date-specific replacement replaces the whole set.

**NutritionLog**:
One recorded consumption occasion of type meal, food, or supplement. A meal groups one or more FoodLogs. Food and supplement occasions each contain exactly one FoodLog of the corresponding kind.

**FoodLog**:
One consumed item and its amount within a NutritionLog, including a supplement where applicable.

**Recipe**:
The ingredients and preparation instructions for a prepared food. An ingredient is a food used in preparation.

### Trackers

**Tracker**:
A definition of one observation or response. Its value type can be number, rating, yes_no, text, photo, document, or a product-defined compound measurement such as blood pressure.

**TrackerSchedule**:
A client's ask to record a Tracker. Timing is selected weekdays, after a workout, after a meal, or once. Weekday prompts have no backlog. A once request stays outstanding until fulfilled or cancelled.
_Avoid_: Tracker assignment, TrackerRequest as a separate model

**TrackerLog**:
One dated observation of one Tracker, recorded by the client or an authorised coach. Measurement time is distinct from recording time. A log can exist without a schedule and can refer to a workout or nutrition record.
_Avoid_: Tracker entry

**Tracker template**:
A reusable list of Trackers and timings. Applying it copies schedules to a client; later template edits do not change those copies.

**Compound measurement**:
One observation whose defined fields belong together, such as systolic and diastolic blood pressure. Independent measurements entered together remain separate logs.

**Tracker coverage**:
The distinct events with linked TrackerLogs compared with eligible events. Missing coverage does not establish non-adherence.

### Check-ins

**Review**:
A coach's saved assessment of a client's ongoing record during a Coaching term, with a private note. Communication is an independent chat message that may refer to the Review. The assessment and note can be edited; the review time and the records seen stay fixed.
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
An ordinary ChatMessage with a reference to a Review, without its private assessment or note. Chat owns the message and its edits. Sending a message does not mark the client reviewed; saving a Review does not require a message.
