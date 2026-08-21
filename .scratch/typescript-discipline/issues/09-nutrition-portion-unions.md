# 09 — Nutrition: model Portion and item references as discriminated unions (cutover branch)

**What to build:** The nutrition domain's natural variants arrive from the generated schema as flat records with independently-nullable siblings, so `{kind: 'gram', grams: null, amount: 5}` is representable and every consumer re-normalises the same fields. Introduce hand-written narrowing unions beside the generated types and parse once at the boundary. This is the design spike the rest of the nutrition typing builds on.

**Blocked by:** 08

**Status:** resolved

## Answer

Added `@easy/utils/nutrition-portion` and `nutrition-item-ref` with parse/serialize helpers; re-exported narrowing aliases from both apps' `src/api/nutrition*.ts`. Replaced five-field `?? null` normalisation in `commands.ts`, `commands-state.ts`, and `nutrition-menu.ts` with `portionWireFromInput`. Fixed `meal-item-row` gram display via `parseNutritionPortion`. `buildMealItemDraft` now takes `NutritionItemRef`; client `SlotRow` and `SheetTarget` are status/mode discriminated unions with exhaustiveness guards. Browser skipped per user preference. Both apps `build` + `check` clean.

- [ ] `NutritionPortion` gains a narrowing alias — `{kind: 'gram'; grams: number} | {kind: 'serving'; amount: number; unit: string; label: string | null}` — declared in the owning `src/api/nutrition*.ts`, **not** in `schema.ts`, which `just gen-api` overwrites. This is where `frontend/AGENTS.md` already puts re-exports.
- [ ] The live defect this fixes is verified gone: `meal-item-row.tsx:33` currently guards `portion.kind === 'gram' && portion.grams != null` and silently falls through to the serving formatter when a gram portion has null grams, rendering an empty string.
- [ ] The three sites that each re-normalise the same five portion fields with `?? null` read the parsed union instead: `builder/commands.ts:464-470`, `api/nutrition-menu.ts:114-120`, `builder/commands-state.ts:54-60`.
- [ ] The item reference becomes a union rather than two optional ids. `builder/amount-draft.ts:11-12` takes `foodId?: string; recipeId?: string` and can return `{kind: 'food', food_id: undefined}`; `clientapp-v2/src/nutrition/components/food-picker.tsx:24-28` documents "exactly one of these two is set" in a comment, which `nutrition-today.tsx:213, :218, :225, :228` then unpacks back into conditional `undefined`s. Replace the comment with a type.
- [ ] `SlotRow` (`clientapp-v2/src/nutrition/nutrition-utils.ts:29-37`) and `SheetTarget` (`nutrition/components/amount-sheet.tsx:28-37`) discriminate on status instead of carrying `entry`, `plannedItem`, and `mealItemId` as independent nullables — `'skipped'` with an `entry` set is currently representable. The `?.` chains in `nutrition-day.tsx:259-268` and `nutrition-today.tsx:412-447` collapse as a result.
- [ ] Every switch or map over portion kind, item kind, and row status gains a `const _exhaustive: never` guard.
- [ ] No rendered output changes for any currently-reachable state, and no request body shape changes. The coach builder amount sheet and the client day are exercised in a browser at 375px.
- [ ] Branded ids are explicitly **out of scope** here and deferred to ticket 10's assessment.
