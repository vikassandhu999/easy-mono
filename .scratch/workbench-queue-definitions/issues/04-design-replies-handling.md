# Design Replies handling

Type: prototype
Status: resolved
Parent: [Coach workbench v1 delivery](../map.md)

## Question

How should a coach mark a waiting conversation handled without replying, and how should that action appear in the Replies queue and conversation screen?

Produce a rough interaction covering discoverability, accidental activation, feedback after handling, repeated client messages, inactive clients, and the distinction between read and handled.

## Answer

Use the prototype's **Selected task pane** interaction:

* On desktop, Replies is a split surface: the waiting-conversation list stays on the left and the selected conversation appears in a task pane on the right.
* On mobile, keep one reading order. Expand the unchanged selected-conversation content inline immediately beneath its selected queue row; selecting another row collapses the previous one and moves the expansion to the new row.
* The whole queue row selects the conversation. Do not show `Review` or `Selected` controls; communicate selection with the standard accent-soft row background and accent label. Opening or selecting a conversation marks its messages read but does not remove it from Replies.
* The selected conversation shows its waiting duration, read state, message-sequence count, and inactive-client state. Inactive clients remain actionable.
* Put `Reply` and the primary `Mark handled` action at the bottom of the selected conversation. `Mark handled` requires confirmation explaining that no message will be sent and that a later client message starts a new waiting sequence.
* After confirmation, remove the conversation from Replies, update the count, select the next waiting conversation, and confirm that no message was sent.
* Additional client messages before handling preserve the original waiting clock. A client message after reply or handling creates a new waiting sequence and returns the conversation with a new clock.

Prototype: [`?view=replies&variant=B`](../../../frontend/apps/coachapp-v2/src/clients/prototypes/replies-handling-prototype.tsx)
