Context: we are about to redesign the core data models of a fitness-coaching product in this repository (Elixir/Phoenix backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`; ignore `frontend/apps/clientapp-v2`, it is unmaintained). Three domains are the core of the system: Training, Nutrition and Trackers (things a client records besides workouts and meals: body weight, measurements, ratings, photos, text reflections, PDF/image reports). The owner wants these modelled completely and future-ready, and wants to know which parts share structure so they can be designed and built together. Before redesigning, we need an exact picture. Be thorough: this is the core of the system and nothing should be missed.

Read `AGENTS.md`, `CONTEXT.md` (domain vocabulary), `backend/AGENTS.md`, `.scratch/check-ins/spec.md` (defines Trackers, Reviews, Focus, Tracker requests) and `.scratch/coaching-terms/spec.md` first.

This is a read-only investigation. Do not modify any files. Report facts with file paths and line numbers; clearly mark anything you inferred rather than read. Your final message is the report, in Markdown.

## Your task: map the **training** domain as it exists today

Training code lives around `backend/lib/easy/training*.ex`, `backend/lib/easy/training/`, exercises (`backend/lib/easy/exercises*.ex` and schemas), migrations in `backend/priv/repo/migrations/`, and typed API types under `backend/lib/easy_web/types/`.

Report:
1. **Every table and Ecto schema** in training (exercise library, templates/programs, client plans, workouts/days, exercise prescriptions, sets, schedule, training sessions, performed sets, snapshots, and so on): each field with type, nullability, constraints, indexes, relationships.
2. **Lifecycle**: template to client plan (assignment), how a plan maps to dates, how a client starts and finishes a session, what is frozen at start, how edits propagate, plan coverage and the coaching-term rule (`backend/lib/easy/plan_coverage.ex`).
3. **What a prescription can express today**: set types, reps and ranges, load and units, RPE/RIR, tempo, rest, supersets/circuits/grouping, notes, media, progression, cardio (time, distance, pace, heart rate), unilateral, warm-ups. Then list explicitly what it **cannot** express.
4. **What a performed session records** compared with the prescription, and whether "completed against expected" can be computed for past dates after the plan was edited.
5. **Awkwardness and duplication**: anything bolted on, duplicated between template and client plan, or structurally parallel to nutrition (template-to-client copy, day/slot grouping, items with quantities, schedules).
6. Where the coachapp training builder and clientapp training screens depend on the current shape.

End with a short list of observations.
