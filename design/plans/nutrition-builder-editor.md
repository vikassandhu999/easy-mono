# Plan: nutrition-builder-editor — restyle pass

Design refs: `design/projects/coachapp-v2-redesign/project/Coachez-Builder.dc.html` — PLAN EDITOR block (lines 1042–1268): editor header, flat meal rows (L1098–1141), MEAL WINDOW food cards + library (L1180–1267), dashed add tiles, popovers.
App route: `/library/nutrition-plans/:id` — `src/nutrition-plans/plan-builder/*` (nutrition-plan-builder, plan-header, meals-list, meal-card, meal-item-row, plan-days).
Viewports: 1280px, 375px.
States: loaded plan with meals+items, empty meal, multi-day days section, hover states on rows/adds, accordion open/close, delete-day dialog. Interaction path: login admin@example.com → /library/nutrition-plans → open a plan.

**Scope (user directive 2026-07-12):** NO structure change. Existing page layout, accordion, sheets, and behaviors stay exactly as they are; only the visual design is updated to the mockup's editor vocabulary. The design's macOS editor window, meal window modal, time pill/popover, and right-hand library panel are NOT built.

## Measured Values

| Element | Property | Design value | Source | App choice |
| --- | --- | --- | --- | --- |
| Meal row card (L1101) | border / radius / padding | 1.5px solid #ECEEF2 / 15–16px / 13–15px | source | `border-[1.5px] border-separator rounded-[16px] p-[15px]` |
| Row hover (L1082) | shadow / transform / border | 0 14px 30px -18px rgba(24,24,27,.5) / translateY(-1px) / #DCE1E8 | source | same arbitrary values (closed cards only) |
| Number badge, row (L1083) | size / radius / font / colors | 30px / 9px / 12px 700 / #1F9D57 on #E7F6EC | source | `size-[30px] rounded-[9px] text-xs font-bold text-[#1F9D57] bg-[#E7F6EC]` |
| Number badge, item (L1222) | size / radius / font | 24px / 7px / 11px 700, same colors | source | `size-6 rounded-[7px] text-[11px]` |
| Row name (L1085) | font | Space Grotesk 15px 700 −.01em | source | `font-grotesk text-[15px] font-bold tracking-[-0.01em]` |
| Row meta (L1086) | font / color | 12px #8A8A8E | source | `text-xs text-muted` |
| Section title (L1074) | font | Space Grotesk 15px 700 −.01em | source | same |
| Section subtitle (L1075) | font / color | 12.5px #8A8A8E, "{n} {unit} · …" | source | `text-[12.5px] text-muted` |
| Delete icon btn (L1089/1136) | size / radius / colors | 30px / 9px / #B4B4BB → hover bg #FDEDEE color #E5484D | source | `size-[30px] rounded-[9px] text-muted/70 hover:bg-[#FDEDEE] hover:text-[#E5484D]` |
| Green icon/pill (L1088/1130) | colors / radius | #1F9D57 on #E7F6EC, 9px | source | same arbitrary values (chevron tile = accordion affordance) |
| Dashed add, structure (L1094/1140) | border / radius / padding / font / hover | 1.5px dashed #D2D6DD / 14px / 13–14px / 13px 600 #8A8A8E / #0A84FF + #F4F9FF | source | `border-[1.5px] border-dashed border-[#D2D6DD] rounded-[14px] text-[13px] font-semibold text-muted hover:border-link hover:text-link hover:bg-link-soft` |
| Dashed add, item (L1239) | radius / padding / font / hover | 13px / 12px / 12.5px 600 / #1F9D57 + #F1FBF4 | source | green hover arbitrary values |
| Food item card (L1220) | border / radius / padding | 1.5px #ECEEF2 / 14px / 12px 14px | source | `rounded-[14px] border-[1.5px] border-separator px-3.5 py-3` |
| Item name (L1223) | font | Space Grotesk 14px 600 | source | `font-grotesk text-sm font-semibold` |
| Amount field (L1231) | bg / border / radius / font | #F7F8FA / 1px #ECEEF2 / 9px / 12.5px #52525B, padding 6px 10px | source | `rounded-[9px] border border-separator bg-surface-secondary px-2.5 py-1.5 text-[12.5px]` |
| Kicker (L1188) | font | 10.5px 700 uppercase .07em #A1A1AA | source | existing kicker style (not used — no window header) |
| Editor name input (L1063) | font | Space Grotesk 20px 700 −.02em | source | `font-grotesk text-[20px] font-bold tracking-[-0.02em]` on plan-name input |
| Nutrition identity (COLORS) | fg / bg | #1F9D57 / #E7F6EC | source JS | arbitrary values (matches builder pass) |

## Differences

