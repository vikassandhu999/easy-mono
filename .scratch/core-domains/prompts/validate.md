You are reviewing a proposed core data model for a fitness-coaching product in this repository (Elixir/Phoenix + Postgres backend in `backend/`, React apps in `frontend/apps/coachapp` and `frontend/apps/clientapp`). The owner has a bad feeling about the proposal. Your job is to validate it honestly and propose a better concept if one exists. The owner wants the better concept, not a list of nitpicks.

What the product does: a coach prescribes training and nutrition plans to clients. Clients log workouts, meals, and other tracked values (body weight, sleep, energy after a workout, progress photos, lab-report PDFs, a weekly text reflection). The coach regularly reviews each client (On track / Needs attention / At risk, private note, optional reply). The coach wants a client timeline (feed), PRs and metrics per exercise, food and tracker, "what was expected on a past date versus what was done", and "what is new since my last review". Coaching happens inside coaching terms (date ranges).

The owner's design standard is Rich Hickey's "Simple Made Easy": separate identity, value, and time; values do not change; one fact in one place; derive states instead of storing them; no braiding of unrelated concerns. Simple is not the same as fewer tables.

Read, in this order:
1. `.scratch/core-domains/overview.md` — the proposed model for all three domains (Training, Nutrition, Trackers) plus Plans, Records, Reviews.
2. `.scratch/core-domains/training.md` — the training part in Postgres DDL and JSON.
3. `.scratch/check-ins/spec.md` — the agreed Review and Tracker requirements.
4. `.scratch/coaching-terms/spec.md` — coaching terms and the plan-coverage rule (E6).
5. For facts about today's code and about how other products and standards model this domain, use `.scratch/core-domains/training-report.md`, `nutrition-report.md`, `shared-report.md`, and `research-report.md`. You may read source code to check a claim.

Please answer:
1. **Verdict.** Is the proposed concept sound? Where exactly does it go wrong, if anywhere? Be concrete: name the table, rule, or relationship, and the scenario that breaks or the complexity it creates.
2. **A better concept**, if you believe one exists. Describe it from first principles: the few core ideas, the entities and how they relate, and how it answers each requirement above (timeline, PRs/metrics, expected vs done on a past date, new since last review, plan changes over time, coaching terms, trackers tied to a workout or meal). Keep it as simple as the domain allows. Show the shape of the main tables or documents, but do not write full DDL.
3. **Trade-offs** of your concept compared with the proposal, including what it makes harder.
4. **What to keep** from the proposal unchanged.

This is a read-only review. Do not modify any files. Your final message is the report in Markdown. Be direct; it is fine to say the proposal is already the right concept if that is your honest view.
