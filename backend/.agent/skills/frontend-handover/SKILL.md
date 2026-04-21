---
name: frontend-handover
description: Produce a structured frontend handover document after backend changes are implemented. Use this skill ANYTIME backend work is complete and the frontend team needs to know what changed — whether the user explicitly says "hand this over to frontend", "document API changes", "create a changelog", "prepare a frontend handover", "what does the frontend need to do", or just describes finishing a backend feature/PR/spec implementation. Also trigger when modifying docs/api_contract.yaml, when a spec implementation is wrapping up, or when the user mentions notifying/updating/syncing with the frontend team. The goal is a per-change document specific enough that a frontend developer never needs to open the backend code — every endpoint, payload, status code, error shape, and behavior shift is explicitly documented and cross-referenced to the original spec that motivated it.
---

# Frontend Handover

Backend changes are useless to a frontend developer if they can't tell what changed without reading the diff. This skill produces a handover document that bridges that gap — granular, specific, cross-referenced to the original spec.

## When to use this skill

Use this skill at the **end** of a backend implementation cycle, after code is written and the API contract is updated. It is the deliverable that closes the loop between a spec and a frontend implementation.

Common trigger contexts:

- "Hand this over to the frontend team"
- "Document the API changes for frontend"
- "Create a changelog for this PR"
- "What does the frontend need to do for this?"
- After completing the implementation phase of a spec
- After updating `docs/api_contract.yaml`
- When a breaking change ships and downstream consumers need migration steps

If you are still implementing the backend, do NOT use this skill yet — finish first. This skill assumes the implementation is settled and you are now describing it to others.

## Inputs you need before writing

Gather these before producing the handover. If any are missing, ask the user for them — do not guess.

1. **The original spec** that motivated the backend changes. This is the WHY — every change in the handover must trace back to a line in the spec.
2. **The implementation** — typically a PR diff, a list of modified files, or commits. You need to know what actually shipped, not what the spec proposed (sometimes they diverge).
3. **The updated `docs/api_contract.yaml`** if endpoints or schema types changed. The contract is the source of truth for request/response shapes.
4. **Whether the change is breaking** — meaning the frontend will fail if it doesn't update. Renames, removed fields, removed endpoints, status code changes, and changed validation rules are all breaking.

## Structure of the handover document

ALWAYS use this exact structure. Frontend developers learn to scan it; deviating wastes their time.

```markdown
# Frontend Handover: [Feature Name]

**Date:** YYYY-MM-DD
**Spec:** [link or filename of the original spec]
**PR:** [link or branch name]
**Breaking change:** [Yes / No / Partial]
**Migration urgency:** [Immediate / Same release / Next release]

---

## TL;DR

Three to five bullet points. The frontend developer reads ONLY this section
to decide if they need to take action this week or not.

- Bullet 1: the most user-visible thing
- Bullet 2: the most likely-to-break thing
- Bullet 3-5: anything else they should know in 30 seconds

---

## Changes

### Change 1: [short imperative title, e.g. "Rename PlannedWorkout to Workout"]

**Type:** [new endpoint | modified endpoint | removed endpoint | renamed entity | schema change | behavior change | new error code | breaking change]
**Spec reference:** [quote or paragraph from the spec that motivated this]
**Breaking:** [Yes / No]

**What changed in the backend**
Concrete description of the code change. One paragraph, no ambiguity.

**What the frontend will observe**
The behavioral diff from the frontend's perspective. If this is a renamed
field, name the old and new field. If status codes changed, list both.

**API details**
[Endpoint, method, request shape, response shape, status codes, error codes]
For modifications, show before/after side by side.

**Frontend impact (action items)**
- Specific update needed: rename type, update RTK Query mutation, handle new error
- Files most likely to touch (best guess from the frontend repo structure)
- Tests that will break

**Example**
```bash
# Before
curl ...

# After
curl ...
```

---

### Change 2: [...]
[Same structure repeated]

---

## Migration checklist for frontend

A flat list of every concrete action the frontend team must take. Pull these
from the "Frontend impact" sections above. Order by dependency: do A before B
if B references something A produces.

- [ ] Rename type `PlannedWorkout` to `Workout` across the codebase
- [ ] Update RTK Query endpoint `getTrainingPlan` response type
- [ ] Add new endpoint binding for `POST /v1/coach/training_plans/:id/plan_items`
- [ ] Update day display from integer (1-7) to string ("monday")
- [ ] Handle new 422 error code `workout_in_use_by_session`
- [ ] Update fixtures in test files
- [ ] Update Storybook for `<TrainingPlanBuilder/>`

---

## Things that did NOT change

Frontend developers spend a lot of time worrying about silent breakage.
Tell them what they DON'T need to update.

- Endpoint X behavior is identical
- WorkoutElement shape is unchanged
- Logging endpoints (`POST /performed_sets`) are unchanged
- Authentication and session handling is unchanged

---

## Open questions / known gaps

If anything was deferred, contested, or not yet decided, list it here so the
frontend doesn't burn time chasing it down.

- The "alternative workout" UI is deferred to post-MVP; backend supports
  workout_type: "alternative" but frontend should only read "primary" for now
- Rest day reminders are not yet implemented on either side
```

