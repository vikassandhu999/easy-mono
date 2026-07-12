# Plan: builder — content library hub + section pages

- **Design refs:** `design/projects/coachapp-v2-redesign/project/Coachez-Builder.dc.html` (desktop window 64–1459: sidebar 73–106, hub 108–227, section page 230–339, assigned modal 341–379, preview modal 381–591, PDF 593–770, see-all 772–823, assign 825–868, Spotter 870–1040, editor 1042–1456; mobile 1461–1526; logic 1534–2587)
- **App route + owning files:** `/library` (`src/library/library.tsx`) + 6 section list pages (`src/exercises/list-exercises.tsx`, `src/foods/list-foods.tsx`, `src/recipes/list-recipes.tsx`, `src/nutrition-plans/list-nutrition-plan.tsx`, `src/training-plans/list-training-plan.tsx`, `src/checkins/list-checkins.tsx`), shell nav `src/@components/app-shell.tsx`, routes `src/@config/routes.ts`
- **Viewports:** 1280px desktop, 375px mobile
- **States + interaction path:** sidebar → Builder group (expandable sub-nav) → hub. Hub: search, category tabs, Build new dropdown, recently-opened rail (after opening ≥1 template), group heading / see-all tile → section page. Section page: search + count, tile/list toggle, exercises muscle chips, highlights (favourite / last opened), card click → preview modal → Edit → existing editor. Card "⋯" → Favourite/Preview/Duplicate/Delete(confirm). Loading = skeletons; error = ErrorState; empty = per-design empty copy.

## Context

The app already has a `/library` hub (plain 6-tile grid) and full CRUD modules for all six types (Exercises, Foods, Recipes, Nutrition plans, Training plans, Check-in forms) with generated + hand-written RTK Query hooks. This pass redesigns the hub and section list pages to the Builder design and reuses every existing editor/builder/detail screen unchanged. The design's plan-editor window duplicates `plan-builder`/`checkin-builder`/forms — not rebuilt (decision 1).

## Measured Values

