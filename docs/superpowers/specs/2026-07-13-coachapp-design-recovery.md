# Coachapp design recovery

## Goal

Restore `coachapp-v2` to its pre-Claude visual system without reverting changes to
`clientapp-v2`, the backend, or shared frontend packages. Reapply coachapp behavior
from functional specifications against the restored UI.

The pre-Claude coachapp snapshot is commit `b5d90e95`. The recovery starts from the
tip of `main`, so work outside `frontend/apps/coachapp-v2` remains present.

## Safety copy

Before restoring files, create an archive branch at the tip of `main`. The archive
keeps the full Claude-based coachapp implementation available for behavior checks
and selective recovery. Do not delete the archive branch during this work.

Create the recovery branch from the same `main` commit. Restore only
`frontend/apps/coachapp-v2` from `b5d90e95`; do not revert the commits that introduced
the design work because those commits also contain unrelated changes.

## Sources of truth

Use these sources in this order while rebuilding coachapp behavior:

1. The backend implementation, OpenAPI document, and backend tests define the
   supported data and operations.
2. Functional specifications under `docs/superpowers/specs` define product behavior.
3. The archive branch may be inspected to understand working interactions and edge
   states.
4. The restored coachapp modules define visual structure and design language.

Do not use `.dc.html` files, Claude screenshots, or `design/plans/*` as requirements
while reapplying functionality. They describe the discarded visual implementation.

## Recovery procedure

1. Create an archive branch at the tip of `main`.
2. Create a recovery branch from `main`.
3. Restore `frontend/apps/coachapp-v2` from `b5d90e95` and commit the path-scoped
   restoration.
4. Regenerate only coachapp's generated client from the repository's OpenAPI
   document. Do not regenerate or edit clientapp files.
5. Build coachapp and record compile failures caused by contract changes since the
   snapshot.
6. Reapply functional work as vertical slices. Each slice includes its data wiring,
   loading and error states, interaction, and one focused verification pass.
7. Commit each functional slice separately. Do not mix visual redesign work into a
   functional commit.

The initial restoration may not compile because the backend contract changed after
`b5d90e95`. Contract adaptation is the first functional slice, not a reason to copy
the Claude-based screens back into the recovery branch.

## UI rules during recovery

Reuse the restored app modules and the canonical modules documented in
`frontend/apps/coachapp-v2/AGENTS.md`.

Functional work may add the minimum markup needed for a supported state or action.
It must not introduce a new visual system. In particular:

- Do not copy prototype HTML or inline prototype styles.
- Do not add global theme tokens for a screen-specific value.
- Do not change shared visual modules unless the functional slice cannot be built
  through their interface.
- Use HeroUI props, existing semantic tokens, and established Tailwind patterns.
- Preserve accessibility, responsive behavior, and 44px interaction targets.

Future Claude design work is optional and separate. It must adapt to the coachapp
module interfaces and accept token mappings instead of requiring pixel equality.

## Protected scope

The recovery must not change these paths unless a later, separately approved
functional specification requires it:

- `frontend/apps/clientapp-v2`
- `backend`
- `frontend/packages`

Design references and specifications remain in the repository. They are evidence,
not runtime dependencies.

## Verification

For every functional slice:

- Run `pnpm -C frontend/apps/coachapp-v2 build`.
- Exercise the affected flow in the browser, including failure and empty states when
  applicable.
- Check mobile at 375px and desktop at 1280px when the slice changes rendered UI.

Before completion:

- Run `just check-rm`.
- Confirm the recovery diff against the archive branch contains no changes under
  `frontend/apps/clientapp-v2`.
- Confirm every selected functional specification has either been implemented or
  explicitly deferred.
- Keep the archive branch until the recovered coachapp has been accepted.

## Acceptance criteria

- Coachapp uses the visual system present at `b5d90e95`.
- Coachapp builds against the repository's supported backend contract.
- Selected functional changes work through the restored UI.
- Clientapp-v2 is byte-for-byte unchanged by the recovery branch.
- No Claude-specific theme expansion or screen hierarchy is copied into coachapp.
- The archive branch retains the discarded implementation for reference and rollback.
