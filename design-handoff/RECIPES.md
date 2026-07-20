# RECIPES.md — golden snippets

Copy these verbatim; do not re-derive from screenshots. All classes assume `theme.css` is installed in `src/index.css`. Utilities like `bg-ink` refer to the theme vars (`--ink` etc.) — register them once in `@theme` if not already.

## R1 — Page scaffold (every list screen)
```tsx
<Page>                                    {/* content pane must be bg-background (off-white) */}
  <Page.Header title="Clients" subtitle="47 active · 0 invited"
    action={<Button variant="primary" onPress={...}><UserPlus className="size-4" />Invite client</Button>} />
  {/* toolbar row */}
  <div className="flex items-center gap-3">
    <SearchField className="max-w-72" placeholder="Search clients" />  {/* default variant: WHITE bg + hairline. NEVER variant="secondary" (grey) */}
    <FilterPills ... />                   {/* R2 */}
    <Button variant="ghost" size="sm" onPress={toggleSort}
      className={sortOn ? 'text-foreground' : 'text-muted'}>
      <ArrowUpDown className="size-3.5" />Last active
    </Button>                             {/* quiet until active — never accent-tinted at rest */}
  </div>
  <ListCard>...</ListCard>                {/* R4 */}
</Page>
```

## R2 — Filter pills (CL, EX, FO, RC, NP, TR, FM — same everywhere)
Selected = ink-filled (dark), NOT accent-soft. Unselected = white + hairline.
```tsx
<ToggleButtonGroup selectionMode="single" selectedKeys={[filter]} onSelectionChange={...}>
  <ToggleButton id="all"
    className="rounded-[9px] border border-border bg-surface px-3.5 py-[7px] text-[12.5px] font-medium text-muted
               selected:border-ink selected:bg-ink selected:font-semibold selected:text-ink-foreground">
    All <span className="text-[11.5px] opacity-70">51</span>
  </ToggleButton>
  ...
</ToggleButtonGroup>
```
Count inside the selected pill inherits white. Mobile: same component, horizontal scroll, no wrap.

## R3 — Segmented control (form type, set type, units, plan/day switches)
Same ink-selected treatment as R2 but joined: group has `rounded-[9px] border border-border bg-surface p-0.5`, buttons `rounded-[7px] border-0`, selected `bg-ink text-ink-foreground`.

## R4 — List card + rows (all listings)
```tsx
<div className="overflow-hidden rounded-[18px] border border-border bg-surface">
  <ListBox>{/* via BrowseListBox */}
    <ListBoxItem className="grid grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-separator px-4 py-3 last:border-0 hover:bg-surface-secondary">
      <Avatar />                                        {/* 36px, surface-tertiary bg, foreground initials */}
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted">{email}</p>
      </div>
      <div className="flex flex-wrap justify-start gap-1.5">{/* chips column: LEFT-aligned, own track — never ms-auto */}</div>
      <StatusCell />                                    {/* R6; fixed right column */}
      <ChevronRight className="size-4 text-muted-2" />
    </ListBoxItem>
  </ListBox>
</div>
```

## R5 — Chips
- Plan chip: `rounded-[7px] bg-surface-secondary px-2 py-[3px] text-[11.5px] font-semibold text-foreground` (neutral grey, no border)
- Attention chip: same but `bg-warning-soft text-warning-text`
- Status chips (Active/Invited/Archived/Draft): `Chip` soft variant in success/accent/neutral/amber per COPY.md — always 7px radius, 11.5px/600.

## R6 — Status cell (right column of rows)
```tsx
<div className="flex items-center justify-end gap-1.5 text-xs text-muted">
  <span className="size-1.5 rounded-full bg-success" />  {/* success=active, muted=inactive, danger=expired, accent=invited */}
  Active 2h ago
</div>
```

## R7 — Sidebar (app shell — port once)
```tsx
<aside className="flex w-[236px] flex-col bg-ink p-3 pt-4 text-sidebar-fg">
  {/* brand: 24px accent square, white "C", then Coach<span accent>Easy</span> in Grotesk 17/700 */}
  <nav className="flex flex-col gap-0.5">
    <NavItem active className="rounded-[10px] bg-accent font-semibold text-white" />   {/* active = ACCENT fill */}
    <NavItem className="rounded-[10px] text-[13.5px] font-medium text-white/80 hover:bg-white/5" />
    <p className="mt-4 px-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white/40">Builder</p>
    ...
  </nav>
  {/* footer: avatar + name + role, separated by border-t border-white/10 */}
</aside>
```
Active nav may carry a count Badge (white/20 bg). Mobile bottom nav: surface bg, hairline top border, accent active icon+label.

## R8 — Primary / secondary buttons
- Primary: HeroUI `variant="primary"` (accent fill) — 13px/500 label, lucide icon `size-4`, pill radius. The spec's primary IS the accent blue; don't ink it.
- Secondary: `variant="outline"` white bg + hairline.
- Destructive: `variant="danger"` only inside confirms/menus.

## R9 — Detail/meta text
Timestamps + footer meta: `text-xs text-muted-2`. Section eyebrows in cards: `text-[11px] font-bold uppercase tracking-[0.07em] text-muted`.

## R10 — Responsive overlay shell (every overlay; UI-CONTRACT §4)
One content component, two shells: `Popover` (desktop, `useIsDesktop`) / `KeyboardSheet` (mobile). Confirms = `AlertDialog` both breakpoints. Copy shells from `plan-assign-control.tsx`.

## Checklist per screen (before PR)
1. Page bg off-white, card white — visible layering?
2. Selected pills/segments ink-filled?
3. Fields white + hairline (not grey)?
4. Radii: card 18 / pill 9 / chip 7 / nav 10?
5. Grotesk on headings only?
6. Row grid columns match R4 (chips left-aligned mid-track)?
