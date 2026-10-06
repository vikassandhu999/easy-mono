Context: we are about to redesign the core data models of a fitness-coaching product in this repository (Elixir/Phoenix backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`; ignore `frontend/apps/clientapp-v2`, it is unmaintained). Three domains are the core of the system: Training, Nutrition and Trackers (things a client records besides workouts and meals: body weight, measurements, ratings, photos, text reflections, PDF/image reports). The owner wants these modelled completely and future-ready, and wants to know which parts share structure so they can be designed and built together. Before redesigning, we need an exact picture. Be thorough: this is the core of the system and nothing should be missed.

Read `AGENTS.md`, `CONTEXT.md` (domain vocabulary), `backend/AGENTS.md`, `.scratch/check-ins/spec.md` (defines Trackers, Reviews, Focus, Tracker requests) and `.scratch/coaching-terms/spec.md` first.

This is a read-only investigation. Do not modify any files. Report facts with file paths and line numbers; clearly mark anything you inferred rather than read. Your final message is the report, in Markdown.

## Your task: map the **nutrition** domain as it exists today

Nutrition code lives around `backend/lib/easy/nutrition*.ex`, `backend/lib/easy/nutrition/`, foods and the food library, recipes if any, the diary (`nutrition_diary*.ex`), migrations in `backend/priv/repo/migrations/`, and typed API types under `backend/lib/easy_web/types/`.

Report:
1. **Every table and Ecto schema** in nutrition (foods, nutrients, servings and portions, recipes, templates, client nutrition plans, day types, meals and meal options, items, calorie/macro targets, schedule, diary days, diary slots, diary entries, snapshots, and so on): each field with type, nullability, constraints, indexes, relationships.
2. **Lifecycle**: template to client plan, how day types map to dates, how the client logs intake (diary slot start, guidance freezing), how edits propagate, plan coverage and the coaching-term rule (`backend/lib/easy/plan_coverage.ex`).
3. **What a plan can express today**: targets (per day, per day type), exact meals vs options vs macro-only coaching, portions and units, micronutrients, water, supplements, notes, recipes, food media. Then list explicitly what it **cannot** express.
4. **What the diary records** compared with what was prescribed, and whether "recorded against expected" can be computed for past dates after the plan was edited.
5. **Awkwardness and duplication**: anything bolted on, duplicated between template and client plan, or structurally parallel to training (template-to-client copy, day/slot grouping, items with quantities, schedules).
6. Where the coachapp nutrition builder and clientapp nutrition screens depend on the current shape.

End with a short list of observations.
