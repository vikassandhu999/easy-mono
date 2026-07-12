# Plan: client-workspace — coach single-client workspace

- **Design refs:** `design/projects/coachapp-v2-redesign/project/coachez- dashboard and client.dc.html` (Turn 2 Clients screen: desktop lines 389–830, mobile 873–1201, logic 1640–2296)
- **App route + owning files:** `/clients/:id` (`src/clients/client-detail.tsx`) + `/clients/:id/messages` (`src/messages/client-conversation.tsx`), shell `src/@components/client-workspace-shell.tsx`, tab registry `src/clients/lib/client-workspace.ts`, panels `src/clients/components/*`
- **Viewports:** 1280px desktop (sidebar rail visible), 375px mobile (header + chips row)
- **States + interaction path:** clients list → click client → workspace (`tab=progress` default). Each tab via sidebar item (desktop) / chip (mobile). Client menu via "⋯" in sidebar header. Subscription extend via "Extend subscription" row → popover. Trainer change via "Change trainer" → picker. Trainer check-in composer inline on its tab. Loading = workspace fallback skeleton; error = ErrorState; pending client = InvitationWidget on progress tab.

## Context

The workspace shell + Progress/Nutrition/Training/Client check-in/Detail tabs were already implemented against this design in a prior pass and match closely. This plan covers the **remaining deltas**: three new tabs (Assigned trainer, Subscription, Trainer check-in incl. new backend domain), client-menu Remove action, sidebar chat unread badge, and a full re-verification of existing tabs.

## Measured Values

| Element | Property | Design value | Source (CSS/computed) | App choice (token/variant/utility) |
| --- | --- | --- | --- | --- |
| Sidebar menu item | padding/radius/font | 11px 12px / 12px / 13.5px w600 | line 414–425 inline | existing `WorkspaceLink` (matches) |
| Sidebar active item | bg / fg | #EAF4FF / #0091FF | `ms()` line 2102 | existing `--link-soft` + `text-link` |
| Sidebar section label | font | 10.5px w700 ls .06em uppercase #A1A1AA | line 420 | existing `text-field-placeholder` block |
| Sidebar divider | 1px #F1F4F8, margin 10px 8px | line 419 | existing `bg-surface-secondary` |
| Chat unread badge | min-w 18px h 18px r 99px bg #0091FF fg #fff 10.5px w700 | line 414 | `bg-accent text-accent-foreground` pill |
| Panel scroll area | padding | 26px 30px | lines 473/546/578/612/635/667/699/740 | existing `lg:px-[30px] lg:py-[26px]` |
| Panel h2 | Space Grotesk 20px w700, mb 4px | line 474 etc. | `font-grotesk text-xl font-bold` |
| Panel sub | 13px #71717A | line 475 | `Typography body-sm muted` |
| Card | border 1.5px #ECEEF2, r 18px, p 20–22px, bg #fff | lines 615, 674, 703, 743 | `rounded-[18px] border-[1.5px] border-separator bg-surface p-5` |
| Section label | 11px w700 ls .06em uppercase #71717A, margin 22px 0 10px | line 620 etc. | `text-[11px] font-bold tracking-[0.06em] uppercase text-muted` |
| Trainer avatar | 60px, r 17px, bg #18181B, 20px w700 | line 616 | `size-[60px] rounded-[17px] bg-accent` (app avatars = accent, see D5) |
| Trainer name | Grotesk 17px w700; specialty 12.5px muted | line 616 | `font-grotesk text-[17px] font-bold` |
| Trainer stat cells | 3 across, gap 10px, r 12px, p 12px, num Grotesk 18px w700, label 11px muted | line 617 | flex row of bordered cells |
| Trainer buttons | p 11px r 12px 13px; secondary bg #F1F4F8; primary bg #18181B fg #fff | line 618 | `bg-surface-secondary` / dark button |
| Trainer history row | p 14px 16px, avatar 38px r 11px, tag pill 11px w700 3px 10px r 99px | lines 622–627 | list rows in `rounded-[18px]` bordered container |
| Sub icon tile | 46px r 13px bg #E9F5FF fg #0091FF | line 744 | `bg-accent-soft text-accent` |
| Sub status pill | 11.5px w700, 5px 12px, r 99px; active #16A34A/#E9F9EF | line 744 + subVals | `softStatusClass` equivalents |
| Sub progress bar | h 9px r 99px track #F1F4F8 fill #0091FF | line 746 | `bg-surface-secondary` track + `bg-accent` fill |
| Sub date cells | grid 3, gap 12px, r 16px, p 16px, label 11px muted, value 14px w700 mt 6px | lines 749–753 | grid of bordered cells |
| Extend row | r 16px p 15px 18px, icon 36px r 10px bg #F1F4F8; hover border #0091FF | line 755 | bordered row + chevron |
| Extend popover | top calc(100%+8px), r 16px, p 16px, shadow 0 24px 60px -18px rgba(24,24,27,.3) | line 760 | HeroUI Popover, matching radius/shadow |
| Quick extend buttons | flex-1, r 11px, p 11px 0, 13px w700, hover #0091FF | lines 763–765 | bordered buttons |
| Manage rows | r 14px p 14px 16px, icon 34px r 10px; warn #D97706/#FEF3E2; danger #F31260/#FEECF0, border #FCE1E8 | lines 774–776 | warning-soft / danger-soft rows |
| Trainer-CI due banner | border 1.5px #FCE3BF bg #FEF9F0 r 14px p 13px 16px, icon 38px r 11px bg #D97706 | line 669 | warning-soft banner |
| Trainer-CI status pill | #D97706/#FEF3E2 11.5px w700 5px 12px | line 668 | `warning-soft` pill |
| Composer card | dashed 1.5px #CDE7FF bg #F7FBFF r 18px p 20px | line 679 | dashed accent-soft card |
| Composer textarea | min-h 90px r 12px border 1.5px #E4E7EC, 13.5px; focus #0091FF | line 681 | HeroUI TextArea |
| Submit button | bg #18181B fg #fff p 10px 18px r 12px 13px w700 | line 682 | dark Button |
| History review row | p 14px 16px, avatar 30px r 9px, date 13px w600, note 11.5px muted lh 1.5 | lines 687–690 | list rows |
| Shared pill | 10.5px w700 #0091FF/#E9F5FF 2px 8px r 99px | line 690 | `accent-soft` pill |
| Client menu popover | w 212px r 14px border 1.5px #ECEEF2 p 6px, shadow 0 24px 54px -18px rgba(24,24,27,.4); item p 10px 11px r 10px 13px w600; danger #F31260 hover #FEE9EC | lines 405–409 | existing Dropdown + new danger item |
| Mobile chips | h 30px px 12px r 9px 12px w600; labels Progress/Nutrition/Training/Trainer/Client check-in/Trainer check-in/Detail/Subscription | lines 887–894 | chips row from tab registry + short labels |

