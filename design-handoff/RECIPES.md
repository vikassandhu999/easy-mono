# RECIPES.md — the repeated patterns and where each one lives

The port campaign is done, so every recipe now has a LIVE reference in the app —
point at it, don't re-derive from screenshots or old snippets. The theme
(`frontend/apps/coachapp-v2/src/index.css`) owns sizes, radii, heights and the
selection registers; a recipe is only ever structure + which variant to use.
Values below must stay on the closed scale (`type-*` 11/14/16/19/22/27/30;
`rounded-chip/control/panel/card` 8/10/13/17 + `rounded-pill`).

## R1 — Page scaffold (every list screen)
`BrowseScreen` (`@/@components/browse-screen`) — header, search, filter row,
list card, load-more. Reference: `foods/list-foods.tsx`.

## R2 — Filter pills (CL, EX, FO, RC, NP, TR, FM — same everywhere)
`ToggleButton` + the theme variant `.toggle-button--ink` (always a pill) or
`.toggle-button--filter` (underline below `sm`, pill above). The variant owns
rest fill, selected ink fill, foreground, radius and weight — a call site adds
NOTHING visual. Hand-assembling `data-[selected=true]:*` strings is gated
(RM-136). Reference: `@components/browse-screen.tsx` filter row.

## R3 — Segmented control (form type, set type, units, plan/day switches)
`ToggleButtonGroup` wrapped in the theme's `.segmented` class — joined pills,
ink-selected, `rounded-control` group with `rounded-chip` segments. Reference:
`training-plans/plan-builder/` set-type segments.

## R4 — List card + rows (all listings)
`BrowseListBox` inside a `rounded-card border border-border bg-surface`
wrapper. Row text: name `type-body font-semibold`, meta `type-eyebrow
text-muted`. Reference: `clients/clients-list/client-list-item.tsx`.

## R5 — Chips
- Status chips (Active/Invited/Archived/Draft): `Chip variant="soft"` with the
  status colour per COPY.md.
- Neutral outline tag: `Chip size="sm" className="chip--outline"` — Chip has
  no HeroUI `outline` variant; `.chip--outline` is the app variant.
- All chips are `rounded-chip`, `type-eyebrow` weight 600 — from the theme,
  not the call site.

## R6 — Status cell (right column of rows)
Dot (`size-1.5 rounded-pill` + status bg) + `type-eyebrow text-muted` label.
Reference: `clients/clients-list/client-list-item.tsx` status cell.

## R7 — Sidebar / bottom nav (app shell)
Already built: `@/@components/app-shell.tsx` (`bg-ink` rail, accent-filled
active item, mobile bottom nav). Extend it; never rebuild it per screen.

## R8 — Primary / secondary buttons
- Primary: `variant="primary"` (accent fill) — the spec's primary IS the
  accent blue; don't ink it. Ink-filled CTA: `className="bg-ink text-ink-foreground"`.
- Secondary: `variant="outline"` (white bg + hairline).
- Destructive: `variant="danger"` only inside confirms/menus.
- Height and radius come from the theme's control block — never write them.

## R9 — Detail/meta text
Timestamps + footer meta: `type-eyebrow text-muted-2`. Section eyebrows in
cards: the app class `.eyebrow` (uppercase, `--tracking-eyebrow`, muted) —
never hand-assemble `uppercase tracking-* font-bold` again.

## R10 — Responsive overlay shell (every overlay; UI-CONTRACT §4)
One content component, two shells: `Popover` (desktop, `useIsDesktop`) /
`KeyboardSheet` (mobile). Confirms = `AlertDialog` both breakpoints. Copy
shells from `plan-assign-control.tsx`.

## Checklist per screen (before PR)
1. Page bg off-white, card white — visible layering?
2. Selected pills/segments via `.toggle-button--ink`/`--filter` (never
   hand-assembled)?
3. Fields white + hairline (not grey)?
4. All radii/sizes from the closed scale — zero px literals, zero new tokens?
5. Grotesk on headings only?
6. Eyebrows via `.eyebrow`, meta via `type-eyebrow text-muted-2`?
