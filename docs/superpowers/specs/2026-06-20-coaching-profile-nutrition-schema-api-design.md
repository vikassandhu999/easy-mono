# Coaching profile and nutrition schema/API design

## Goal

Prepare the coaching, forms, communication, and nutrition backend model for production.

The target product behavior is:

* Coaches can collect client requirements through reusable forms.
* Coaches can personalize training and nutrition plans from those requirements.
* Coaches can assign plans quickly.
* Coaches can keep clients accountable through attention filters and threaded discussion.

This spec covers backend schema and API shape only. Coach and client UX flows will be covered in a separate spec.

## Product rules

Client profile data is shared across training, nutrition, lifestyle, and future modules. Do not create separate nutrition and training profile roots.

Forms are the main way clients update their profile. Coaches and clients can both edit profile fields. There is no approval queue.

Intake is soft required. The app should show it loudly until complete, but it should not block plan access, logging, or normal app usage.

Plans are personalized copies. Assigning a template creates a client-owned copy. Template edits do not update assigned plans.

Assigned plan edits are allowed. A coach edits the assigned plan for normal client adjustments. A coach assigns a separate plan for a phase change.

Plan profile snapshots are out of scope. Plans should not store a copy of the client profile.

Food and recipe records are live references. If a coach edits a business-owned food or recipe, meals that reference it use the updated nutrition. Before saving, the API must support showing which templates and active client plans will be affected.

Meal logs and food log entries snapshot planned/logged nutrition at log time. History should not change when a food, recipe, meal, or plan is edited later.

## Database guarantees

Use database constraints for invariants that must survive concurrent writes:

* one `client_profiles` row per client
* unique `profile_field_definitions.key` per business
* one `profile_field_values` row per client/field definition
* one active assigned nutrition plan per client/date range
* one `nutrition_schedule_entries` row per plan/day/slot
* exactly one of `food_id` or `recipe_id` on meal items and food log entries
* positive `weight_g` where nutrition math is required
* one `nutrition_meal_logs` row per client/date/meal slot

## Client profile and forms

### Tables

```text
client_profiles
  id
  business_id
  client_id
  general
  nutrition
  training
  lifestyle
  intake_status
  intake_completed_at
  inserted_at
  updated_at
```

`general`, `nutrition`, `training`, and `lifestyle` are maps in v1. Keep common fields documented in code and OpenAPI. Promote a field to a real column only when backend filtering or indexing needs it.

```text
profile_field_definitions
  id
  business_id
  section
  label
  key
  field_type
  options
  filterable
  archived_at
  inserted_at
  updated_at
```

`field_type` values:

```text
text
number
boolean
date
select
multi_select
```

Only `number`, `boolean`, `date`, `select`, and `multi_select` can be filterable. Free text stays visible on the profile but does not drive dashboard filters.

```text
profile_field_values
  id
  business_id
  client_id
  profile_field_definition_id
  value
  updated_by_type
  updated_by_id
  updated_from_submission_id
  inserted_at
  updated_at
```

`updated_by_type` values:

```text
coach
client
system
```

```text
form_templates
  id
  business_id
  name
  purpose
  sections
  status
  inserted_at
  updated_at
```

`purpose` values:

```text
intake
weekly_check_in
nutrition_update
training_update
custom
```

`sections` contains form sections. Each section has a section tag (`general`, `nutrition`, `training`, `lifestyle`, or custom), ordered questions, and optional profile mappings.

```text
form_assignments
  id
  business_id
  client_id
  form_template_id
  purpose
  priority
  status
  due_date
  completed_at
  inserted_at
  updated_at
```

`priority` values:

```text
high
normal
```

`status` values:

```text
assigned
in_progress
completed
dismissed
```

Weekly check-ins are normal `form_assignments` with `purpose = weekly_check_in`. There is no separate check-in table in v1.

```text
form_submissions
  id
  business_id
  client_id
  form_assignment_id
  question_snapshot
  answers
  submitted_by_type
  submitted_by_id
  submitted_at
  inserted_at
```

Submissions are immutable. If a client submits again, create another submission.

### Profile update behavior

When a form is submitted:

1. Store the submission with question snapshot and raw answers.
2. Map core answers into `client_profiles`.
3. Map custom answers into `profile_field_values`.
4. Set `updated_by_*` and `updated_from_submission_id` on changed values.
5. Mark the assignment `completed`.

