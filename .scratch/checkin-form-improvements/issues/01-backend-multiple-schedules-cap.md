# 01 — Backend: multiple active check-in schedules per client (cap + error contract)

**What to build:** A coach can run several recurring check-ins per client through the API. Creating a second active schedule with a different check-in template succeeds and both appear in the schedule list. Creating a second active schedule with the *same* template is rejected with a 422 whose error sits on the form template field (today the unique violation is misleadingly mapped to the client field). Creating — or reactivating via update — a fourth active schedule is rejected with a distinct 422 cap error; the message must not promise a specific number, since the cap (3) is a product guess that is cheap to raise. Two schedules due for the same client on the same day each generate their own assignment linked to their schedule, and due/overdue reminders fire per assignment — existing sweeper behavior, locked down by tests rather than rewritten. The OpenApiSpex schema gains the cap error response and both generated frontend schemas are regenerated.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Second active schedule with a different template: created, both returned by the schedule list endpoint
- [x] Second active schedule with the same template: 422 with the error on the form template field
- [x] Fourth active schedule via create: 422 with the distinct cap error (message names no specific number)
- [x] Reactivating a paused schedule that would exceed the cap via update: same 422 cap error
- [x] Context test: two due schedules for one client on the same date generate two assignments, each linked to its schedule
- [x] Context test: reminders fire per assignment across schedules
- [x] Pausing one schedule leaves the other still generating assignments (controller-seam test)
- [x] OpenApiSpex updated with the cap error response; both frontend `schema.ts` files regenerated
- [x] Tests assert on API responses and database effects visible through the API, not internal calls
- [x] `mix precommit` passes

## Comments

Implemented 2026-08-14. Notes:

- No migration needed: the DB unique index was already `(client_id, form_template_id) WHERE active`; only the changeset error mapping was wrong (landed on `client_id`).
- Cap (3) lives as `@active_check_in_schedule_cap` in `Easy.Forms`; enforced app-side on create (inside the transaction) and on reactivation via update. Count-then-write is unserialized — concurrent requests can overshoot the soft cap; accepted and marked with `ponytail:` comments.
- Cap error is the bare atom `:check_in_schedule_cap_reached`, mapped by `FallbackController` to a 422 with `error_code: "check_in_schedule_cap_reached"` and a message naming no number.
- OpenAPI: the cap error shares the single 422 slot with validation errors, documented in the response description (spec allows one response per status). Frontends discriminate at runtime via `error_code`, not via types — the shared `ErrorResponse` schema doesn't declare `error_code` (pre-existing debt).
- clientapp `schema.ts` had no diff: the coach-only schedule endpoints don't appear in `client.openapi.json`, so "both regenerated" is satisfied vacuously.
