# 08 — Nutrition: mechanical type cleanups (cutover branch)

**What to build:** The mechanical nutrition findings, all compiler-verified and independent of each other. Every file here differs between `main` and the nutrition cutover branch, so this ticket lands **after or with** that merge — auditing or patching the working tree's pre-cutover copy is wasted work.

**Blocked by:** the `nutrition-backend-rewrite/16-contract-cutover` merge

**Status:** resolved

## Answer

- **`STATUS_CHIP`** is exhaustive (`as_planned`, `pending` added; `Partial<` dropped).
- **`planToMenuRequest`** accepts `PlanMenuSource` (structural `Pick`); check fixture uses `satisfies` instead of `unknown` cast.
- **`ItemRow`** derives macro/portion fields from `NutrientTotals` / `NutritionPortion`; no `{}` fallbacks.
- **Builder slots** typed end-to-end (`optionsForSlot`, `MealSlotControl`); duplicate label maps collapsed into `packages/utils/src/meal-slots.ts`.
- **Nutrition API casts** removed from `nutrition.ts`, `nutrition-plans-list.ts`, and `nutrition-plan-builder.ts`.
- Verified: `pnpm -C apps/clientapp-v2 build`, `pnpm -C apps/coachapp-v2 build`. Browser exercise skipped (prior preference).

- [x] `coachapp-v2/src/clients/client-screen/nutrition-day.tsx:26` drops the `Partial<` from `Partial<Record<NutritionDayRow['status'], string>>` and adds the two missing arms (`as_planned`, `pending`). This is the only `Partial<Record` in the frontend, and it removes the one piece of exhaustiveness the domain already had. A new backend status becomes a build break instead of a blank chip.
- [x] `coachapp-v2/src/api/nutrition-menu.check.ts:74` loses its `as unknown as Parameters<typeof planToMenuRequest>[0]`. The cause is a too-wide parameter: `planToMenuRequest` accepts a whole `NutritionPlan` but reads a subtree. Narrow it structurally — `builder/commands-state.ts:8-15` already does exactly this with `Pick` plus indexed access. The fixture then guards the real contract rather than `unknown`.
- [x] `clients/client-screen/nutrition-day.tsx:195-196` stops re-typing `nutrients` and `portion` as all-optional inline objects and derives `NutrientTotals` / `NutritionPortion` instead. That redeclaration is what lets `nutrients={entry?.nutrients ?? {}}` and `portion={entry?.portion ?? {}}` compile at `:266-267`.
- [x] The builder's slot parameters are typed, removing the casts at `builder/commands.ts:255, :305, :323` and the `slot: string` parameters at `plan-tree.ts:68, :75, :88`. The callers already hold the union.
- [x] The Meal Slot vocabulary stops existing three times. `packages/utils/src/nutrition.ts:14-42`, `nutrition-plans/builder/slots.ts:6-35`, and the generated enum collapse to one `MealSlot` derived from `NutritionDaySlot['meal_slot']`, with total lookups and no `?? slot` fallback hiding a miss (`slots.ts:38`, `nutrition-utils.ts:129`, `clients/lib/nutrition-day.ts:1-2` — the last takes the label map as a parameter purely to dodge the type).
- [x] The redundant `as Promise<…>` casts in the nutrition api files are removed here rather than in ticket 03, to avoid two tickets editing the same lines: `clientapp-v2/src/api/nutrition.ts:40, :48, :56`, `coachapp-v2/src/api/nutrition-plans-list.ts` (×9), `nutrition-plan-builder.ts:115, :139`.
- [x] Both apps build clean; the coach plan builder and the client nutrition day are exercised in a browser.
