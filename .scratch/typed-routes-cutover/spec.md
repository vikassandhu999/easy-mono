# Typed-routes cutover

Status: ready-for-agent

Muscle is the template. Dual-run is on. The rest of the app still has OpenAPI. This file is the order. The subagent prompt is [SUBAGENT.md](SUBAGENT.md).

## Coordination

One fact: `schema.ts` is a shared write. Two agents generating at once will clobber each other.

| Who | Owns |
| --- | --- |
| Parent | `just gen-api`, both `schema.ts`, `frontend/openapi/*`, merge of leftover OpenAPI, final `tsc` |
| Subagent | One **resource** from the wave table: type module, both controllers if they share `t`, JSON view deletion, controller tests, hook re-exports |

Subagents do **not** run `just gen-api`, `mix typed_routes.gen`, or edit `schema.ts` / `easy-openapi.json`. After the wave’s agents return, the parent generates once, then agents (or the parent) point hooks at the new names if `tsc` still reads `components['schemas']`.

A controller file is OpenAPI or `typed`, never both. Coach and client of the same JSON resource are **one** agent. `EasyWeb.Types.Revision` already exists; reuse it for delete query bodies.

Banned: `patch/1`, `Omit`, headers on `typed`, types from Ecto schemas, `format/1` catch-all `Map.from_struct`, generating OpenAPI from `typed`.

## Name table

Last segment of `EasyWeb.Types.*` is the TypeScript name. Claimed here so two agents do not pick `Plan`.

| Resource | Module | TS name |
| --- | --- | --- |
| Muscle (done) | `EasyWeb.Types.Training.Muscle` | `Muscle` |
| Equipment | `EasyWeb.Types.Training.Equipment` | `Equipment` |
| Health | `EasyWeb.Types.Health` | `Health` |
| Library media | `EasyWeb.Types.LibraryMedia` | `LibraryMedia` |
| Weight entry | `EasyWeb.Types.WeightEntry` | `WeightEntry` |
| Coach profile | `EasyWeb.Types.CoachProfile` | `CoachProfile` |
| Client profile | `EasyWeb.Types.ClientProfile` | `ClientProfile` |
| Upload | `EasyWeb.Types.Upload` | `Upload` |
| Team member | `EasyWeb.Types.TeamMember` | `TeamMember` |
| Prospect | `EasyWeb.Types.Prospect` | `Prospect` |
| Landing page | `EasyWeb.Types.LandingPage` | `LandingPage` |
| Business | `EasyWeb.Types.Business` | `Business` |
| Form template | `EasyWeb.Types.FormTemplate` | `FormTemplate` |
| Form assignment | `EasyWeb.Types.FormAssignment` | `FormAssignment` |
| Check-in schedule | `EasyWeb.Types.CheckInSchedule` | `CheckInSchedule` |
| Check-in review | `EasyWeb.Types.CheckInReview` | `CheckInReview` |
| Client | `EasyWeb.Types.Client` | `Client` |
| Food | `EasyWeb.Types.Nutrition.Food` | `Food` |
| Recipe | `EasyWeb.Types.Nutrition.Recipe` | `Recipe` |
| Nutrition plan | `EasyWeb.Types.NutritionPlan` | `NutritionPlan` |
| Nutrition day | `EasyWeb.Types.Nutrition.Day` | `Day` |
| Exercise | `EasyWeb.Types.Training.Exercise` | `Exercise` |
| Training plan | `EasyWeb.Types.TrainingPlan` | `TrainingPlan` |
| Workout session | `EasyWeb.Types.Training.Session` | `Session` (if clash, `TrainingSession`) |
| Performed set | `EasyWeb.Types.Training.PerformedSet` | `PerformedSet` |
| Conversation | `EasyWeb.Types.Conversation` | `Conversation` |
| Chat message | `EasyWeb.Types.ChatMessage` | `ChatMessage` |
| Workbench | `EasyWeb.Types.Workbench` | `Workbench` |
| Billing | `EasyWeb.Types.Billing` | `Billing` |

If `Session` collides at Mix unique-segment check, rename before generating. Do not prefix in the Mix task.

## Waves

Parent runs `just gen-api` after each wave (not after each agent). Then `pnpm -C apps/coachapp-v2 exec tsc -p tsconfig.app.json --noEmit` and the client equivalent. Then `mix test` on the files that wave touched.

### Wave 1 — clones of muscle

Parallel. `take/1`. Copy `MuscleController` and `EasyWeb.Types.Training.Muscle`.

1. Equipment (`GET /v1/coach/training-equipment`)
2. Health (`GET /api/health`) — rewrite `json`/`put_status` to `ok/2`; those tokens are banned in a typed controller file
3. Weight entries (coach `ClientWeightEntryController` + client `WeightEntryController`, one `WeightEntry.t()`)
4. Library media create

### Wave 2 — still flat, more actions

Parallel. Same JSON as today’s views. `Revision.t()` on deletes that already send `expected_revision`.

1. Uploads (coach + client)
2. Team
3. Prospects
4. Landing (public show/apply + coach show/update), one `LandingPage.t()`
5. Business
6. Coach profile + client profile (two type modules, two agents is fine)

### Wave 3 — forms and clients

Parallel. Medium.

1. Form templates
2. Form assignments (coach + client)
3. Check-in schedules
4. Clients (`ClientController`)
5. Check-in review

### Wave 4 — food, then recipe

Serial inside the wave. Recipe JSON embeds `Food.t()`.

1. Food (coach + client). Move `EasyWeb.FoodPayload` into `Food.format/1`. Preload `media`. `allergens`/`dietary_tags`/`serving_sizes` nil → `[]` in `format/1`, not in `take/1`.
2. Parent `just gen-api`
3. Recipe (coach + client). `Recipe.format/1` from `RecipePayload`. Preload `recipe_ingredients` + `food`. Nested food is `Food.t()`.

### Wave 5 — training

1. Exercise (coach + client). Nested muscle/equipment on the exercise JSON stay as the exercise type’s fields, not a live `Muscle.t()` unless the view already matches `Muscle`.
2. Parent generate
3. Training plan (coach + client coverage/index/show) **and** coach `ClientPlanController` lists
4. Workout sessions (coach + client) + performed sets

Training plan `replace_prescription` is the fat action. One agent, do not split the module.

### Wave 6 — nutrition programs

1. Nutrition plan (coach + client) including `replace_menu`
2. Parent generate
3. Nutrition day (coach index + client diary writes). Idempotency plug on the write actions, not a `typed` key. Skip this wave if the diary rewrite is still dirty in the working tree.

### Wave 7 — chat, workbench, billing

Parallel.

1. Conversations + messages (coach + client)
2. Workbench
3. Billing

### Wave 8 — leftovers, then delete OpenAPI

1. Auth stays on OpenAPI unless you explicitly convert it. The contract allows `json(%{...})` there. Webhooks stay `send_resp` text; out of `schema.ts`.
2. Coverage test: zero `open_api_operation` left on in-scope routes (except auth/webhooks if kept).
3. Only then delete `backend/lib/easy_web/open_api/`, Scalar, `frontend/openapi/`, `openapi-typescript`. `paths` stays. `just gen-api` becomes `mix typed_routes.gen` plus biome.

## Done when

- Every in-scope router action is `typed` or the documented leftover (auth, webhooks)
- `mix typed_routes.gen --check` is green after `just gen-api`
- Both apps’ `tsc -p tsconfig.app.json` pass
- Focused controller tests pass without `OpenApiSpex.TestAssertions.assert_schema/3` on converted modules
