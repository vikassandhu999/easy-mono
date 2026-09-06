# Easy coaching

Easy supports coaches who manage client onboarding, programming, check-ins, conversations, and coaching engagements.

## Language

**Workbench**:
The coach's action-oriented workspace. It contains ordered queues of work that can be completed or deferred.

**Queue**:
A drainable, ordered collection of coach work. Every queue has an entry rule, an exit action, and a reason for each item.
_Avoid_: Metric, list

**Queue item**:
One unit of coach work. A client may have items in several queues when separate actions are required. Several reasons for the same work do not create several items.

**Queue reason**:
A machine-readable domain fact explaining why an item belongs to a queue. An item may have several ordered reasons. Reasons contain structured facts, not user-facing labels, tones, or actions.

**Onboarding**:
Action required to move a client through invitation acceptance and intake completion.
_Avoid_: New clients

**Intake**:
The single lifetime onboarding form assigned to a client. It may be completed or dismissed, but a client is never assigned a second Intake.

**Recent client**:
A client whose invitation was accepted within the reporting window. This is a reporting concept, not a work queue.

**Required service**:
Training or Nutrition currently selected for a client. A coach may select it directly; a client's submitted Service type answer may replace the selection. A requirement has no separate start date or requested/confirmed state.

**Service type question**:
An Intake-only question asking whether the client requires Training, Nutrition, or both. Its submitted answer becomes the client's required services. It is never part of a Check-in.

**Unclassified client**:
An active client with no required service selected. An unclassified client does not enter Programming until Training or Nutrition is selected.

**Coverage**:
The inclusive local-date range for which a client-owned plan supplies a required service. Coverage begins on its start date and is open-ended when it has no end date.

**Training Template**:
A reusable training prescription that can be copied for a client. It is never itself assigned to a client.
_Avoid_: Reusable training plan, template plan

**Client Plan**:
An independent training prescription owned by one client. It may originate from a Training Template, but later changes never affect its source or another Client Plan.
_Avoid_: Assigned copy, assigned training plan

**Assignment**:
The act of creating a client-owned plan from a reusable template. It is not a persistent object separate from the resulting plan.
_Avoid_: Assigned plan

**Training Session**:
One client's record of performing a planned or freestyle workout. A completed or discarded Training Session is final historical evidence.
_Avoid_: Workout log

**Planned Training Session**:
A Training Session begun from any workout in the Client Plan supplying Coverage that day. Its prescription is captured when the session begins; the Workout Schedule is guidance, not an eligibility rule.

**Freestyle Training Session**:
A Training Session begun without a Client Plan workout.

**Workout Schedule**:
The repeating weekly guidance that maps each weekday to at most one workout in a Training Template or Client Plan. A weekday with no workout is a rest day.
_Avoid_: Calendar, workout calendar

**Prescription**:
The ordered workouts, Prescribed Exercises, Prescribed Sets, and Workout Schedule authored inside a Training Template or Client Plan.
_Avoid_: Plan structure

**Prescribed Exercise**:
An exercise selected inside a workout with its ordered Prescribed Sets.
_Avoid_: Workout element

**Prescribed Set**:
A target set within a Prescribed Exercise. It describes intended work and has no lifecycle outside that prescription.
_Avoid_: Planned set

**Performed Set**:
A historical record of work performed during a Training Session. It freezes the exercise name even when it retains a live exercise reference.
_Avoid_: Logged set

**Waiting conversation**:
A conversation in which the client has started an unanswered message sequence. It remains waiting until a coach replies or marks it handled.
_Avoid_: Unread conversation

**Handled**:
A coach decision that a waiting conversation needs no reply.

**Quiet client**:
An active client whose most recent due check-in was missed. Training inactivity is not part of this definition for v1.

### Nutrition

**Nutrition Template**:
A reusable nutrition prescription that can be copied for a client. It is never itself assigned to a client.
_Avoid_: Reusable nutrition plan, template plan

**Client Nutrition Plan**:
An independent nutrition prescription owned by one client. It may originate from a Nutrition Template, but later changes never affect its source or another Client Nutrition Plan.
_Avoid_: Assigned nutrition plan

**Menu**:
The document of Meals, Menu Items, Day Patterns, and Week Schedule owned by one Nutrition Template or Client Nutrition Plan. It is saved and copied as a whole. Meals, items, and patterns have identities local to that Menu.
_Avoid_: Plan structure

**Day Pattern**:
A named reusable set of Slots across the closed Meal Slot vocabulary.

**Slot**:
A Day Pattern's entry for one Meal Slot: the ordered Meal IDs it offers. The first is its default. A Slot has no identity of its own.
_Avoid_: Meal option, meal choice

**Week Schedule**:
The mapping of Monday through Sunday to one Day Pattern per weekday.
_Avoid_: Calendar, meal calendar

**Live guidance**:
The covering plan, targets, selected Day Pattern, and its offered Meals resolved for a client-local date. Missing Coverage is a normal absence.

**Meal Slot**:
One of the closed timing anchors used by programming and Diary: ordinary day-period slots and a separate pre-, during-, and post-workout group.
_Avoid_: Meal type, snack, occasion

**Diary Slot**:
One client's frozen guidance and actual intake for one local date and Meal Slot under one applied timezone.

**Frozen offered option**:
A snapshot of one Meal offered in a Diary Slot's Meal Slot when the slot starts. It owns relational frozen planned items.

**Frozen planned item**:
A copy of one Menu Item's source identity, display details, Portion, nutrient basis, nutrients, and position.

**Diary Entry**:
One recorded occurrence of actual intake. It may retain an association with one frozen planned item or be independent.
_Avoid_: Food log, meal log

**Nutrition Day**:
The shared client and coach read model combining live guidance for unstarted slots with frozen rows for started slots.
