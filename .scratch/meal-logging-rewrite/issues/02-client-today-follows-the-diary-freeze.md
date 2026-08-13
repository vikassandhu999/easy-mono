# Client Today follows the diary freeze

Type: AFK
Status: resolved

## Parent

[Meal logging diary](../spec.md)

## Design constraints

Read the spec Design brief before coding.

Must discard: live plan as the join key for past dates; client `buildSlots` joining today's plan to raw entries.

Must delete or replace: the `buildSlots` join (keep adherence and targets helpers). Client Today fetches diary rows and renders them. Unlogged slots still use live options as a checklist, not as plan-versus-actual.

## What to build

Client Today and past-date navigation render a logged slot from diary rows (status + frozen planned item + entry), not by joining the live weekday plan to entries. An unlogged slot still shows the live chosen option as unchecked items, not skipped rows. After the coach edits the plan, a past day the client already logged still shows the freeze from that day.

## Acceptance criteria

- [x] An unlogged slot shows planned foods as unchecked from the live option, with no skipped chips.
- [x] After the client logs some or all items, that slot renders diary rows: as-planned and swapped are checked, skipped stay unchecked and loggable, extras show as extras.
- [x] Opening a past date after the builder meal changed still shows the foods and statuses frozen at log time, not the edited live plan.
- [x] Consumed hero totals still sum logged entries.
- [x] The client does not join live plan items to entries by meal-item id (or any other key) to decide chips or skipped rows.
- [x] Future dates stay read-only.

## Blocked by

- [Show a logged planned meal without duplicate chips](./01-show-logged-planned-meal-without-duplicate-chips.md)

## Answer

Deleted `buildSlots`. `buildDaySlots` renders a meal log from server `rows` (freeze + status); an unlogged slot uses the live chosen option as an unchecked checklist. A pending option pick with no fulfilments shows the new checklist plus diary extras. Today UI maps `SlotRow` statuses to checkboxes (skipped/checklist unchecked and loggable; as_planned/swapped/added checked). Hero totals still sum logged entries. Future dates remain read-only. `asTodayPlan` stays until [One nutrition-day read](./05-one-nutrition-day-read.md).

Verified: `pnpm -C apps/clientapp-v2 build`.