| Element | Property | Design value | Source (CSS/computed) | App choice (token/variant/utility) |
| --- | --- | --- | --- | --- |
| Hub h1 | font | Space Grotesk 32px w700 ls -.035em | line 113 | `font-grotesk text-[32px] font-bold tracking-[-0.035em]` |
| Hub subtitle | font/color | 13.5px #8A8A8E, bold counts #18181B, mt 10px | line 114 | `text-[13.5px] text-muted` + `font-semibold text-foreground` counts |
| Build new button | style | bg #18181B fg #fff, p 10px 17px, r 11px, 13.5px w600 | line 117 | dark `Button` (`bg-accent text-accent-foreground` app dark) |
| New menu | box | w 238px r 16px border #EEF1F5 p 7px, shadow 0 24px 60px -18px rgba(24,24,27,.42) | line 121 | HeroUI `Dropdown` menu, `rounded-2xl` |
| New menu section label | font | 10px w700 ls .06em uppercase #A1A1AA | line 122 | Dropdown section header utility |
| New menu item | style | 13px w600, p 9px 12px, r 10px, hover #F5F6F8; icon tile 26px r 8 #F1F3F6 | lines 123–127 | Dropdown item + icon tile span |
| Search field | style | bg #F1F3F6 r 11px p 10px 13px, input 13.5px, max-w 288px (hub) / 320px (section) | lines 137–139, 244 | `SearchField variant="secondary"` `max-w-xs` |
| Category tabs | segmented | container bg #F1F3F6 r 10px p 3px; tab 7px 14px r 8px 12.5px w600; active bg #fff shadow 0 1px 3px | lines 142–146 + `catTabs` 2173 | HeroUI `Tabs` (segmented) or `ToggleButtonGroup` |
| Hub scroll area | padding | 26px 36px 40px | line 150 | `Page.Content` px overrides `lg:px-9` |
| Recent rail label | font | Grotesk 12px w700 ls .08em uppercase #18181B + clock icon 15px | lines 153–155 | `font-grotesk text-xs font-bold uppercase tracking-[0.08em]` |
| Recent card | box | w 184px r 16px border #ECEEF2 p 15px 16px; icon 40px r 12; name Grotesk 14.5 w700 mt 12; type 12px #A1A1AA w600 mt 4 | lines 159–162 | horizontal scroll flex, `rounded-2xl border-separator` |
| Group heading | font | Grotesk 12px w700 ls .08em uppercase + count 12px #B4B4BB + chevron 14px #0091FF; hover bg #F1F4F8 | lines 170–174 | button row, chevron `text-link` |
| Template card | box | border 1px #ECEEF2 r 18px p 17px 18px; hover translateY(-2px) shadow 0 18px 36px -20px | line 177 | `rounded-[18px] border-separator bg-surface` + hover shadow |
| Card icon tile | box | 46px r 13px per-type bg/fg | line 180 + COLORS 1612–1618 | type registry classes (see Mapping) |
| Card name | font | Grotesk 16px w700 ls -.01em truncate | line 187 | `font-grotesk font-bold truncate` |
| Card meta | font | 13px #8A8A8E mt 4px | line 188 | `text-[13px] text-muted` |
| Card footer | layout | mt 15px pt 14px border-top #F1F4F8, 12px #8A8A8E; “· Updated X” | lines 191–193 | border-top row (assigned pill omitted, D-dev) |
| Card menu button | box | 30px r 9px top 15 right 14, hover #F1F3F6 | line 197 | icon `Button variant="ghost"` absolute |
| Card menu | box | w 184px r 14px border #EEF1F5 p 6px, same shadow; item 13px w600 p 9px 11px r 9px; danger #E5484D hover #FDEDEE | lines 201–206 | `Dropdown` + danger item |
| Fav star | badge | 16px #F5A623 top 17 right 48 | line 196 | lucide `Star` filled `text-[#F5A623]` |
| See-all tile | box | dashed 1.5px #DCE1E8 r 18 bg #FAFBFC; circle 34px #EAF5FF chevron #0091FF; label 13px w600 #0091FF | lines 213–215 | dashed tile, `text-link` + `bg-link-soft` circle |
| Empty state | copy | “Nothing here yet” 15px w600 #71717A / 13px #A1A1AA | lines 221–226 | existing `ListEmptyState` styling kept |
| Section back button | box | 38px r 12px border 1.5px #ECEEF2 | line 235 | `BackButton` styled |
| Section icon | box | 44px r 13px type bg/fg | line 236 | type registry |
| Section kicker | font | 11px w700 ls .06em uppercase #A1A1AA (“Builder section”) | line 238 | utility block |
| Section h1 | font | Grotesk 26px w700 ls -.025em | line 239 | `font-grotesk text-[26px] font-bold` |
| View toggle | segmented | bg #EDEFF3 r 10 p 3; buttons 32×28 r 8; active bg #fff shadow | lines 249–252 | `ToggleButtonGroup` icon buttons |
| Muscle chips | pill | p 8px 15px r 99 border #E4E7EC 13px w600; active bg #18181B fg #fff | lines 257–260 | `Chip`/`ToggleButton` pills (no counts, D-dev) |
| Highlight card | box | r 16 border #ECEEF2 p 14 15; role label 10.5 w700 uppercase (fav #F5A623, clock #71717A); icon 38 r 11; name Grotesk 14 w700; stat 11.5 #8A8A8E | lines 266–288 | grid 3 (2 shown: Favourite, Last opened) |
| Section grid | layout | tile: 2 cols gap 12; list: 1fr | line 293 + 2533 | grid classes toggled |
| Preview overlay | style | rgba(24,24,27,.25) blur(6px) | line 383 | `Modal` backdrop blur |
| Preview window | box | w 580 max-h 88% r 24, shadow 0 40px 90px -24px | line 384 | Modal content `rounded-3xl` |
| Preview header | layout | p 26 28 22 border-b #F1F4F8; icon 52 r 15; type 11 w700 uppercase #A1A1AA; h2 Grotesk 23 w700; meta 13 #71717A | lines 385–397 | header block |
| Preview inside label | font | 10.5px w700 ls .06em uppercase #8A8A8E mb 13 | line 402 | utility |
| Preview day/meal group | box | r 16 border #ECEEF2; header p 12 15 bg #F7F8FA border-b; n-badge 26 r 8 type colors; row p 11 15 border-t #F4F6F9, 13.5 w600 + 12 muted | lines 407–450 | list groups |
| Form question card | box | r 14 p 14 16; scale cells h 30 r 8 #F4F6F9; choice pills 7 14 r 99; photo dashed 52px | lines 458–491 | per-qtype renderers |
| Exercise stat cells | box | grid 3 gap 10, r 13 p 14 center, Grotesk 22 w700 + 11px uppercase muted | lines 506–518 | stat grid |
| Recipe macro strip | box | icon 64 r 14 + grid 4, Grotesk 18 w700 / 10px uppercase | lines 536–543 | macro strip |
| Preview footer | buttons | Duplicate/Edit bordered 1.5 #ECEEF2 r 12 p 11 16 13.5 w600; Assign bg #0A84FF fg #fff r 12 p 11 19 | lines 583–587 | secondary Buttons + `bg-link` Assign (blue = interactive per D12 prior pass) |
| Type colors | fg/bg | training #0091FF/#EAF4FF · nutrition #1F9D57/#E7F6EC · forms #7A5AF0/#EFEBFE · exercises #E08600/#FCF0DD · recipes #E5484D/#FDECEC | COLORS 1612–1618 | categorical identity palette, arbitrary values in type registry (Foods reuses nutrition green family, distinct icon) |
| Sidebar sub-nav | style | border-l 1.5px, item 13px w500 p 8 12 r 9, active filled; type-colored 15–16px icons | lines 85–97 | existing `SidebarNavGroupSection` (app dark-sidebar tokens) |
| Mobile hub header | layout | h1 27px, subtitle 12px, 40px dark + button, search, scrollable cat tabs + See all | lines 1472–1489 | responsive header |
| Mobile group card | row | r 16 p 13 icon 44 r 13, name 14.5 Grotesk, meta 12, chevron | lines 1500–1511 | list rows < `sm` |

