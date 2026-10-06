The repository has **no implemented standalone Tracker system**. Its reusable foundations are client identity and access, coaching terms, dated training/nutrition records, private attachments, public library media, and chat references. The migration chain defines **34 application tables**, plus Ecto’s migration bookkeeping table.

This is a read-only source audit of `backend/`, maintained `clientapp`, `coachapp`, and relevant shared packages. I read the five requested documents first and excluded `clientapp-v2`. Graph tools were unavailable, so I used direct source inspection and searches. “Current schema” below means the result of the repository’s migrations, **not a verified live database**. No files were modified; runtime flows and tests were not executed. Inferences are explicitly marked.

1. Tracker-like data exists inside other domains, but body-progress tracking has been removed.

   | Area | Implemented data or behavior | Evidence |
   |---|---|---|
   | Workout soreness | Optional integer `soreness_rating`, validated from 1–5, on each training session. Client labels range from “No soreness” to “Very high.” | [training_session.ex:29](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:29), [validation:122](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:122), [workout-notes.tsx:105](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/workout-notes.tsx:105) |
   | Set-level ratings and notes | Performed sets store decimal RPE, validated from 1–10, and notes up to 5,000 characters. Prescribed sets also carry RPE and notes. These belong to training, not a generic rating system. | [training_performed_set.ex:16](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:16), [validation:127](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:127), [planned_set.ex:32](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:32) |
   | Workout commentary | Session `notes`, up to 4,000 characters. Completing a workout sends a nonblank note as a linked chat message. The client editor distinguishes saving workout details from finishing/sharing. | [training_execution.ex:186](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:186), [workout-notes.tsx:92](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/workout-notes.tsx:92) |
   | Meal commentary | Diary slots have `note_to_coach`, validated to 4,000 characters when shared. Individual diary entries also have notes, capped at 255 characters. | [nutrition_diary.ex:114](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:114), [diary_slot/entry.ex:9](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/entry.ex:9) |
   | Coach profile notes | `Client.notes` is one mutable text field, capped at 2,000 characters. It is present in the coach client response and absent from the client’s own profile response. It is not a dated note history. | [client.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:14), [validation:65](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:65), [coach response:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/client.ex:8), [client response:6](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/client_profile.ex:6) |
   | General reflections/photos/files | Chat can hold free text and image/video/audio attachments. Attachments have upload metadata, not a measurement date, Tracker identity, photo-view category, or report grouping. | [message.ex:18](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:18), [attachment.ex:22](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:22) |
   | Client activity indicator | `last_active_at` is a monotonic timestamp updated by workout completion and nutrition saves. The call sites inspected do not make it a general app-presence or chat-activity metric. | [client_account.ex:68](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/client_account.ex:68), [client.ex:279](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:279), [training_execution.ex:186](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:186), [nutrition_diary.ex:63](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:63) |
   | Nutrition summaries | Derived logged/planned nutrients, intake presence and row-status counts. There is also a calculated calorie band: below 90% is `under`, above 110% is `over`, otherwise `on`; no intake is `none`. This is not a coach-set Review assessment. | [nutrition_day.ex:72](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_day.ex:72), [calculation:93](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_day.ex:93) |

   In the maintained client app, the complete route set covers Today, account, messages, training plans/sessions and nutrition plans/days/slots. It contains no body-weight, measurements, progress-photo, Tracker, check-in or Review screen. Main navigation is Today, Training, Nutrition and Messages. “Progress” text does not establish a separate progress feature. [router.tsx:15](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/router.tsx:15), [app-shell.tsx:55](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/app-shell.tsx:55)

   The coach client overview contains coaching lifecycle, training plans, nutrition plans, and links to messages/profile details. It does not implement the proposed Review workspace. [client-overview.tsx:74](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/clients/client-overview.tsx:74)

   There is **no meal-photo field** in the current diary slot/document/entry model. Photo support belongs to chat. There is likewise no current body-weight or circumference field on `Client`. [diary_slot.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot.ex:14), [document.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:14), [entry.ex:9](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/entry.ex:9), [client.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:14)

   The retained history of removed features is substantial:

   - `form_templates` held intake/check-in purpose, section documents, active/archive status, system key/version, default-intake flag and revision. `check_in_schedules` held frequency, next due date and active state. `form_assignments` held client/template/schedule links, due date, priority, lifecycle and reminder timestamps. [forms migration:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000100_create_forms_and_client_progress.exs:5), [schedules:60](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000100_create_forms_and_client_progress.exs:60), [assignments:113](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000100_create_forms_and_client_progress.exs:113)
   - `form_submissions` held frozen questions, answer maps, submitting actor, submission time and reviewer/time. Later migrations added revision, reviewed revision, correction time and review-pending-since. [submissions:179](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000100_create_forms_and_client_progress.exs:179), [record corrections:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922163000_record_corrections.exs:5), [review wait:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922165000_preserve_form_review_wait.exs:5)
   - `weight_entries` held client/business, date, decimal value with precision 5/scale 2, unit string, note, optional submission link and revision. Standalone entries were unique per client/date. These are historical definitions, not current tables. [weight definition:233](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000100_create_forms_and_client_progress.exs:233)
   - The retirement migration first detached weight entries from submissions, then dropped forms, schedules, assignments, submissions, next steps, queue snoozes and acquisition tables. It also removed `conversations.waiting_since` and converted form-reference messages into plain text. The subsequent weight-removal migration dropped `weight_entries` and similarly stripped weight references from chat. [feature removal:4](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260923120000_remove_retired_coaching_features.exs:4), [weight removal:4](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260923160000_remove_weight_progress.exs:4)
   - Nonfunctional remnants include iOS permission descriptions saying “progress photos,” a shared list helper’s comment referring to a former check-in builder, and a measurement-unit seed described below. [Info.plist:61](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/ios/App/App/Info.plist:61), [move-item.ts:6](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/packages/utils/src/move-item.ts:6)

   The agreed check-ins spec describes future functionality, not these retired forms. Its proposed structure is:

   | Proposed concept | Spec requirement; not implemented in the current schema |
   |---|---|
   | Tracker and entry | Built-in/custom definition; number with unit, rating, photo, text or document; dated entries recorded by client or coach. |
   | Client Tracker list | Lives on the client, independently of plans. Timings are after workout, after meal, daily, weekly or on request. Removing a list item retains entries. |
   | Reports/photos | One report entry contains ordered PDFs/images; another report is another entry. Front, side and back photos are separate Trackers. |
   | Reflection | Default client list contains weekly text Reflection. |
   | Review | Coach assessment, private note, optional chat reply, review time and the moment the screen read its data. Assessment/note/reply remain editable without moving review time. |
   | Client settings | Focus and Review frequency belong on the client. Frequencies are 1, 3, 7, 14 or 28 days. |
   | Tracker request | Open ask closed by an entry or cancellation; old-term requests do not reopen when coaching restarts. |
   | Business defaults | Review frequency, reminder weekday and default Tracker list, with an explicit choice about applying changes to existing clients. |

   Sources: [concepts:15](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:15), [Reviews:52](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:52), [Trackers:70](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:70), [Focus/requests:88](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:88), [defaults:108](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:108). The spec names only four new table categories—Reviews, Trackers, entries and requests—but does not settle the physical storage representation of the client Tracker list.

