# Chat Unread Batch Counts

**Goal:** Replace per-conversation correlated unread subqueries with one grouped count for the returned page.

## Plan

1. Add a regression covering a null cursor, an advanced cursor, pagination, and the grouped SQL shape.
2. Load conversations first, then attach unread counts from one tenant-scoped message query for those IDs.
3. Reuse the same loader for single coach/client conversation reads and delete the correlated selectors.
4. Run focused chat/controller tests and the full backend precommit gate.

## Deliberate limit

Do not add maintained counters. Current local volume is 39 conversations and 48 messages; counters would add write-path and repair complexity without evidence they are needed.