## Differences

| # | Difference | Type | Action |
| --- | --- | --- | --- |
| 1 | Design tab "Assigned trainer" missing (trainer card lives in Detail) | structural | decision 1 → build tab, move card |
| 2 | Design tab "Subscription" missing (dates shown as Detail rows) | structural | decision 1 → build tab |
| 3 | Design tab "Trainer check-in" — no backend concept | structural + backend | decision 1 (revised) → NOT built; user declined new backend domain. Approved deviation. |
| 4 | Design menu Pause/Cancel/Remove vs app Deactivate/Reactivate | workflow | decision 2 → keep Deactivate/Reactivate. Remove client BLOCKED: backend DELETE only revokes pending invitations (422 for linked clients — `Easy.Clients.revoke_invitation/2`); cascade delete of active clients is a separate backend feature. Logged as deviation, flagged to user. |
| 5 | Chat Messages/Media segmented toggle + media grid | structural | decision 3 → skipped, logged as deviation |
| 6 | Detail: goal statement card, personal rows (age/height/location), tags, emergency contact — no backend fields | data | decision 4 → skipped, logged as deviation |
| 7 | Progress: body-fat stat, muscle bars, health markers, key points — no backend data | data | covered by decision 4 rationale → skipped, logged |
| 8 | Sidebar Chat unread badge missing | visual/data | autonomous → add via conversation `unread_count` |
| 9 | Subscription price / "Next billing" rows — no per-client billing data | data | decision 1 annotation → omit price & next-billing |
| 10 | Trainer stats rating/tenure — no backend data | data | show clients count only (from team API); omit rating/tenure |
| 11 | Trainer history list — no assignment-history endpoint | data | omit section; current trainer card only |
| 12 | Design avatars neutral dark #18181B; app avatars use accent | visual | keep app accent (established app-wide mapping, prior pass) |
| 13 | Design "Message trainer" button | workflow | no coach↔trainer conversation exists — omit button |
| 14 | Trainer-CI "Your review cadence · weekly" + due banner | product logic | derive: due when last review ≥ 7 days old; no cadence setting |

## Decisions

| N | Question | Frozen answer |
| --- | --- | --- |
| 1 | Which missing tabs to add? | Assigned trainer + Subscription (existing endpoints, no price/billing rows). Trainer check-in REVISED 2026-07-12: user rejected adding the backend domain — tab not built. Standing rule: never add backend functionality that doesn't exist without asking first. |
| 2 | Client "⋯" menu mapping | Keep Deactivate/Reactivate vocabulary; add destructive "Remove client" with confirm (delete endpoint) |
| 3 | Chat media grid | Skip for now; needs attachments-listing endpoint; logged deferred |
| 4 | Detail design-only fields | Skip; match design styling for existing data; missing fields logged as approved deviations |