## Differences

| # | Difference | Type | Action |
| --- | --- | --- | --- |
| 1 | Design's full plan-editor window (macOS modal, meal/day/item windows, time popovers, library panes) | structural | decision 1 → NOT rebuilt; reuse existing plan-builder / checkin-builder / exercise & recipe forms. Card/preview “Edit” navigates to existing routes. |
| 2 | “Library” renamed “Builder” | naming | decision 2 → adopt label “Builder” in sidebar, hub, bottom nav; keep `/library/*` URLs |
| 3 | Design has 5 types; app has 6 (Foods separate) | structural | decision 3 → Foods = 6th group styled identically |
| 4 | Recently opened rail + section “Last opened” highlight — no backend | data | decision 4 → localStorage recents |
| 5 | Favourites — no backend | data | decision 4 → localStorage favourites |
| 6 | Tile-click preview modal | structural | decision 4 → build shared preview modal using existing get-detail hooks |
| 7 | Spotter AI import (scan/upload/paste) | structural + backend | skipped (no backend AI feature; standing rule: no unasked backend features). Deviation. |
| 8 | PDF-style window + Share menu (WhatsApp/Messages/Email/Copy link) | structural + backend | skipped (no share-link backend). Deviation. |
| 9 | Assigned-count pill + avatar stack + assigned-clients modal | data | list APIs expose no per-template assignment counts → omit; footer shows meta/updated only. Deviation. |
| 10 | Draft cards (dashed amber) + Draft pill | data | no draft concept in backend (plans are active/archived) → omit. Deviation. |
| 11 | Section highlights “Most used” + “In progress” | data | no usage counts / drafts → show only Favourite + Last opened. Deviation. |
| 12 | Muscle chips with per-muscle counts | data | no per-muscle counts endpoint → chips without counts, single-select from `useListMusclesQuery` |
| 13 | “See all N” totals & header counts | data | available via list `count` — use it (limit-4 queries per group) |
| 14 | Design blue #0091FF/#0A84FF fills | visual | prior app-wide mapping (client-workspace D12): interactive blues → `--link`/`--link-soft`; per-type categorical colors kept as design values |
| 15 | Assign button in preview | workflow | plans: reuse existing assign flow (`plan-assign-control` pattern); forms: schedule flow; exercises/recipes/foods: no assign → hide button |
| 16 | Duplicate menu item | workflow | plans: `useDuplicate*Mutation`; exercises/recipes: `useCopy*Mutation`; forms/foods: hide if no endpoint |
| 17 | Assigned-clients “see-all” modal (mobile) | structural | dropped with #9 (no data); mobile cat tabs get no “See all” chip |
| 18 | Preview footer “Assign to client” button | workflow | omitted — assign flows live in the plan-builder screens (`plan-add-to-client`), reached via Edit; refines #15 |
| 19 | Hub subtitle template count | data | counts training/nutrition/forms/recipes only; Exercises/Foods lists include system databases (417 / 55k) that aren't coach templates |
| 20 | Hub single-category tab shows full grid in design | behavior | shows top-24 + “See all N” tile; the full infinite grid is the section page |
| 21 | Check-in forms section layout | structural | SUPERSEDED 2026-07-12 (user: match design exactly): forms now uses the standard SectionPage (search + count, view toggle, highlights, card grid); Templates tabs removed — purpose filter (All/Intake/Check-in) and "To review (N)" are design-style filter chips; `?tab=review` deep link still renders the review queue under the section header |
| 22 | Sidebar sub-nav icons type-colored in design | visual | keep app dark-sidebar tokens (uncolored icons, `bg-link` active) — consistent with app-wide nav mapping (D14) |
| 23 | Nutrition preview meal→foods rows | data model | renders the app's day model: day → slot rows (default meal + “N options”), meals resolved via plan-scoped `listMeals` |

