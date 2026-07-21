# Exercises trio design audit — 2026-07-21

Scope: EX (`/library/exercises`), EP (`/library/exercises/2ffd0169-bd2c-4dd9-b623-606940fb68d3`), and ED (`/library/exercises/2ffd0169-bd2c-4dd9-b623-606940fb68d3/edit`). The selected custom exercise, **Toes to Bar (copy)**, has anatomy close enough to the references, so no audit-only exercise was created.

## Findings (pre-fix)

| badge | width | what's wrong | pass | severity | proposed fix | status |
| --- | --- | --- | --- | --- | --- | --- |
| ED | desktop / 1720 | The loaded, loading, and error bodies use guttered `Page.Content` without `Page.Frame size="content"`; the form therefore expands beyond the canonical 1024px column on wide viewports. | B-consistency | high | Make `Page.Content` bare and wrap every state body in `Page.Frame size="content"`. | fixed — all three states now use the canonical frame |
| EP | desktop / 1720 | Loading and error bodies are also unframed. The loaded body is correctly framed, so the column changes between states. | B-consistency | high | Reuse the loaded state's bare `Page.Content` + `Page.Frame size="content"` shape for loading and error. | fixed — loading/error now match loaded anatomy |
| ED | 390 | Mechanics and Force stack, while ED-mobile keeps this short pair side-by-side. | A-fidelity | high | Pass `className="grid-cols-2"` to the existing `FieldRow`. | fixed — measured as two 171px columns |
| EP | loading | The loading header omits the Back button even though error and loaded headers include it. | B-consistency | medium | Use the same Back + title header anatomy in all three states. | fixed — Back + title now render in loading |
| ED | 390 | The mobile form shows the desktop `Details` legend and description before Images. The established form pattern and ED-mobile put Images first, then a separated mobile Details heading. | A-fidelity | medium | Reuse the responsive visibility pattern from `foods/food-form/food-form.tsx`. | fixed — Images lead, followed by the mobile Details divider |
| EX | 390 | Search and muscle filter split the toolbar nearly evenly; the search placeholder clips (`Search exercis`) while the reference gives search the larger track. | A-fidelity | medium | Give the filter a bounded mobile width while leaving search flexible. | fixed — full search placeholder is visible at 390px |
| EP | error | Error copy is `Exercise couldn't load...`, not the canonical `Couldn't load exercise.` | B-consistency | low | Use the canonical copy. | fixed — bad-id state verified with canonical copy |
| EP | both | The reference includes Cues, but the API has no cues field. | A-fidelity | low | None; this is the explicit scope gap. | not-a-finding — required omission |
| ED | both | The shipped multi-image URL adder goes beyond the static reference. | A-fidelity | low | Keep it. | not-a-finding — kept feature |

## Systemic

- Unframed create/edit/detail bodies: EP loading/error and all ED states omit the canonical `Page.Frame size="content"`. The out-of-scope Create Exercise sibling has the same unframed shape. The fix stays in EP/ED because changing Create is forbidden by this run's screen scope.

## Initial measurements

- EX at 1240×900: canonical header/toolbar/list frames `L240 W1000 R0`; document `scrollWidth=1240`. At 390×844: list `L0 W390 R0`, document `scrollWidth=390`.
- EP at 1240×900: header/body frames `L240 W1000 R0`; document `scrollWidth=1240`. At 390×844: header/body frames `L0 W390 R0`; document `scrollWidth=390`; visible Back/Edit/Duplicate/Delete targets are 44px tall.
- ED at 1240×900: only the header resolves to the canonical `L240 W1000 R0`; the form has no max-width frame. At 390×844: form `L16 W358 R16`; document `scrollWidth=390`; visible controls are at least 44px tall.

## Final verification

- EX at 1240×900: header/toolbar/list frames remain `L240 W1000 R0`; document `scrollWidth=1240`. At 390×844: document `scrollWidth=390`; the full `Search exercises…` placeholder is visible. Infinite list option counts were observed as **20 → 40 → 60 → 80**; after each scroll the page height increased and the main page remained scrollable.
- EP at 1240×900: header/body frames `L240 W1000 R0`; document `scrollWidth=1240`. At 390×844: header/body frames `L0 W390 R0`; document `scrollWidth=390`. The bad-id state renders Back, `Exercise`, and `Couldn't load exercise.` inside the same frame. The Cues omission remains the recorded scope gap.
- ED at 1240×900: header/body frames `L240 W1000 R0`; document `scrollWidth=1240`. At 390×844: header/body frames `L0 W390 R0`; document `scrollWidth=390`; Mechanics `L16 W171` and Force `L203 W171 R16`. At 1720×900: the 1024px form column is centered in the 1480px app pane: viewport measurements `L468 W1024 R228` (228px on either side after the 240px rail).
- ED was left with browser Back; no field was changed and no save action was used. No audit exercise was created or deleted.

## Gates

- `pnpm -C frontend/apps/coachapp-v2 build` — pass (existing generated CSS and chunk-size warnings only).
- `pnpm -C frontend/apps/coachapp-v2 lint` — pass; no fixes applied.
- `./scripts/check-ui-contract.sh` — pass.
- `./scripts/check-rm.sh` — pass.
- `git diff --check` — pass.

## Skipped and out-of-scope

- No in-scope finding was skipped.
- Create Exercise has the same unframed-body shape, but this run explicitly limits screen changes to EX/EP/ED. It is named here for the next create-screen audit and was not edited.
