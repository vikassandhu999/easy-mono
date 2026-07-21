# FO / FD / FE design audit — 2026-07-21

Scope: Foods list (`FO`), seeded food detail (`FD`), and seeded food edit (`FE`) only. Compared at 1240×900 desktop and 390×844 mobile/touch against the matching reference images. The seeded food was **Whey Protein, Vanilla**. No edit was saved.

## Findings before fixes

| badge | width | what's wrong | pass | severity | proposed fix | status |
|---|---:|---|---|---|---|---|
| FE | 390 | Category and Source stack as full-width fields, while the reference keeps the pair side by side. | A-fidelity | medium | Keep the canonical fields but use a local two-column grid for this pair; do not change shared `FieldRow` pixels on other screens. | skipped — `FoodForm` also renders out-of-scope Create Food; changing shared `FieldRow` pixels or adding a one-off layout API would violate this run's scope/component rules. |
| FE | 390 | The mobile form opens with the Details legend and description before Images; the reference presents Images first, then a divider and the Details register above the text fields. | A-fidelity | medium | Reorder only the mobile presentation with responsive wrappers while preserving the desktop fieldset anatomy. | skipped — the anatomy is owned by `FoodForm`, shared with out-of-scope Create Food; a FE-only fork would duplicate the form. |
| FE | 1240 / 390 | The seeded custom food renders an empty Source input even though list/detail consistently present its null source as custom. | A-fidelity / B-consistency | medium | Use the existing custom fallback when mapping a food into edit-form values. | fixed — edit now displays `custom`; duplicate creation still deliberately clears Source. |
| FD | 390 | The hero, Nutrition, Serving sizes, and Notes regions run together without the mobile separators shown in the reference. | A-fidelity | medium | Add mobile-only separators/padding at the owning FD section boundaries; keep desktop unchanged. | fixed — the three content sections measure a 1px top border and 32px top padding at mobile; each remains 0px/0px at desktop. |
| FD | 1240 / 390 | Notes render muted gray; the reference uses normal foreground text on both widths. | A-fidelity | medium | Remove the muted text color from FD notes. | fixed — notes now inherit foreground color. |
| FD | error | The error state says “Food couldn't load…” instead of the required “Couldn't load food.” pattern. | B-consistency | low | Replace the copy only. | fixed — invalid-id route verified as “Couldn't load food. It may not exist, or you may not have access.” |

## Systemic

None. No finding appears on all three screens, so no shared-component change is justified.

## Measured baseline

- Desktop viewport: 1240×900. Document `scrollWidth`: FO 1240, FD 1240, FE 1240.
- Mobile viewport: 390×844 with mobile + touch. Document `scrollWidth`: FO 390, FD 390, FE 390.
- Mobile FE form: left 16, width 358, right 16. All measured visible inputs are 44px tall (textarea 90px); no visible interactive target measured below 44×44.
- Mobile FO and FD: no visible interactive target measured below 44×44.
- The canonical `size="content"` containers measured L240 / W1000 / R0 at desktop and L0 / W390 / R0 at mobile before their internal gutters. FO, FD, and FE use the same Page width token; no third content width was found.
- FO load-more baseline: 40 options before scrolling to the bottom; 60 options after the next page loaded.

## Not findings / skips

- **FO category filter:** not a finding. The missing backend `category` parameter is the already-recorded scope gap; it was not implemented.
- **Reference sample rows, images, dates, and profile counts:** not findings. Live data may differ from prototype data.
- **Reference-omitted live actions:** not findings. Create, Edit, Duplicate, and Delete remain intact.

## Verification after fixes

- Re-captured FO, FD, and FE at 1240×900 desktop and 390×844 mobile/touch. Viewport emulation was reset afterward.
- Final document `scrollWidth`: 1240 on every desktop route; 390 on every mobile route.
- Final mobile FE form geometry: L16 / W358 / R16. Final visible target check: 0 targets below 44×44 on FO, FD, and FE.
- Final FE first input values: `Whey Protein, Vanilla`, `Supplement`, `custom`. The form was not submitted or saved; the route was left by direct navigation.
- Final FD mobile section measurements: Nutrition, Serving sizes, and Notes each have a 1px top border and 32px top padding. At desktop those same three sections measure 0px border / 0px padding, so desktop pixels were not changed by the responsive fix.
- Final FO load-more: 40 options before bottom scroll → 60 after the next page loaded.
- Gates: cache cleanup target check found no `*.tsbuildinfo`; build passed; lint passed (Biome formatted one touched file); UI-contract check passed; recurring-mistakes check passed.
