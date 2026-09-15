# Template management

When a coach's library grows, they need to adapt or retire a saved template without changing plans already assigned to clients. This is occasional maintenance on mobile and desktop. The costly mistakes are deleting the wrong version, editing an original when intending a copy, and repeating a successful copy after losing its response.

A menu of immediate actions would be compact but conceal consequences. A dedicated management page gives the saved name and status first, independent copying second, archive/restore next, and permanent deletion last. Use this approach for both training and nutrition. Leave the worksheet focused on building. Unsaved edits pass through the existing navigation guard.

Entry: Manage template in a saved editor; archived library rows open management directly. The library has server-owned Active/Archived/All filters and opaque cursor pagination. Query strings and return state persist. Archived templates can be viewed and restored, but cannot be copied or newly assigned.

Each action confirms the saved name and consequence. Archive/restore and deletion send the reviewed revision. The server keeps assigned copies independent when their source template is archived or deleted. Copy creates an active independent template and opens its editor for naming and adaptation. The API chooses the copy name.

On an interrupted archive, restore or delete, read the same resource to reconcile its current state. A lost copy response cannot be matched conclusively by name: freeze the copy action and offer the saved library for explicit review. Failed or stale actions require closing and reviewing refreshed data before another confirmation. Do not discard newer edits, retry duplicate automatically, or infer server state from local list membership. Account changes invalidate late mutation completion.

Scope: reusable template lifecycle. Client-plan coverage and lifecycle remain the next slice. Verified 2026-09-14 at 375px and 1280px against the normal API/app (4000/2022): three actual cursor pages, page failure/retry, search beyond page one, all status filters, archived direct entry, preserved return queries, draft keep/discard, independent copied workouts/targets, stale confirmations, lost archive/copy/delete responses, assigned-copy survival, failed initial reads, account isolation and mobile overflow. Screenshots reviewed at both widths. Nutrition authoring/assignment regression passed on the normal server; training authoring/assignment regression uses the isolated database because its fixture asserts an exercise-only total and the normal database contains shared exercises.

Nutrition lifecycle now accepts optional positive expected_revision query parameters, checking under the existing row lock. Omitted revisions retain compatibility. Router tests cover successful, malformed and stale archive/restore/delete requests, retained content after stale deletion, and tenant isolation. API types regenerated through just gen-api. App build, scoped Biome, repository shape checks and backend precommit passed (1,770 tests). Physical-device and target-coach reviews remain in the final application audit.


## Current management audit — 2026-09-15

The complete template and client-plan lifecycle suites pass again at 375px/1280px on normal API 4000/app 2022. Server date errors now receive field focus after pending controls re-enable. Stale date and lifecycle-confirmation errors receive focus, with keyboard access to Load saved dates or Close and review. Modal focus takes precedence over background form errors. The pre-fix overlap and stale-template probes fail; the corrected journeys retain drafts and complete recovery.

Independent copying, status/search/cursor lists, archive/restore/delete, revision and interrupted-write recovery, preserved activity history and account replacement remain covered. Build, scoped Biome, repository rules and full backend precommit pass (1,778 tests, zero failures). The existing bundle-size warning remains. See ui-audit-coachapp-2026-09-15.md for the exact route coverage and evidence limits.