## Writing each change section — rules

The "Changes" section is the heart of the document. Get this right and the rest is logistics.

### Granularity: one change per section

A single change is one observable shift from the frontend's perspective. Examples of good change boundaries:

- "Rename `planned_workout_id` to `workout_id` on workout sessions" — one change
- "Add new endpoint `POST /v1/coach/training_plans/:id/plan_items`" — one change
- "Change `day_number` (integer) to `day` (string) on plan items" — one change

Bad granularity (too coarse):

- "Restructure training plans" — too vague, frontend can't plan their work

Bad granularity (too fine):

- "Add the `:plan_items` field to the schema" + "Add a `cast_assoc` in the changeset" + "Add a controller action" — these are backend implementation details, not frontend-visible changes. Collapse into one change: "Add new endpoint X."

The test: would a frontend developer assign this change as a single task to one person? If yes, it's the right granularity.

### Spec reference: quote, don't paraphrase

For every change, include a direct quote (or near-direct paraphrase) from the original spec that motivated it. This serves two purposes:

1. Justifies the change — the frontend developer can see why the backend made this decision.
2. Catches drift — if the implementation doesn't match the spec, writing the spec reference forces you to notice.

```markdown
**Spec reference:** From `ux-spec-training-plan-redesign.md`:
> "Same Push Day on Mon AND Thu = 2 PlanItems, 1 Workout. Edit once,
> both days update."
```

If a change has NO spec reference (you added it on your own), say so explicitly:

```markdown
**Spec reference:** Not in spec — added during implementation because
existing code already had a unique constraint on (workout_id, position)
that conflicted with the redesign.
```

### Behavioral change: write what the frontend SEES, not what the backend DOES

Backend developers are tempted to describe their implementation. The handover is for someone who doesn't care about the implementation. Translate.

```markdown
# BAD (implementation language)
We renamed the schema module from PlannedWorkout to Workout and updated
the foreign key column from planned_workout_id to workout_id.

# GOOD (frontend-observable language)
The JSON response field `planned_workout` is now `workout`. The query
parameter `planned_workout_id` is now `workout_id`. Anywhere the
frontend referenced "planned workout" it should now reference "workout".
```

If the backend changed something internal that has zero frontend-visible effect, do NOT include it in the handover. The handover is not a code review — it is a contract.

### API details: show, don't tell

For every endpoint change, include the actual request and response shape. Either inline or as a reference to the API contract section.

For modifications, ALWAYS show before and after:

```markdown
**Before**
```json
GET /v1/coach/training_plans/:id

{
  "data": {
    "id": "...",
    "name": "PPL Split",
    "planned_workouts": [
      {
        "id": "...",
        "name": "Push Day",
        "day_number": 1
      }
    ]
  }
}
```

**After**
```json
GET /v1/coach/training_plans/:id

{
  "data": {
    "id": "...",
    "name": "PPL Split",
    "workouts": [
      {
        "id": "...",
        "name": "Push Day"
      }
    ],
    "plan_items": [
      {
        "id": "...",
        "day": "monday",
        "workout_type": "primary",
        "workout_id": "..."
      }
    ]
  }
}
```
```

### Status codes and error codes

If a request can return new status codes or error codes, list every one. Frontend developers handle errors based on codes, so missing one means broken UI for that case.

```markdown
**Status codes**
- `200 OK` — workout retrieved
- `404 Not Found` — workout doesn't exist or belongs to a different business
- `422 Unprocessable Entity` — new error code `workout_in_use_by_session`
  returned when trying to delete a workout that has active sessions
```

### Frontend impact: be concrete

Don't say "the frontend will need to update its types." Say "rename the TypeScript type `PlannedWorkout` to `Workout` and update all imports across the workout builder, today screen, and active workout screen."

You may not know the exact files in the frontend repo. That's fine — guess based on the feature area and label your guesses as guesses. The frontend developer will refine.

```markdown
**Frontend impact**
- Rename type `PlannedWorkout` to `Workout` (likely in `types/training.ts`)
- Update RTK Query `getTrainingPlan` response type
- Update `<TrainingPlanBuilder/>` to render the new `plan_items` array
  alongside the `workouts` array (likely in `pages/training-plans/`)
- Replace any usage of `day_number` integer (1-7) with `day` string
  ("monday"-"sunday")
- Add a new `<WorkoutLibrary/>` section to the builder
- Update fixtures and mocks
```