## Decisions

| N | Question | Frozen answer |
| --- | --- | --- |
| 1 | Scope of this pass | Hub + 6 section list pages redesigned; existing editors/builders/detail screens reused unchanged (design's editor window not rebuilt) |
| 2 | “Library” → “Builder” rename | Adopt “Builder” label everywhere in UI; keep `/library/*` routes (no URL churn) |
| 3 | Foods placement | Foods is a 6th group styled like the design's 5 |
| 4 | Design-only extras | Include: localStorage recently-opened, localStorage favourites, preview modal. Exclude: Spotter import, PDF/share, assigned-count pills (no backend) |

## Mapping

| Design selector (region) | UI role | Existing owner | Structure rung | Style rung | Preserved behavior |
| --- | --- | --- | --- | --- | --- |
| sidebar Builder + sub-nav (83–99) | nav group | `app-shell.tsx` `LIBRARY_GROUP` / `SidebarNavGroupSection` | reuse component (relabel, reorder, type icons) | existing dark-sidebar tokens | NavLink active, collapse |
| hub (108–227) | library hub | `src/library/library.tsx` | rewrite page-local (same route) | semantic tokens + arbitrary radii; type registry | route, links to sections |
| type registry (TYPES/COLORS/ORDER 1536–1618) | shared constants | new `src/library/lib/builder-types.tsx` | page-local lib | arbitrary categorical colors | — |
| recents/favs (state.recent/favs) | client-side prefs | new `src/library/lib/recents.ts` (localStorage) | page-local lib | — | — |
| Build new menu (118–133) | create dropdown | HeroUI `Dropdown` | reuse component | matching radius/shadow | navigates to existing create routes |
| group cards (176–219) | template cards | new `src/library/components/template-card.tsx` | page-local component | tokens + arbitrary | click → preview; menu → fav/preview/duplicate/delete |
| section page (230–339) | list screens | 6 existing `list-*.tsx` + new shared `src/library/components/section-page-header.tsx` | add shared header/grid components, keep each page's data wiring (`BrowseListBox`/infinite queries) | tokens + arbitrary | search, infinite scroll, create routes, checkins review tab |
| preview modal (381–591) | read-only preview | new `src/library/components/template-preview.tsx` | page-local component (HeroUI Modal) | tokens + arbitrary | Edit → existing editor routes; Duplicate/Assign via existing mutations |
| mobile frame (1461–1526) | responsive variants | same components, responsive classes | — | — | bottom nav label Builder |

## Slices

- [x] **S1 — Shell naming + registry libs.** `app-shell.tsx`: LIBRARY_GROUP → label “Builder”, design section order (Training plans, Nutrition plans, Check-in forms, Exercises, Food recipes, Foods), per-type lucide icons; BOTTOM_NAV label “Builder”. New `src/library/lib/builder-types.tsx` (type key, labels, group label, icon, fg/bg classes, list/create/detail routes, ORDER) + `src/library/lib/recents.ts` (localStorage recents + favourites, few lines). States: group open/closed, active per section. Verifies rows: sidebar sub-nav, type colors.
- [x] **S2 — Builder hub.** Rewrite `library.tsx`: header (h1 Builder, counts subtitle summing 6 list `count`s), Build new dropdown (6 create items), search, category segmented tabs, recently-opened rail, grouped sections (top-4 cards via limit-4 list queries + search param), see-all tile, empty state; mobile variant (compact header, + button, scrollable tabs, row cards). New `template-card.tsx` with “⋯” menu (Favourite, Preview, Duplicate where endpoint exists, Delete + AlertDialog confirm, toasts via `toastMutationError`). States: loading skeletons, error, empty, search-no-match, menu open, delete confirm/pending, recents empty (rail hidden). Verifies rows: hub h1/subtitle/build-new/new-menu/search/cat tabs/recent rail/group heading/card/menu/see-all/empty/mobile.
- [x] **S3 — Section pages.** Shared `section-page-header.tsx` (back, icon tile, kicker, Grotesk title, Build new, search + count, tile/list toggle) + shared grid/list card rendering; apply to the 6 list pages keeping each page's existing queries, filters, `ListEmptyState`, and checkins templates/review tabs; exercises get single-select muscle chips; highlights row (Favourite + Last opened) on all sections. States: loading, error+retry, empty, filtered-empty, view toggle persistence (in-page state), muscle filter. Verifies rows: section back/icon/kicker/h1/toggle/muscle chips/highlights/grid.
- [x] **S4 — Preview modal.** `template-preview.tsx`: type-specific read-only content via existing detail hooks (training days→items, nutrition meals→foods, form questions incl. scale/choice/photo/text/number renderers, exercise stat cells + cues, recipe macros/ingredients/steps, food facts); footer Duplicate / Edit (navigate) / Assign (plans only, existing flow). Opening a preview records the item in recents. States: loading skeleton inside modal, error, per-type content, footer per capability. Verifies rows: preview overlay/window/header/inside label/day-meal groups/question cards/stat cells/macros/footer buttons.
- [x] **S6 — Exactness pass.** DONE 2026-07-12 (user follow-up "designs don't match exactly"): audited computed styles against design source values and fixed every visual delta. Segmented controls (hub category tabs + section view toggle) now use the app's `--segment` white-pill idiom with the design's exact geometry (active bg white, shadow 0 1px 3px rgba(24,24,27,.16), r 8px forced — HeroUI rescales `rounded-lg` to 6px); section back button 38×38 r 12 border 1.5 separator; Build-new shadow 0 6px 16px -6px (hub only — design's section button has none); subtitle 13.5px; card-menu popover w 184 r 14; build-new popover w 238 r 16; preview backdrop rgba(24,24,27,.25)+blur(6px), dialog r 24 (forced) + shadow 0 40px 90px -24px, header/body paddings 26/22, Duplicate = bordered white button, Edit r 12; group gap 30px; heading hover translate-x 2px; muscle chips `border-border` (#E4E7EC). Converted ALL semantic radius classes on design surfaces to explicit px — this app rescales Tailwind's radius tokens (`rounded-2xl`=12px, `rounded-xl`=9px, `rounded-lg`=6px), so day/meal groups, recent-rail cards, highlight cards, cue/ingredient rows, icon tiles and num badges were 3–6px under design until pinned. Note: Chrome at DPR 1 rounds 1.5px used border widths to 1px (verified on a bare test div) — CSS values are exact. Re-verified hub, exercises section, and training preview visually; build + lint clean.

- [x] **S5 — Full verification.** DONE 2026-07-12: browser pass at 1280px + 375px — hub (search server+client filtering, cat tabs incl. top-24+see-all, build-new menu, recent rail, fav star, duplicate→toast→list refresh, delete confirm→removal), sections (exercises muscle chips + count 63, infinite scroll 20→40, forms tabs preserved, mobile row cards + bottom nav), previews for all 6 types (training days, nutrition day-model, form question renderers, exercise stats+cues, recipe macros/ingredients, food facts; Edit navigates, Duplicate works). Computed values: h1 Space Grotesk 32px w700 ls −1.12px; card r 18px border=separator; icon tile 46px r 13px #EAF4FF/#0091FF; chevron `--link` — all exact. No console errors. `pnpm build` + lint clean (billing.tsx / generated.ts complaints pre-existing).
