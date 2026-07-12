# Design Implementation Progress

Downloaded Claude Design projects live in `design/projects/<project>/`; per-screen plans in `design/plans/<screen>.md`. Maintained by the `implement-claude-design` skill.

## Screens

| Screen | Design ref | Plan | Status | Notes |
| --- | --- | --- | --- | --- |
| client-workspace | coachapp-v2-redesign / `coachez- dashboard and client.dc.html` (Turn 2) | [client-workspace.md](plans/client-workspace.md) | verified | Added Assigned trainer + Subscription tabs, chat unread badge, mobile chip fix; verified at 1280px + 375px incl. extend flow, reassign picker, error toasts |
| nutrition-builder-editor | coachapp-v2-redesign / `Coachez-Builder.dc.html` (PLAN EDITOR block) | [nutrition-builder-editor.md](plans/nutrition-builder-editor.md) | verified | Restyle-only pass on existing nutrition plan builder (decision 9: no structure change): numbered green badges, hairline cards + hover lift, dashed add tiles, grotesk headers, green totals. Found+fixed app-wide `font-grotesk` no-op (`@theme` registration, RM-129) and promoted the Builder palette to semantic tokens (RM-109 now clean). Verified 1280+375 incl. all day/option flows |
| builder | coachapp-v2-redesign / `Coachez-Builder.dc.html` | [builder.md](plans/builder.md) | verified | /library hub + 6 section pages redesigned as "Builder" (label only, URLs kept); shared TemplateCard/SectionPage/TemplatePreview; localStorage recents+favs; existing editors reused; verified 1280px+375px incl. previews for all 6 types, duplicate/delete flows, infinite scroll, muscle chips. Exactness pass (S6): segmented white-pill tabs, bordered back button, popover/modal geometry, all radii pinned to design px (app rescales Tailwind radius tokens) |

Status values: planned → in-progress → verified.

## Decisions

| N | Screen | Question | Frozen answer | Date |
| --- | --- | --- | --- | --- |
| 1 | client-workspace | Which missing sidebar tabs to add? | Assigned trainer + Subscription (no price/billing rows). Trainer check-in REVISED: user declined new backend domain — tab not built | 2026-07-12 |
| 2 | client-workspace | Client "⋯" menu mapping (design: Pause/Cancel/Remove) | Keep Deactivate/Reactivate vocabulary; add destructive Remove client with confirm | 2026-07-12 |
| 3 | client-workspace | Chat Messages/Media toggle + media grid? | Skip for now (needs attachments-listing endpoint); deferred | 2026-07-12 |
| 4 | client-workspace | Detail tab design-only fields (goal card, personal rows, tags, emergency contact)? | Skip; style existing data per design; missing fields = approved deviations | 2026-07-12 |
| 5 | builder | Scope of Builder pass? | Hub + 6 section list pages; existing editors/builders reused, design's editor window not rebuilt | 2026-07-12 |
| 6 | builder | Rename Library → Builder? | UI label "Builder" everywhere; keep /library/* URLs | 2026-07-12 |
| 7 | builder | Foods (6th app section vs design's 5 types)? | Foods = 6th group styled identically | 2026-07-12 |
| 8 | builder | Design-only extras? | Include localStorage recents + favourites + preview modal; skip Spotter import, PDF/share, assigned-count pills | 2026-07-12 |
| 9 | nutrition-builder-editor | Rebuild design's editor/meal windows? | No — restyle existing builder in place; elements and behaviors stay, visuals adopt the design's editor vocabulary | 2026-07-12 |

## Deviations & changes

Per screen: approved deviations from the design (with decision number), behavior or scope changes, token remappings — anything a reviewer skimming this screen should know.

| Screen | Deviation / change | Why | Decision |
| --- | --- | --- | --- |
| client-workspace | Trainer check-in tab not built | User declined creating the backend domain; design-only concept | 1 (revised) |
| client-workspace | No "Remove client" menu/manage action for linked clients | Backend DELETE only revokes pending invitations (422 otherwise); cascade delete is a separate backend feature | 2 (blocked) |
| client-workspace | Chat Media toggle + shared-media grid skipped | Needs an attachments-listing endpoint | 3 |
| client-workspace | Detail: goal card, personal rows, tags, emergency contact omitted; Progress: body fat, muscle bars, health markers omitted | No backend fields/data | 4 |
| client-workspace | Subscription: price + next-billing cells omitted; "Pause/Cancel membership" = Deactivate | No per-client billing; app status vocabulary | 1, 2 |
| client-workspace | Trainer tab: stat cells (clients/rating/tenure), trainer history, Message trainer omitted | TeamMember has no such data; no history endpoint; no coach↔trainer conversations | — |
| client-workspace | Design blue fills/tiles (#0091FF/#E9F5FF) render as app dark accent/accent-soft; blue kept for links/active nav (`--link`, `--link-soft`, `--focus`) | Established app-wide token mapping from the prior workspace pass | 12 (plan diff) |
| builder | Design's plan-editor window (macOS modal, meal/day windows, time popovers) not rebuilt; Edit opens existing plan-builder/checkin-builder/form screens | Duplicates existing editors | 5 |
| builder | Spotter AI import, PDF-style share window (WhatsApp/Messages/Email/Copy link), assigned-count pills + avatar stacks + assigned-clients modal all skipped | No backend (AI import, share links, per-template assignment counts) | 8 |
| builder | Recents + favourites are localStorage-only (per device); draft cards/pills, "Most used"/"In progress" highlights, muscle-chip counts omitted | No backend fields for favs/drafts/usage counts | 8 |
| builder | Preview footer has Duplicate + Edit only (no Assign); forms/foods have no Duplicate | Assign lives in plan builders; no duplicate endpoints for forms/foods | 8 (plan diff 18) |
| builder | Hub subtitle counts only training/nutrition/forms/recipes; single-category tab shows top-24 + See-all (full grid = section page) | Exercises/Foods are system databases (417/55k); avoids duplicating section pages | plan diffs 19–20 |
| builder | Check-in forms section now uses the standard design SectionPage; purpose filter + "To review (N)" are filter chips (tabs removed); `?tab=review` deep link preserved | User overrode the earlier tabs compromise — exact design match | plan diff 21 (superseded) |
| builder | Sidebar sub-nav icons keep dark-sidebar tokens (not type-colored); type identity colors (design COLORS palette + teal for Foods) used on content icon tiles | App-wide nav token mapping (client-workspace D12) | plan diff 22 |
| builder / nutrition-builder-editor | Design palette + hairlines now live as `@theme` semantic tokens (`training/nutrition/…-soft`, `star`, `edge`, `edge-strong`) — no hex literals in UI code; `font-grotesk` registered in `@theme` (was a silent no-op app-wide) | RM-109 mechanical check was failing on main; RM-129 added to ledger | nutrition-builder plan diffs 10–11 |
| nutrition-builder-editor | Meal time pill/popover, drag-reorder grips, meal-window modal + right library panel not built; accordion + shared picker sheets keep their structure with design visuals | User directive: restyle only, no structure change; no backend fields for time/reorder | 9 |