## Workflow

Follow these steps in order. Don't jump ahead.

### Step 1: Read the spec

Read the entire spec, not just the parts you remember implementing. The spec defines the user-visible promise; the handover documents how that promise is now delivered.

### Step 2: Read the implementation

Look at the actual changed files. Use `git diff main` or the equivalent. List every file that changed. This is your raw material.

If the implementation is not in git yet (uncommitted or in a feature branch), look at the file changes directly. Do not guess from the spec — guess from the code.

### Step 3: List frontend-observable changes

Walk through the diff and produce a flat list of every change that is visible to the frontend. Internal refactors that don't change the API surface do NOT belong on this list.

For each change, classify it:

- **New endpoint** — a route that didn't exist before
- **Modified endpoint** — same route, different request or response shape
- **Removed endpoint** — a route the frontend was calling no longer exists
- **Renamed entity** — same data, different name (in JSON keys, in route paths, in docs)
- **Schema change** — a field added, removed, or changed type within an existing endpoint
- **Behavior change** — same shape, different semantics (e.g., "now returns 422 instead of 200 in this case")
- **New error code** — a new failure mode the frontend should handle
- **Breaking** — anything that requires the frontend to update or it will break

A single change can carry multiple labels (e.g., "renamed entity + breaking").

### Step 4: Cross-reference each change to the spec

For every change in your list, find the line in the spec that motivated it. Quote it. If you can't find one, mark the change as "not in spec" and explain why.

This step often surfaces drift — implementations that diverged from the spec. When you find drift, flag it in the handover under "Open questions" so the frontend (and the spec author) can decide whether the divergence is intentional.

### Step 5: Write the document

Use the structure above. Don't reorder. Don't skip sections (write "None" if a section is empty).

Save the file to a predictable location. Recommended:

```
docs/handovers/YYYY-MM-DD-<feature-slug>.md
```

So handovers accumulate over time and the frontend team can search for "what changed in March."

### Step 6: Sanity check

Before declaring it done, read the document fresh and ask:

1. Could a frontend developer who has never seen the backend code take action from this alone? If no, what's missing?
2. Is every breaking change called out as breaking?
3. Does every change have a spec reference (or an explicit "not in spec")?
4. Is the migration checklist complete — every change above produces at least one checklist item?
5. Are the "things that did not change" honest? If the frontend will worry about something silently, name it explicitly.

If any answer is no, fix it before handing off.

## Common pitfalls

### Pitfall: Hiding breaking changes inside non-breaking sections

A "schema change" that removes a field IS a breaking change. Mark it as such. The migration urgency badge at the top exists so frontend leads can prioritize work — don't let breaking changes hide.

### Pitfall: Documenting backend internals

If you find yourself writing about Repo calls, changeset functions, or schema modules, stop. The handover audience does not have access to or interest in the backend codebase. Translate to API surface area.

Bad:
> "We added an `Ecto.Multi` to ensure the workout and plan_item are created
> in the same transaction."

Good:
> "Creating a workout and assigning it to a day are now atomic — if either
> fails, both are rolled back. The frontend will see either both records
> in the response or neither."

### Pitfall: Skipping examples for "obvious" changes

A rename feels obvious to the person who made it. Three weeks from now, the frontend developer reading the handover doesn't have that context. Always include before/after JSON for any field rename, no matter how trivial.

### Pitfall: Vague action items

"Update the training plan UI" is not actionable. "Replace the `day_number` integer dropdown with a string-keyed weekday selector in `<WorkoutScheduler/>`" is. The level of detail to aim for: a junior developer could pick up the checklist and start work without asking questions.

### Pitfall: Missing "did not change" section

Frontend developers often discover things they assumed changed but didn't, and waste time updating code that didn't need to change. Listing what stayed the same is the cheapest gift you can give them.

### Pitfall: Forgetting the API contract

If `docs/api_contract.yaml` was updated, link to the specific section. If it wasn't updated and should have been, that's a backend issue — fix it before producing the handover. The contract and the handover should agree.

## Reference: example handover

Before producing your first handover, read `references/example-handover.md` in this skill folder. It is a complete, real-shaped handover for a moderately complex breaking change (the training plan architecture redesign). It is the gold standard for shape, granularity, and tone. Pattern-match against it rather than inventing your own format.

## Output

The skill produces ONE markdown file named:

```
<YYYY-MM-DD>-<feature-slug>-handover.md
```

Saved to the location the user specifies (or `docs/handovers/` by default if their repo has that directory).

After producing the file, briefly summarize for the user:

- How many distinct changes the handover covers
- Whether any are marked breaking
- Any drift you found between spec and implementation
- Any open questions you flagged

Do NOT paraphrase the entire handover in chat — the file is the deliverable. The summary is just confirmation that it covers what they expected.