2. Media is split between private client attachments and public library assets.

   `attachments` stores UUID, `business_id`, `client_id`, uploader type/id, storage key, MIME type, byte size, optional duration and timestamps. Uploader types are coach/client/system; the exposed creation services stamp coach membership ID or client ID. There is no stored original filename, caption, capture date, report identity or upload-completion state in this schema. [attachment.ex:15](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:15), [attachments.ex:20](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments.ex:20)

   | Private attachment category | Accepted MIME types | Per-file limit |
   |---|---|---:|
   | Image | `image/jpeg`, `image/png`, `image/webp`, `image/heic` | 15 × 1,024² bytes |
   | Video | `video/mp4`, `video/webm`, `video/quicktime` | 50 × 1,024² bytes |
   | Audio | `audio/webm`, `audio/mp4`, `audio/mpeg` | 10 × 1,024² bytes |
   | PDF/document | Not accepted | No PDF limit is defined |

   Size must be positive. If supplied, duration must be between 1 and 300,000 milliseconds. These are binary-sized limits, although the client UI calls them MB. The typed upload API repeats the MIME whitelist. [attachment.ex:16](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:16), [duration validation:55](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:55), [size validation:116](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:116), [upload type:24](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/upload.ex:24)

   The private upload flow inserts an attachment row and returns a presigned PUT URL plus `Content-Type` header. The client then uploads directly to object storage. Keys are:

   ```text
   businesses/{business_id}/clients/{client_id}/attachments/{id}.{extension}
   ```

   Download requests accept 1–50 distinct UUIDs and return signed URLs in requested order. Owners can access attachments within their business; other coaches must have access to every associated client; clients can access only attachments belonging to themselves. Authorization is against the attachment’s client, not against a particular chat-message link. [attachment.ex:65](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments/attachment.ex:65), [attachments.ex:53](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments.ex:53), [authorization:97](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/attachments.ex:97)

   Storage uses S3-compatible AWS Signature V4, separate private/public buckets and a configured public origin. Default URL lifetimes are 900 seconds for PUT and 600 seconds for GET. The implementation signs `host` with `UNSIGNED-PAYLOAD`; the size checks above validate submitted metadata. The inspected flow has no upload-finalization/content-verification operation. [storage.ex:28](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/storage.ex:28), [signing:53](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/storage.ex:53), [expiry:119](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/storage.ex:119), [configuration:69](/Users/vikassandhu/Desktop/10x/easy-mono/backend/config/runtime.exs:69)

   Chat permits up to four distinct attachments per message. `chat_message_attachments` supplies their ordering through `position`; creation uses zero-based request order. Attachments must belong to the conversation’s business and client. There is no uploader-identity restriction in that linking query. [message.ex:74](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:74), [chat_messages.ex:161](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_messages.ex:161), [link insertion:182](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_messages.ex:182)

   The client app retains unsent files in IndexedDB, under `clientapp.photos`, scoped by account owner and resource. Despite its name, the store supports chat media generally. It keeps the local name/blob, upload ticket and resulting attachment ID; uploads can reuse an unexpired ticket. This is device draft storage, not a progress-photo backend. [photo-store.ts:3](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/photo-store.ts:3), [IndexedDB:30](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/photo-store.ts:30), [attachments.ts:65](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/api/attachments.ts:65)

   `library_media` is a separate schema: UUID, optional business/uploader information, storage key **or** external URL, content type, byte size and timestamps. Uploaded assets accept JPEG/PNG/WebP images up to 15 MiB and MP4/WebM video up to 50 MiB. They do not accept private attachment formats HEIC, QuickTime or audio. [media.ex:13](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media/media.ex:13), [limits:74](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media/media.ex:74)

   Library uploads use:

   ```text
   businesses/{business_id}/library-media/{id}.{extension}
   ```

   They go to the public bucket, with public-read ACL and `Cache-Control: public, max-age=31536000, immutable`. Representations return a permanent public URL or the external URL. Attachable media belongs to the current business or is global system media. Thus “business-owned” library media is still publicly served. [media.ex:57](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media/media.ex:57), [library_media.ex:36](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media.ex:36), [upload:62](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/library_media.ex:62), [storage.ex:47](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/storage.ex:47)

   Exercises and foods each have one `media_id`; exercises additionally retain an `images` array of URL strings. Global exercises are prohibited by a database check from having `media_id`, so their image URLs are structurally distinct from custom exercise uploads. Global food seeds create external-URL system `library_media` rows. Both coach editors support image/video library media. Recipes have no corresponding media association. [exercise schema:47](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:47), [exercise constraint:49](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:49), [food seeds:71](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds/food_seeds.exs:71), [food editor:25](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/foods/food-media.tsx:25), [recipe schema:27](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe.ex:27)

   **Inference for Trackers:** private attachments are the relevant foundation for client photos/reports. PDF support, ordered report membership and entry-level metadata still need implementation; the public library path has different access semantics. The Tracker spec explicitly requires PDFs/images while deferring upload-limit decisions to the attachment service’s current limits. [check-ins spec:82](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:82), [deferred limits:117](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:117)

