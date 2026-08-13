# Implement atomic Replies waiting state

Type: task
Status: resolved
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

## Answer

Replies membership now comes from an explicit stable `waiting_since` clock. The first client message in a waiting sequence starts the clock, repeated client messages preserve it, and a coach reply clears it. These transitions happen inside the existing message-persistence transaction alongside the conversation summary update, while read-cursor writes remain independent and `last_message_role` remains history only.

`Easy.Chat.mark_conversation_handled/3` now locks the tenant- and visibility-scoped conversation row, includes inactive clients, and clears only the exact observed message sequence. It is idempotent when the conversation is already clear, returns `:conflict` for a newer waiting message, and returns `:not_found` for absent or invisible conversations. The row lock and message transaction ensure a stale confirmation cannot erase concurrent newer client work.

Verification passed:

* `mix test test/easy/chat_test.exs` — 35 tests, 0 failures.
* Combined Chat and workbench controller suites — 39 tests, 0 failures.
* `mix precommit` — 1,138 tests, 0 failures; Credo reported only the pre-existing `Easy.Clients.attention_facts/2` complexity advisory.