There is no approval queue. Coaches can override profile values. Clients can update profile values later.

### Form/profile endpoints

Coach:

```text
GET    /v1/coach/clients/:client_id/profile
PATCH  /v1/coach/clients/:client_id/profile
GET    /v1/coach/profile-fields
POST   /v1/coach/profile-fields
PATCH  /v1/coach/profile-fields/:id
DELETE /v1/coach/profile-fields/:id
GET    /v1/coach/form-templates
POST   /v1/coach/form-templates
GET    /v1/coach/form-templates/:id
PATCH  /v1/coach/form-templates/:id
DELETE /v1/coach/form-templates/:id
POST   /v1/coach/form-templates/:id/assign
GET    /v1/coach/clients/:client_id/form-assignments
PATCH  /v1/coach/form-assignments/:id
```

Client:

```text
GET  /v1/client/profile
PATCH /v1/client/profile
GET  /v1/client/form-assignments
GET  /v1/client/form-assignments/:id
POST /v1/client/form-assignments/:id/submit
```

Filtering clients by profile:

```text
GET /v1/coach/clients?profile_filter[section][field]=value
```

Support core fields and filterable custom fields. Ignore archived custom fields in filter options, but keep their stored values visible on historical profiles/submissions.

## Nutrition schema

### Table names

Use nutrition-prefixed table names:

```text
nutrition_plans
nutrition_meals
nutrition_meal_items
nutrition_schedule_entries
nutrition_foods
nutrition_recipes
nutrition_recipe_ingredients
nutrition_meal_logs
nutrition_food_log_entries
```

### Macro vocabulary

Use one nutrition vocabulary.

Food reference data stores per-100g values:

```text
calories_per_100g
protein_g_per_100g
carbs_g_per_100g
fat_g_per_100g
fiber_g_per_100g
```

Targets, planned amounts, logged amounts, and snapshots store actual totals:

```text
calories
protein_g
carbs_g
fat_g
fiber_g
```

Do not accept alternate names like `protein`, `protein_per_100g`, or loose macro maps in public request bodies.

Micronutrients are out of scope for v1.

All nutrition math resolves to grams. `amount` and `unit` are display/input fields. `weight_g` is the calculation value. If the backend cannot resolve `weight_g`, reject the write.

### Food library

```text
nutrition_foods
  id
  business_id
  creator_id
  name
  brand
  barcode
  source
  category
  calories_per_100g
  protein_g_per_100g
  carbs_g_per_100g
  fat_g_per_100g
  fiber_g_per_100g
  serving_sizes
  allergens
  dietary_tags
  notes
  image_url
  import_id
  inserted_at
  updated_at
```

`source` values:

```text
system
imported
custom
```

System/imported foods are read-only. Editing them creates a business-owned copy through the copy endpoint.

`serving_sizes` is an embedded list:

```text
label
amount
unit
weight_g
is_default
```

Fixed allergen enum:

```text
dairy
egg
fish
shellfish
tree_nuts
peanuts
wheat
soy
sesame
```

Fixed dietary tag enum:

```text
vegan
vegetarian
halal
kosher
gluten_free
dairy_free
low_fodmap
keto
high_protein
```

### Recipes

```text
nutrition_recipes
  id
  business_id
  creator_id
  name
  description
  instructions
  servings_count
  cooked_weight_g
  serving_sizes
  allergens
  dietary_tags
  inserted_at
  updated_at
```

Recipe nutrition is derived from ingredients. Store derived totals only if the product needs cached read performance; otherwise compute on read.

```text
nutrition_recipe_ingredients
  id
  recipe_id
  food_id
  amount
  unit
  weight_g
  position
```

Ingredients reference foods, not recipes. Nested recipes are out of scope.

### Plans

```text
nutrition_plans
  id
  business_id
  creator_id
  client_id
  source_template_id
  name
  description
  status
  start_date
  end_date
  target_calories
  target_protein_g
  target_carbs_g
  target_fat_g
  target_fiber_g
  tags
  inserted_at
  updated_at
```

`client_id IS NULL` means template. `client_id` set means assigned client copy.

`status` values:

```text
active
archived
```

For assigned plans, prevent overlapping active date ranges for the same client. This makes "today's plan" deterministic.

There is no multi-week cycle in v1. A plan is a repeating week. If multi-week nutrition becomes needed, add `cycle_week` to schedule entries before adding a `nutrition_weeks` table.

