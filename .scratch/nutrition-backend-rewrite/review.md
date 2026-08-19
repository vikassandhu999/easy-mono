# Nutrition rewrite review

Status: ready-for-agent

Review each resolved ticket's diff against that ticket, then fix what still matters on the tip. The source spec is [spec.md](./spec.md). Tickets live in [issues/](./issues/).

Stay on `nutrition-backend-rewrite/16-contract-cutover` for every session. Diff an old range; do not check out tickets 01–15 to patch them.

## Ground rules

1. One ticket per chat. A chat that reviews more than one ticket is not done.
2. Review the three-dot range for that ticket, not `main...HEAD`, except in the integration pass.
3. The spec for a ticket is its issue file. Use `spec.md` stories only when that issue points at them.
4. Leftovers a ticket deferred (`Blocked by`, "until ticket 16", "cutover still owns this") belong to the later ticket. If a later resolved ticket already removed the leftover, drop the finding and name that ticket.
5. Out of scope stays out of scope: a frontend timezone setting, reconstructing dropped Programming or Diary data, a broad builder UI rename (`NutritionPlanDay` / `day_meals`) unless a P0/P1 depends on it.
6. Do not implement in a review chat. Write findings into this file, then stop.
7. Fix only on the tip, after the review phase, P0 then P1. P2 waits.

A ticket review is done when that ticket's heading below has a `Reviewed:` line and every finding has severity, a spec or issue quote, and a path. The review phase is done when all sixteen headings have `Reviewed:`.

## Ranges

Three-dot diffs. Confirm `git rev-parse` on both ends and a non-empty diff before reviewing.

* 01 `main...nutrition-backend-rewrite/01-local-calendar-foundations` — [01-local-calendar-foundations.md](./issues/01-local-calendar-foundations.md)
* 02 `nutrition-backend-rewrite/01-local-calendar-foundations...nutrition-backend-rewrite/02-food-library` — [02-food-library.md](./issues/02-food-library.md)
* 03 `nutrition-backend-rewrite/02-food-library...nutrition-backend-rewrite/03-recipe-library` — [03-recipe-library.md](./issues/03-recipe-library.md)
* 04 `nutrition-backend-rewrite/03-recipe-library...nutrition-backend-rewrite/04-template-lifecycle` — [04-template-lifecycle.md](./issues/04-template-lifecycle.md)
* 05 `nutrition-backend-rewrite/04-template-lifecycle...nutrition-backend-rewrite/05-atomic-menu-meals` — [05-atomic-menu-meals.md](./issues/05-atomic-menu-meals.md)
* 06 `nutrition-backend-rewrite/05-atomic-menu-meals...nutrition-backend-rewrite/06-day-patterns-slots-schedule` — [06-day-patterns-slots-schedule.md](./issues/06-day-patterns-slots-schedule.md)
* 07 `nutrition-backend-rewrite/06-day-patterns-slots-schedule...nutrition-backend-rewrite/07-assignment-client-plans` — [07-assignment-client-plans.md](./issues/07-assignment-client-plans.md)
* 08 `nutrition-backend-rewrite/07-assignment-client-plans...nutrition-backend-rewrite/08-coverage-workbench` — [08-coverage-workbench.md](./issues/08-coverage-workbench.md)
* 09 `nutrition-backend-rewrite/08-coverage-workbench...nutrition-backend-rewrite/09-library-menu-protection` — [09-library-menu-protection.md](./issues/09-library-menu-protection.md)
* 10 `nutrition-backend-rewrite/09-library-menu-protection...nutrition-backend-rewrite/10-live-nutrition-days` — [10-live-nutrition-days.md](./issues/10-live-nutrition-days.md)
* 11 `nutrition-backend-rewrite/10-live-nutrition-days...nutrition-backend-rewrite/11-extras-freezing-idempotency` — [11-extras-freezing-idempotency.md](./issues/11-extras-freezing-idempotency.md)
* 12 `nutrition-backend-rewrite/11-extras-freezing-idempotency...nutrition-backend-rewrite/12-planned-logging-statuses` — [12-planned-logging-statuses.md](./issues/12-planned-logging-statuses.md)
* 13 `nutrition-backend-rewrite/12-planned-logging-statuses...nutrition-backend-rewrite/13-option-switching` — [13-option-switching.md](./issues/13-option-switching.md)
* 14 `nutrition-backend-rewrite/13-option-switching...nutrition-backend-rewrite/14-diary-corrections` — [14-diary-corrections.md](./issues/14-diary-corrections.md)
* 15 `nutrition-backend-rewrite/14-diary-corrections...nutrition-backend-rewrite/15-history-summaries` — [15-history-summaries.md](./issues/15-history-summaries.md)
* 16 `nutrition-backend-rewrite/15-history-summaries...nutrition-backend-rewrite/16-contract-cutover` — [16-contract-cutover.md](./issues/16-contract-cutover.md)

