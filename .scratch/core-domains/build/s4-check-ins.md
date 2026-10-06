You are implementing the fourth and last slice of a redesign in this repository: the check-ins spec (Reviews), end to end (backend, API contract, coach app, client app). Slices 1–3 built Training, Nutrition and Trackers on a shared foundation. Work in this working tree on the branch `codex/core-domains`. Do not create another branch or worktree. Do not commit and do not push.

## Context

Fitness-coaching product: Elixir/Phoenix + Postgres backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`. Do not touch `frontend/apps/clientapp-v2`.

Read these first; they are the source of truth:
1. `.scratch/check-ins/spec.md` — the product spec for this slice. Read it fully. A check-in is not a period; it is a coach reviewing a client's ongoing record and saving a Review.
2. `.scratch/core-domains/decisions.md` — frozen decisions (M1–M18, P1–P4), especially M9, M10 (record journal, "new since"), M18 (counts, never scores).
3. `.scratch/core-domains/overview.md` — sections 7 (history), 8 (client and coach tables: `reviews`, client fields), 9 (calculated values).
4. `.scratch/core-domains/build/s1-report.md`, `s2-report.md`, `s3-report.md` — what slices 1–3 built and the choices they made. Reuse their pieces: `Easy.RecordJournal`, `record_changes` + `clients.last_change_seq`, the `records` view, expected workouts and meals with fulfilment, daily nutrition totals and target in force, tracker metrics, coverage and requests, PRs. Do not build second versions.
5. `.scratch/coaching-terms/spec.md` — coaching terms (reviews happen only while a term covers today).
6. `.scratch/core-domains/shared-report.md` — chat today (messages, record references, read cursors).
7. `AGENTS.md`, `CONTEXT.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, and the app `AGENTS.md` files.

Design standard: Rich Hickey's "Simple Made Easy" — one fact in one place; calculate states (due, overdue, waiting on client) instead of storing them; no braiding. Prefer deleting code to adapting it. Prototype: you may rewrite prototype migrations and reset dev/test databases; re-run seeds afterwards.

## Scope

**Data**
- `clients`: `review_frequency_days` (1, 3, 7, 14 or 28) and `focus` (one line, nullable).
- `businesses`: `default_review_frequency_days` (default 7). A business-settings change applies to new clients; on save the coach chooses whether to apply it to existing clients too (spec "Defaults and access").
- `reviews`: business, client, coach (author), `reviewed_at` (fixed when saved), `reviewed_through_seq` (the client's `last_change_seq` read in the same database snapshot as the review screen's data), `seen_at` (display time of that read), `assessment` (`on_track`, `needs_attention`, `at_risk`), `private_note`, `reply_message_id` (nullable). Assessment, note and reply stay editable; `reviewed_at` and `reviewed_through_seq` never change.

**Calculated, never stored**
- **Due**: a client is due when a coaching term covers today and either there is no Review since the current term started, or today ≥ the date of the last Review + frequency. Show "Overdue N days". A new or returning client is due on the term's start date.
- **New since the last review**: `record_changes` rows with `seq` > the last Review's `reviewed_through_seq` (or the whole current term when there is no Review), grouped by record, including corrections and removals.
- **Waiting on client**: open Tracker requests (slice 3 already calculates "open").

**Coach app**
- **Client roster** (the coach's daily screen for check-ins): every coached client once, with: due / overdue N days, last reviewed (date or "Never this term"), latest assessment, unread chat, "Waiting on client since <date>". Sort and filter by each. Owner sees every client; other coaches see the clients they coach (existing access rules).
- **Review screen** for one client, in the spec's order:
  1. "New since last review": added, changed and removed workouts, meals and tracker entries, each linked to the record; a correction shows old → new values from the journal.
  2. Summary from the last Review until today by default, or a chosen range, every figure linked to its records: training expected vs done (counts, extra sessions), nutrition days logged and daily totals vs the target in force (with "target changed" and unknown values), tracker values and change, event-tracker coverage, photo comparison.
  3. The last Review's private note at the top.
  4. Links to the client's plans.
  5. Save a Review: assessment (pre-filled from the last one; the first one starts at On track), private note, optional reply. Focus and Tracker requests can be set from this screen.
- The screen reads its data and `last_change_seq` in one consistent snapshot; saving stores that sequence. A change that arrives while the coach reads still appears next time.
- A Review history list for the client: date, coach, assessment, private note highlighted.
- Business settings: default review frequency (with apply-to-existing choice). Client settings: review frequency and focus.

**Reply in chat**
- A reply is posted as a chat message with a record reference to the Review (new reference type `review`).
- Editing the reply edits that chat message and marks it "edited"; deleting the reply deletes the message. Chat has no editing today: add editing and deletion for review replies only.
- Chat is also the place for urgent matters; there is no urgency flag.

**Client app**
- Today shows the Focus pinned, with open requests and "To record" (slice 3) as now.
- A history of the coach's replies (from chat references) and the current Focus. The client never sees the assessment or the private note.
- No "send" action and no submitted state for check-ins.

**Out of scope:** calculated scores or percentages, automated nudges, push notifications, forms, occurrence exceptions, multi-week cycles.

## How to work

- Backend: use the `elixir-production` skills (elixir-production plugin). Public context functions take `%Ctx{}` first. Typed routes and `EasyWeb.Types`; run `rtk just gen-api` after API changes.
- Frontend: keep code quality as high as it is now; match the patterns of slices 1–3 and the existing coach workbench and chat screens. Follow the `AGENTS.md` files.
- Tests: due calculation (no review this term, frequency boundary, returning client, no term today); "new since" includes corrections and removals and excludes changes at or below the stored sequence; a write that commits while the review screen reads is not lost (separate connections); `reviewed_at`/`reviewed_through_seq` immutable while assessment/note/reply edit; reply edit/delete updates the chat message and its "edited" flag; access (coach scope, client never sees assessment or private note); roster sorting and filters; default frequency apply-to-existing.
- Where the spec is silent, choose the simplest option that fits it and the decisions; list it in your report. Do not reopen frozen decisions.
- Dev servers may be running on :4000, :2022, :1315. Restart if needed.

## Verification (all must pass)

- `rtk mix precommit` in `backend/` (report the test count).
- `rtk just gen-api`.
- `rtk pnpm -C frontend/apps/coachapp build` and `rtk pnpm -C frontend/apps/clientapp build`.
- `rtk pnpm -C frontend lint:ci`.
- The training, nutrition and trackers browser flows from slices 1–3 still pass.
- A new Playwright flow (OTP `123456`): a client with an active term and some workouts, meals and tracker entries appears as due ("Never this term"); coach opens the review screen, sees the new items and the summary, saves a Review (Needs attention, private note, reply) and sets a Focus; the client sees the reply in chat and the Focus on Today, and no assessment; the client corrects an old meal and removes a tracker entry; the roster shows the client not due (weekly frequency) and the next review screen shows exactly those two changes with old → new values; coach edits the reply and the client sees "edited"; coach deletes the reply and the message disappears. Coach at 1280px and 375px, client at 375px. Screenshots in `.scratch/core-domains/build/s4-screens/`.

## Report

Write `.scratch/core-domains/build/s4-report.md`: what changed (backend, contract, coachapp, clientapp), choices where the spec was silent, anything not done, and verification results. End your final message with a short summary.
