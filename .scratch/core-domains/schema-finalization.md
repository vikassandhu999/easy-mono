# Core-domain schema decisions

Status: design in progress, 2026-10-04. This is the entry point for finalizing the schemas table by table. Agent proposals are recommendations, not approved schema changes. No migrations or product changes are part of this work.

## Scope

Produce concrete schemas for Training, Nutrition, Trackers, and Reviews. Each table needs columns, types, nullability, relationships, constraints, mutation rules, and a defined transaction boundary. Embedded documents need the same precision for identity and validation. Preserve the agreed [Check-ins contract](../check-ins/spec.md); identify proposed changes to [the glossary](../../CONTEXT.md) explicitly.

Working assumption: target the first build of the redesign. Keep future capabilities out unless they affect a decision that must be made now. Existing data needs a preservation policy; an unavailable historical expectation must remain unknown.

## Working proposals

* [Training](schema-training-proposal.md)
* [Nutrition](schema-nutrition-proposal.md)
* [Trackers and Reviews](schema-trackers-proposal.md)

The shared plan lifecycle will be reconciled here before any domain proposal is treated as final. The proposals may recommend different choices while that work is underway.

## Decision 1: historical prescription storage

Pending user choice.

| Option | What is retained | Trade-off |
| --- | --- | --- |
| Immutable plan revisions with captured library details (recommended) | Each published prescription contains the names, interpretation, portion conversions, and nutritional values needed to reproduce its guidance. | Fewer independent version histories. Library edits reach client guidance only through a newly published plan revision. |
| Separately versioned dependencies | Plans, foods, recipes, and servings retain immutable versions and a defined resolution timestamp. | Can preserve library-driven updates from a moment onward, but requires complete dependency resolution and more version relationships. |
| Retain record snapshots and add dated expectations | Captured sessions and diary guidance remain; a separate dated representation preserves expected work and nutrition. | Smaller change to recording, but two capture boundaries must stay consistent. |

All options need historical coverage rules. None makes current plan dates, archive state, coaching terms, or timezone settings sufficient evidence of past expectations. All options also need a daily nutrition target policy and an explicit workout matching rule.

## Table review order

1. Plan identity and lifecycle, separately instantiated for Training and Nutrition.
2. Immutable prescription revisions, historical coverage, and dated expectations.
3. Training library and embedded prescription structure.
4. Training Sessions, Performed Sets, and retry identity.
5. Food library, serving definitions, recipes, and ingredient storage.
6. Nutrition prescription content, Diary Days, Diary Slots, and embedded entries or entry rows.
7. Tracker definitions and client assignment history.
8. Tracker entries, attachment links, and requests.
9. Reviews and existing client/business/chat extensions.
10. Cross-domain constraints, change discovery, and migration acceptance scenarios.

For each table, record the chosen shape and its reason before moving it to final status. Unresolved product choices stay visible; conventional implementation details can be settled by the design review.

## Rules already supported by the contracts

* Tenant-owned relations retain `business_id`; trusted scope comes from `Ctx`. Cross-table references must preserve tenant and client identity.
* Training and Nutrition plans are independent client prescriptions. Template assignment copies content.
* The Tracker list belongs to the client, outside plan expiry.
* Workouts and meals remain client-recorded. Tracker entries may be recorded by a coach.
* Missing data is not zero, skipping, or non-adherence.
* Corrections remain possible while captured prescription meaning stays stable.
* Embedded entities can have stable IDs. Rows are justified by their write and integrity requirements, not identity alone.
* User-approved schema decisions here do not imply that migrations have been implemented or verified.

## Review evidence

The initial review checked the agreed Check-ins spec, glossary, report conclusions, and exact source for plan coverage, overlap, training snapshots, nutrition diary writes, portion resolution, and embedded entry identity. Graph tools were unavailable in this session, so graph project, generation, and coverage are unknown. Agent proposals must cite their additional bounded source checks. No runtime validation has been performed.

## Scenarios the final schemas must answer

| Scenario | Required answer |
| --- | --- |
| A coach edits or archives a plan after a month with no recorded sessions. | Past expectations remain explainable without consulting only the plan's current shell. |
| A serving changes from 200 g to 150 g after a meal was prescribed and recorded. | Both historical guidance and recorded intake retain their intended portion basis. The policy for future guidance is explicit. |
| Breakfast and dinner use different plan revisions on one local date. | The Nutrition Day has one defined daily target baseline. |
| A client performs Monday's workout on Tuesday, then repeats it. | Expected-versus-completed has an explicit matching and duplicate-credit rule. |
| A coach adds an event Tracker between a morning and evening workout. | Assignment history determines which events count in coverage. |
| A set is created, corrected, deleted, and its original create request is retried. | The retry does not create another set or mistake corrected values for the original request. |
| A child record changes while a coach is reading the Review screen. | The next Review can discover the change, including a deletion. |
| A client returns for another coaching term. | Earlier plans and requests follow the agreed term rules; the Tracker list does not inherit plan expiry. |
| A record or attachment ID from another client or business is supplied. | The write fails without leaking the other client's data. |
| Legacy data has a frozen record but no recoverable historical plan. | Its recorded guidance survives. Missing expectations are not invented. |
