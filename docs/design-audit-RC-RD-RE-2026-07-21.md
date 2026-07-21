# Recipes design audit — RC / RD / RE — 2026-07-21

Scope: `/library/recipes`, seeded **Chicken & Rice Bowl** detail, and its edit route. Compared at 1240×900 and 390×844 with mobile/touch emulation. No edit was saved.

## Findings

| badge | width | what's wrong | pass | severity | proposed fix | status |
|---|---:|---|---|---|---|---|
| RD | 390×844 | Detail sections run together without the mobile separators shown between the hero, Nutrition, Ingredients, Instructions, and Serving sizes. | A-fidelity | medium | Reuse one local responsive section class, matching the established food-detail pattern. | **fixed** — all four content sections now measure a 1px top border on mobile and 0px on desktop. |
| RE | both | Loaded, loading, and error bodies use guttered `Page.Content` directly instead of the required `bare` content plus `Page.Frame size="content"` anatomy. | B-consistency | low | Wrap each body in the canonical content frame without hand-written centring or width classes. | **fixed** — all three states now use `bare` content plus the canonical content frame. |
| RD | both | The error state says “Recipe couldn't load. It may not exist, or you may not have access” instead of the canonical “Couldn't load recipe.” copy. | B-consistency | low | Use the established recipe error copy. | **fixed** — forced with `/library/recipes/not-a-real-recipe` and observed “Couldn't load recipe.” |
| RD | both | The loading header omits the Back affordance that is present in the loaded and error headers. | B-consistency | low | Render the same Back + Recipe title anatomy while loading. | **fixed** — loading, error, and loaded code paths now render Back + Recipe. |

## Systemic

None. The findings are owned by the recipe detail or recipe edit screen; no issue appears on all three audited routes.

## Baseline measurements

- RC desktop: document `scrollWidth=1240`, `innerWidth=1240`; Page candidates `L240 W1000 R0` (outer app content; canonical frame is nested within it).
- RC mobile: document `scrollWidth=390`, `innerWidth=390`; rows measured `L0 W390 R0`, each 68px tall.
- RD desktop: document `scrollWidth=1240`, `innerWidth=1240`; header and frame outer candidates both `L240 W1000 R0`.
- RD mobile: document `scrollWidth=390`, `innerWidth=390`; each content section measured `L16 W358 R16`; visible action targets measured 44px tall.
- RE desktop: document `scrollWidth=1240`, `innerWidth=1240`; header outer candidate `L240 W1000 R0`.
- RE mobile: document `scrollWidth=390`, `innerWidth=390`; Name, Instructions, and Cooked weight fields measured `L16 W358 R16`; field heights were 44px, 114px, and 44px.

## Preserved / not findings

- **RC — not a finding:** seeded data and calorie totals differ from the static reference; sample data differences are excluded by the audit prompt.
- **RC — not a finding:** the list remains on strict `BrowseRow`; its mobile full-bleed surface and inset row contents follow the current shared browse-list contract.
- **RD — not a finding:** ingredient rows, macro summary, Duplicate, and detail-page Delete are live features and remain intact.
- **RE — not a finding:** the form's live ingredient controls, nutrition calculation, and serving-size editor remain intact. The screen was inspected without saving.

## Verification closeout

- Re-captured RC, RD, and RE at 1240×900 and 390×844 after the fixes; all screenshots were compared directly with their matching references.
- Final RC desktop: `scrollWidth=1240`, list `L273 W934 R33`, 3 options. Final RC mobile: `scrollWidth=390`, list `L0 W390 R0`, 3 options; row heights `[68, 68, 68]`.
- Final RD desktop: `scrollWidth=1240`; Nutrition, Ingredients, Instructions, and Serving sizes each `L272 W936 R32`, with `borderTopWidth=0px`. Final RD mobile: `scrollWidth=390`; the same sections each `L16 W358 R16`, with `borderTopWidth=1px`.
- Final RE desktop: `scrollWidth=1240`, form `L272 W936 R32`. Final RE mobile: `scrollWidth=390`, form `L16 W358 R16`.
- Infinite list proof (`/library/exercises`, because RC has too few seeded rows): option count **40 before → 60 after** scrolling `.easy_main-content` to the bottom; scroll height **2871 → 4231** and viewport client height **776**. Load-more fired.
- RE was left through **Cancel**; the resulting URL was the Chicken & Rice Bowl detail route. No edit was saved.
- Gates passed: clean `.tsbuildinfo` check (no matching file existed), coachapp build, coachapp lint (220 files, no fixes), UI-contract check, and recurring-mistakes check. Vite emitted its existing generated-CSS syntax/chunk-size warnings; the build exited 0.
- **Skipped:** nothing in the RC/RD/RE scope.
