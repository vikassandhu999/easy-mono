# Implement atomic Replies waiting state

Type: task
Status: open
Blocked by: 08
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Replace role-derived Replies state with the accepted stable waiting clock and implement the conflict-safe Mark handled context command.

## Locked behavior

* A client message sets `waiting_since` to that message's timestamp only when the field is null. Further client messages preserve it.
* A coach reply clears `waiting_since`. Read-cursor writes never change it.
* Add `Easy.Chat.mark_conversation_handled(ctx, conversation_id, expected_last_message_at)` with tenant and coach visibility scoping, including inactive clients.
* Return 204 semantics to the controller when the observed sequence clears or is already clear, `:conflict` when a newer waiting message exists, and `:not_found` for absent or invisible conversations.
* Message persistence and Mark handled must update the conversation atomically so a stale confirmation cannot erase a newer client message.
* Keep `last_message_role` as conversation history, but stop using it as Replies membership state.

## Edit surface

* `backend/lib/easy/chat.ex`
* `backend/lib/easy/chat/conversation.ex`
* `backend/lib/easy/chat/message.ex` where message timestamps or transaction ownership require it
* `backend/test/easy/chat_test.exs`

## Acceptance

* Tests cover first and repeated client messages, coach reply, read-only changes, idempotent handling, stale handling, inactive clients, owner/trainer visibility, and tenant isolation.
* A concurrency test proves a stale Mark handled request cannot clear a newer waiting sequence.

## Verification

Run `mix test test/easy/chat_test.exs`, then `mix precommit` from `backend/`.
