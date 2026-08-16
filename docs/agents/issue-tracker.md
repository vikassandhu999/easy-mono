# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Status

Issues move `ready-for-agent` → `claimed` → `resolved`. Also `needs-triage`, `needs-info`, `ready-for-human`, `wontfix`. Historical `complete` means `resolved`.

Specs are `ready-for-agent` while any issue is still open, and `resolved` when the last issue is `resolved`. A finished spec does not stay `ready-for-agent`.

Triage role strings: `docs/agents/triage-labels.md`. `claimed` / `resolved` are wayfinding session states from this file, not extra triage roles.

## Session

A coding session is one claimed issue.

1. **Claim** — set `Status: claimed` and save. Done when the issue file says `claimed`.
2. **Branch** — `<effort-slug>/<NN>-<slug>` matching the issue file. Done when `git branch --show-current` matches.
3. **Scope** — that issue, `CONTEXT.md` terms for the domain, and the owning module. The parent spec's story list stays out of the session.
4. **Commit** — the ticket's product files. Skill files and `AGENTS.md` belong only to a ticket about those files. Unrelated `.scratch` stays out.
5. **WIP** — commit as soon as the change compiles and renders (RM-131). Push the ticket branch for backup. A PR is optional.
6. **Resolve** — after the ticket's finish checks pass: append `## Answer`, set `Status: resolved`, add a gist-and-link to the map's Decisions-so-far. If this was the last open issue, set the spec `Status: resolved`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved` (or `complete`).
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work. Session above is the rest of the loop.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`. If this was the last open issue, set the spec `Status: resolved`.
