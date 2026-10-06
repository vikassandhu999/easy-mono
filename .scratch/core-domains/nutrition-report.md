Nutrition currently consists of **six tables**, a live food/recipe library, a whole-document Menu inside each plan, and frozen guidance plus actual intake inside each diary slot. Historical comparison is reliable for guidance that was captured when a slot started; it is incomplete for dates or slots that were never recorded.

This is a read-only source audit of the current checkout, including all migrations, nutrition schemas and contexts, typed APIs, and the maintained coachapp/clientapp. No files were changed. I did not run tests or inspect an installed database. Graph tools were unavailable, so graph freshness and index coverage could not be checked. Database details below describe the migrations; explicitly labelled implications are deductions from the code.

The vocabulary is already deliberate: a **Day Pattern** contains **Slots**; a Slot offers ordered Meals; a **Diary Slot** freezes those choices and records intake. “Day type” and “meal option” are not separate persisted entities. [CONTEXT.md:79](/Users/vikassandhu/Desktop/10x/easy-mono/CONTEXT.md:79)

The complete persistence inventory follows. Types use migration/Ecto terminology. `?` means database-nullable. Unless stated otherwise, there is no database default. Every nutrition table has an Ecto-generated UUID primary key, without a migration-declared database UUID default. All except recipe ingredients have non-null UTC `inserted_at` and `updated_at`.

**`nutrition_foods` maps to `Easy.Nutrition.Food`.** Its fields, constraints and indexes are defined in the [nutrition migration:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:5); its Ecto shape begins at [food.ex:39](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/food.ex:39).

| Field | Database type | Nullability/default |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id` | UUID | Nullable |
| `name` | string | Required |
| `brand`, `source`, `category` | string | Nullable |
| `calories_per_100g` | float | Nullable |
| `protein_g_per_100g` | float | Nullable |
| `carbs_g_per_100g` | float | Nullable |
| `fat_g_per_100g` | float | Nullable |
| `fiber_g_per_100g` | float | Nullable |
| `sugar_g_per_100g` | float | Nullable |
| `serving_sizes` | array of maps | Nullable; default `[]` |
| `allergens`, `dietary_tags` | array of strings | Nullable; default `[]` |
| `notes` | text | Nullable |
| `creator_id`, `media_id` | UUID | Nullable |
| `revision` | integer | Required; default `1` |
| `search_vector` | stored generated `tsvector` | Generated from `to_tsvector('simple', coalesce(name, ''))`; no explicit NOT NULL |
| `inserted_at`, `updated_at` | UTC datetime | Required |

Relationships:

- `business_id → businesses.id`, default delete action.
- `creator_id → coaches.id`, `ON DELETE SET NULL`.
- `media_id → library_media.id`, `ON DELETE SET NULL`.
- Serving sizes are embedded values, not rows.

Database checks require each of the six nutrient values to be null or nonnegative, and `revision > 0`. Indexes are the primary key; `(business_id)`; `(business_id, inserted_at, id)`; nonunique `(business_id, lower(name))`; `(media_id)`; and GIN on `search_vector`.

Ecto adds `source: system | custom`, requires a name, validates nutrient nonnegativity and allowed tags, and requires business/creator when creating a custom food. It forces custom source and stamps identities rather than accepting them from input. The database itself does not enforce the source enum or custom-food ownership requirements. `search_vector` is not an Ecto field. [food.ex:92](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/food.ex:92)

`Easy.Nutrition.ServingSize` is an embedded schema without an ID:

| Field | Ecto type | Application validation |
|---|---|---|
| `label` | string | Required |
| `amount` | float | Required; positive |
| `unit` | string | Required |
| `weight_g` | float | Required; positive |
| `is_default` | boolean | Default `false` |

A food may have no serving definitions. Otherwise, exactly one must be default. The database does not validate serving elements, their uniqueness, or the default count. Serving replacement uses `on_replace: :delete`. [serving_size.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/serving_size.ex:8), [food.ex:144](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/food.ex:144)

Allowed allergens are `dairy`, `egg`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `wheat`, `soy`, `sesame`. Dietary tags are `vegan`, `vegetarian`, `halal`, `kosher`, `gluten_free`, `dairy_free`, `low_fodmap`, `keto`, `high_protein`. These are application validations, not database enums. Category remains free text. [nutrition_tags.ex:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_tags.ex:1), [food.ex:176](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/food.ex:176)

**`nutrition_recipes` maps to `Easy.Nutrition.Recipe`.** [Nutrition migration:60](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:60), [recipe.ex:27](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe.ex:27)

| Field | Database type | Nullability/default |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id`, `creator_id` | UUID | Nullable |
| `name` | string | Required |
| `description`, `instructions` | text | Nullable |
| `servings_count` | integer | Required |
| `cooked_weight_g` | float | Nullable |
| `allergens`, `dietary_tags` | array of strings | Nullable; default `[]` |
| `revision` | integer | Required; default `1` |
| `inserted_at`, `updated_at` | UTC datetime | Required |

Relationships are business → businesses with default delete action, creator → **coaches** with `SET NULL`, and `has_many :recipe_ingredients`.

Database checks require positive servings, positive revision, and null-or-positive cooked weight. Indexes are the primary key, `(business_id)`, and `(business_id, inserted_at, id)`.

Ecto requires business/name/servings, trims the name and limits it to 255 characters, validates tags, and replaces ingredients with `on_replace: :delete`. An empty ingredient collection is permitted. Nutrients are calculated from ingredients; no nutrient columns, recipe media field, or recipe snapshot table exists. [recipe.ex:66](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe.ex:66)

