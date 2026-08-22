# 06 — Make the closed vocabularies actually closed

**What to build:** The backend's closed vocabularies reach the frontend as literal unions and are then widened back to `string` or `Record<string, …>`, or handled by a catch-all `default`. There is not one `const _exhaustive: never` in 391 files. Add the guards where a new backend variant would otherwise render wrong silently, and make the lookup tables total.

**Blocked by:** none

**Status:** resolved

- [x] `clientapp-v2/src/checkins/checkin-field.tsx:65` switches over `question.type` with an explicit case per kind and a `const _exhaustive: never = question` in the default arm. Today an unknown type silently renders a `TextField` and submits the wrong answer shape. The sibling at `auth/accept-invite.tsx:141` is the pattern to copy — it has no `default`, so `noImplicitReturns` already catches gaps.
- [x] `coachapp-v2/src/clients/lib/workbench-reason-presentation.ts` gains exhaustiveness guards in `presentProgrammingReason` (`:56`) and `presentOnboardingReason` (`:36`), which currently fall through to a final branch reading variant-specific fields. Note the audit's severity was checked and downgraded: `WorkbenchProgrammingReason` is a genuine three-member union, so a new variant missing those fields breaks the build; the real risk is a variant that carries them and renders under the wrong label. The sibling `workbench-programming.ts:13` already uses the safe `Record<Reason['code'], …>` shape.
- [x] The closed vocabularies typed as `Record<string, …>` in shared surfaces are keyed on their union: `packages/utils/src/nutrition.ts:24` `MEAL_SLOT_LABELS` (the `MealSlot` union is two lines above it at `:22`), `packages/utils/src/workout.ts:61` `SESSION_STATE_CHIP` (declare the missing session-state union), and `packages/utils/src/workout.ts:49` `DAY_NAMES`.
- [x] `packages/utils/tsconfig.json` enables `noUncheckedIndexedAccess`, which both apps already set. Without it these package lookups type as non-optional while being `undefined` at runtime.
- [x] `clientapp-v2/src/workout/session-utils.ts:224` `FIELDS: Record<string, FieldKind[]>` is keyed on the backend `tracking_type` union; the `?? ['weight', 'reps']` fallback at `:237` is removed or justified in a comment.
- [x] `coachapp-v2/src/settings/billing.tsx` is already covered by ticket 01; do not duplicate that work here.
- [x] The meal-slot write path is typed end to end: `meal-slot-control.tsx:60` stops doing `onChange(String(next))`, and `nutrition-plans/builder/commands.ts:230, :234, :251` drop their `as MealSlot` casts. The **read** path stays `string` — `schema.ts:2771` genuinely returns free-form `meal_slot` and `nutrition-day.tsx:305` handles values outside the union. Write boundary only.
- [x] Both apps build clean; both apps' `check` suites pass; `just check-rm` is clean.

## Answer

Added `const _exhaustive: never` guards to `checkin-field.tsx` (explicit `text` case; default no longer falls back to TextField), `presentOnboardingReason`, and `presentProgrammingReason`.

Tightened `@easy/utils` lookup tables: `MEAL_SLOT_LABELS` was already `Record<MealSlot, string>`; added `SessionState` + `SESSION_STATE_CHIP`, `IsoWeekdayNumber` + `DAY_NAMES`, and enabled `noUncheckedIndexedAccess` on the utils package tsconfig.

Client workout: `TRACKING_TYPES` / `TrackingType` union keys `FIELDS`; `parseTrackingType` validates at the boundary and defaults unknown values to `weight_reps` (replacing the silent `?? ['weight', 'reps']` lookup fallback).

Nutrition builder write path: `MealSlotControl` validates ListBox selection to `BuilderMealSlot`; `addOption` / `moveOption` / `changeSlot` take `BuilderMealSlot` with casts removed; `slotRows` / `firstFreeSlot` / `MealCard.slot` typed on the write boundary. Read paths (`slotLabel(slot: string)`, coach nutrition-day) unchanged.

Both apps build + check pass.
