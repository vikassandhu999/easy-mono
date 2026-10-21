# Cronometer authenticated observations

Observed on 2026-10-12 in the web app. The supplied account has Pro and Gold surfaces. This file records browser observations, not a claimed database schema. No diary entry, profile change, recipe, meal, or custom food was saved.

## Access and evidence limits

The direct `cua_repl` browser connection reported `No browser is available`. The `chrome-devtools-axi` browser control supported login, navigation, UI actions, accessibility snapshots, and network inspection. Raw screenshot capture returned Access denied because the configured browser workspace roots exclude the requested output path. The CLI discarded this error and reported success. No authenticated screenshots were saved. The official images linked in [spec.md](spec.md) are separate visual references. The CLI truncates network response display at 2,000 characters. The root agent used the same browser bridge without the CLI text formatter and saved sanitized response schemas. The safe recipe editor accessibility tree is saved as [recipe-editor-accessibility.txt](evidence/recipe-editor-accessibility.txt).

## Account and navigation

- Login opened the Pro `Clients` page. It has `ADD CLIENT`, `BULK ADD CLIENTS`, `ADD CLIENT GROUP`, client search, and sorting by `First Name`. A pre-existing client had `Pending Verification`. No client record was changed.
- `Account` exposes Pro and a `Cronometer Gold` link. Gold opens the personal account without a purchase flow.
- Gold navigation: Dashboard, Diary, Trends, Foods, More, Plans, Support, About.
- Dashboard has Quick Add to Diary: `FOOD`, `EXERCISE`, `BIOMETRIC`, `NOTE`; also Crono Coach, fasting, streaks, energy history, weight goal overview, and sleep sections.
- Foods expands to `Custom Meals`, `Custom Recipes`, `Custom Foods`, `Repeat Items`, `Suggest Food`, `Ask the Oracle`, and `Search Foods`.

## Diary and food selection

Route: `/#diary`. Entry buttons are FOOD, EXERCISE, BIOMETRIC, NOTE, FAST. Empty groups are Uncategorized, Breakfast, Lunch, Dinner, Snacks, each with a collapse control. A calendar and Today control select the day. Nutrition has Energy Summary (Consumed, Expenditure, Remaining), macro targets, nutrient targets, scores, highlighted nutrients, detailed nutrient tables, and nutrient ratios.

The water panel has quick add controls, ADD CUSTOM, WATER SETTINGS, a drinking-water goal, and a separate Total Water target. Its text says water added here contributes to the total water nutrient target.

Verified path: Diary → FOOD → type `banana` → select `Banana, Fresh`.

- Search tabs: All, Favorites, Common Foods, Beverages, Supplements, Brands, Restaurants, Custom.
- Results have Description and Source. Observed sources include NCCDB, USDA, CRDB, FDC UPC, CFCD, CoFID, NUTTAB, CNF, IFCDB.
- Details show food name, protein/net carbs/fat, a count of listed nutrients, and Data Source. Selected NCCDB banana reports 87 listed nutrients.
- Logging fields: optional `Include time`, `Diary Group` (Uncategorized by default), `Amount`, `Measure`, and `ADD TO DIARY`.
- Default banana measure was medium (118 g). Thus the selected source food, quantity, serving measure, diary group, and time are separate user choices.
- Supplements are a food-search category, not a separate top-level diary action in this screen.
- Add was not submitted. Edit/copy/delete history behavior is untested.

## Custom recipe editor

Verified path: Foods → Custom Recipes → CREATE RECIPE. The list also has IMPORT RECIPE, search, and Most Recent sort. The editor says `Unsaved Recipe, Data Source: Custom`.

- Recipe Name, ADD INGREDIENTS, Serving Sizes, Notes, Advanced Info, Nutrition Label, Nutrition Overview.
- Serving Based: Serving Name and Servings per Recipe.
- Weight Based: Serving Name and Grams per Serving.
- Advanced Serving Sizes expands a table with quantity, Serving Name, and Grams per Serving. Built-in oz, g, and full recipe rows are visible; ADD SERVING SIZE adds another measure.
- Advanced Info shows Barcodes, Original Recipe Weight, Category, Tags, and Translations. Tags include Whole, Brand, Restaurant, Supplement, Seafood, Vegetarian, Vegan, Dairy, Nuts.
- Nutrition Overview has `Nutrients in` amount and measure, so display basis is selectable. The empty recipe uses full recipe.
- Nutrition tables show `Not Entered` and dashes for absent values. Do not treat missing nutrient data as confirmed zero.
- Serving-mode and advanced-option changes stayed in an unsaved draft. Saving, revision behavior, cooked-weight editing, sharing, and diary expansion remain untested at this point.