**`nutrition_recipe_ingredients` maps to `Easy.Nutrition.RecipeIngredient`.** [Nutrition migration:91](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:91), [recipe_ingredient.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe_ingredient.ex:14)

| Field | Database type | Nullability/default |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id` | UUID | Required |
| `recipe_id` | UUID | Required |
| `food_id` | UUID | Required |
| `position` | integer | Required; default `0` |
| `portion` | map | Required |

There are no timestamps or revisions.

Relationships are business → businesses `CASCADE`, recipe → recipes `CASCADE`, and food → foods `RESTRICT`. These are single-column FKs: matching ingredient/recipe businesses and permitted food visibility are application concerns, not composite tenant constraints.

Indexes are the primary key, `(business_id)`, `(recipe_id)`, and unique `(recipe_id, position)`. Checks require nonnegative position and a valid positive gram/serving JSON portion. The portion check ends in `IS TRUE`, so missing required JSON values cannot pass through SQL’s null semantics; extra JSON keys are not prohibited.

Ingredients reference **foods only**. Their public input contains `food_id` and `portion`; collection order supplies position. The public output omits the ingredient row ID. [recipe_ingredient.ex:58](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe_ingredient.ex:58), [types/nutrition/recipe.ex:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/recipe.ex:1)

The shared `Easy.Nutrition.Portion` is a custom Ecto map type, not a table or embedded schema:

```text
Gram:
  kind: "gram"
  grams: positive number

Serving:
  kind: "serving"
  amount: positive number
  unit: nonempty string
  label: string | null
  grams: positive number | null
```

Numbers are normalized to floats. There is no unit enum, density model or general conversion engine. Public serving JSON deliberately omits the internally stored `grams`. [nutrition_portion.ex:4](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_portion.ex:4)

Food servings resolve by exact `(unit, label)`:

```text
resolved grams = requested amount / serving-definition amount × weight_g
```

A food defaults to its marked serving, otherwise 100 g; gram portions are always available. Recipes default to one `"serving"` with a null label. Recipe servings work without cooked weight; gram portions require cooked weight. [nutrition_portions.ex:4](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_portions.ex:4)

**`nutrition_plans` maps to `Easy.Nutrition.Plan` and holds both templates and client plans.** [Nutrition migration:135](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:135), [plan.ex:38](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:38)

| Field | Database type | Nullability/default |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id` | UUID | Required |
| `name`, `kind` | string | Required |
| `description` | text | Nullable |
| `start_date`, `end_date` | date | Nullable |
| `target_calories` | float | Nullable |
| `target_protein_g` | float | Nullable |
| `target_carbs_g` | float | Nullable |
| `target_fat_g` | float | Nullable |
| `target_fiber_g` | float | Nullable |
| `creator_id`, `client_id`, `source_template_id` | UUID | Nullable |
| `revision` | integer | Required; default `1` |
| `archived_at` | UTC datetime | Nullable |
| `menu` | map | Required; no DB default |
| `inserted_at`, `updated_at` | UTC datetime | Required |

Relationships:

- Business → businesses, `CASCADE`.
- Creator → **users**, `SET NULL`; this differs from food/recipe creator IDs.
- `(client_id, business_id) → clients(id, business_id)`, `CASCADE`.
- `(source_template_id, business_id) → nutrition_plans(id, business_id)`, setting only `source_template_id` null on deletion.

Checks enforce:

- `kind` is `template` or `client_plan`.
- Templates have no client, source template, start date or end date; client plans require a client.
- Menu is an object with `meals` array, `day_patterns` array and `schedule` object.
- Start ≤ end when both dates exist.
- Revision > 0.
- Each target is null or nonnegative.

Indexes:

- Primary key.
- `(business_id, client_id, start_date, end_date)`, partial for unarchived dated client plans.
- `(business_id, client_id)`.
- `(business_id)`.
- `(business_id, kind, archived_at)`.
- `(business_id, kind, inserted_at, id)`.
- Unique `(id, business_id)`.
- GIN on `menu`.
- Unique `(business_id, client_id)`, partial for unarchived client plans without a start date.

The last index allows at most one incomplete client plan. There is **no database exclusion constraint for overlapping dated plans**. The source-template FK also does not enforce that its target actually has `kind=template`; the application does. [Nutrition migration:169](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:169)

Ecto requires/stamps the creator during template creation, trims and requires the name, limits name to 255 and description to 5,000 characters, validates targets and dates, and increments revisions on mutations. Its virtual fields are:

- `lifecycle`: `active | incomplete | waiting | upcoming | current | ended | archived`.
- `assigned_client_count`: integer, default 0.

These are not database columns. [plan.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:14), [plan.ex:86](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:86)

The Menu contains four embedded schemas and no additional tables:

| Embedded schema | Persisted fields | Validation and identity |
|---|---|---|
| `Menu` | `meals[]`, `day_patterns[]`, `schedule: map<string,string>` | No ID; patterns and schedule required |
| `Menu.Meal` | `id: UUID`, `name: string`, `notes: string?`, `meal_items[]` | Supplied ID; trimmed required name ≤255; notes ≤5,000 |
| `Menu.Item` | `id: UUID`, `food_id: UUID?`, `recipe_id: UUID?`, `portion: Portion` | Supplied ID; exactly one source; portion required |
| `Menu.DayPattern` | `id: UUID`, `name: string`, `slots[]` | Supplied ID; trimmed required name ≤255 |
| `Menu.Slot` | `meal_slot: enum`, `meal_ids: UUID[]` | No ID; at least one meal ID |

