Context: we are about to redesign the core data models of a fitness-coaching product in this repository (Elixir/Phoenix backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`; ignore `frontend/apps/clientapp-v2`, it is unmaintained). Three domains are the core of the system: Training, Nutrition and Trackers (things a client records besides workouts and meals: body weight, measurements, ratings, photos, text reflections, PDF/image reports). The owner wants these modelled completely and future-ready, and wants to know which parts share structure so they can be designed and built together. Before redesigning, we need an exact picture. Be thorough: this is the core of the system and nothing should be missed.

Read `AGENTS.md`, `CONTEXT.md` (domain vocabulary), `backend/AGENTS.md`, `.scratch/check-ins/spec.md` (defines Trackers, Reviews, Focus, Tracker requests) and `.scratch/coaching-terms/spec.md` first.

This is a read-only investigation. Do not modify any files. Report facts with file paths and line numbers; clearly mark anything you inferred rather than read. Your final message is the report, in Markdown.

## Your task: map the **shared and tracker-adjacent** ground

Other investigations cover training and nutrition in depth. You cover what sits around and between them.

Report:
1. **Anything tracker-like that already exists**: body weight, measurements, progress photos, ratings, notes, client metrics, progress screens in `frontend/apps/clientapp`, leftovers of removed forms or check-ins.
2. **Attachments and media**: the attachment schema and service, allowed formats, size limits, storage, how chat uses it, public library media for exercises and foods.
3. **Units**: `Client.unit_system`, weight/load units in training, units in nutrition (grams, servings), any conversion code.
4. **Patterns shared by training and nutrition**: library items (public vs business-owned custom), template to client copy, plan coverage (`backend/lib/easy/plan_coverage.ex`), schedule and day structures, ordering/position columns, archive vs delete, snapshots and freezing, `Ctx` scoping, ownership (business, coach), client-local dates and timezones.
5. **Chat**: messages, record references (how a message points at a workout or meal), read state.
6. **Client**: the schema and everything hanging off it.
7. **Every table in the current schema**, grouped by domain, so we have the full picture.

End with a short list of observations about structure shared across training, nutrition and trackers.