## Observed network surface

Only requests caused by normal UI actions were inspected. No arbitrary API writes were sent. Account identifiers below are placeholders.

| UI activity | Method and endpoint | Evidence |
|---|---|---|
| App load, diary and food detail | POST `/cronometer/app` | Many successful XHRs; captured request operations include `getFood` and `getTotalNutrients` |
| Personal target load | GET `/api/v3/user/{user_id}/targets` | 200; request 393 in browser session |
| Initial food picker | GET `/api/v3/user/{user_id}/food-search/string?query=&maxResults=50&sources=All&categoryId=0&selectedTab=ALL&type=All` | 200; request 480 |
| Search banana | GET `/api/v3/user/{user_id}/food-search/string?query=BANANA&maxResults=50&sources=All&categoryId=0&selectedTab=ALL&type=All` | 200; request 486 |
| Goal configuration | GET `/api/v3/goal-rate-options` | 200 during app load |

Food selection was followed by POST requests 489, 491, and 492 to `/cronometer/app`. Requests 489 and 491 name `getFood`. Report requests 631 and 635 name `getTotalNutrients`. Their old response bodies were unavailable when extracted; no RPC response model is claimed.

The root agent saved `evidence/network-models.json` and `evidence/live-response-schemas.txt`. The latter verifies complete read-only schemas for target and search responses:

- Targets return an array with `id`, `min`, `max`, `vis`, `custom`. Observed types are number, number, null, boolean, boolean. The UI separately verifies the meaning of target/maximum/visibility/custom; the payload alone does not prove an ID's namespace.
- Food search returns an array with identity/name/source, ranking and popularity fields, language/translation fields, category/type, retired flag, measure ID/display name, display string, and `meal`, `recipe`, `recipeOrMeal` booleans. Exact keys are in the schema artifact. This is direct evidence that one search result contract can represent food, recipe, and meal variants. It does not prove one database table.
- Profile/report navigation also made GET `/api/v3/user/{user_id}/pro/client/{client_id}/client-prefs`. Only its path was captured; no response model is claimed.

## Model conclusions supported by these screens

- Catalog items have a nutrition source and measures. A diary occurrence adds quantity, group, and optional time.
- Diary group is separate from reusable Meal and Recipe library items.
- Recipe ingredients, batch yield, and selected display/logging measure are separate concerns.
- Nutrient quantity, its unit, missing data, and target percentage need distinct meanings.
- The Pro client relationship and personal Gold diary are separate surfaces under one account.

## Further editor observations

In the unsaved recipe, ADD INGREDIENTS opened the same food/source search. Selecting banana showed Amount and Measure, with ADD INGREDIENT. The resulting ingredient row showed Description, Database, Amount, Unit, Energy (kcal), and Weight. One medium banana made Original Recipe Weight and the full-recipe measure 118 g. REVERT CHANGES cleared the ingredient and returned to an empty recipe. Nothing was saved.

Custom Meals has CREATE MEAL, search, and sorting. The page explicitly describes combining foods and recipes for quick diary logging. Its tip says to right-click a diary Meal and use Explode to turn its items into individual entries. This tip was observed; the action was not executed. CREATE MEAL opens Meal Name, Meal Items, ADD ITEM, and Nutrition Overview. No recipe yield controls appeared in this editor.

