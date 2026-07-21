# DB dashboard design audit — 2026-07-21

Scope: DB only, route `/dashboard`, compared directly with `DB-desktop.png` at 1240×900 and `DB-mobile.png` at 390×844 (mobile + touch).

## Findings

| badge | width | what's wrong | pass | severity | proposed fix | status |
|---|---|---|---|---|---|---|
| DB | desktop + mobile | No actionable presentation drift found after applying `GAPS.md` and the run's live-feature/data-state exceptions. | A-fidelity / B-consistency | — | None. | not-a-finding — current UI matches the reference structure and approved component decisions. |

## Systemic

None. This audit is intentionally limited to DB, so no cross-screen systemic claim was made.

## Measured geometry

- Desktop 1240×900: document `scrollWidth` 1240; dashboard page L240 / R0 / W1000 (the L240 desktop sidebar); wide header and frame L240 / R0 / W1000, with 32px inner content insets from the page edge.
- Mobile 390×844 with mobile + touch: document and body `scrollWidth` 390; wide header and frame L0 / R0 / W390, with 16px inner content insets; the scroll container measured `scrollHeight` 1018 / `clientHeight` 776 at the captured data state.
- Mobile Settings avatar link: L330 / T26 / W44 / H44 and `href=/settings`.

## Preserved live features and resolved differences

- Setup cell: kept. It is absent in the captured account state because `dashboard_setup_hidden_reason` has already hidden it; source retains loading, error, ready, dismiss, undo, completion, and next-step navigation states.
- Stat bar: kept pressable; both cells still deep-link to `/clients`.
- Priority queue: kept. The GAPS-approved status chips intentionally replace the reference's colored left stripes.
- Recent conversations: kept, including unread state and Inbox navigation.
- Quick actions: kept. They continue below the mobile reference crop and remain visible by scrolling.
- Mobile Settings: kept as the 44×44 avatar link in the header, the only sub-lg Settings entry point.
- `Page.Content` and dashboard frames retain the deliberate no-`min-h-0` behavior.

## Verification status

- Fix phase: no code change made; there was no verified defect to fix.
- Post-audit desktop screenshot at 1240×900: compared directly with `DB-desktop.png`; measured document/body `scrollWidth` 1240, page L240, content L272 / R32.
- Post-audit mobile screenshot at 390×844 with mobile + touch: compared directly with `DB-mobile.png`; measured document/body `scrollWidth` 390, content L16 / R16, scroll container `scrollHeight` 1018 / `clientHeight` 776.
- Tall-content scrolling: reached `scrollTop` 242, equal to `scrollHeight - clientHeight` (242). Quick actions were present at the bottom.
- Stat-bar interaction: pressing Active clients navigated to `/clients`.
- Mobile Settings interaction: pressing the avatar navigated to `/settings`.
- Viewport reset to desktop 1240×900 after mobile capture.
- Gates passed: clean `.tsbuildinfo` check (none present), app build, app lint (220 files; no fixes), UI-contract check, and recurring-mistakes check. The build emitted existing dependency CSS-minification and chunk-size warnings but exited successfully.
- Nothing was committed, staged, stashed, or checked out; no Git command was run.
