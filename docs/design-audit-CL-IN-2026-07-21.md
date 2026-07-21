# CL / IN design audit — 2026-07-21

Scope: CL (`/clients`) and IN (`/clients/invite`) only. Compared live at 1240×900 and 390×844 against the four named reference images.

## Findings

| badge | width | what's wrong | pass (A-fidelity / B-consistency) | severity | proposed fix | status |
|---|---|---|---|---|---|---|
| CL | desktop + mobile | The reference includes a `Last active` sort control; the shipped toolbar has no sort control. On mobile that also leaves search full-width instead of sharing the row with the square sort action. | A-fidelity | medium | Do not add a no-op control. Add this only with a real sortable last-active field and handler; the current client-list data has neither and this audit forbids data-hook changes. | skipped — unsupported by the scoped presentation layer |

## Systemic

None. The single finding is confined to CL.

## Not findings

| badge | width | observation | reason |
|---|---|---|---|
| CL | desktop + mobile | Live client names, statuses, counts, and list length differ from the reference. | Account data is explicitly excluded from fidelity findings. The two old pending invites, when present, are likewise data. |
| CL | desktop + mobile | Rows have no WhatsApp/message shortcuts or unread badge. | Their removal is an explicit product decision in this run's brief. |
| CL | desktop + mobile | The client row does not use `BrowseRow`. | It deliberately owns a five-track `ListBox.Item` on `LIST_ITEM_CLASS`. |
| CL | mobile | The selected filter has a grey count badge. | This is the deliberate richer CL variant; other lists use `FilterCount`. |
| IN | desktop + mobile | Seat usage reads `49 of 100` rather than the reference's `40 of 50`. | Account data differs; the meter structure and treatment match. |
| IN | desktop + mobile | Assigned trainer is absent for this account. | The current account has no alternate active trainer, so the conditional field has no choice to offer; inventing one would add a non-functional control. |
| IN | desktop + mobile | Desktop uses the canonical `size="content"` width rather than the narrower-looking prototype card. | `coachapp-v2/AGENTS.md` is higher authority and requires one content width for lists and forms. |

## Baseline measurements

| badge | width | geometry |
|---|---|---|
| CL | 1240×900 | Root `scrollWidth=1240`; canonical content wrappers measured `L240 W1000 R0` before their internal gutters. |
| CL | 390×844 | Root `scrollWidth=390`; page/frame wrappers measured `L0 W390 R0`; no interactive target below 44px was found in the mobile query. |
| IN | 1240×900 | Root `scrollWidth=1240`; canonical header/body wrappers both measured `L240 W1000 R0`. Inputs measured 40px high, matching `INPUT_SKIN_CLASS` desktop behavior. |
| IN | 390×844 | Root `scrollWidth=390`; canonical header/body wrappers both measured `L0 W390 R0`. Fields and actions measured `L16 R16` where full-width, and all interactive targets measured at least 44px high. |

## Verification

- Final CL desktop (1240×900): root `scrollWidth=1240`; visible list `L272 W936 R32`.
- Final CL mobile (390×844, mobile + touch): root `scrollWidth=390`; visible list `L0 W390 R0`.
- Final IN desktop (1240×900): root `scrollWidth=1240`; form `L272 W936 R32`.
- Final IN mobile (390×844, mobile + touch): root `scrollWidth=390`; form `L16 W358 R16`; sticky footer `L0 W390 R0`, bottom inset `0`.
- Browser viewport emulation was reset to 1240×900 after capture.
- No invite was submitted, so this audit created no client or pending-invite data.
- `pnpm -C frontend/apps/coachapp-v2 build` — passed (existing generated CSS and chunk-size warnings only).
- `pnpm -C frontend/apps/coachapp-v2 lint` — passed; no fixes applied.
- `./scripts/check-ui-contract.sh` — passed.
- `./scripts/check-rm.sh` — passed (`check-rm: all clean`).
