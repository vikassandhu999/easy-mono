# Encode the session operating loop

Type: task
Status: ready-for-agent
Blocked by: None — can start immediately.
Parent: [Agent development process](../map.md)

## Question

Where does an agent read the rule that a coding session claims one issue, names the branch after it, and does not mix product work with skill edits?

## What to encode

Put the spec's operating loop into the files agents already load. Do not add a new always-on document.

Required rules, in this vocabulary:

* Before the first edit, set the issue `Status: claimed` and save.
* Branch name is `<effort-slug>/<NN>-<slug>` matching the issue file.
* Session scope is that issue, `CONTEXT.md` terms for the domain, and the owning module. Do not paste the parent spec's full story list into the session.
* Product commits do not include skill files, `AGENTS.md` (except when the ticket is about those files), or unrelated `.scratch` edits.
* WIP-commit as soon as the change compiles and renders (RM-131). Push the ticket branch for backup; do not wait for a PR.
* Mark the issue `resolved` only after the ticket's finish checks pass. Append `## Answer` as the issue tracker already requires.
* When the last issue of an effort is `resolved`, set the spec's `Status:` to `resolved`. Specs that are finished must not remain `ready-for-agent`.
* Unify status words going forward: issues use `ready-for-agent` → `claimed` → `resolved` (or `ready-for-human` / `wontfix`). Specs use `ready-for-agent` while work remains, `resolved` when the effort is done. Do not rename every historical `complete` in this ticket; mention `complete` as a synonym of `resolved` so agents treat both as closed.

## Edit surface

* `docs/agents/issue-tracker.md` — operating loop, spec lifecycle, branch naming, status words. Keep the existing wayfinder claim/resolve section; extend it rather than replacing the file.
* `docs/agents/triage-labels.md` — add `claimed` and `resolved` (and note `complete` = `resolved`) so the table matches how tickets actually move.
* Root `AGENTS.md` — a short pointer under Working rules or Issue tracker. Do not copy the full loop. Point at `docs/agents/issue-tracker.md`.
* This effort's spec already states the loop; do not duplicate it into a fourth file.

## Acceptance

- [ ] `docs/agents/issue-tracker.md` states claim-before-edit, branch naming, session inputs, no mixed product/skill commits, WIP-commit + push, spec `resolved` when the last issue resolves.
- [ ] Triage labels include `claimed` and `resolved`.
- [ ] Root `AGENTS.md` points at that file in a few lines; it does not grow by a page.
- [ ] An agent reading only those two files can start a session without opening the process spec.

## Verification

Read the three files. Confirm no new always-on rule file was added. Do not run the product test suite.
