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

**Assignment**:
The act of creating a client-owned plan from a reusable template. It is not a persistent object separate from the resulting plan.
_Avoid_: Assigned plan

**Training Session**:
One client's record of performing a planned or freestyle workout. Completion records that the activity happened and first shares it. Clients may correct recorded facts afterward using the current revision; the captured prescription remains unchanged. Discarded sessions remain closed.
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

### Nutrition

**Nutrition Template**:
A reusable nutrition prescription that can be copied for a client. It is never itself assigned to a client.
_Avoid_: Reusable nutrition plan, template plan

**Client Nutrition Plan**:
An independent nutrition prescription owned by one client. It may originate from a Nutrition Template, but later changes never affect its source or another Client Nutrition Plan.
_Avoid_: Assigned nutrition plan

**Menu**:
The document of Meals, Menu Items, Day Patterns, and Week Schedule owned by one Nutrition Template or Client Nutrition Plan. It is saved and copied as a whole. Meals, items, and patterns have identities local to that Menu. Item names, serving weights, and nutrients follow the current Library; recorded Diary values stay frozen.
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
One client's frozen guidance, chosen Meal, and actual intake for one local date and Meal Slot under one applied timezone.

**Frozen offered option**:
A snapshot of one Meal offered when a Diary Slot starts, including its ordered frozen planned items.

**Frozen planned item**:
A copy of one Menu Item's identity, source, display details, Portion, and nutrients within a frozen offered option.

**Diary Entry**:
One recorded occurrence of actual intake within a Diary Slot. It may retain an association with one frozen planned item or be extra intake; its identity belongs to that slot.
_Avoid_: Food log, meal log

**Nutrition Day**:
The shared client and coach view combining live guidance for unstarted slots with recorded guidance and intake for started slots. Its targets freeze when the first slot is saved and remain the same for the whole date.
