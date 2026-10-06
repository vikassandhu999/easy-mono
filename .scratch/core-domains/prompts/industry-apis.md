We are designing the core data model of a fitness-coaching product. We want to learn from the best-designed APIs and domain models in the software industry: companies known for a strong engineering culture and carefully designed APIs. Please research them with web search, read their actual public API references and design writing, and tell us what we can learn. Cite sources. Do not modify any files in this repository; your final message is the report in Markdown.

## Our problem, briefly

- A coach writes **templates** and assigns them to clients as **client plans** (training and nutrition). The coach edits plans over time; edits can apply now or from a future date.
- A plan has a weekly **schedule**. Each date produces **expected occurrences** ("Workout A on Monday 6 Oct"). Clients sometimes do Monday's workout on Tuesday, repeat it, or skip it.
- Clients create **records** (workouts with sets, meals with food entries, tracker entries such as body weight or a lab-report PDF). Records can be corrected or removed later.
- The coach **reviews** a client and needs "what is new since my last review", a timeline, "what was expected on a past date versus what was done", and PRs/metrics.
- Library items (foods, recipes, exercises) can change, but history must keep its meaning.
- Our design standard is Rich Hickey's "Simple Made Easy": separate identity, value, and time; values never change; one fact in one place; derive states.

Our current proposal is in `.scratch/core-domains/overview.md` and `.scratch/core-domains/training.md`, and a review of it is in `.scratch/core-domains/validation-report.md`. Read those three first so you know what we are deciding.

## What to research

Pick the 4–6 companies or systems whose models best map to our open problems, and study the relevant parts of their APIs in depth. Candidates we think are relevant (you may choose others if they fit better):

- **Stripe**: Prices and Products (immutable prices), Subscriptions and Subscription Schedules (phases over time, future changes), Invoices and line items (snapshotting what was billed), Events and webhooks, idempotency keys, API versioning, object expansion.
- **Google Calendar API**: recurring events, RRULE, instances, exceptions, moving or cancelling one occurrence.
- **Shopify**: orders snapshotting line items vs. live products and variants; order edits.
- **Datomic** (Hickey's own database): facts, transactions, as-of and since queries, valid time vs. transaction time.
- **Ledger designs** (e.g. Modern Treasury, Square, TigerBeetle): immutable entries, corrections by reversal, balances as derived values.
- **Linear or GitHub**: activity history and timelines for issues; "updated since" sync.
- **Strava or Garmin / Apple HealthKit**: activities, laps, samples, corrections, and how fitness data is exposed.

For each system you pick:
1. The core entities and how they relate (identity vs. value vs. time).
2. How they handle change over time: versioning, immutability, scheduled future changes, corrections, deletions.
3. How they handle recurrence or expected occurrences, if relevant.
4. How clients learn "what changed since X" (events, cursors, sync).
5. The specific lesson for our model, mapped to one of our concrete problems, with a concrete suggestion.

Then finish with:
- **Patterns that appear across several of these systems** and how they would look in our model.
- **Recommended changes to our proposal**, ranked by value, each tied to a source.
- **What not to copy**: things that work for them but would be over-engineering for us.