| # | Difference | Type | Action |
| --- | --- | --- | --- |
| 1 | Design editor is a macOS modal window over the Builder page; app is a routed page with back button | structural | Decision 9 (user): keep app structure, restyle only |
| 2 | Design meal rows open a separate MEAL WINDOW modal with food cards + right library panel; app expands an inline accordion | structural | Decision 9: accordion stays; its body adopts the meal-window food-card visuals; expand affordance = green chevron tile (design's green "Open" pill mapped) |
| 3 | Meal time pill + frosted time popover | scope | Skip — no backend field (no-unasked-backend-features); logged deviation |
| 4 | Drag-to-reorder grip on rows | scope | Skip — no meal-reorder endpoint; subtitle says "tap to edit" only |
| 5 | Right-hand food library panel; app uses shared SearchPickerSheet (builder-kit, shared with training) | structural | Keep existing sheet unrestyled this pass — shared component |
| 6 | Days section (day tabs, weekday strip, slot options) has no counterpart in the design's nutrition editor (flat meals) | visual | Autonomous: apply same card/badge/dashed vocabulary; weekday + Default chips use nutrition green |
| 7 | Design dark editor header band with Save button; app header = BackButton + Assign + actions, autosave | structural | Decision 9: keep app header; plan-name input gets design typography |
| 8 | Meal/day total cards (app-only elements, currently accent-blue tint) | visual | Recolor to nutrition green tint (#E7F6EC family) per design identity |
| 9 | Design icon buttons 24–30px < app 44px target rule | visual | Follow builder-pass precedent (38px back btn etc.); whole-row targets stay large |
| 10 | `font-grotesk` utility didn't exist — `--font-grotesk` lived in `:root` only, so ALL grotesk classes app-wide silently rendered Inter | tooling bug found during verify | Fixed: registered in `@theme` (index.css); ledger RM-129 |
| 11 | Hex literals violate RM-109 (`just check-rm` was failing on committed main from the builder pass) | tooling | Fixed root-cause: design palette promoted to `@theme` semantic tokens (`training/nutrition/forms/exercises/recipes/foods` + `-soft`, `star`, `edge`, `edge-strong`); swept builder + plan-builder files; one-offs mapped (`#F1FBF4`→`nutrition-soft/50`, `#FAFBFC`→`surface-secondary/30`, delete hover→`danger-soft`/`danger`). check-rm all clean |

## Decisions

| N | Question | Frozen answer |
| --- | --- | --- |
| 9 | Rebuild design's editor window/meal window structure? | No — user (2026-07-12): "Elements stay where they are and how they are, just change the designs to match the new interactions." Restyle-only pass on the existing builder. |

## Mapping

- Editor header name input → plan name → `plan-header.tsx` FormTextField → style rung: utilities (grotesk 20px).
- Section title+subtitle (L1074–75) → MEALS/DAYS/Plan details headings → `meals-list.tsx`, `plan-days.tsx`, `plan-header.tsx` → replace uppercase SectionHeading with local grotesk heading + muted count subtitle → keep collapse-all/add-day actions.
- Flat meal row (L1101) → MealCard header → `meal-card.tsx` → structure kept (toggle, inline rename, ⋯ menu); style rung: utilities + arbitrary design values; number badge added (index prop from meals-list); meal-total text moves under the name as the design's meta line; green chevron tile = expand affordance.
- Meal-window food card (L1220) → MealItemRow → `meal-item-row.tsx` → card visuals, number badge (index prop), amount as soft field-look pill; tap behavior unchanged.
- Dashed add tiles (L1094/1140/1239) → Add meal / Add food or recipe / Add option → respective files; blue hover for structure-level, green for item-level.
- Delete/trash hover (L1136) → menu triggers + day rename/delete icon buttons → utilities.
- Slot option row / Default chip / weekday strip / totals → `plan-days.tsx` → design vocabulary, nutrition green.

## Slices

- [x] S1 plan-header: grotesk heading, name input typography (files: plan-header.tsx; re-checks: name input, section title rows)
- [x] S2 meals: section header + MealCard chrome + badges + menu/chevron tiles + dashed Add meal (files: meals-list.tsx, meal-card.tsx; re-checks: meal row card, badges, hover, dashed add rows)
- [x] S3 meal items: MealItemRow food-card style + amount field + dashed Add food + green total card (files: meal-item-row.tsx, meal-card.tsx; re-checks: food item card, amount field, item badge, dashed item add)
- [x] S4 days: headers, weekday strip, slot option rows, Default chip, dashed Add option, day total, icon buttons (files: plan-days.tsx; re-checks: row card, delete hover, dashed add)
- [x] S5 verify at 1280/375 (computed styles vs Measured Values), build, lint touched files, progress.md

Verified 2026-07-12: computed audit on meal card (border 1.5px→1px used-value rounding as established, radius 16px, badge 30px/9px `#E7F6EC`/`#1F9D57`, header pad 15px, name Space Grotesk 15px 700 −0.15px), dashed tiles (1.5px dashed `#D2D6DD`, 14px, 13px 600), item card 14px/hairline. Flows re-tested with restyle: expand/collapse, add option (Select), add day, tabs + weekday strip + rename/delete buttons, delete day (dialog), remove option (menu) — all behaviors unchanged. 1280px + 375px screenshots clean. Post-token-sweep recheck: identical computed rgb values via `bg-nutrition-soft` etc.; `just check-rm` all clean; build green.