Custom Foods describes entry from a product nutrition label. CREATE FOOD opens Food Name, Serving Sizes (#, Measure, Grams), Notes, Advanced Info, Nutrition Label, and Nutrition Overview. The empty initial serving is 1 Serving, with grams shown as n/a. No custom food was saved.

## Targets, profile, and scheduler

Verified path: More → Targets + Profile (`/#profile`). Macro modes are Ratios, Fixed Targets, Keto Calculator. Ratios display percent, grams, and energy; text says these adapt with weight changes. The page separates Weight Goal from Energy Expenditure (Baseline Activity, BMR default/custom, optional TEF, tracker activity, exercise).

Advanced Settings exposes percent vs ratios, Custom Energy Target, Add Expenditure Above Baseline to Energy Target, Target vs Balance display, and net vs total carbohydrate tracking. Net-carb exclusions include Fiber, Sugar Alcohols, Allulose, Fructose. The displayed default formula subtracts fiber and sugar alcohols. No preferences were changed.

Nutrient Targets is separate: categories General, Vitamins, Minerals, Carbohydrates, Lipids, Protein; columns Nutrient, Daily Target, Maximum, Units, Custom, Visible. This supports distinct minimum/daily and maximum values plus display preferences.

Profile holds sex, birth date, height, current weight, body-fat estimate, and calculated BMI. Actual account values are deliberately omitted from this artifact.

More → Macro Scheduler (`/#macro-scheduler`) has Enable Scheduler, Templates, NEW TEMPLATE, and one template selector per weekday. Its explanation says this enables a Daily Target Editor and template display in Diary. NEW TEMPLATE opens name, macro mode, and optional Custom Energy Target, with CANCEL and SAVE. The template's custom energy text says it overrides default energy only on days using this template. In an unsaved template, Fixed Targets displayed fixed macro energy fields and derived grams/percent. CANCEL closed it; no template or scheduler change was saved.

## Sharing and reports

More → Sharing separates Friends List, Professionals, Connected Apps, and optional Photo Logging Research. The screen says Gold friends can see each other's custom foods and recipes in search. Professionals are described as monitoring the account. No friend request, professional connection, app connection, or data-sharing change was made.

Trends expands to Charts, Nutrition Report, Print Report, Snapshots. Nutrition Report (`/#nutrition-report`) presents daily averages over a selected range. Controls include a range selector (initially Last 2 weeks), Include Today, Filter Days, and Include Supplements. Its result repeats diary energy, macro, nutrient, score, and ratio views. This is a period summary, not a second food log.

Filter Days offers All Days, Non-Empty Days, and Completed Days. No filter was changed.

## Other diary actions

The day menu offers Mark Day Complete, Copy Previous Day, Copy Current Day, Paste, Clear All, Clear Amounts, Sort All By Time, Diary Settings. These were inspected, not executed.

BIOMETRIC opens search, Most Recent, Browse All, ADD CUSTOM BIOMETRIC, optional time, Diary Group, and ADD TO DIARY. Browse All categories are Body, Cardio, Labs, Mental. NOTE opens a multiline field with a 1,000-character counter, photo control, optional timestamp, and SAVE NOTE. EXERCISE opens search, Most Recent, Browse All, and ADD CUSTOM EXERCISE. These dialogs were closed without saves.

## Pro client flows

ADD CLIENT opens an Add a Client form with Shared Account and Internal Account. Shared Account says the client owns the account and the professional can also access it. Fields are Name, Client Email, Client Group. Internal Account says only the professional can access it and log data, and it can later become shared. It omits email. Neither form was submitted.

Clicking the pre-existing Pending Verification client opened its full diary. Pending Verification therefore did not block professional diary access in this account. The client navigation exposes Diary, Dashboard, Targets + Profile, Macro Scheduler, Custom Meals, Custom Recipes, Custom Foods, Display Settings, Charts, Nutrition Report, Fasting, Snapshots, Notes. Client identity and health values are omitted here.

The pre-existing diary had a Meal row. Opening its context menu showed View/Edit Selected Meal, Explode Meal, Copy Selected Items, Create Recipe From Selected Items, Create Meal From Selected Items, Paste, Delete Selected Items. Only View/Edit was opened. It showed a CRDB Meal containing individual foods with source, amount, unit, energy, weight. Its catalog menu had Edit a Copy, Report Issue, Display for printing, Export to CSV File. No existing item was edited or deleted.

## Untested behavior

Save/revision propagation, retroactive recipe edits, delete versus retire, cooked-weight changes, actual entry copy/move/delete, shared library assignment, invitations, integrations, and payment gates were not executed. The account already has Gold/Pro, so access in this session does not establish the free-tier feature set. Recipe and Meal draft edits were reverted or abandoned, and target template edits were cancelled.