If a local branch is missing, use the remote of the same name.

## Review session

New chat. Working tree clean. Branch is the tip. Attach the ticket file.

Prompt:

```text
/code-review <fixed-point>

Spec: the attached ticket. spec.md stories only if that ticket names them.
Stay on nutrition-backend-rewrite/16-contract-cutover. Diff the range in
.scratch/nutrition-backend-rewrite/review.md for this ticket. Do not check
out the old branch. Do not implement.

Treat leftovers this ticket deferred to a later ticket as owned by that
later ticket. If a later resolved ticket already removed them, drop the
finding and name the ticket.

For each finding: path, why, quote from the ticket or spec, severity
(P0 ship-blocker / P1 wrong behavior / P2 cleanup). Append the report
under that ticket heading in .scratch/nutrition-backend-rewrite/review.md
with a Reviewed: YYYY-MM-DD line. Stop.
```

`<fixed-point>` is the left side of the range (`main` for 01, the previous ticket branch otherwise). `/code-review` three-dot diffs that point against `HEAD` if you pass only the left side while sitting on the tip **and** the ticket's commits are ancestors of `HEAD`. Prefer the full range from the list so the review does not include later tickets.

Run Standards and Spec as parallel axes. Do not merge or rerank them.

### Models

* Spec: Claude Opus, or GPT 5.6.
* Standards: Grok 4.6, or Claude Opus.
* Tickets 08, 09, and 10–16 also get a Bugbot pass (defects) or Security Review (Library deletes, tenant scope, Diary writes). Skip that on 01–07 unless Spec found a P0/P1.

Do not use a fast or Composer model for these reviews.

Optional ensemble on 08–16 Spec: run Opus and GPT 5.6 on the same range. Keep findings both report, plus any single-model P0 you accept.

Spend the expensive models on 08, 09, and 10–16. 01–07 get one Spec pass each unless something looks structurally wrong.

## Finding shape

```text
- P1 — short title
  Path: backend/lib/easy/nutrition_diary.ex
  Quote: "<ticket or spec line>"
  Why: <what the diff does instead>
  Disposition: open | superseded by NN | wontfix | fixed
```

`superseded by NN` is the later ticket that already closed it. `wontfix` needs a one-line reason (out of scope, judgement, already matching the ticket).

## Fix session

Start only after the review phase is done.

1. Dedupe. The same bug on tickets 10, 12, and 16 is one fix on the tip.
2. New chat on `nutrition-backend-rewrite/16-contract-cutover`. Implement P0 then P1. Leave P2.
3. One commit per cluster (Library, Programming, Diary, frontend cutover), not per finding.
4. After each cluster: `cd backend && mix precommit`, then `pnpm -C apps/coachapp-v2 build` and `pnpm -C apps/clientapp-v2 build` when that cluster touched frontend.
5. Mark dispositions in this file as `fixed` with the commit.

A fix cluster is done when those commands pass and every finding it claimed is `fixed`.

## Integration pass

After P0/P1 fixes:

```text
/code-review main

Spec: .scratch/nutrition-backend-rewrite/spec.md stories 136–142 and
HTTP / persistence / testing decisions. Catch holes no single ticket owned.
Do not implement in this chat.
```

Then the live widths ticket 16 asked for and the cutover session skipped: coach client overview at 375 and 1280, client Today and History at 375. Dev login OTP is `123456`.

## Tickets

### 01 — Local calendar foundations

Reviewed:

### 02 — Food library

Reviewed:

### 03 — Recipe library

Reviewed:

### 04 — Template lifecycle

Reviewed:

### 05 — Atomic menu meals

Reviewed:

### 06 — Day patterns, slots, schedule

Reviewed:

### 07 — Assignment and client plans

Reviewed:

### 08 — Coverage and workbench

Reviewed:

### 09 — Library menu protection

Reviewed:

### 10 — Live nutrition days

Reviewed:

### 11 — Extras, freezing, idempotency

Reviewed:

### 12 — Planned logging statuses

Reviewed:

### 13 — Option switching

Reviewed:

### 14 — Diary corrections

Reviewed:

### 15 — History summaries

Reviewed:

### 16 — Contract cutover

Reviewed:
