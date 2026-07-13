# Token Reconciliation — coachez design files → coachapp-v2 (FINAL)

**Method:** scanned the 7 current coachez `.dc.html` files (dashboard/client,
Prospects, Trainers, Builder, Analytics, Payments, Settings) and tallied every
distinct `border-radius`, `box-shadow`, hex color, hairline border, and
`font-size`. Counts are raw occurrences. Device-frame values (phone bezel radii
36/46/56px, mac traffic-light dots, dark fake-window chrome `#26262A/#2A2A2E`)
are **mockup chrome — excluded**; the real app has no bezels or fake titlebars.

All judgment calls are **resolved** and encoded in `index-css-additions.css`.
The agent uses these fold maps; it never picks a value.

**Consumption rule:** components use the generated **utilities**
(`rounded-card`, `shadow-popover`, `text-2xs`, …) or HeroUI props — never
`var(--token)`, never `style={{…}}` for design constants (runtime-computed
geometry only), never an appearance `className` on a HeroUI component.
`var()` is legal only inside `index.css`.

---

## 1. Radius — final scale: 4 semantic steps + full

Raw app usage: `11(234) 12(166) 10(165) 9(139) 16(92) 14(91) 8(87) 13(85)
18(63) 7(33) 22(27) 20(19) 15(17) 6(10)` + pills `99/999(210)` + circles
`50%(117)`. The `8–13px` band (877 uses, 6 values) was one intent — "control
radius" — split by drift.

| Utility | Value | Folds in | Used for |
|---|---|---|---|
| `rounded-full` | 9999px / 50% | 99px, 999px, 50% | pills, tabs, badges, avatars, dots |
| `rounded-inset` | 8px | 6, 7, 8 | icon tiles, small square avatars, nested chips |
| `rounded-control` | 10px | 9, 10, 11, 12, 13 | buttons, inputs, menu rows, nav items, segmented tracks |
| `rounded-card` | 18px | 14, 15, 16, 17, 18, 20 | cards, list rows, popovers, panels (= HeroUI's computed card radius) |
| `rounded-window` | 22px | 22, 24, 26 | modals, immersive windows |

Tailwind's default `rounded-sm…3xl` are **banned** in `.tsx` (lint rule 5) —
they're the named-utility side door around this scale.

---

## 2. Shadow — final scale: 4 tiers + 2 named specials

~40 distinct strings; alpha/blur jitter (`.12/.14/.15/.16`, `54/60/70px`) is drift.

| Utility | Value | Folds in (examples) | Used for |
|---|---|---|---|
| `shadow-hairline` | `0 1px 3px rgb(24 24 27 / .15)` | `.12 .14 .16` variants (22 uses; = HeroUI `--surface-shadow`) | segmented active chip, raised tile, cards |
| `shadow-raised` | `0 8px 20px -8px rgb(24 24 27 / .4)` | `0 6px 16px -6px`, `0 2px 6px -3px`, `0 10px 22px -12px` | hover-lifted controls/tiles, chat bubbles |
| `shadow-popover` | `0 24px 56px -18px rgb(24 24 27 / .4)` | `0 24px 60px -18px`, `0 24px 54px -18px`, `0 30px 70px -20px`, `0 24px 44px -22px` | menus, dropdowns, notification panel |
| `shadow-modal` | `0 40px 90px -24px rgb(24 24 27 / .5)` | all `40–50px / 80–100px` overlays (33+ uses; pairs with HeroUI `--overlay-shadow`) | modals, immersive windows |
| `shadow-note` | `0 16px 34px -12px rgb(24 24 27 / .45)` | sticky-note lifts | dashboard floating notes only |
| `shadow-focus-accent` | `0 0 0 3px rgb(0 145 255 / .25)` | all `rgba(0,145,255,…)` glows | accent focus ring on hand-built elements (HeroUI components keep their own `--focus`) |

Tailwind's default `shadow-sm…2xl` are **banned** in `.tsx` (lint rule 5).

---

## 3. Neutral / ink ramp — fold to the 3 existing text tokens

| Utility | Value | Folds in | Role |
|---|---|---|---|
| `text-foreground` | `#18181B` (474) | `#1D1D1F` (52) | primary ink |
| `text-foreground-secondary` | `#3F3F46` (44) | `#3A3A3C` (22), **`#52525B` (110)** | secondary text, stat labels |
| `text-muted` | `#71717A` (357) | `#8A8A8E`* (248), `#9A9AA2`, **`#A1A1AA` (338)**, `#B4B4BB`, `#C4C4CC` | muted/meta text, faint icons |

\* `#8A8A8E` in *placeholder* position is `--field-placeholder` (already set);
everywhere else it folds to `text-muted`.

**Dark sidebar text** (`#A1A1AA` on `#18181B`): use the existing codebase
pattern `text-accent-foreground/60` — opacity modifiers on semantic tokens are
allowed and preferred over extra gray tokens.

---

## 4. Surfaces & hairlines — 9 near-identical grays → 2 tokens (+1 edge)

| Utility | Value | Folds in | Role |
|---|---|---|---|
| `bg-surface` | `#FFFFFF` (603) | — | card / panel background |
| `bg-surface-secondary` | `#F7F8FA` (109) | `#FAFBFC`, `#FBFBFD`, `#F5F6F8`, **`#F2F2F7` (34, segmented track)** | page background, muted fills, segmented tracks |
| `bg-surface-emphasis` | `#E7EAEE` | — | stronger fill (e.g. "Today" pill) — bridge added |
| `border-border` | `#ECEEF2` (403) | `#EEF1F5`, `#F1F3F6`, `#F4F6F8/9`, `#F5F7F9`, `#EEEEF1`, `#ECECEF`, `#F4F4F7` | **the one hairline** |
| `border-separator` | `#F1F4F8` (219) | `#F0F0F4` | softer inner separators |
| `border-edge` | `#E4E7EC` (95) | `#D4D4D8` | stronger card edge / hover border |

> Deliberate: the segmented track gets **no token of its own** — `#F2F2F7` vs
> `#F7F8FA` was a near-duplicate; near-duplicate tokens are drift inside the
> token layer.

---

## 5. Status & domain color

| Utility | Value | Folds in | Notes |
|---|---|---|---|
| `text-link` / `bg-link` | `#0091FF` (373) | **`#0A84FF` (80)** | one blue; hover `#0072D6` already handled |
| `bg-link-soft` | `#EAF4FF` (50) | `#E9F5FF`, `#D9ECFF`, `#F5FAFF` | one blue tint (bridge added) |
| `text-success` | `#16A34A` (169) | — | soft tint `#E9F9EF` folds `#F0FAF4` |
| `text-warning` | `#D97706` (57) | `#F59E0B` (11) | |
| `text-danger` | HeroUI `--danger` (≈`#F31260`, 44) | **`#EF4444` (32)** | one danger — RESOLVED |
| `text-star` | `#F5A623` (17) | — | favourite star |

**Domain palette** (unchanged, stays in the existing `@theme` block): training
`#0091FF`, nutrition `#1F9D57`, forms `#7A5AF0` (folds `#7C3AED`), exercises
`#E08600`, recipes `#E5484D`, foods `#0D9488`. Dark mode is out of scope for
now; when it lands, move the softs to runtime vars with `color-mix` dark values
(same pattern as `--link-soft`) — utility names won't change.

**Brand marks** (WhatsApp `#25D366`, Instagram, etc.) are not UI tokens. They
live ONLY in `src/@components/brand-icons.tsx`, the single file allowlisted
from the hex lint.

---

## 6. Type — kill the half-pixels; ride Tailwind defaults

Raw: `11(338) 13(291) 12.5(241) 13.5(214) 12(187) 11.5(162) 14(160) 10.5(150)…`
The `.5` sizes are pure drift.

| Utility | px | Folds in | Role |
|---|---|---|---|
| `text-2xs` (custom) | 11 | 10, 10.5, 11 | micro labels, badges, uppercase eyebrows |
| `text-xs` | 12 | 11.5, 12, 12.5 | secondary / meta text |
| `text-sm` | 14 | 13, 13.5, 14, 14.5 | body, controls — RESOLVED: 14, lands on Tailwind default |
| `text-base` | 16 | 15, 16 | emphasized body |
| `text-lg` | 18 | 17, 18, 19 | small headings |
| `text-xl` + | 20/24/30/34/44 | the display cluster | Space Grotesk display numbers |

Only `11px` is a custom step. Deliberate — fewer custom steps, less drift.

---

## Summary of changes to `src/index.css`

Already present and kept: HeroUI semantic tokens, `--surface-shadow` /
`--overlay-shadow` (HeroUI internals), `--field-radius` (10px = control ✓),
`--link`/`--link-soft`, `.button`/`.chip` component overrides.

From `index-css-additions.css` (light-only; dark mode deliberately skipped):
1. Radius scale + elevation tokens + `text-2xs` in `@theme` (all static).
2. Bridges for `link-soft` and `surface-emphasis` (utilities didn't exist).
3. `.button` merged rule (weight + control radius).
4. Segmented-control theme on **verified** Tabs BEM classes; ToggleButtonGroup
   themed to match once its classes are confirmed from its docs page.
