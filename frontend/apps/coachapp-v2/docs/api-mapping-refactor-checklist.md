# API Mapping Refactor Checklist

Goal: keep app state canonical, push API quirks to entity mappers, and keep screens/components thin.

## Hunt checklist

For each entity, search for and remove:

- request shaping in UI
  - `...(value && {field: value})`
  - `...(value !== undefined && {field: value})`
  - `value || undefined`
  - `value ?? undefined`
- response normalization in UI
  - `normalizeMacros(...)`
  - alias handling
  - backend-specific key knowledge
- draft coercion in UI
  - `Number(...)`
  - `isNaN(...)`
  - `value === ''`
  - `value !== ''`
- business calculations in UI
  - totals loops
  - per-100g math
  - aggregate macros
- repeated API-to-form bootstrapping
  - `useMemo(() => ({...apiData}))`
  - `useState(mappedApiData)`

## Target structure per entity

- `src/api/mappers/<entity>.ts`
  - `fromApi`
  - `toCreateRequest`
  - `toUpdateRequest`
  - `toFormValues`
  - nested child mappers
- `src/domain/<entity>.ts`
  - pure business calculations
  - draft factories
  - intent-level helpers

## Screen/component acceptance criteria

A screen is done when it mostly reads as:

- fetch data
- hydrate form from mapper
- submit with request mapper
- call named domain helpers for computations

and does **not** contain mapping/coercion glue.

## Rollout status

- [x] Food
  - `src/api/mappers/foods.ts`
  - `transformResponse` in `src/api/foods.ts`
  - create/edit form request mappers
  - duplicate/form hydration mapper
  - removed food macro normalization from UI consumers
- [x] Recipe
  - `src/api/mappers/recipes.ts`
  - `src/domain/recipes.ts`
  - `transformResponse` in `src/api/recipes.ts`
  - create/edit request mappers
  - form hydration + ingredient draft mappers
  - recipe nutrition computation extracted from UI
  - removed recipe macro normalization from UI consumers
- [x] Nutrition plan
  - `src/api/mappers/nutritionPlans.ts`
  - `src/api/mappers/meals.ts`
  - `src/domain/nutrition-plans.ts`
  - `transformResponse` in `src/api/nutritionPlans.ts`
  - `transformResponse` in `src/api/meals.ts`
  - create/edit request mappers
  - form hydration mapper
  - meal item request shaping extracted from UI
  - meal macro summary computation extracted from UI
- [x] Training plan
  - `src/api/mappers/trainingPlans.ts`
  - `src/domain/training-plans.ts`
  - `src/domain/training-exercise-form.ts`
  - `src/domain/training-weekly-overview.ts`
  - `transformResponse` in `src/api/trainingPlans.ts`
  - create/edit plan request mappers
  - form hydration mapper
  - workout rename/notes request shaping extracted from UI
  - workout element create/update request shaping extracted from UI
  - next-position and workout lookup helpers extracted from UI
  - inline exercise form set/rest conversion helpers extracted from UI
  - weekly overview day-state/copy/rest helpers extracted from UI
- [x] Workout session
  - `src/api/mappers/workoutSessions.ts`
  - `src/domain/workout-sessions.ts`
  - `transformResponse` in `src/api/workoutSessions.ts`
  - session title/subtitle computations extracted from UI
  - performed set/session response normalization centralized
- [x] Client
  - `src/api/mappers/clients.ts`
  - `transformResponse` in `src/api/clients.ts`
  - edit/invite request mappers
  - edit form hydration mapper
  - inline notes update request shaping extracted from UI
  - invitation share/expiry formatting extracted from UI
- [x] Client nutrition
  - `src/api/mappers/mealLogs.ts`
  - `src/domain/client-nutrition.ts`
  - `transformResponse` in `src/api/mealLogs.ts`
  - adherence week/date helpers extracted from UI
  - meal comparison and day summary computations extracted from UI
- [x] Exercise
  - `src/api/mappers/exercises.ts`
  - `transformResponse` in `src/api/exercises.ts`
  - create/edit request mappers
  - edit form hydration mapper
- [x] Storefront
  - `src/api/mappers/storefront.ts`
  - `transformResponse` in `src/api/offers.ts`
  - `transformResponse` in `src/api/testimonials.ts`
  - `transformResponse` in `src/api/storefront.ts`
  - offer/testimonial create-edit request mappers
  - storefront profile form hydration + upsert mapper
- [ ] Remaining entities

## Recommended search commands

```bash
rg -n "\.\.\(.*&& \{.*\}\)" apps/coachapp-v2/src
rg -n "normalizeMacros\(" apps/coachapp-v2/src
rg -n "Number\(" apps/coachapp-v2/src
rg -n "isNaN\(" apps/coachapp-v2/src
rg -n "!== ''|=== ''" apps/coachapp-v2/src
rg -n "Object\.entries\(|Object\.keys\(" apps/coachapp-v2/src
rg -n "setValue\(" apps/coachapp-v2/src
```