There is no `nutrition_daily_targets` table in v1. If different targets by weekday become needed, add daily target overrides later.

### Meals and schedule

```text
nutrition_meals
  id
  business_id
  creator_id
  nutrition_plan_id
  name
  notes
  default_meal_slot
  inserted_at
  updated_at
```

Meals are plan-scoped. They are copied when a template is assigned.

```text
nutrition_meal_items
  id
  business_id
  nutrition_meal_id
  food_id
  recipe_id
  amount
  unit
  weight_g
  position
  inserted_at
  updated_at
```

Exactly one of `food_id` or `recipe_id` must be set.

```text
nutrition_schedule_entries
  id
  business_id
  nutrition_plan_id
  day_of_week
  meal_slot
  nutrition_meal_id
  inserted_at
  updated_at
```

Unique index:

```text
nutrition_plan_id, day_of_week, meal_slot
```

Meal slots:

```text
breakfast
morning_snack
lunch
afternoon_snack
dinner
evening_snack
```

Weekdays:

```text
monday
tuesday
wednesday
thursday
friday
saturday
sunday
```

Do not allow multiple schedule entries for the same plan/day/slot. If a slot has multiple foods, model that as one meal with multiple meal items.

### Logging

```text
nutrition_meal_logs
  id
  business_id
  client_id
  date
  meal_slot
  planned_snapshot
  planned_calories
  logged_calories
  inserted_at
  updated_at
```

Unique index:

```text
client_id, date, meal_slot
```

```text
nutrition_food_log_entries
  id
  nutrition_meal_log_id
  food_id
  recipe_id
  food_name
  amount
  unit
  weight_g
  calories
  protein_g
  carbs_g
  fat_g
  fiber_g
  notes
  source
  planned_item_index
  inserted_at
  updated_at
```

`source` values:

```text
planned
replacement
unplanned
```

Logging snapshots the actual nutrition values for the eaten amount. Those values do not change after library edits.

## Nutrition API

Use kebab-case public paths.

### Plans

Coach:

```text
GET    /v1/coach/nutrition-plans
POST   /v1/coach/nutrition-plans
GET    /v1/coach/nutrition-plans/:id
PATCH  /v1/coach/nutrition-plans/:id
DELETE /v1/coach/nutrition-plans/:id
POST   /v1/coach/nutrition-plans/:id/duplicate
POST   /v1/coach/nutrition-plans/:id/assign
```

Client:

```text
GET /v1/client/nutrition-plans
GET /v1/client/nutrition-plans/:id
GET /v1/client/nutrition-plans/today?date=YYYY-MM-DD
```

### Meals and schedule

Coach:

```text
GET    /v1/coach/nutrition-plans/:plan_id/meals
POST   /v1/coach/nutrition-plans/:plan_id/meals
GET    /v1/coach/nutrition-meals/:id
PATCH  /v1/coach/nutrition-meals/:id
DELETE /v1/coach/nutrition-meals/:id
POST   /v1/coach/nutrition-meals/:meal_id/items
PATCH  /v1/coach/nutrition-meal-items/:id
DELETE /v1/coach/nutrition-meal-items/:id
GET    /v1/coach/nutrition-plans/:plan_id/schedule
PUT    /v1/coach/nutrition-plans/:plan_id/schedule/:day
```

`PUT /schedule/:day` replaces that day's schedule as desired state. Body is keyed by meal slot:

```json
{
  "breakfast": {"meal_id": "meal-id"},
  "lunch": {"meal_id": "meal-id"}
}
```

Omitted meal slots are empty for that day. This replaces separate copy-day endpoints.

### Foods and recipes

Coach:

```text
GET    /v1/coach/nutrition-foods
POST   /v1/coach/nutrition-foods
GET    /v1/coach/nutrition-foods/:id
PATCH  /v1/coach/nutrition-foods/:id
DELETE /v1/coach/nutrition-foods/:id
GET    /v1/coach/nutrition-foods/:id/impact
POST   /v1/coach/nutrition-foods/:id/copy
GET    /v1/coach/nutrition-recipes
POST   /v1/coach/nutrition-recipes
GET    /v1/coach/nutrition-recipes/:id
PATCH  /v1/coach/nutrition-recipes/:id
DELETE /v1/coach/nutrition-recipes/:id
GET    /v1/coach/nutrition-recipes/:id/impact
POST   /v1/coach/nutrition-recipes/:id/copy
```