3. Units have domain-specific representations, without a shared conversion system.

   `Client.unit_system` is an Ecto enum, `metric | imperial`, defaulting to metric, with a matching database check. Both coach profile updates and client self-updates permit changing it. The client self-update permits name, preferred name, phone and unit system, but not timezone. [client.ex:21](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:21), [update fields:37](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:37), [database check:135](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs:135)

   | Domain | Stored representation | Conversion/default behavior |
   |---|---|---|
   | Training load | Decimal `load_value`; `kg`, `lbs`, `bodyweight` or `none` | Client preference chooses the default kg/lbs for a new set. Existing set values and units are retained. |
   | Training distance | Decimal `distance_value`; `meters`, `km`, `miles` or `none` | New client set form defaults to `km`, independently of the load-unit preference. |
   | Training time | Integer duration seconds; prescribed rest seconds | Explicit seconds fields, not a configurable unit object. |
   | Training reps/RPE | Reps are strings; RPE is decimal | These are not part of a generic measurement-unit system. |
   | Food nutrients | Float calories/macronutrients per 100 g | Intake nutrients scale from resolved gram weight. |
   | Food portion | Either grams, or amount + unit string + optional label | Named servings resolve through the individual food’s serving weights. |
   | Recipe portion | Serving quantity, optionally gram quantity | Grams require positive cooked weight; serving nutrients scale by `servings_count`. |

   Sources: [SetVocab:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/set_vocab.ex:1), [planned set fields:32](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/planned_set.ex:32), [performed set fields:16](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_performed_set.ex:16), [client preference use:88](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/session.tsx:88), [new/existing set defaults:66](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/training/recording.ts:66), [food fields:39](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/food.ex:39).

   A food serving embeds `label`, `amount`, free-text `unit`, `weight_g` and `is_default`; amount and weight must be positive. The conversion is:

   ```text
   grams = requested amount / serving amount × serving weight_g
   ```

   Matching uses the serving’s unit and label. A recipe serving can derive grams from `amount / servings_count × cooked_weight_g`; without cooked weight, serving portions still work but gram portions do not. This is food/recipe-specific portion arithmetic, not universal cup-to-gram or imperial-to-metric conversion. [serving_size.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/serving_size.ex:8), [nutrition_portions.ex:33](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_portions.ex:33), [recipe portions:57](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_portions.ex:57)

   Diary corrections normally scale frozen nutrient values and frozen gram equivalence. Switching to another portion representation can consult the current library to establish gram equivalence. [nutrition_diary_entry_resolver.ex:34](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_entry_resolver.ex:34), [portion scaling:64](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary_entry_resolver.ex:64)

   I found no kg/lb, cm/inch or general physical-unit conversion implementation in the inspected backend, maintained apps or shared utilities. In the training flow, switching preference does not normalize stored loads. Nutrition’s portion model does not consult `unit_system`.

   One retained seed file lists grams, kilograms, millilitres, litres, teaspoons, tablespoons, cups, fluid ounces, ounces and pounds, referring to `Easy.Nutrition.MeasurementUnit`. That module/table is absent from the current model inventory, and the seed entry point runs only training and food seeds. **Inference:** this measurement-unit seed is obsolete, not an active units registry. [measurement_units_seeds.exs:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds/measurement_units_seeds.exs:1), [seeds.exs:18](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/seeds.exs:18)

   The Tracker spec’s rule—built-ins stored in metric and converted for display, custom units free text without conversion—is therefore a future requirement, not functionality already supplied by `unit_system`. [check-ins spec:82](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:82)

