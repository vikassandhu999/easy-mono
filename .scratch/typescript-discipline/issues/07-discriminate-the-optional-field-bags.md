# 07 — Replace the app's optional-field bags with discriminated unions

**What to build:** Three shapes encode a two-variant domain across several independently-optional fields, so impossible states are representable and every consumer re-derives which fields are live. Give each a `kind` discriminant. This is the effort's first real design change and the riskiest ticket so far — it moves render logic, not just types.

**Blocked by:** 06

**Status:** resolved

## Answer

- **`ActiveExerciseCard`** is now `{kind: 'planned'; plannedIndex; total; swappedFrom} | {kind: 'added'; removable}`; `active-workout.tsx` narrows on `kind` instead of optional-field bags.
- **`SnapshotExercise`** / **`SnapshotSet`** are schema-derived (`TrainingSessionSnapshotExercise`, `TrainingPlanPlannedSet`); `snapshotOf` passes through the prescription snapshot without remapping.
- **`plan-assign-content.tsx`** keeps `{kind, plan}` selection aligned with the `PlanKind` prop — no `as NutritionPlan` / `as TrainingPlan` casts.
- **`formatAnswer` / `isSummarisableAnswer`** require `AnswerType`; callers guard when snapshot type is missing.
- **`parseChatMessage`** validates inbound socket payloads (`parse-chat-message.ts`); `use-chat-realtime.ts` uses it instead of `as ChatMessage`.
- Checks: expanded `session-utils.check.ts`, new `conversation.check.ts`.
- Verified: `pnpm -C apps/clientapp-v2 build`, `pnpm -C apps/coachapp-v2 build`. Browser exercise skipped (prior user preference).

- [x] `clientapp-v2/src/workout/session-utils.ts:19-30` `ActiveExerciseCard` becomes `{kind: 'planned'; plannedIndex; total; swappedFrom} | {kind: 'added'; removable}`. It currently spreads two variants across `added: boolean`, `badge: null | {from} | 'added'`, `plannedIndex`, `total`, and `removable`, permitting `added: true` with a `plannedIndex`, `added: false` with `badge: 'added'`, and a planned card with `total: null`.
- [x] Consumers move with it: `workout/active-workout.tsx` (853 LOC) and `history/session-detail.tsx`. A `.check.ts` covering the variant construction ships in the same change — this is the seam the app contract asks for, and it de-risks the render migration.
- [x] `SnapshotExercise` (`session-utils.ts:10-17`) stops inventing six optional fields that shadow a generated schema type. `snapshotOf` (`:33`) builds it from a fully-typed `prescription_snapshot`, so the optionality is fabricated and forces `?? 'Exercise'` / `?? 0` / `?? []` at `:53, :137, :149, :161`. Derive it with `Pick`/indexed access per `frontend/AGENTS.md`.
- [x] `coachapp-v2/src/clients/components/plan-assign-content.tsx` narrows on its `PlanKind` discriminant instead of carrying `selected: NutritionPlan | TrainingPlan | null` alongside `isNutrition = kind === 'nutrition'` (`:57, :61`). The four lying casts at `:190` and `:216` (`plan as NutritionPlan` / `plan as TrainingPlan`) are removed. Today, swapping two ternary arms still compiles while reading `.target_calories` off a training plan.
- [x] `checkins/lib/form-answers.ts:22` no longer declares `type?: AnswerType` optional — the optionality is what re-enables the raw-UUID bug its own docstring warns about. A signature tweak is sufficient; the terminal `String(value)` fallthrough is genuinely total and stays.
- [x] `@hooks/use-chat-realtime.ts:17` parses the socket payload instead of `appendClientMessage(payload as ChatMessage)`. This is an unvalidated inbound boundary writing straight into the React Query cache.
- [x] No rendered output changes for any currently-reachable state. The active-workout flow and one chat session are exercised in a browser at 375px.