Menu item `name` and `nutrients` are **virtual**. A saved Menu stores references and portions, not frozen food names or nutrient values. Array order supplies ordering; there are no persisted position fields. [menu.ex:38](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:38), [menu/meal.ex:7](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu/meal.ex:7), [menu/item.ex:7](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu/item.ex:7), [menu/day_pattern.ex:7](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu/day_pattern.ex:7), [menu/slot.ex:7](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu/slot.ex:7)

Application topology validation requires:

- Unique IDs across every meal, item and pattern within one Menu.
- Unique meal slots within each pattern.
- Unique offered meal IDs within a slot, all referring to this Menu’s meals.
- Exactly seven schedule keys, Monday–Sunday, each referencing a pattern.
- Empty meals and patterns with no slots are allowed.

These nested rules and library references are not database constraints. A fresh Menu has no meals, one generated “Everyday” pattern with no slots, and every weekday mapped to it. [menu.ex:48](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:48)

The closed Meal Slot vocabulary is:

```text
early_morning, breakfast, mid_morning, lunch,
afternoon, evening, dinner, pre_sleep,
pre_workout, during_workout, post_workout
```

The workout group has no workout/session ID or event linkage. [nutrition_meal_slot.ex:2](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_meal_slot.ex:2)

**`nutrition_diary_days` maps to `Easy.Nutrition.DiaryDay`.** [Nutrition migration:233](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:233), [diary_day.ex:20](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_day.ex:20)

| Field | Database type | Nullability/default |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id`, `client_id` | UUID | Required |
| `local_date` | date | Required |
| `target_calories`, `target_protein_g`, `target_carbs_g`, `target_fat_g`, `target_fiber_g` | float | Nullable |
| `inserted_at`, `updated_at` | UTC datetime | Required |

Relationships are business → businesses `CASCADE`, composite `(client_id, business_id) → clients(id, business_id)` `CASCADE`, plus an additional plain client FK with `CASCADE`.

Indexes are the primary key, unique `(business_id, client_id, local_date)`, and unique `(id, business_id, client_id, local_date)`. Targets must be null or nonnegative.

This row stores frozen targets only. It has **no timezone, revision, plan ID, plan revision, source-template ID or coaching-term ID**.

**`nutrition_diary_slots` maps to `Easy.Nutrition.DiarySlot`.** [Nutrition migration:280](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:280), [diary_slot.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot.ex:14)

| Field | Database type | Nullability/default |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id`, `client_id`, `nutrition_diary_day_id` | UUID | Required |
| `local_date` | date | Required |
| `meal_slot`, `applied_timezone` | string | Required |
| `has_coverage` | boolean | Required |
| `revision` | integer | Required; DB default `1` |
| `document` | map | Required |
| `shared_at` | UTC datetime | Nullable |
| `note_to_coach` | text | Nullable |
| `inserted_at`, `updated_at` | UTC datetime | Required |

`shared_at` and `note_to_coach` were added by the later [activity-publication migration:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922164000_activity_publication.exs:5).

Relationships:

- Business → businesses, `CASCADE`.
- `(client_id, business_id) → clients(id, business_id)`, `CASCADE`.
- `(nutrition_diary_day_id, business_id, client_id, local_date) → nutrition_diary_days(id, business_id, client_id, local_date)`, `CASCADE`.

Indexes are the primary key, unique `(id, client_id, business_id)`, and unique `(business_id, client_id, local_date, meal_slot)`.

Checks enforce the eleven meal slots, positive persisted revision, and a document object containing `meal_id`, `options[]` and `entries[]`, with meal ID a string or null. They do not validate the nested snapshots.

Ecto uses revision **0** for an unpersisted/live slot and increments it on save. Applied timezone is required but this schema does not validate an IANA timezone name. There is no stored plan/term relationship: `has_coverage` is only a frozen boolean. [diary_slot.ex:19](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot.ex:19)

The diary document has four embedded schemas:

| Embedded schema | Persisted fields | Validation |
|---|---|---|
| `DiarySlot.Document` | `meal_id: UUID?`, `options[]`, `entries[]` | No own ID; selection must be offered, or null when no options |
| `DiarySlot.Option` | `id: UUID`, `name: string`, `items[]` | Supplied original meal ID; ID/name required |
| `DiarySlot.Item` | `id: UUID`, `name: string`, `food_id: UUID?`, `recipe_id: UUID?`, `portion`, `nutrients` | Supplied original menu-item ID; required snapshot values; exactly one source |
| `DiarySlot.Entry` | Same snapshot fields as Item, plus `planned_item_ref: UUID?`, `notes: string?` | Slot-local supplied ID; notes ≤255 |

Used planned references must belong to one of the frozen options and cannot repeat. Request validation additionally rejects duplicate meal slots and duplicate entry IDs within a slot. Arrays preserve order. Frozen source UUIDs are JSON values, with no FK or deletion cascade. [document.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:14), [option.ex:6](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/option.ex:6), [item.ex:6](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/item.ex:6), [entry.ex:7](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/entry.ex:7), [nutrition_diary_input.ex:25](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_input.ex:25)

