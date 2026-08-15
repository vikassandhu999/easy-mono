# 11 — Remove the replaced Training design and verify the application

**What to build:** Remove the superseded Training paths and prove that the replacement Programming and Execution design is the only working system across backend and frontend applications.

**Blocked by:** 03 — Manage Training Template lifecycle; 05 — Duplicate Templates and handle stale revisions; 07 — Read Client Plans and resolve Coverage; 10 — Finalize sessions and inspect immutable history.

**Status:** complete

- [x] Replaced generic plan, workout, and session contexts and their obsolete schemas, helpers, and tests are deleted.
- [x] Child workout, Prescribed Exercise, reorder, schedule, and generic session-state mutation routes are absent from the generated contract.
- [x] No backend or frontend caller references removed symbols, route operations, fields, ordering conventions, or untyped snapshot behavior.
- [x] OpenAPI, generated frontend types, examples, factories, seeds, development fixtures, and product capability documentation describe one Training design.
- [x] Training Library, Programming, and Execution tests cover the target behavior through their public interfaces.
- [x] Backend formatting, compilation, focused tests, complete tests, database checks, and precommit checks pass.
- [x] Frontend formatting, linting, type checks, tests, generated-contract checks, recurring-mistake checks, and builds pass.
- [x] End-to-end probes cover Template creation, Prescription replacement, duplication, Assignment, Client Plan editing, Coverage resolution, planned and freestyle starts, Performed Sets, completion, discard, deletion survival, and immutable history.
- [x] Searches for every deleted context, route, field, and compatibility path return no active callers.
