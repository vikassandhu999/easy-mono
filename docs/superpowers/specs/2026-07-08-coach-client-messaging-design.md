# 1:1 Coach↔Client Messaging — Design

Date: 2026-07-08
Status: approved

## Summary

Replace the unused Threads system with a single direct-message conversation per
client. One conversation per `business_id + client_id` pair; the coach side is a
shared business inbox (every coach with visibility of the client can read and
reply). Realtime delivery via Phoenix Channels; messages are plain text in v1.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Conversation model | One DM conversation per client, distinct from topic threads |
| Threads system | Deleted entirely (backend domain, API, tables) |
| Coach-side access | Shared inbox: owner/admins + assigned trainer (existing `Client.visible_to(ctx)` boundary) |
| Realtime | Phoenix Channels, receive-only; sending stays HTTP |
| Message content | Text only |
| Coachapp surfaces | `/messages` inbox page + Messages tab in client detail |
| Clientapp surface | Chat screen + entry point with unread badge |
| WS client | Official `phoenix` npm package |
| `packages/chat`, `packages/websocket` | Deleted (dead code: Mantine UI, custom non-Phoenix protocol, zero importers) |

## Backend

### Delete Threads

- `lib/easy/threads.ex`, `lib/easy/threads/` schemas
- Coach + client thread/thread-message controllers and JSON views
- `lib/easy_web/open_api/schemas/threads.ex`
- Thread routes in `router.ex`
- Thread tests
- New migration drops `threads` and `thread_messages`. No data migration — the
  feature never had a UI, so tables hold no meaningful data.

### New domain: `Easy.Chat`

`lib/easy/chat.ex` + `lib/easy/chat/` (schemas only, per context-dir rule).

**`conversations`**
- `business_id` (tenant FK), `client_id` (FK), unique index on the pair
- `last_message_at`, `last_message_preview`
- `coach_last_read_message_id`, `client_last_read_message_id`
- Created lazily on first open or first message.
- Read state is two cursors on the row, not a read-state table. Shared inbox
  means any coach reading marks the conversation read for the whole team —
  accepted v1 ceiling; upgrade path is a per-coach read table.
  (`ponytail:` comment goes on the schema.)

**`chat_messages`**
- `conversation_id` FK, `sender_type` (`coach | client`), `sender_id`, `body`
- Index `[conversation_id, id]` for before-cursor pagination.

**Context functions** (Ctx-first, three-case naming, `for_`/`include_` builders):
- `list_conversations(ctx, opts)` — coach inbox: constrained to
  `Client.visible_to(ctx)`, ordered by `last_message_at` desc, each row carries
  an unread count (messages from client with id > coach read cursor).
- `get_or_create_conversation(ctx, client_id)` / client-side variant.
- `list_messages(ctx, conversation_id, opts)` — `before` cursor + `limit`.
- `send_message(ctx, conversation_id, attrs)` — inserts message, bumps
  `last_message_at`/`last_message_preview` in the same transaction, then
  broadcasts (see Realtime).
- `mark_read(ctx, conversation_id, message_id)` — advances the caller's cursor
  (never backwards).

### HTTP API (OpenApiSpex, standard resource pattern)

Coach (`/v1/coach`):
- `GET /conversations` — inbox with unread counts
- `GET /clients/:client_id/conversation` — get-or-create + first messages page
- `GET /conversations/:id/messages?before=&limit=`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/read`

Client (`/v1/client`):
- `GET /conversation` — get-or-create + first messages page
- `GET /conversation/messages?before=&limit=`
- `POST /conversation/messages`
- `POST /conversation/read`

Schemas in `lib/easy_web/open_api/schemas/chat.ex` following the shared
`data_response`/`list_response` helpers. Request schemas `struct?: false`.

### Realtime

Channels are **receive-only**; all writes go through HTTP so validation and the
OpenAPI contract have a single path.

- `socket "/socket", EasyWeb.UserSocket` in `endpoint.ex`. `connect/3` verifies
  the same bearer access token (passed as a connect param) via
  `Easy.Identity.Token.verify_access_token/1` and stores a `Ctx` in socket
  assigns.
- `EasyWeb.ConversationChannel`, topic `conversation:<id>`. Join authorized by:
  client owns the conversation, or coach passes the visibility check. Server
  pushes `message_new` with the message payload. Broadcast from `send_message`
  via the existing `Easy.PubSub`.
- `EasyWeb.InboxChannel`, topic `inbox:business:<business_id>`, joined by any
  authenticated coach of the business. Events carry **only** `conversation_id`
  (no content), and the frontend reacts by invalidating the RTK inbox query —
  HTTP with visibility filtering stays the only data path, so trainers never
  receive content for clients they cannot see.
- Token expiry (5-min JWTs): socket auth happens once at `connect/3`; Phoenix
  does not re-auth a live socket. Reconnects fetch a fresh token via a params
  closure on the JS side.

## Frontend

- Add `phoenix` npm package to `coachapp-v2` and `clientapp-v2`. Small
  `src/api/socket.ts` per app: creates the Socket with a token-getter params
  closure, exposes channel join helpers.
- Chat UI built lean per app with HeroUI: message list with date separators and
  sender-aligned bubbles, scroll-up infinite loading via `before` cursor,
  textarea + send (Enter to send). No shared package until a second consumer
  proves the need.
- **Coachapp**: `/messages` inbox route (conversations by recency, unread
  badges, nav badge with unread total) + Messages tab in the client detail view
  reusing the same conversation component.
- **Clientapp**: chat screen + entry point (top bar icon) with unread badge.
- On `message_new`: append to the open conversation's message cache. On inbox
  channel events: invalidate the inbox query tag.
- Regenerate API clients with `just gen-api` after backend lands. Restart
  `phx.server` first — OpenApiSpex spec is cached in dev and code-reload does
  not bust it.
- Delete `frontend/packages/chat` and `frontend/packages/websocket` and their
  workspace/peer-dependency references (`packages/hooks`, `packages/ui`).

## Testing

- Context tests: visibility boundary (trainer vs owner), unread-count math,
  cursor pagination, read-cursor never regresses, lazy conversation creation
  race (unique index + upsert/on-conflict).
- Controller tests for every endpoint, both roles.
- Channel tests: join authorization (client, visible coach, invisible trainer
  rejected), `message_new` broadcast on send, inbox event payload contains only
  `conversation_id`.
- `mix precommit` clean; frontend `just lint` + tsc clean.

## Build order (tracer bullet)

1. Backend: drop threads, `Easy.Chat` domain + HTTP API + tests
2. UserSocket + channels + broadcast from `send_message`
3. Coachapp: inbox + conversation UI (HTTP only)
4. Clientapp: chat screen (HTTP only)
5. Wire realtime into both apps, unread badges

## Out of scope (v1)

Attachments/images, rich text, typing indicators, per-coach read state,
push/email notifications for offline recipients, message edit/delete, presence.