4. Training and nutrition share a plan lifecycle, but not one prescription structure.

   | Concern | Training | Nutrition |
   |---|---|---|
   | Library visibility | Exercises visible when business-owned or `business_id` is null. Sources: system/imported/custom. | Foods use the same business-or-null visibility. Sources: system/custom. Recipes are queried within the business. |
   | Library authorship | Exercise `creator_id` references a coach. | Food and recipe `creator_id` reference coaches. |
   | Plan identity | One `training_plans` table with template/client-plan kinds. | One `nutrition_plans` table with the same kinds. |
   | Plan metadata | Name, description, revision, archive timestamp, client, source template, coverage dates, creator user. | Same, plus nutrient targets and embedded menu. |
   | Assignment | Creates an independent plan and copies workout/exercise rows and schedule links. | Creates an independent plan and copies the menu document and targets. |
   | Prescription storage | Relational workouts and prescribed exercises; prescribed sets embedded in exercises. | Menu document embeds meals, items, day patterns and weekday schedule. |
   | Recorded activity | Session plus performed-set rows. | Diary day plus diary-slot rows; options/items/entries embedded in each slot document. |

   Sources: [exercise visibility:178](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_exercise.ex:178), [food visibility:157](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/food.ex:157), [recipe scope:142](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_library.ex:142), [training plan:25](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:25), [nutrition plan:38](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:38), [training copy:114](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:114), [nutrition assignment:102](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:102).

   Templates are business-owned, not global library items. Assignment is an operation, not an assignment table. Both copy services require a coach, authorize the client, lock an unarchived source template and check its revision. Training generates new child-row identities and remaps schedule links. Nutrition preserves menu-local identities inside an independently stored document. [training_plan_copy.ex:24](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_copy.ex:24), [nutrition_plan_copy.ex:24](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_plan_copy.ex:24)

   Copying a plan does **not** freeze its library items. Training prescriptions retain live exercise references. Nutrition menu item names/nutrients are virtual and resolved from the current library on reads; freezing occurs when recording begins. [prescribed_exercise.ex:15](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/prescribed_exercise.ex:15), [menu/item.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu/item.ex:8), [nutrition_plan_reader.ex:313](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_plan_reader.ex:313)

   Coverage is genuinely shared through `Easy.PlanCoverage`. For a requested date:

   - The plan’s start/end dates must cover the date inclusively.
   - A coaching term must cover the date.
   - No term may have ended on or after the plan’s client-local creation date and before the requested date.
   - Effective end is the earlier of explicit plan end and the first applicable term end.
   - Lifecycle derives `upcoming`, `ended`, `current` or `waiting`; plan schemas additionally handle incomplete/archive states.

   This is creation-based protection against reviving an earlier term’s plan. Plans do not store a `coaching_term_id`. Both domain queries call this module after selecting scheduled, unarchived client plans. [plan_coverage.ex:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:5), [lifecycle/effective end:32](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_coverage.ex:32), [training coverage:230](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_plan.ex:230), [nutrition coverage:224](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/plan.ex:224)

   `PlanOverlap` is also shared. It locks the client, compares effective intervals against other scheduled/unarchived plans of the **same schema**, and rejects overlaps. Its overlap calculation includes terms already ended before today. Each domain has a database uniqueness rule allowing at most one unarchived incomplete plan per client. [plan_overlap.ex:10](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/plan_overlap.ex:10), [training incomplete constraint:129](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:129), [nutrition incomplete constraint:181](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:181)

   Scheduling and ordering differ in ways that matter:

   | Structure | Identity and ordering |
   |---|---|
   | Training workout schedule | Rows with weekday enum; unique plan/weekday; each row references a workout in that same plan/business. Missing weekdays represent rest. Any workout in the covering plan can start a session, regardless of the suggested weekday. |
   | Training prescription | Workouts and prescribed exercises have nonnegative, parent-unique `position` columns. Prescribed sets are ordered embedded values without their own primary key. |
   | Training execution | Performed sets have session-unique positions and their own UUIDs. |
   | Nutrition menu | Ordered meal/item/day-pattern arrays with menu-local UUIDs. A pattern’s slot has no identity of its own; its ordered `meal_ids` are offered choices, first default. |
   | Nutrition week | A complete Monday–Sunday map to day-pattern UUIDs; every key must exist and point inside the menu. |
   | Nutrition diary | One day per business/client/local date; one slot per business/client/local date/meal slot. Entries and frozen options/items live inside the slot document. |
   | Other ordered children | Recipe ingredients and chat attachment links have explicit `position` columns. |

   Sources: [workout_schedule.ex:17](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/workout_schedule.ex:17), [startable workouts:139](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_plan_reader.ex:139), [training_workout.ex:44](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_workout.ex:44), [prescribed_exercise.ex:54](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/prescribed_exercise.ex:54), [menu.ex:39](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:39), [menu validation:68](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/menu.ex:68), [default offered meal:20](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot/document.ex:20), [diary uniqueness:258](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:258), [recipe positions:76](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/recipe_ingredient.ex:76).

   Nutrition’s closed meal-slot vocabulary is early morning, breakfast, mid-morning, lunch, afternoon, evening, dinner, pre-sleep, pre-workout, during-workout and post-workout. The workout-related slots are timing labels; diary slots do not reference a training session. [nutrition_meal_slot.ex:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_meal_slot.ex:1), [diary_slot.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition/diary_slot.ex:14)

   Both plan contexts implement archive, restore and hard delete. Archive/restore alter `archived_at` and revision; restore rechecks overlap. Hard deletion is distinct from archive. Deleting a source template nulls `source_template_id` on surviving copies. [training_programming.ex:55](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:55), [nutrition_programming.ex:31](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_programming.ex:31), [training source FK:134](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:134), [nutrition source FK:188](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:188)

   Archive behavior is not perfectly uniform: nutrition explicitly rejects editing metadata/menu on archived plans; training’s inspected metadata and prescription mutation paths have no equivalent archive check. [nutrition_programming.ex:86](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_programming.ex:86), [training_programming.ex:36](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_programming.ex:36), [training_prescription_writer.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_writer.ex:14)

   Library items have no archive field in these schemas. Business exercises can be deleted when not referenced by prescriptions; performed-set exercise references become null on exercise deletion while their stored names survive. Foods/recipes are protected from deletion while structurally used by menus/recipes. Food serving identities and recipe cooked weight also have usage protections. System foods reject edits/deletion. [training_library.ex:165](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_library.ex:165), [performed-set FK:371](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:371), [nutrition_food_writer.ex:47](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_food_writer.ex:47), [recipe protections:70](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_recipe_writer.ex:70)

   Historical freezing happens at different boundaries:

   - A planned training session snapshots plan ID/name/revision, workout ID/name, exercise references/names/tracking types and prescribed sets **when it starts**. Source plan/workout IDs are plain UUID fields, not foreign keys. Completed facts remain correctable with revision checking; discarded sessions remain closed. [training_execution.ex:223](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:223), [training_prescription_snapshot.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_prescription_snapshot.ex:8), [training_session.ex:56](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:56), [migration fields:275](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:275)
   - A nutrition slot freezes offered meals/items and applied timezone **when first saved**. The first saved slot freezes day targets. Starting a previously unrecorded past slot creates no historical plan guidance; live guidance is frozen only for today. Existing snapshots are reused on corrections. [nutrition_diary.ex:77](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:77), [freezing:141](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:141), [day targets:184](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:184)
   - Nutrition keeps frozen values when a library item disappears and hides unavailable live links in the response. [nutrition_day.ex:133](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_day.ex:133)

   Client-local date resolution is shared: client timezone, then business timezone, then `Asia/Kolkata`. Business timezone is non-null in the migration. Nutrition persists the applied timezone per slot; training sessions persist date and UTC start/close timestamps but **no applied timezone**. Training correction validation obtains today from the client’s current calendar, whereas nutrition corrections use the slot’s stored timezone. [local_calendar.ex:4](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/local_calendar.ex:4), [client_account.ex:42](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/client_account.ex:42), [training_session.ex:29](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training/training_session.ex:29), [nutrition_diary.ex:85](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:85)

   Tenant/actor scoping is also shared. `%Ctx{business_id, user_id, coach_id, client_id, owner?}` carries trusted identity. Owners see business clients; other coaches see assigned clients. Client-facing operations use `ctx.client_id`, loaded once from the accepted membership. Most tenant tables repeat `business_id` and use composite foreign keys; `coaching_terms` is an exception, deriving business scope through its client. [ctx.ex:1](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/ctx.ex:1), [client visibility:136](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:136), [client_access.ex:42](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/client_access.ex:42), [load_client.ex:10](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/plugs/load_client.ex:10), [term scope:40](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/coaching_terms/coaching_term.ex:40)

   A naming inconsistency worth preserving in the map: plan `creator_id` means **user ID**, while exercise/food/recipe `creator_id` means **coach membership ID**. Client-plan access follows the client relationship, not the creator. These are not interchangeable ownership keys.

