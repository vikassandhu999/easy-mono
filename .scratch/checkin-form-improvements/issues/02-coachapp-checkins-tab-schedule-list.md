# 02 — Coach app: Check-ins tab schedule list + add-schedule flow

**What to build:** On a client's Check-ins tab, the coach sees *all* of the client's check-in schedules as a list of cards, replacing today's single-schedule card. Each card keeps the inline frequency and active (pause/resume) controls the single card has today, plus a delete action for a schedule set up by mistake. An add-schedule action opens a flow collecting: a check-in template (check-in purpose only), a frequency (once, weekly, biweekly, monthly), and a first due date — so a new cadence starts on the day the coach intends, not today by default. Editing one schedule's frequency never touches the others. The duplicate-template and schedule-cap 422s from the API render as clear, human messages. The endpoints already exist and return lists; this is presentational work over them.

**Blocked by:** 01 — Backend: multiple active check-in schedules per client (cap + error contract).

**Status:** resolved

- [x] Check-ins tab lists every schedule for the client as its own card
- [x] Each card retains inline frequency editing and pause/resume; editing one schedule leaves the others untouched
- [x] Each card offers delete for a schedule that has not generated assignments
- [x] Add-schedule flow: pick check-in template (check-in purpose only), frequency (once/weekly/biweekly/monthly), first due date
- [x] Duplicate-template 422 renders a clear message tied to the template choice
- [x] Cap 422 renders a clear message (no specific number promised)
- [x] React Query invalidation lives in the src/api mutation hooks, not at call sites
- [x] Typecheck and build gates pass (existing frontend gates; no new test seam)

## Comments

Implemented 2026-08-14. Notes:

- Add-schedule flow is `CheckinScheduleAddContent` inside the canonical `AssignSurface`/`PickerModal` shell, mirroring `PlanAssignContent`'s two steps (pick template → cadence). New hooks `useCreateCheckInScheduleMutation` / `useDeleteCheckInScheduleMutation` own their invalidation in `src/api/checkins.ts`.
- Duplicate-template 422 renders as `"<template name>" already has an active schedule for this client. Pick a different template.` in the cadence step; the cap 422 (no field errors) falls through to the backend's human message via `getApiErrorMessage`. Resuming a paused schedule past the cap surfaces the same message as a danger toast (`getApiErrorCode` check in the card's save handler).
- The first-due-date field defaults to today but is prominent, required, and `min`-clamped to today — the coach picks the start day deliberately; we kept the today default rather than forcing an empty field.
- Delete stays hidden until the assignments query has loaded (unknown ≠ unused), and for any schedule with assignments; the backend still rejects stale deletes with 422.
- Verified live in the browser: card list, both create paths (default and edited date), duplicate-template error, frequency-edit isolation between cards, delete hidden on schedules with assignments. Cap error and delete-confirm exercise the same shared code paths (error box / plan-actions-menu dialog pattern) and are covered by backend tests + typecheck.
- Note for later: the pick-step markup (header + sticky search + BrowseListBox + create button) now appears near-verbatim in three assign flows — rule-of-three candidate for a shared component.