There are no per-entry timestamps, revisions, actors, attachment IDs or library revision numbers. Meal notes, food media, allergens, recipe instructions and ingredient breakdowns are not captured in these snapshots. `Document.from_meals/1` copies meal identity/name and the ordered item snapshots only. [document.ex:20](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:20)

`Easy.Nutrition.NutrientTotals` is another custom Ecto map type:

```text
Persisted:
  calories: number | null
  protein: number | null
  carbohydrates: number | null
  fat: number | null
  fiber: number | null

Derived in memory/API:
  complete: boolean
```

All five keys must exist and values must be null or nonnegative. `complete` means all five are numeric; it is removed when persisted. A missing nutrient propagates null for that nutrient through sums. An empty collection has unknown totals, not zero totals. Display formatting rounds to one decimal. Sugar is excluded from these totals despite being stored on foods. [nutrition_nutrient_totals.ex:6](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_nutrient_totals.ex:6), [nutrition_nutrient_totals.ex:78](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_nutrient_totals.ex:78), [nutrition_nutrient_totals.ex:116](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_nutrient_totals.ex:116)

Food media uses shared infrastructure rather than another nutrition table:

| Shared table/schema | Fields | Constraints and indexes relevant here |
|---|---|---|
| `library_media` / `Easy.LibraryMedia.Media` | UUID PK; nullable `business_id`, `uploaded_by_type`, `uploaded_by_id`, `storage_key`, `content_type`, `byte_size: bigint`, `external_url: text`; required UTC timestamps | Business FK `CASCADE`; business index; unique storage key. Source check requires either a system HTTP(S) external URL or a stored upload with business/content type/positive size. Polymorphic uploader has no FK. |
| `attachments` / `Easy.Attachments.Attachment` | UUID PK; required UUID business/client/uploader; required uploader type/storage key/content type; required bigint byte size; nullable integer duration; required UTC timestamps | Business and composite client/business FKs `CASCADE`; unique `(id,business_id)` and storage key; uploader type coach/client/system; duration null or 1–300000 ms. |
| `chat_message_attachments` | UUID PK; required business/message/attachment UUIDs, integer position and UTC inserted time; no updated time | Business and composite message/business and attachment/business FKs `CASCADE`; index `(business_id,chat_message_id)`; unique `(chat_message_id,attachment_id)` and `(chat_message_id,position)`. |

Definitions are in the [media migration:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000200_create_media.exs:5), [media migration:42](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000200_create_media.exs:42), and [conversation migration:124](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000500_create_conversations.exs:124).

Food library uploads accept JPEG/PNG/WebP images up to 15 MiB and MP4/WebM videos up to 50 MiB. The separate client attachment schema accepts image/video/audio, **not PDF**, with 15/50/10 MiB limits. No attachment relation exists on a recipe, Menu or diary entry. This matters when comparing the current infrastructure with the future Tracker report requirement. [library_media/media.ex:10](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media/media.ex:10), [attachments/attachment.ex:15](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:15), [check-ins spec:85](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:85)

The plan-to-diary lifecycle works as follows.

1. **Create a reusable template.** Creation stamps template kind and an empty Everyday Menu. Targets can exist without meals. `incomplete` later means a client plan lacks a start date; it does not mean its nutritional content is incomplete. A dated empty Menu can therefore supply Coverage. [plan.ex:74](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:74)

2. **Assign an active template.** Assignment creates a new client-owned plan at revision 1, copying metadata, all targets and the whole Menu. Menu-local meal/item/pattern UUIDs are retained. It records `source_template_id`; deleting the template clears that link without deleting the copy. Assignment and template duplication require an active template. The audited public context has no direct blank-client-plan creation or client-plan-to-client-plan copy operation. [plan.ex:96](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:96), [nutrition_plan_copy.ex:38](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_plan_copy.ex:38)

3. **Resolve Coverage for a local date.** The plan must be unarchived, have a start date and include that date. A coaching term must also include it. Finally, no coaching term may have ended on or after the plan’s creation-local-date but before the requested date. Dates are inclusive. Creation is interpreted using the client’s current timezone, with business fallback. [plan.ex:224](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:224), [plan_coverage.ex:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:5)

4. **Choose the weekday’s Day Pattern.** The date’s actual weekday selects its schedule entry, which selects a pattern. Each pattern slot supplies ordered meal IDs; the first meal is the default. This is a repeating week, not a rotation measured from plan start. A meal can be reused in different patterns or slots. [menu.ex:119](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:119)

5. **Read live guidance.** For today/future dates, Menu items resolve against the current food/recipe library. Merely reading does not save diary rows. Future guidance is readable but write-ineligible. Past dates deliberately do not reconstruct guidance from mutable plans. [nutrition_plan_reader.ex:313](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_plan_reader.ex:313), [nutrition_diary_day_assembler.ex:112](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:112)

6. **Start a slot on its first server save.** Today’s coverage and offered meals are frozen. All alternatives and their planned items are copied, not only the chosen meal. The day’s targets are inserted once, on the first saved slot. Further slots reuse those targets. A first recording for a past date gets no reconstructed options or targets. [nutrition_diary.ex:141](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:141), [nutrition_diary.ex:184](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:184)

7. **Save actual intake.** The client sends complete entry arrays for the supplied slots, with expected revisions. Existing slots are locked; a multi-slot save runs in one repeatable-read transaction. Invalid entries or stale revisions roll back the operation. Omitted entries disappear; omitted slots are untouched. Removing every entry retains the slot and its frozen guidance. [nutrition_diary.ex:52](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:52), [repo.ex:18](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/repo.ex:18), [diary_logging_test.exs:38](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/nutrition/diary_logging_test.exs:38)