5. Chat is a client conversation with frozen record previews and shared read cursors.

   There is one conversation per business/client. It stores last-message timestamp, preview and role, plus coach/client last-read timestamps. Messages store body, polymorphic sender type/id, optional idempotency request/fingerprint, optional record reference/snapshot, and microsecond timestamps. Sender display name is resolved from the current coach/client record, not frozen in the message. [conversation.ex:17](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/conversation.ex:17), [conversation uniqueness:34](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/conversation.ex:34), [message.ex:18](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:18), [sender lookup:235](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:235)

   A message may contain text, attachments, a reference, or combinations. Text is trimmed and capped at 4,000 characters. A body is required only when neither attachments nor a reference exists. Reusing a sender/conversation request ID with the same fingerprint returns the prior message; different content conflicts. [message.ex:41](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:41), [content validation:107](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:107), [idempotency:122](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_messages.ex:122)

   Each message has at most one record reference:

   | Reference type | Actual target | Eligibility |
   |---|---|---|
   | `training_session` | `training_sessions.id` | Same business/client; session completed |
   | `meal` | `nutrition_diary_slots.id` | Same business/client; `shared_at` present |

   “Meal” here does not mean a menu meal or an individual diary entry. `embed_id` is a polymorphic UUID, not a database foreign key to either source table. [chat_record_references.ex:30](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_references.ex:30), [chat migration:73](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000500_create_conversations.exs:73)

   The frozen preview contains title, occurred-on date, recorded-at timestamp and revision; meal references add the meal-slot name. It is a summary, not a full historical copy. Opening it fetches the latest source record, and both apps explain when its revision changed. [chat_record_references.ex:61](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_references.ex:61), [client reference notice:3](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/clientapp/src/ui/reference-notice.tsx:3), [coach record detail:39](/Users/vikassandhu/Desktop/10x/easy-mono/frontend/apps/coachapp/src/conversations/record-detail.tsx:39)

   One precise behavior: a supplied reference revision may be any positive integer **up to** the current source revision. The title/date are read from the current row, while the snapshot revision is the supplied revision. The resolver does not retrieve historical source contents for that revision. [chat_record_references.ex:61](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_references.ex:61)

   Workout completion and meal sharing can create linked “Note to coach” messages. Their request IDs are deterministically derived from source type, ID and revision. Blank notes create no message. Changed notes on subsequent published corrections create another message rather than rewriting an earlier preview. [chat_record_notes.ex:9](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat_record_notes.ex:9), [training correction sharing:59](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/training_execution.ex:59), [meal publication:114](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/nutrition_diary.ex:114)

   Read state is per conversation side, not per coach or per message. Any coach marking it read advances the team-side cursor. Unread counts count opposite-side messages whose insertion timestamp is later than the cursor. Explicit `through` timestamps advance without moving backwards and are capped at the last message. Without `through`, the cursor is set to the latest message timestamp. [conversation.ex:21](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/conversation.ex:21), [unread counts:193](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat/message.ex:193), [cursor update:214](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/chat.ex:214)

   Phoenix channels deliver message/inbox updates; the conversation channel rejects incoming mutation events as read-only. Message creation and read marking use HTTP. The client HTTP write gate also applies to `POST /conversation/read`, so ended clients can fetch history but cannot advance that cursor through this endpoint. [conversation_channel.ex:17](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/channels/conversation_channel.ex:17), [chat routes:234](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/router.ex:234), [require_coaching.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/plugs/require_coaching.ex:8)

   The current schema/API has no Review reference type or message edit/delete operation. The proposed Review reply must be linked, editable with an “edited” indication, and deletable with the reply. That requires additional chat behavior. [message types:34](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/types/chat_message.ex:34), [coach chat routes:178](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/router.ex:178), [Review reply requirement:60](/Users/vikassandhu/Desktop/10x/easy-mono/.scratch/check-ins/spec.md:60)

