---
name: authoritative-schema-refactor
description: Authoritative database schema refactor — research the schema with N parallel agents (field consistency, low-value fields, bad table/relation design), then decide and apply the changes yourself without asking for approval. Use when the user wants the schema audited and cleaned up, mentions "schema refactor", dead columns, inconsistent fields, or badly designed tables.
---

# Authoritative Schema Refactor

You are the **authoritative refactorer**: you research, you decide, you change. Do not
present findings and wait — synthesize the evidence, pick the changes that make sense,
and apply them. The only things that stop a change are missing evidence or data loss
you cannot make safe.

This repo: Ecto schemas live in `backend/lib/easy/**`, migrations in
`backend/priv/repo/migrations`, the FE↔BE contract in `docs/api_contract.yaml`.
Frontend consumers live in `frontend/apps/*` and `frontend/packages/*`.

## Phase 1 — Parallel research (N agents, one aspect each)

Work on a branch (`schema-refactor/<date>`). Then spawn the research agents **in one
message so they run concurrently**. Default N=3, one per aspect below; split an aspect
across more agents if the domain count is large (e.g. one consistency agent per group
of domains). Use `Explore` agents — research is read-only.

Every agent must report findings as: `table.field (or relation) — evidence — verdict —
proposed change`, where evidence cites file:line for every read/write site found.

**Agent 1 — Field consistency & usefulness.** Sweep all schemas for: same concept with
different names/types across tables (`note` vs `notes`, `:string` vs `:text` dates as
strings), inconsistent nullability/defaults for equivalent fields, enums duplicated
with drifting values, timestamp conventions, units stored ambiguously. Verdict: rename,
retype, unify, or leave.

**Agent 2 — Low-contributing fields.** For every field, trace actual use: read in
backend queries/views? exposed in `docs/api_contract.yaml`? consumed in `frontend/`?
A field is a delete candidate only if it has **zero meaningful reads across backend,
contract, and frontend** (write-only or fully dead). Distinguish "dead" from "audit/
compliance" fields — keep the latter and say why.

**Agent 3 — Table & relation design.** Hunt for: god tables mixing concerns, join
tables wrapping a relation that should be a plain FK (or vice versa), wrong cardinality,
missing FK constraints / `on_delete` behavior, duplicated data across tables, tables
with no live code paths. Verdict: merge, split, drop, re-key, or add constraints.

## Phase 2 — Synthesize and decide

Merge the three reports. For each finding, decide: **do it / do it differently / reject**
— and record one line of reasoning. Rules:

- Evidence beats vibes: no deletion without the zero-reads proof from Phase 1.
- Conflicts between agents: re-verify yourself with Grep before deciding.
- Order the accepted changes so each migration step compiles and passes tests alone.

## Phase 3 — Apply

For each accepted change, in dependency order:

1. Edit the Ecto schema(s) and all call sites (changesets, queries, views, tests).
2. `mix ecto.gen.migration <name>` in `backend/` — destructive steps must be staged
   safe: drop columns/tables only after code no longer references them; prefer
   reversible migrations; never silently lose data a user could miss (rename via
   add-copy-drop if the table is live).
3. If the field/table is in `docs/api_contract.yaml`: update the contract AND the
   frontend types/usages in the same change (per repo rule).
4. Verify per change: `mix compile --warnings-as-errors && mix test` in `backend/`;
   `just lint` if frontend touched. A failing step reverts or reworks that change —
   it does not block the rest of the queue.

Commit per logical change with a message stating the evidence
(e.g. `schema: drop clients.legacy_ref — write-only, no reads in BE/FE/contract`).

## Final report

End with: changes applied (with commits), findings rejected and why, and anything
deferred because data-loss safety couldn't be guaranteed.
