# Implement the unified workbench

Status: resolved
Type: task

Implement the [specification](../spec.md) through the [implementation plan](../plan.md), preserving the legacy API contracts. The user authorized implementation on 2026-09-17 after reviewing the requirements.

Use the proposed defaults: missing coverage today before waiting replies/reviews, separate service items, intake reviews included, and exact counts on the first page and explicit refresh. Validate the priority policy with coaches after use.

Finish with the specification's WB-01 through WB-13 scenarios, measured query behavior, generated contract review, focused destination/shared-list regressions, coach build, repository checks, and backend precommit. Record evidence and remaining deployment/user-research limits in the implementation plan.

## Comments

Implementation started from `3d3c09fb`. The rebuild brief links and workbench proposal were already in the working tree; preserve their content. No push or deployment.

## Answer

Implemented and verified the unified API and coach screen, retained compatible legacy endpoints, and added optional-count/cursor-recovery support to shared lists. Full evidence and requirement mapping: [verification](../verification.md). Backend precommit: 1,795 tests, zero failures. Workbench plus eight affected browser suites pass. No push or deployment.
