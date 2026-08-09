# Sweeper Prototype Decision

**Current evidence (2026-08-01 local development database):** 10 active check-in schedules, 0 due schedules, 1 due reminder, 6 overdue reminders, and 0 expired clients.

## Decision

- Keep the current per-schedule generation. Rewrite it as chunked `FOR UPDATE SKIP LOCKED` work only when due batches routinely exceed 100 schedules or measured sweep time/query load becomes material.
- Guard each automatic sweeper run with a named PostgreSQL session advisory lock. This prevents overlapping Fly machines or deploy generations from generating/sending the same work while avoiding a database transaction around email delivery.
- Keep the immediate startup sweep plus 24-hour in-memory timer for the prototype. Startup catches up overdue database state after restarts.
- Do not add Oban at prototype volume.

## Known ceiling

- A failed email is retried on the next sweep, which can be roughly 24 hours later.
- The timer is not a wall-clock schedule and drifts by sweep duration.
- Move to durable unique jobs when retry latency, exact delivery windows, or multiple independent worker processes become product requirements.