8. **Share or correct.** Sharing sets the first `shared_at`; initial sharing requires actual intake. An optional note, max 4,000 characters, becomes a normal chat message with a frozen meal reference. Later correction preserves the original sharing time and earlier messages. Actual facts remain correctable without an age cutoff; future writes are prohibited, and selecting a different offered meal is restricted to the current local date. [nutrition_diary.ex:114](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:114), [nutrition_diary_correction_policy.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_correction_policy.ex:14), [chat_record_references.ex:44](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_references.ex:44)

The coaching-term rule uses **creation date, not start date**, to prevent revival. A plan prepared before acceptance can activate when coaching begins. A plan created during a term is permanently stopped after that term ends, even if its planned start was later. A plan created between terms can serve a returning client. No plan rows are rewritten when a term ends; `effective_end` and `stopped_on` are derived. [plan_coverage.ex:42](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:42), [coaching-terms spec:59](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/coaching-terms/spec.md:59)

Overlap validation locks the client and compares other plans of the same schema. Training and nutrition may overlap each other; two nutrition plans may not overlap. An important implementation detail is that overlap validation considers only **already-ended** terms when shortening periods. A future planned term end does not yet free a conflicting open-ended plan period. This last consequence is inferred from the implementation, not a scenario I executed. [plan_overlap.ex:20](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_overlap.ex:20)

Coaches can prepare plans for invited or ended clients. Client HTTP writes require a term covering **today**, while GETs remain allowed. The diary context itself checks identity, date and revision; the current-term write gate is in the HTTP plug. Consequently, a current client can record/correct past dates, including dates outside the current term. [nutrition_programming.ex:160](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_programming.ex:160), [require_coaching.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/plugs/require_coaching.ex:8), [nutrition_diary.ex:54](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:54)

Edits propagate differently depending on what changed:

| Edit | Effect |
|---|---|
| Template metadata/Menu | Changes that template only; existing client copies remain independent |
| Client-plan metadata/Menu | Immediately changes that client’s unstarted live guidance |
| Plan targets after the day’s first slot save | Changes future/unstarted-day targets; that date’s frozen targets remain |
| Food name, nutrient density or serving weight | Changes referencing live plans and recipes, including indirect food → recipe → Menu use |
| Recipe ingredients, serving count or cooked weight | Changes live guidance derived from that recipe |
| Any of the above after a diary slot started | Does not rewrite its frozen offered options or recorded nutrient basis |
| Archive plan | Prevents authoring and removes Coverage; does not freeze its library-resolved display values |
| Delete client plan/template | Preserves diary records and snapshots |

The explicit library test changes a recipe item from 30 to 100 kcal while the plan revision remains unchanged. Archived plans also resolve through the current library. [library_recipe_test.exs:104](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/nutrition/library_recipe_test.exs:104), [nutrition_plan_reader.ex:313](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_plan_reader.ex:313), [diary_reads_test.exs:343](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/nutrition/diary_reads_test.exs:343)

Library deletion is blocked by structural use in any Menu or recipe, including archived plans and unused meals within a Menu. A referenced food serving’s `(unit,label)` cannot be removed or renamed, although its amount/weight may change. Cooked recipe weight cannot be cleared while a Menu uses a gram portion. Diary-only references do not block deletion: frozen values survive, while unavailable live links are hidden in the response. [nutrition_food_writer.ex:63](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_food_writer.ex:63), [nutrition_recipe_writer.ex:70](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_recipe_writer.ex:70), [nutrition_day.ex:133](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_day.ex:133)

What a plan can express is narrower than the breadth of the library fields:

| Capability | Supported shape |
|---|---|
| Daily targets | Independent nullable calories, protein, carbs, fat and fiber targets; zero valid |
| Macro-only coaching | A dated plan with targets and an empty Menu is valid |
| Different eating patterns | Named patterns mapped to weekdays |
| Exact meals | One offered meal in a slot |
| Meal alternatives | Multiple ordered meals; first is default |
| Food substitution while logging | Actual entry can reference another food/recipe while retaining its planned-item association |
| Quantities | Positive grams or named servings with defined food gram weights |
| Recipes | Ordered food ingredients, whole-recipe quantities, integer yield, optional cooked weight, description/instructions |
| Guidance text | Plan description and meal notes; food notes and recipe instructions in the library |
| Allergens/dietary labels | Fixed tag vocabularies, manually authored |
| Food media | One live library image/video reference |
| Unplanned intake | Extra food/recipe entries, including when no plan covers the date |

Targets have no consistency rule requiring calories to equal macro-derived calories or Menu totals. Patterns and meals have no target fields. Recipe nutrients are calculated from ingredients, and tags do not automatically derive from ingredients. [plan.ex:21](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:21), [recipe.ex:27](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe.ex:27), [nutrition_item_resolver.ex:105](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_item_resolver.ex:105), [recipe-editor.tsx:276](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/recipes/recipe-editor.tsx:276)

The following are **not expressible in the audited nutrition schemas/API**; these are bounded absence conclusions from the field and contract inventory above:

