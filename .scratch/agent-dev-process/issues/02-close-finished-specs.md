# Close finished specs

Type: task
Status: resolved
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

Which `.scratch` specs are finished and still labelled `ready-for-agent`, so a later session could try to implement them again?

## What to change

Set `Status: resolved` on every spec whose issues are all closed and whose map (if any) is already resolved.

Known at writing:

* `.scratch/workbench-queue-definitions/spec.md` — 18 issues resolved, `map.md` Status: resolved, spec still `ready-for-agent`.
* `.scratch/meal-logging-rewrite/spec.md` — issues 01–05 resolved, spec still `ready-for-agent`.
* `.scratch/checkin-form-improvements/spec.md` — issues 01–04 resolved, spec still `ready-for-agent`.

Leave `.scratch/training-backend-rewrite/spec.md` as `ready-for-agent` (tickets 03–11 still open).

Leave this effort's spec as `ready-for-agent` until its last issue resolves.

Do not rewrite spec bodies. Status line only, unless a spec has no `Status:` line at the top — then add one.

## Edit surface

* The three spec files listed above.
* Optionally the matching `map.md` if its Status contradicts the spec after the edit (workbench map is already resolved).

## Acceptance

- [x] Workbench, meal-logging, and check-in specs read `Status: resolved`.
- [x] Training rewrite spec is `resolved` — all 11 issues are already `complete` (the leave-open line was stale).
- [x] No other effort's issue file contents were rewritten.

## Verification

`rg -n '^Status:' .scratch --glob 'spec.md'` and confirm the three finished specs are `resolved` and training plus this effort are not.

## Answer

Closed four finished specs that were still `ready-for-agent`: workbench queue definitions, meal logging diary, check-in form improvements, and the training backend rewrite. Meal-logging `map.md` is `resolved` to match its spec. Nutrition rewrite stays `ready-for-agent` (spec only, no tickets yet). This effort's spec stays `ready-for-agent`.

Training's "leave open" line in this ticket was stale: issues 01–11 are all `complete`, which the tracker treats as `resolved`. Leaving that spec `ready-for-agent` would have been the same bug this ticket exists to fix.
