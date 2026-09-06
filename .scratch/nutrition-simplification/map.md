# Nutrition simplification

## Notes

One coherent prototype cutover across storage, API, and both apps. Menu documents
remain the plan aggregate. Historical migrations remain executable history;
runtime compatibility paths do not remain.

## Decisions so far

- [01 — Coherent model](issues/01-coherent-model.md): live Library references and
  chosen portions in menus; frozen Diary values and one target snapshot per date;
  shared portion/nutrient values; simplified API and frontend contract. Completed
  with full backend, frontend, migration-preservation, and browser validation.

## Fog

None for this audit. Production rollout uses a database backup, stopped writers,
and matching backend/frontend releases as documented in ADR 0004.
