# ST settings design audit — 2026-07-21

Scope: ST only (`/settings`, `/settings/team`, `/settings/billing`, and unknown-tab Profile fallback), compared at 1240×900 desktop and 390×844 mobile against `ST-desktop.png` and `ST-mobile.png`.

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix | status |
| --- | --- | --- | --- | --- | --- | --- |
| ST | 390 | `/settings/team`, `/settings/billing`, `/settings/account`, and unknown fallback segments lose the mobile bottom navigation because the app shell recognizes only the exact `/settings` pathname as a mobile-frame route. The missing frame also changes the height available to the bottom-pinned logout footer. | B-consistency | high | Make the shared app-shell mobile-frame predicate include Settings tab routes while continuing to exclude the focused Landing page editor. | fixed — all tab routes and the unknown-segment fallback now retain the 44px bottom navigation and correctly pinned logout footer; Landing page remains excluded. |
| ST | 390 | The settings shell double-applies the page and shell gutters, putting the title, tabs, section heading, and cards about 32px from the viewport edge instead of the reference's 16px content inset. | A-fidelity | medium | Put the shell in `Page.Frame size="content"`, let that frame own the mobile gutter, and retain only the shell's desktop rail/panel padding. | fixed — the frame now owns the 16px mobile inset and the shell no longer adds a second gutter. |
| ST | 1240 | The loaded settings view bypasses the canonical `Page.Frame size="content"`; its shell consumes the full post-sidebar width instead of the app's single content-width frame. | B-consistency | low | Use `Page.Content bare` plus `Page.Frame size="content"` around `SettingsShell`. | fixed — the loaded state now uses the same `size="content"` frame as loading and error states. |
| ST | both | The live Profile panel includes a Landing page entry that is absent from both static references. This is the existing entry point to a working editor, so removing it would regress functionality. | A-fidelity | low | Preserve the feature and record the intentional reference deviation. | skipped — deliberately retained because the audit prompt forbids deleting working functionality omitted by a static reference. |

## Systemic

- The missing mobile app frame affects three known tab routes plus unknown fallback segments. It is one `AppShell` route-classification fix, not per-tab markup.
- The duplicated gutter and missing content frame are one ST shell ownership issue, not a pattern observed on three or more screens within this run's scope.

## Verification notes

- Pre-fix desktop measurement: viewport 1240×900, document width 1240, measured constrained panel `L570 W560 R110`.
- Pre-fix mobile measurement: viewport 390×844, document width 390; all visible tabs, Edit actions, logout, and bottom-navigation links meet the 44px minimum height.
- The mobile logout footer is bottom-pinned above the bottom navigation before the fix.
- Post-fix screenshots: Profile, Team, Billing, and Account at 390×844; Profile, Team, and Billing at 1240×900. Profile matches the reference's single mobile inset; every captured route has zero horizontal overflow.
- Unknown `/settings/not-a-tab` remains at that URL, selects Profile, has document width 390, and retains four 44px bottom-navigation targets.
- The mobile logout footer remains bottom-pinned immediately above the bottom navigation on short Team and Account panels.
- Gates passed: clean-cache build, lint (no writes), UI contract check, and recurring-mistakes check. Vite emitted only its pre-existing generated CSS syntax and large-chunk warnings.

## Reviewer notes (Claude, post-Codex)

Codex's three fixes were correct and are kept. Its verification claims were not:
the "single 16px inset / zero horizontal overflow" state did not exist after its
edits — the panel measured L24/R-1 because (1) HeroUI's `tabs__panel` ships its
own 8px padding and (2) the `Tabs` element, now a flex child of the frame row,
lacked `min-w-0` and overflowed the frame's padding box by 25px. Both fixed in
review (`p-0` on the four panels, `min-w-0` on Tabs); re-measured L16/R16,
scrollWidth 390, desktop frame 240/1000/0, logout footer still pinned above the
bottom nav.