6. The Client is the durable business relationship; coaching terms and records hang from it.

   The complete persisted Client shape is:

   | Category | Fields |
   |---|---|
   | Identity/ownership | `id`, `business_id`, nullable `user_id`, required `coach_id` |
   | Profile | `full_name`, `preferred_name`, `email`, `phone`, `notes` |
   | Preferences | Nullable `timezone`, `unit_system` |
   | Invitation/account linkage | `invite_token`, `invited_at`, `joined_at` |
   | Activity/audit timestamps | `last_active_at`, `inserted_at`, `updated_at` |

   `state`, `current_term`, `training_plan_name` and `nutrition_plan_name` are virtual fields. There are no persisted height, weight, goal-weight, body-measurement, assessment, Focus, Review-frequency or Tracker-list fields. The explicit Ecto associations are user, business, coach and `has_many :terms`; other client-owned tables reference Client from their own schemas. [client.ex:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:14)

   Database constraints include business/email uniqueness when email exists, user/business uniqueness, unique non-null invite token and a composite coach/business foreign key. A client therefore has one assigned coach in its business; coach reassignment is owner-only in the client context. [identity migration:99](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs:99), [clients.ex:127](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients.ex:127)

   | Relationship from Client | Cardinality and downstream data |
   |---|---|
   | Business | One; supplies owner, team, default timezone and business billing/seat capacity |
   | User | Optional until acceptance; authentication tokens/sessions belong to User |
   | Coach | One assigned coach |
   | Coaching terms | Many; inclusive nonoverlapping date spans |
   | Training plans | Many independent client plans → workouts → prescribed exercises → embedded sets; schedule rows |
   | Training sessions | Many → performed sets and set-request idempotency rows |
   | Nutrition plans | Many independent client plans → embedded menu |
   | Nutrition diary days | One per local date → diary slots → embedded options/items/entries |
   | Attachments | Many private uploads |
   | Conversation | At most one per business/client → messages → ordered attachment links |

   The direct client foreign keys appear in [coaching terms:139](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs:139), [training plans:105](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:105), [sessions:287](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:287), [nutrition plans:152](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:152), [diary days:233](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:233), [diary slots:280](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:280), [attachments:17](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000200_create_media.exs:17), [conversations:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000500_create_conversations.exs:5).

   Coaching terms store only client, start/end dates and timestamps. The database rejects reversed dates and overlapping inclusive ranges. Start is not editable; end can be set/cleared while the term still covers today, subject to date validation. State is derived: no linked user means invited; a covering term means active/ending soon; otherwise earlier terms distinguish ended from joined. [coaching_term.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/coaching_terms/coaching_term.ex:8), [database exclusion:149](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs:149), [state derivation:102](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/clients/client.ex:102), [term updates:22](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/coaching_terms.ex:22)

   Acceptance links the account, clears the token and stamps `joined_at`. It starts a term if capacity permits; otherwise the linked client remains joined. Capacity checks lock the business billing row. Seats derive from active clients; there is no client subscription record in this model. [coaching_terms.ex:38](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/coaching_terms.ex:38), [capacity:59](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/coaching_terms.ex:59)

   Client GET requests remain available after coaching ends. All non-GET requests under the client router require a term covering today, including uploads, messages and profile updates. This gate resides in the HTTP pipeline; the inspected recording context functions primarily enforce identity/revision/domain rules rather than repeating that gate. [router.ex:22](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/router.ex:22), [require_coaching.ex:8](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy_web/plugs/require_coaching.ex:8)

   Invitation revocation is limited to unaccepted clients and explicitly refuses clients with training sessions, nutrition diary records or chat messages. It is not a general client-delete operation. Ending coaching updates the term rather than deleting client history. [client_invitations.ex:64](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/client_invitations.ex:64), [record checks:83](/Users/vikassandhu/Desktop/10x/easy-mono/backend/lib/easy/client_invitations.ex:83)

