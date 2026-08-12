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

**Recent client**:
A client whose invitation was accepted within the reporting window. This is a reporting concept, not a work queue.

**Required service**:
Training or Nutrition currently selected for a client. A coach may select it directly; a client's submitted Service type answer may replace the selection. A requirement has no separate start date or requested/confirmed state.

**Service type question**:
An Intake-only question asking whether the client requires Training, Nutrition, or both. Its submitted answer becomes the client's required services. It is never part of a Check-in.

**Unclassified client**:
An active client with no required service selected. An unclassified client does not enter Programming until Training or Nutrition is selected.

**Coverage**:
The dates for which an active assigned plan supplies a required service.

**Waiting conversation**:
A conversation in which the client has started an unanswered message sequence. It remains waiting until a coach replies or marks it handled.
_Avoid_: Unread conversation

**Handled**:
A coach decision that a waiting conversation needs no reply.

**Quiet client**:
An active client whose most recent due check-in was missed. Training inactivity is not part of this definition for v1.