Recipe writes include ingredients in the request body. There is no separate recipe ingredient CRUD in v1.

Client:

```text
GET /v1/client/nutrition-foods
GET /v1/client/nutrition-foods/:id
GET /v1/client/nutrition-recipes
GET /v1/client/nutrition-recipes/:id
```

Clients can read full recipe details. Clients cannot mutate foods or recipes.

### Logging

Client:

```text
GET    /v1/client/nutrition-meal-logs?date=YYYY-MM-DD
GET    /v1/client/nutrition-meal-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
POST   /v1/client/nutrition-food-log-entries
PATCH  /v1/client/nutrition-food-log-entries/:id
DELETE /v1/client/nutrition-food-log-entries/:id
POST   /v1/client/nutrition-food-log-entries/log-meal
POST   /v1/client/nutrition-food-log-entries/log-day
```

Coach:

```text
GET /v1/coach/clients/:client_id/nutrition-meal-logs?date=YYYY-MM-DD
GET /v1/coach/clients/:client_id/nutrition-meal-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Coach access to client meal logs is read-only.

## Threads

Threads are a lightweight communication layer used across modules. They power a unified coach/client inbox and link back to module-specific subjects.

### Tables

```text
threads
  id
  business_id
  client_id
  module
  subject_type
  subject_ref
  title
  status
  priority
  last_message_at
  last_message_preview
  created_by_type
  created_by_id
  inserted_at
  updated_at
```

`module` values:

```text
nutrition
training
fitness
profile
general
```

`status` values:

```text
open
resolved
archived
```

`priority` values:

```text
normal
attention
```

`created_by_type` values:

```text
coach
client
system
```

Examples of `subject_type`:

```text
nutrition_week
nutrition_day
nutrition_meal_slot
workout_session
weight_entry
form_submission
client_profile
general
```

`subject_ref` is a map. Examples:

```json
{"week_start": "2026-06-15"}
{"date": "2026-06-20", "meal_slot": "lunch"}
{"resource_id": "workout-session-id"}
```

```text
thread_messages
  id
  thread_id
  author_type
  author_id
  body
  kind
  metadata
  inserted_at
  updated_at
```

`author_type` values:

```text
coach
client
system
```

`author_id` is the coach id or client id. It is null for system messages.

The thread belongs to the whole business/client relationship, not to one assigned coach. Any coach in the business can see client threads. A client can see only their own threads.

### Thread endpoints

Coach:

```text
GET   /v1/coach/threads?client_id=&module=&status=&priority=
POST  /v1/coach/threads
GET   /v1/coach/threads/:id
PATCH /v1/coach/threads/:id
POST  /v1/coach/threads/:id/messages
GET   /v1/coach/clients/:client_id/threads
```

Client:

```text
GET  /v1/client/threads
POST /v1/client/threads
GET  /v1/client/threads/:id
POST /v1/client/threads/:id/messages
```

Do not add read receipts, reactions, realtime delivery, or participants in v1.

## Attention

Attention is a computed dashboard read model. Do not add an alerts table in v1.

Signals can come from:

* missed planned meal slots
* nutrition variance from target
* replacements and unplanned foods
* incomplete high-priority intake/check-ins
* open attention-priority threads
* profile restrictions that conflict with an assigned plan

Endpoint:

```text
GET /v1/coach/attention?from=&to=&module=&signal=&client_id=
```

Response shape:

```json
{
  "data": [
    {
      "client": {"id": "client-id", "first_name": "Ava", "last_name": "Rao"},
      "signals": [
        {
          "module": "nutrition",
          "signal": "missed_logs",
          "severity": "attention",
          "date": "2026-06-20",
          "summary": "Missed 2 planned meals",
          "thread_id": null
        }
      ]
    }
  ]
}
```

When a coach starts a discussion from an attention signal, create or link a thread. The signal can then include `thread_id`.

## Out of scope

* Plan profile snapshots
* Separate nutrition/training profile roots
* Approval queues for profile updates
* Hard intake blocking
* Multi-week nutrition cycles
* Daily nutrition target overrides
* Micronutrients
* Nested recipes
* Recipe ingredient CRUD endpoints
* Realtime chat
* Thread read receipts/reactions/participants
* Stored alert rows
* Automated recurring check-in assignment