- Per-Day-Pattern, per-meal or arbitrary-date targets within one plan; target ranges, percentages, minimum/maximum bands or weight-based formulas.
- Micronutrient values or targets. Sugar exists on foods but is absent from recipe, Menu and diary totals.
- A hydration target, fluid-volume diary, water-specific completion record or hydration schedule.
- A dedicated supplement prescription with dosage, frequency, duration or adherence. A supplement can only be represented as a generic food/category with ordinary portions.
- Custom meal-slot names, exact times, multiple separately identified meal occurrences in the same date/slot, or linkage of pre/post-workout meals to a particular workout.
- Date exceptions, multiweek rotations, or scheduled future edits to one plan’s content. Separate date-covered plans are possible.
- Nested recipes, recipe steps as structured rows, automatic allergen aggregation, or direct recipe media.
- Prescribed notes on individual Menu items or Day Patterns.
- Free-text/custom-macro diary items without a food/recipe source, meal photographs, PDFs or report attachments.
- A full prescription/version history, per-entry change history, or complete dated expectations for every day.
- Coach-recorded meal intake through the nutrition write API.

The relevant constraints are visible in the [Menu schemas](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:38), [recipe ingredient input](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe_ingredient.ex:58), [diary entry input](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/day.ex:112), and [client-only diary save](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:52).

For the diary, “prescribed versus recorded” has several distinct meanings.

| Question | Available evidence |
|---|---|
| Which meals were offered when recording began? | All frozen offered options in that slot |
| Which option was chosen? | `document.meal_id` |
| What was prescribed in that option? | Ordered frozen item IDs, source IDs, names, portions and nutrient values |
| What was actually recorded? | Entries with their own IDs, actual sources, portions, nutrients and notes |
| Which planned item did an entry fulfil/replace? | Nullable `planned_item_ref` |
| What was extra intake? | Entries without a current selected-option match; stored association may belong to another frozen option |
| What was the day’s target? | The target values frozen by the first saved slot |
| Which plan/revision/pattern supplied that history? | Not persisted; IDs/provenance are incomplete |
| What did the client record before a correction? | No revision history; the current document replaces earlier actual values |

When correcting the same source, the resolver scales **frozen** nutrients rather than recalculating them from today’s library. Same-serving changes use the saved serving basis. Switching to another portion identity can require a live conversion, but the resulting ratio still scales frozen nutrient values. Replacing the source uses the current replacement food/recipe. [nutrition_diary_entry_resolver.ex:34](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_entry_resolver.ex:34)

The server can switch among frozen alternatives today without deleting submitted actual intake. Entries associated with another option appear as extras until that option is selected again. The current client UI behaves more narrowly: its option-change helper retains unassociated extras and rebuilds the planned rows, so the whole-document submission can remove intake associated with the previous option. This distinction follows from the backend document behavior and frontend draft transformation. [document.ex:59](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:59), [diary_options_test.exs:6](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/nutrition/diary_options_test.exs:6), [meal-draft.ts:74](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/meal-draft.ts:74)

The response derives these statuses rather than storing them:

- `as_planned`: actual and planned source IDs match, **regardless of quantity**.
- `swapped`: a matched planned item has a different actual source.
- `pending`: planned item has no entry on a current/future date.
- `skipped`: planned item has no entry on a past date.
- `added`: extra intake in a slot with coverage.
- `recorded`: intake in a slot without coverage.

It also calculates a calorie `adherence` band: below 90% is `under`, above 110% is `over`, otherwise `on`; no entries gives `none`, and unknown calories or a nonpositive target gives null. [nutrition_diary_slot_view.ex:31](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_slot_view.ex:31), [nutrition_day.ex:93](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_day.ex:93)

Therefore the answer to historical comparison is **partly yes**:

| Historical situation | Can “recorded against expected” be calculated after plan edits? |
|---|---|
| Slot started on its actual date | Yes, against its frozen offered/selected meal and item quantities |
| Day had at least one slot started on its actual date | Yes, against its frozen day targets |
| Other slots on that date were never started | No preserved expectations for those slots |
| Entire past date was never recorded | No preserved targets, pattern, meals or items |
| First recording was backdated | Actual intake exists, but no reconstructed prescription or target is frozen |
| Same-day plan/library changes between slot starts | Each slot retains the guidance at its own start; day targets retain the first save’s values |
| Original plan/library later deleted | Captured values survive; live source links may disappear |

Past reads return only frozen diary evidence. Public `plan_id` comes from live guidance, so it is null for past dates even when their recorded slots originally came from a plan. This prevents misleading reconstruction, but it also prevents complete retrospective expected-day denominators. [nutrition_diary_day_assembler.ex:112](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:112), [nutrition_diary_day_assembler.ex:138](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:138), [diary_logging_test.exs:173](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/nutrition/diary_logging_test.exs:173)

The public contract exposes projections of these documents:

| API family | Important shape/dependency |
|---|---|
| Food | Raw per-100g fields, calculated five-nutrient object, serving sizes, default/available portions, tags, media and revision |
| Recipe | Whole-recipe nutrients, servings/cooked weight, ingredients with nested food, default/available portions and revision |
| Plan | Kind, derived lifecycle, five targets, dates, `stopped_on`, source/client IDs and entire Menu; `archived_at` is not returned |
| Coverage | `{date, current, upcoming[]}`; incomplete/waiting plans are found through plan lists |
| Nutrition Day | Date, derived plan ID, timezone, write eligibility, targets, summary and slots |
| Day slot | ID/revision/publication fields, selected meal, planned/logged calories, offered options and merged rows |
| Diary save | Complete entries for each supplied slot; identities, references, portions and notes; no client-supplied nutrient values |
| Library usage | Separate recipes/templates/client-plan counts and pages, plus deletion-block reason |