## Mapping

| Design selector (region) | UI role | Existing owner | Structure rung | Style rung | Preserved behavior |
| --- | --- | --- | --- | --- | --- |
| left menu (393–427) | workspace sidebar | `client-workspace-shell.tsx` | keep shell, extend tab registry | existing tokens | routing, replace-nav, status header, deactivate menu |
| menu item + unread badge (414) | nav item | `WorkspaceLink` | reuse component | accent pill utility | active/hover states |
| client menu (403–411) | actions dropdown | shell `Dropdown` | add item | existing dropdown styles | status toggle; new: delete → navigate to list |
| ASSIGNED TRAINER panel (610–631) | trainer tab | `client-trainer-card.tsx` (in Detail) | move + restyle into own tab panel | semantic tokens + arbitrary radii | reassign flow (AssignSurface picker) |
| SUBSCRIPTION panel (738–779) | subscription tab | new `client-subscription.tsx` in `src/clients/components/` | page-local component | semantic tokens (accent/warning-soft/danger-soft) | `updateClient` for dates/status; `deleteClient` |
| extend popover (759–770) | quick extend | new, inside subscription panel | HeroUI Popover + native date input | matching radius/shadow | writes `subscription_ends_on` |
| TRAINER CHECK-IN panel (665–695) | trainer-ci tab | new `client-trainer-reviews.tsx` + new backend | new domain + tab panel | semantic tokens | new list/create endpoints |
| CHAT (389–469) | chat tab | `client-conversation.tsx` | keep | — | unchanged (media toggle skipped) |
| mobile chips (886–895) | mobile tab nav | shell mobile header | extend registry w/ short labels | existing chip styles | scrollable chips |

## Slices

- [x] **S1 — Shell: tabs + menu + badge.** `client-workspace.ts` (add `trainer`, `trainer-checkin`, `subscription` tab ids, short labels), `client-workspace-shell.tsx` (icons, dividers per design order, unread badge from `useGetCoachClientConversationQuery`, Remove client menu item + confirm dialog → delete → navigate to clients). States: active/hover per tab, badge 0/hidden, menu confirm/cancel/error. Verifies rows: sidebar item, section label, divider, unread badge, client menu popover, mobile chips.
- [x] **S2 — Assigned trainer tab.** New panel in `client-detail.tsx` for `tab=trainer`; restyle/move `ClientTrainerCard` content to design card (avatar 60/17, stats cells, Change trainer dark button); remove from Detail tab. States: no trainer assigned (empty card + assign CTA), loading, error, reassign flow. Verifies rows: trainer avatar/name/stat cells/buttons/card.
- [x] **S3 — Subscription tab.** New `client-subscription.tsx`: status card (icon tile, status pill, term progress bar computed from start/end, elapsed/remaining labels), date cells (start/end; no price/billing per D9), extend row + popover (+1/+3/+6 → date math on `subscription_ends_on`, or explicit date), manage rows (Deactivate/Reactivate warning row, Remove client danger row + confirm). States: no dates set (empty/CTA), active/inactive, popover open, mutation pending/error. Verifies rows: sub icon tile, status pill, progress bar, date cells, extend row/popover/buttons, manage rows.
- [x] ~~**S4 — Backend: client reviews domain.**~~ DROPPED — user declined new backend domain (decision 1 revision). Work reverted. Elixir context + schema (`client_reviews`: client_id, author user_id, note, shared_with_client, inserted_at), migration, coach endpoints list/create under `/v1/coach/clients/:id/reviews`, OpenApiSpex schemas, tests, `mix precommit`, `just gen-api` (restart dev server for spec). Follow elixir-conventions (Ctx-first, three-case naming).
- [x] ~~**S5 — Trainer check-in tab.**~~ DROPPED with S4. New `client-trainer-reviews.tsx`: due banner (last review ≥7d or none → warning banner "Review due"; else neutral), last review card, composer (TextArea + share-with-client checkbox + submit → create), review history list w/ Shared pills. States: empty (no reviews), pending submit, error, loading. Verifies rows: due banner, status pill, composer card/textarea/submit, history rows, shared pill.
- [x] **S6 — Full workspace verification.** Browser pass at 1280px + 375px replaying: list → client → each of 8 tabs → menu → extend popover → trainer change → review submit. Compare computed values against every Measured Values row (colors/typography/radius exact, geometry ±1px). Re-verify existing tabs (Progress/Nutrition/Training/Client check-in/Detail) against design regions 471–736. Repo checks: coachapp build + lint, backend precommit.
