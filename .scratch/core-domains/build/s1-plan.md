# Slice 1 implementation plan

Authority: `../decisions.md`, `../overview.md`, `../training.md`, and the owner's task in `s1-foundation-training.md`.

Work in this tree on `codex/core-domains`. No commits, pushes, or worktrees. Preserve existing owner changes. Do not modify clientapp-v2. Nutrition keeps its current storage.

## Task 1: Backend and typed contract

Replace training storage, schemas, contexts and API with the frozen model. Own `backend/`, generated contracts, and necessary generation scripts only. Create the shared tables, immutable revision and journal triggers, training-only records view, SQL coverage and expected occurrence functions. Use one journal transaction helper with client serialization. Keep E6 and nutrition working. Replace exercise tracking types and image arrays with measures/bodyweight/media; update seeds. Implement immutable plan publishing, dates, withdrawal, copy assignment, session/set writes, units, occurrence results and PR history. Delete retired training implementation. Keep `%Ctx{}` authorization at each public boundary. Add meaningful tests for all specified rules and tenant denial. Run focused tests and full precommit, generate contracts, and seed dev data. Publish the concrete API interface early for app work.

## Task 2: Coach app

Replace training builder and exercise editing consumers with the generated content contract. One document save, stable ids, typed sets and block formats, multiple schedule entries per day. Add revision publishing and withdrawal, P4 notice, assignment, weekly expected/done/extra, session prescription comparison and exercise PR history. Own only coachapp and its tests. Match existing primitives and commands. Build and verify the workflows at 1280px and 375px.

## Task 3: Client app

Replace Today, training and session recording consumers with the generated contract. Explicit occurrence selection, including an earlier date; other plan workouts and free sessions; prescribed set ids, extra work, outcomes and unit conversion. Preserve offline drafts and idempotent retries. Own only clientapp and its tests. Build and verify at 375px.

## Task 4: Integration, review and evidence

Run backend precommit, API generation, both builds and frontend lint. Exercise the owner's full Playwright scenario against the running apps and save screenshots in `s1-screens/`. Review the complete change for spec and quality. Write `s1-report.md` with changes, choices, limitations and command results.

## Interface checks

| Tasks | Interface | Resolution |
|---|---|---|
| 1 / 2 / 3 | Typed routes and generated schemas | Backend publishes concrete fields early; apps consume generated types. No handwritten compatibility shapes. |
| 1 / 4 | Database resets and seeds | Authorized by owner; keep nutrition tests passing and rerun seeds. |
| 2 / 3 | Exercise units and content | Frozen JSON and kg/lb, m/km/mi/s vocabulary applies. |
| 1 | SQL rule versus older design prose | Owner explicitly requires SQL functions; SQL is authoritative. |
| 2 | Single save versus old builder protocol | Remove the two-request flow. |
| 3 | Earlier occurrence versus execution date | Client explicitly selects occurrence; local_date remains execution date. |
| 4 | Commit/worktree skill defaults | Owner prohibits both; all changes remain in this working tree. |

## Screen brief

Coach enters from training templates or a client's plans. The primary action saves a template or publishes a client prescription. A scheduled change shows its date and a withdraw action. The client page shows expected workout occurrences and links to completed sessions and PRs. Unsaved editor values remain after a failed request.

Client enters from Today or Training. The primary action starts the selected occurrence, another plan workout, or a free session. Recording shows prescribed and extra sets. Local drafts survive interruption; retries retain request ids. Empty guidance, loading failures and ended coaching preserve readable history and recovery paths.
