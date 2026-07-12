# Remove Client Profiles — Design

**Date:** 2026-07-11
**Status:** Approved (grilled with user; every decision below was an explicit user choice)
**Supersedes:** `2026-07-09-client-lifecycle-subscription-intake-design.md` §5 (profile mappings, "hide the builder", intake_status sync) and the measurements-via-profile-mappings note in `2026-07-11-checkins-real-world-flow-design.md`.

## Goal

One sentence: **intake is a form; answers live in the submission; there is no separate "profile".**

Today "profile fields" means three overlapping things and nobody can say which is real:

1. Curated intake answers copied into four JSON section maps (`general`/`training`/`nutrition`/`lifestyle`) on a `client_profiles` row.
2. Coach-authored custom field definitions (`profile_field_definitions`) from a builder screen the lifecycle spec already hid from nav — yet the route still exists and an empty-state CTA still links to it.
3. A per-client EAV table (`profile_field_values`) that check-in `custom_field` mappings write into and **nothing ever reads** — a silent data sink.

Plus: the same custom-field value is stored in two places depending on who wrote it (coach edits → JSON maps; form submissions → EAV table), and `client_profiles.intake_status` is a second writer for a fact the intake `FormAssignment` already owns.

Verified facts driving the decision:

- `profile_field_values` is write-only — no read path anywhere in `lib/`.
- The clients-list profile filters (`profile_filter` param, core + custom JSONB fragments) have **no frontend caller**.
- clientapp never calls `/v1/client/profile` (it only uses `/v1/client/me`, the account profile — untouched).
- The coach's client-detail check-ins card already renders each assignment's latest submission from its `question_snapshot` — including the intake assignment — with real question labels.

## Decisions

1. **Retire the custom profile-field system entirely** — definitions, values, builder, and the check-in builder's "map to profile field" UI. Delete, don't fix.
2. **Remove the profile-mapping concept end-to-end.** Both `core` and `custom_field` kinds of the submit-pipeline mapping branch are deleted. `DefaultIntake` keeps its questions, drops the `profile_mapping` keys; `FormTemplate` changeset mapping validation goes too. The `weight` question side effect (append `weight_entries` row on submit) is unrelated and stays.
3. **Delete `client_profiles` entirely** (not just the section maps). Its `intake_status`/`intake_completed_at` duplicate the intake `FormAssignment`'s `status`/`completed_at`; the assignment is the single owner. All assignment→profile sync code dies. The roster `intake_incomplete` flag already derives from the assignment — unaffected.
4. **Coach reads intake via the existing check-ins card** on client detail (snapshot renderer). No dedicated profile page, no new renderer. Optional cosmetic polish only (pin intake first / "Intake" chip).
5. **Rename `Easy.ClientProfiles` → `Easy.Forms`** in the same overall change — after the deletion, the context holds only form templates, assignments, submissions, check-in schedules, and curated content. Matches the coachapp nav's "Forms" rename from the check-ins spec.
6. **Drop tables + delete code, hard.** One migration drops `client_profiles`, `profile_field_definitions`, `profile_field_values`. Data discarded deliberately (pre-launch; intake answers re-derivable from stored submissions). No parked files.

## Invariants that must survive

- Client invite still auto-assigns the curated intake template (get-or-create per business, never duplicated).
- Intake submission still completes the assignment; roster `intake_incomplete` flag unchanged.
- Weight answers still append weight entries with submission provenance.
- Check-in scheduling, review queue, ratings/photos: untouched.

## Sequencing (three slices, each lands green)

1. **Coachapp: remove profile UI surfaces.** Backend untouched; app must build and run against the current API throughout. Delete: client-profile page + route + constant, profile-fields builder + route + constant, "Set up profile fields" CTA, Detail-card profile rows + Edit link (membership rows stay), client-profile API slice, profile-field input component, check-in builder mapping dropdown + `fieldKey`/`profile_mapping` in draft types.
2. **Backend: delete profile system, drop tables, regen clients.** Schemas, context fns, mapping pipeline, sync helpers, both endpoint pairs, profile-field CRUD, dead list filters, OpenApi schemas; migration; `just gen-api` (restart phx first — spec cached in dev); both apps build.
3. **Rename `Easy.ClientProfiles` → `Easy.Forms` + amend superseded specs.** Mechanical rename (module, dir, tests, aliases), signatures unchanged; add superseded-by notes to the two spec files above.

## Testing

- **Forms context tests** (renamed context test file) — primary seam: intake auto-assign on invite (once per business); submission completes assignment; weight side effect; profile/mapping/field tests deleted.
- **OpenAPI route-coverage test** — deleted endpoints leave router + spec together; Swagger UI still renders.
- **Migration** — exercised by the suite on a fresh DB; no bespoke test for straight drops.
- **Frontend** — no test suite by policy: `just gen-api` + both app builds + browser pass of client detail (intake visible via check-ins card, membership card intact) at 375px and desktop.

## Out of scope (deliberate)

- Any replacement "profile"/notes surface for coach observations (own spec if wanted).
- Measurements tracker — the profile-mappings path to it is gone; own design when asked for.
- Re-send / re-assign intake flows.
- Renaming the `ClientProfile*`-prefixed OpenAPI schema titles that survive (they describe forms/check-ins resources, e.g. `ClientProfileFormAssignment`); retitling them regenerates every FE type name — cosmetic churn, defer.
- Data migration/export of dropped rows.

## History

Originally published to Linear as COA-131 (sub-tickets COA-132/133/134) on 2026-07-11; the team has since moved away from Linear — **this file and its plan are the authority.**
