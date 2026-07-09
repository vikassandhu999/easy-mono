# Follow-ups

Repo-local follow-up ledger (Linear paused this week). One section per feature; delete items when done.

## Coach↔client messaging (merged bae41483, 2026-07-09)

Spec: `docs/superpowers/specs/2026-07-08-coach-client-messaging-design.md` · SDD ledger: `.superpowers/sdd/progress.md`

### Security / correctness

- [ ] **Revoke live websockets on deactivation/reassignment** (also filed as Linear COA-124).
  Sockets outlive the 5-min JWT; deactivating a client/trainer or reassigning does not kill joined channels — pushes keep flowing until the socket drops. Fix: `EasyWeb.Endpoint.broadcast("user_socket:#{user_id}", "disconnect", %{})` from the lifecycle context fns (`UserSocket.id/1` already returns that topic). Channel test: deactivated trainer stops receiving pushes.
- [ ] **Prod `check_origin` fail-loud** (also filed as Linear COA-125).
  Unset `CORS_ALLOWED_ORIGINS` → `check_origin: false` in prod (silent CSWSH exposure). Raise in `runtime.exs` prod branch when unset. Related: token rides the socket query string — fine at 5-min TTL, revisit together if TTL grows.

### Product-scope (decide before building)

- [ ] **Push notifications for offline recipients.** No FCM/APNS/web-push infra exists; a message while the app is closed is silent. Feature-sized.
- [ ] **Per-coach read cursors.** v1 is one shared cursor per side — any coach reading marks the whole team's side read. Upgrade path: per-coach read table (`ponytail:` comment on `Conversation` schema marks the seam).

### Polish / hardening batch (small, one PR-sized sweep)

- [ ] Scroll anchoring on "Load older messages" — prepended page can shift the viewport (both chat views).
- [ ] Client channel join performs an upsert (`Chat.get_client_conversation/1` in `ConversationChannel.authorize/2`) — auth-as-side-effect; swap to a read-only `for_client |> Repo.one()` compare.
- [ ] Inbox unread count is a correlated subquery per row × limit 100, refetched per `conversation_updated` event and by the always-mounted badge — denormalize an unread counter if inboxes grow.
- [ ] Helper dedup: `Easy.Chat.get_client_account/get_coach` duplicate `Easy.Clients` helpers; `parse_int/1` duplicated across the two conversation controllers (+ exercise controller's `parse_integer`); socket.ts base-URL logic duplicated vs base.ts in both apps (drift risk — base.ts already grew a warn-guard socket.ts lacks).
- [ ] OpenAPI ops declare `unauthorized` (401) but the auth pipeline returns 403 — spec-wide drift, fix across all controllers in one pass.
- [ ] `@lexical/react` peer deps in `packages/hooks` + `packages/ui` likely dead after the chat-package deletion — verify and drop.

### Dev residue (no code change)

- [ ] qatest conversation holds ~12 smoke messages; dev servers left running (backend :4000, coachapp :2021, clientapp :1314).