7. The migration-defined table inventory is 34 application tables, grouped below.

   The definition codes identify these exact files; the final column gives each table’s creation line:

   - **I:** [backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000000_create_identity_and_tenancy.exs:7)
   - **M:** [backend/priv/repo/migrations/20260922000200_create_media.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000200_create_media.exs:5)
   - **T:** [backend/priv/repo/migrations/20260922000300_create_training.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000300_create_training.exs:5)
   - **N:** [backend/priv/repo/migrations/20260922000400_create_nutrition.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000400_create_nutrition.exs:5)
   - **C:** [backend/priv/repo/migrations/20260922000500_create_conversations.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000500_create_conversations.exs:5)
   - **B:** [backend/priv/repo/migrations/20260922000600_create_billing.exs](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922000600_create_billing.exs:5)

   | Domain | Table | Purpose | Definition |
   |---|---|---|---|
   | Identity | `users` | Account identity, names/contact verification and sign-in timestamps | I:7 |
   | Identity | `one_time_tokens` | Hashed one-time tokens, type, relation and optional user | I:23 |
   | Identity | `user_sessions` | Refresh/session credentials, expiry/revocation, actor/business claims | I:36 |
   | Organization | `businesses` | Owner, name, handle, timezone | I:56 |
   | Organization | `coaches` | Business membership, optional account link, invitation and removal facts | I:73 |
   | Client | `clients` | Business client relationship, profile, coach, preferences and invitation facts | I:99 |
   | Client | `coaching_terms` | Inclusive coaching date spans | I:139 |
   | Media | `attachments` | Private, client-scoped uploads | M:5 |
   | Media | `library_media` | Public uploaded or external library assets | M:42 |
   | Training library | `training_muscles` | Muscle reference vocabulary | T:5 |
   | Training library | `training_equipment` | Equipment reference vocabulary | T:15 |
   | Training library | `training_exercises` | Global/business exercise library | T:25 |
   | Training library | `training_exercise_muscles` | Exercise–muscle join; no surrogate primary key | T:70 |
   | Training library | `training_exercise_equipment` | Exercise–equipment join; no surrogate primary key | T:80 |
   | Training programming | `training_plans` | Templates and client plans | T:90 |
   | Training programming | `training_workouts` | Ordered plan workouts | T:162 |
   | Training programming | `training_prescribed_exercises` | Ordered exercise occurrences with embedded prescribed sets | T:195 |
   | Training programming | `training_workout_schedule` | Plan weekday → workout mapping | T:232 |
   | Training records | `training_sessions` | Planned/freestyle activity, frozen prescription, lifecycle, notes/rating | T:269 |
   | Training records | `training_performed_sets` | Ordered performed facts and frozen exercise names | T:343 |
   | Training records | `training_set_requests` | Set-creation request/fingerprint ledger; optional resulting set link | T:410 |
   | Nutrition library | `nutrition_foods` | Global/business foods, per-100-g nutrients, embedded servings and media | N:5 |
   | Nutrition library | `nutrition_recipes` | Business recipes, yield/cooked weight, instructions/tags | N:60 |
   | Nutrition library | `nutrition_recipe_ingredients` | Ordered recipe food references and portions | N:91 |
   | Nutrition programming | `nutrition_plans` | Templates/client plans, targets and embedded menus | N:135 |
   | Nutrition records | `nutrition_diary_days` | Client/date identity and frozen daily targets | N:233 |
   | Nutrition records | `nutrition_diary_slots` | Client/date/slot identity, frozen guidance/intake document, publication/note | N:280 |
   | Chat | `conversations` | One conversation per business/client, latest-message summary and read cursors | C:5 |
   | Chat | `chat_messages` | Text, sender, frozen source reference and idempotency information | C:58 |
   | Chat | `chat_message_attachments` | Ordered message–attachment links | C:124 |
   | Billing | `business_billing` | Business seat allowance and Razorpay subscription/cancellation state | B:5 |
   | Billing | `billing_events` | Business billing event history, amounts, seat deltas and metadata | B:34 |
   | Billing | `billing_webhook_receipts` | Provider event deduplication/processing state | B:52 |
   | Billing | `billing_checkout_intents` | Idempotent checkout/quantity-change intents | B:63 |

   Ecto additionally creates `schema_migrations`, containing migration version and insertion timestamp. That makes **35 expected tables including framework bookkeeping**, assuming the repository migration chain has been applied. [Ecto schema_migration.ex:9](/Users/vikassandhu/Desktop/10x/easy-mono/backend/deps/ecto_sql/lib/ecto/migration/schema_migration.ex:9), [creation:26](/Users/vikassandhu/Desktop/10x/easy-mono/backend/deps/ecto_sql/lib/ecto/migration/schema_migration.ex:26)

   Later migrations add session revision and diary-slot publication fields without adding surviving tables. The final chat-reference constraint allows only training session and meal. [record corrections:19](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922163000_record_corrections.exs:19), [activity publication:5](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260922164000_activity_publication.exs:5), [final reference constraint:14](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260923160000_remove_weight_progress.exs:14)

   Ten created tables are subsequently dropped and excluded from this count: `form_templates`, `check_in_schedules`, `form_assignments`, `form_submissions`, `weight_entries`, `workbench_queue_snoozes`, `coach_next_steps`, `landing_pages`, `landing_programs`, `prospects`. [retired tables:11](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260923120000_remove_retired_coaching_features.exs:11), [weight drop:18](/Users/vikassandhu/Desktop/10x/easy-mono/backend/priv/repo/migrations/20260923160000_remove_weight_progress.exs:18)

   Prescribed sets, food serving sizes, nutrition menu meals/items/day patterns/slots, and diary options/items/entries are **embedded structures, not additional SQL tables**. There are no current Tracker, Tracker-entry, Tracker-request, Review, plan-assignment or measurement-unit tables.

The following are structural observations for redesign, **inferred from the code and requirements above**:

- Training and nutrition can share plan identity, copy orchestration, revisions, coverage and archive/restore rules. Their prescription documents need not share one storage shape.
- All three domains need client/business scope, local dates, correction semantics and durable history. Timezone capture should be decided consistently; it is currently different between training and nutrition.
- Trackers resemble library definitions plus dated client records. Their client-level list and reminder timings differ from plan coverage and prescription schedules.
- Ratings and commentary already exist inside workout/meal records. Decide explicitly which remain native event fields and which become Tracker entries, so the same fact is not stored twice.
- Private attachments and ordered attachment membership are reusable for photos/reports. PDFs and report grouping are missing; public library media has different access requirements.
- Frozen record summaries and chat links are reusable across domains, but Review replies require edit/delete behavior and another reference type.
- Do not assume one generic “daily record” cardinality: training allows multiple sessions per date, nutrition keys slots by date and meal slot, and the Tracker spec permits repeated dated entries.