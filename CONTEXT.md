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
The dates for which a Client Plan supplies a required service. Coverage begins on its start date and is open-ended when it has no end date.

**Training Template**:
A reusable training prescription that can be copied for a client. It is never itself assigned to a client.
_Avoid_: Reusable training plan, template plan

**Client Plan**:
An independent training prescription owned by one client. It may originate from a Training Template, but later changes never affect its source or another Client Plan.
_Avoid_: Assigned copy, assigned training plan

**Assignment**:
The act of creating a Client Plan from a Training Template for a client. It is not a persistent object separate from the resulting Client Plan.
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