These contracts are in [types/nutrition/food.ex:63](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/food.ex:63), [types/nutrition/recipe.ex:40](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/recipe.ex:40), [types/nutrition_plan.ex:113](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition_plan.ex:113), [types/nutrition/day.ex:57](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/day.ex:57), and [types/nutrition/library_usage.ex:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/library_usage.ex:1).

Several structural awkwardnesses matter before redesign.

- **Independent plans still have mutable nutritional meaning.** Template/client copies are independent documents, but their library references remain shared. Food/recipe edits change guidance without updating plan revision or timestamps. A process watching plan revisions alone would miss those changes. This consequence is supported by the explicit unchanged-revision test. [library_recipe_test.exs:104](/Users/vikassandhu/Desktop/10x/easy-mono/backend/test/easy/nutrition/library_recipe_test.exs:104)
- **Snapshot coverage is uneven.** Targets freeze per day, guidance freezes per slot, and corrections replace actual entries. A date can combine different guidance versions without storing which plan/library versions supplied them. This is an inference from the capture boundaries and absent provenance fields.
- **The model’s labels exceed its evidence.** `skipped` conflicts with the glossary’s statement that “Not recorded” is not evidence of a skipped meal. `as_planned` ignores quantity. The calorie adherence band also predates a check-ins spec that excludes calculated adherence scores and initially asks for calorie comparison only. Coach history mitigates one issue by displaying `skipped` as “Not recorded.” [CONTEXT.md:24](/Users/vikassandhu/Desktop/10x/easy-mono/CONTEXT.md:24), [check-ins spec:117](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:117), [nutrition-day.tsx:10](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-history/nutrition-day.tsx:10)
- **Menu and diary internals rely on application guarantees.** Their database checks validate outer JSON shapes; nested uniqueness, source references and portions are enforced by changesets/context code. Recipe ingredients, by contrast, have relational positions/FKs and a detailed database portion check.
- **Serving identity is textual.** `(unit,label)` acts as a reference key, so changing wording is structurally significant while changing the serving’s weight is allowed. There are no stable serving IDs. [nutrition_food_writer.ex:63](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_food_writer.ex:63)
- **Food usage reports are not transitive.** Plans using a food through a recipe are not included in that food’s direct plan-use list; recipe usage is a separate result. Deletion protection also examines plans the current coach may not be permitted to view. [nutrition_library_usage.ex:58](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_library_usage.ex:58), [nutrition/plan.ex:271](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:271)
- **Unknown nutrition has inconsistent ingestion semantics.** Runtime totals preserve unknown as null. The CSV food seed converts missing/non-numeric macro values to `0.0`, drops the external row ID and generates internal IDs. Its import therefore cannot distinguish missing source values from known zero values. [food_seeds.exs:58](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds/food_seeds.exs:58), [food_seeds.exs:124](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds/food_seeds.exs:124)
- **Publication is layered onto slot storage.** `shared_at` and note-to-coach are later additions. Saving without sharing is supported by the backend, but coach day assembly does not filter out unshared saved slots. Sharing primarily establishes publication/chat-reference behavior; it is not a separate private-record table. [nutrition_diary.ex:114](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:114), [nutrition_diary_day_assembler.ex:162](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:162)
- **Authorship identifiers differ.** Foods/recipes point to coaches; plans point to users; individual diary entries have no actor field. This is relevant if coach recording or unified audit history is introduced.
- **Constraint translation is incomplete.** For example, the plan changeset registers a default client FK name while the migration names the composite FK `nutrition_plans_client_business_id_fkey`; it also does not register the Menu-shape check. This is a source-observed boundary mismatch, not a runtime failure demonstrated here. [plan.ex:178](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:178)

The structural parallels with training are concrete, but the storage models differ:

| Concern | Nutrition | Training |
|---|---|---|
| Reusable prescription → client copy | Template → independent client plan | Same ownership/lifecycle pattern |
| Coverage | Shared `PlanCoverage` and `PlanOverlap` | Same modules |
| Prescription storage | Embedded Menu document | Relational workouts/prescribed exercises/schedule, embedded sets |
| Copy identity | Preserves document-local IDs | Generates new relational IDs and remaps schedule references |
| Weekly grouping | Every weekday selects a pattern, which supplies slots and meals | Each weekday has at most one workout; absent means rest |
| Item quantity | Portion on food/recipe item | Ordered prescribed sets on an exercise |
| Historical boundary | Frozen guidance on first diary-slot save | Captured prescription when a training session begins |
| Eligibility versus schedule | Choice among meals offered for the resolved pattern/slot | Can begin any workout in the covering plan, regardless of scheduled weekday |

Training’s copy implementation and schedule rules are at [training_plan_copy.ex:114](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:114), [prescribed_exercise.ex:15](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/prescribed_exercise.ex:15), [workout_schedule.ex:42](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/workout_schedule.ex:42), and [training_plan_reader.ex:141](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_reader.ex:141). There is no duplicated template-table/client-table pair within nutrition; duplication is the copied prescription content and parallel implementation across domains.

The maintained app dependencies are substantial.

| Coachapp area | Dependency on current model |
|---|---|
| Template/client builder | Whole Menu plus separately edited targets; menu-local UUIDs; fixed slots; seven-day pattern schedule |
| Menu editor | Adds meals/options/items; reuses meal IDs; duplicates a day variation by cloning pattern, meals and items with new IDs |
| Ordering UI | Alternative order determines the default; meal-slot order is fixed |
| Save workflow | Saves metadata/targets first, then PUTs the Menu using the resulting revision |
| Assignment | Selects active template, previews it, sends template revision and coverage dates; UI requires a start date |
| Food/recipe editors | Raw per-100g food fields, named serving definitions, food-only ingredients, whole-recipe yield |
| History | Reads projected Day/slots/rows and renders recorded versus planned values; read-only |
| Management | Lifecycle, current/upcoming Coverage, source-template IDs, archive/restore/delete |

The main source boundaries are [nutrition-plan-worksheet.tsx:227](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-plans/nutrition-plan-worksheet.tsx:227), [menu-editor.tsx:87](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-plans/menu-editor.tsx:87), [arrange-menu.tsx:165](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-plans/arrange-menu.tsx:165), [assign-nutrition-plan.tsx:175](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/clients/assign-nutrition-plan.tsx:175), [api/nutrition-plans.ts:38](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/api/nutrition-plans.ts:38), and [nutrition-history/nutrition-day.tsx:110](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-history/nutrition-day.tsx:110).

The builder’s two saves are not one transaction. It explicitly warns that targets may already be saved if Menu saving fails. This is an existing partial-save state that a redesign must account for. [nutrition-plan-worksheet.tsx:281](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-plans/nutrition-plan-worksheet.tsx:281)

Clientapp depends on the Day projection rather than manipulating plan structure:

| Clientapp area | Dependency on current model |
|---|---|
| Day screen | Server totals/targets/timezone, fixed slot vocabulary, nullable plan ID and write eligibility |
| Meal editor | Separate entry IDs and planned references; offered options; complete-slot replacement |
| Intake selection | Planned-only rows initially excluded; “Record all” explicitly includes them |
| Quantity editor | Changes amount in the existing portion; source/portion-type selection comes through library picker |
| Extra intake | Generates a new entry ID with null planned reference |
| Corrections | Current slot revision, persistent slot ID, original shared time |
| Durable drafts | Account/date/slot keys and exact outgoing request persisted on device |
| Recovery | Rereads server after ambiguous results; checks expected revision + 1 and matching entries; offers draft-versus-server review |
| Sharing | Every maintained meal-editor submission sets `share: true`; ordinary unsent edits remain local |
| Ended coaching | Saved read view; recording controls disabled |

Sources are [nutrition.tsx:225](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/nutrition.tsx:225), [meal-draft.ts:48](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/meal-draft.ts:48), [meal-draft.ts:97](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/meal-draft.ts:97), [meal.tsx:179](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/meal.tsx:179), [api/nutrition.ts:81](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/nutrition.ts:81), and [use-meal-draft.ts:4](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/use-meal-draft.ts:4).

Additional app constraints:

- Coach-authored meal notes appear on the client’s direct plan screen, but not in diary offered guidance. Actual entry notes are displayed in the meal editor; the editable commentary field is slot-level note-to-coach. [nutrition.tsx:485](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/nutrition.tsx:485), [meal.tsx:602](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/meal.tsx:602)
- Both maintained history hooks query one date at a time. The backend supports inclusive ranges up to 31 dates, but these screens do not expose range summaries or a “changed since review” feed. Slot `updated_at` exists in storage but is not part of the Day-slot response. [coach api/nutrition-days.ts:13](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/api/nutrition-days.ts:13), [client api/nutrition.ts:31](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/nutrition.ts:31), [nutrition_diary_day_assembler.ex:99](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_day_assembler.ex:99)
- There is a source-derived picker display problem: client `LibraryItem` labels raw `item.nutrients` “For [default portion]”. Foods return per-100g nutrients; recipes return whole-recipe nutrients. Defaults may instead be a named food serving or one recipe serving. Actual intake resolution scales correctly, but that picker label/value combination can be wrong. This was not browser-tested. [library.tsx:149](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/nutrition/library.tsx:149), [types/nutrition/food.ex:152](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/food.ex:152), [types/nutrition/recipe.ex:112](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/nutrition/recipe.ex:112)
- Generated contracts in both apps directly encode Menu, Portion, Day, row statuses and the eleven slots. Shared nutrition/slot utilities also exist, but the bounded search found no imports of those helpers in either maintained app; local implementations are the active dependencies. [coach schema.ts:424](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/api/schema.ts:424), [client schema.ts:93](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/schema.ts:93), [shared nutrition.ts:58](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/packages/utils/src/nutrition.ts:58), [coach menu.ts:2](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/nutrition-plans/menu.ts:2)

The final observations are:

- The shared foundations with training are ownership, template copying, Coverage, revisions, weekly guidance and captured prescription. Those similarities are already real in the code.
- Nutrition’s historical gap is **uncaptured expectations**, not loss of already-frozen diary values.
- “Independent client plan” does not mean immutable prescription: live library values remain shared and mutable.
- Nutritional capability is five canonical nutrient totals, uniform daily targets, food-based recipes and fixed meal slots; hydration, supplements and micronutrients have no dedicated model.
- Trackers remain a separate client-level concept in the agreed spec. Nutrition has no Tracker association, and the proposed PDF/report flow exceeds the current attachment schema. [Check-ins spec:19](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:19)
- A redesign must include the generated contracts, builder’s two-stage save, client durable drafts/recovery, history projections and chat references—not only the six tables.