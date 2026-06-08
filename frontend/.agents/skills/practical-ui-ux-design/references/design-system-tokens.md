# Design System Tokens

A ready-to-use set of design tokens following the Practical UI book's recommendations. Use this as a starting point when building a design system from scratch, or as a reference for sane defaults when you don't have one.

These tokens are deliberately opinionated and minimal — small sets, clear roles, accessibility-first.

## Color tokens

### The 5-variation palette (light mode)

Replace `<hue>` with your brand hue (0–360). The example below uses `230` (a blue brand).

| Token name        | HSB values        | CSS hex (for hue=230) | Role |
|-------------------|-------------------|------------------------|------|
| `--brand`         | `<hue>, 65, 85`   | `#4F70D9`              | Interactive elements: links, buttons, active states |
| `--text-strong`   | `<hue>, 57, 24`   | `#1A2A3D`              | Headings, body text, form labels |
| `--text-weak`     | `<hue>, 27, 48`   | `#5A6677`              | Secondary text, captions, placeholder text |
| `--stroke-strong` | `<hue>, 23, 65`   | `#8290A6`              | Form borders, meaningful icons |
| `--stroke-weak`   | `<hue>, 5, 94`    | `#EFF0F0`              | Decorative borders, dividers |
| `--fill`          | `<hue>, 2, 98`    | `#F9FAFB`              | Subtle backgrounds (badges, panels) |
| `--background`    | `0, 0, 100`       | `#FFFFFF`              | Page background |

### Accessibility constraints

- `--brand`, `--text-strong`, `--text-weak` must hit **≥4.5:1** contrast against `--fill` and `--background`.
- `--stroke-strong` must hit **≥3:1** against `--fill` and `--background`.
- `--stroke-weak` and `--fill` are decorative; no contrast requirement (but content placed *on* them must hit the ratios above).

When you change the brand hue, **recheck contrast** — different hues need different saturation/brightness to hit the same ratios.

### System colors (light mode)

For statuses (errors, warnings, success). Each follows the same 4-variation structure as the brand color.

| Status   | Base HSB        | Hex      |
|----------|-----------------|----------|
| Red (error)   | `0, 71, 78`     | `#C73A3A` |
| Amber (warn)  | `42, 82, 56`    | `#8F6E1A` |
| Green (success) | `162, 95, 48`  | `#067A5C` |

Each system color gets the same 4 variations (text, stroke-strong, stroke-weak, fill) at the same opacities.

### Dark mode

Mirror the light-mode structure with adjusted brightness and saturation:

| Token name        | HSB values (hue=230) | Role |
|-------------------|----------------------|------|
| `--brand`         | `230, 36, 100`       | Brighter, less saturated for dark contrast |
| `--text-strong`   | `230, 6, 96`         | Near-white with brand tinge |
| `--text-weak`     | `230, 12, 72`        | Light grey |
| `--stroke-strong` | `230, 22, 50`        | Mid-tone for borders |
| `--stroke-weak`   | `230, 30, 22`        | Subtle dividers |
| `--fill`          | `230, 35, 14`        | Slightly lighter than background |
| `--background`    | `230, 40, 10`        | Dark background (not pure black) |

System colors in dark mode also brighten and desaturate.

### Transparent palette (for complex apps)

When the app has multiple background colors (white, fill, branded panels, dark mode), use the brand hue at fixed opacities instead of solid greys. Foreground elements maintain consistent prominence regardless of what's behind them.

| Token       | Color | Opacity | Use |
|-------------|-------|---------|-----|
| `text`      | brand | 100%    | Body, labels |
| `stroke-strong` | brand | 80%   | Borders, icons |
| `stroke-weak`   | brand | 20%   | Decorative borders |
| `fill`      | brand | 5%      | Subtle highlight backgrounds |

For interaction states, layer additional transparent overlays on top of the element:

| State    | Overlay |
|----------|---------|
| Hover    | brand at 5–10% darken |
| Press    | brand at 15–20% darken |
| Focus    | 2pt brand-color outline at 100% |

## Spacing tokens (8pt grid)

| Token | Value | Use |
|-------|-------|-----|
| `--space-xs`  | `8pt`  | Inside small components (icon-to-text, label-to-field gap) |
| `--space-s`   | `16pt` | Between closely related items |
| `--space-m`   | `24pt` | Between items in a group |
| `--space-l`   | `32pt` | Between groups |
| `--space-xl`  | `48pt` | Between sections |
| `--space-xxl` | `80pt` | Between major page regions, page margins on desktop |

For more granular control on dense interfaces, add `--space-3xs: 4pt` and `--space-2xs: 6pt`. Avoid going below 4pt — it stops being a perceivable unit.

### Spacing rule

Closer = more related. Use the smallest value for innermost elements (a label and its input), grow as you move out (between groups, between sections, around the page).

### Responsive scaling

Margins shrink on smaller screens:

| Screen size | Page margin |
|-------------|-------------|
| Mobile      | `--space-s` (16pt) |
| Tablet      | `--space-l` (32pt) |
| Desktop     | `--space-xxl` (80pt) |

## Typography tokens

### Type scale (1.200 ratio)

| Token       | Size | Line height | Weight | Use |
|-------------|------|-------------|--------|-----|
| `--text-h1` | 40px | 48px        | Bold   | Page titles |
| `--text-h2` | 32px | 40px        | Bold   | Section titles |
| `--text-h3` | 24px | 32px        | Bold   | Subsection titles |
| `--text-h4` | 20px | 28px        | Bold   | Component titles, card headers |
| `--text-body` | 16px | 24px      | Regular | Default UI text, labels |
| `--text-body-large` | 18px | 28px | Regular | Long-form body text (articles, prose) |
| `--text-small` | 14px | 20px     | Regular | Captions, metadata, tertiary info |

### Font family

Default to one sans-serif. The book recommends:

```css
--font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 
               'Segoe UI', sans-serif;
```

For headings, optionally add a second typeface — but only when brand personality genuinely calls for it.

### Font weights

```
--font-weight-regular: 400;
--font-weight-bold: 700;
```

Don't add light, medium, or semibold by default. Add them only if a fourth hierarchy level is genuinely needed.

### Letter spacing

| Size range | Letter spacing |
|------------|---------------|
| ≤18px      | 0 (default)   |
| 20–24px    | -1% to -2%    |
| 32–40px    | -2% to -3%    |
| 48px+      | -3% to -4%    |

Tighten as text grows. (Display typefaces designed for large sizes already have tight spacing — leave them alone.)

### Line length constraint

For long-form prose:

```css
max-width: 65ch; /* ~40-80 characters per line */
```

## Border radius tokens

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `8pt`  | Small components: buttons, inputs, tags, chips |
| `--radius-md` | `16pt` | Medium components: cards, dialogs, panels |
| `--radius-lg` | `32pt` | Large components: hero panels, full-screen sheets |

Pick one tier per component type and stick with it. Don't mix `--radius-sm` and `--radius-md` randomly within the same surface.

A `--radius-full: 999px` (or 50%) is acceptable for circular elements (avatars, icon buttons).

## Shadow tokens

Two elevation levels:

```css
--shadow-raised: 0 1px 2px rgba(0, 0, 0, 0.05),
                 0 2px 4px rgba(0, 0, 0, 0.05);

--shadow-overlay: 0 4px 8px rgba(0, 0, 0, 0.08),
                  0 8px 24px rgba(0, 0, 0, 0.12);
```

| Token | Use |
|-------|-----|
| `--shadow-raised`   | Cards, buttons, sticky headers |
| `--shadow-overlay`  | Menus, modals, tooltips, popovers |

Adjust shadow color tinge with the brand hue for subtle cohesion (e.g., `rgba(<r>, <g>, <b>, 0.08)` where rgb is derived from the brand color).

## Component sizes

### Touch targets

| Token | Value | Use |
|-------|-------|-----|
| `--target-min` | `44pt` | Absolute minimum (WCAG) |
| `--target-default` | `48pt` | Default button/input height |
| `--target-large` | `56pt` | Frequent or critical actions |

Separate adjacent interactive elements by at least `--space-xs` (8pt).

### Button heights

| Variant | Height |
|---------|--------|
| Small   | 32pt   |
| Default | 48pt   |
| Large   | 56pt   |

### Input field heights

Match button heights so they read as a peer when adjacent: 48pt default.

### Icon sizes

| Token | Value | Use |
|-------|-------|-----|
| `--icon-sm` | `16pt` | Inline with body text |
| `--icon-md` | `20pt` | Inline with headings, button icons |
| `--icon-lg` | `24pt` | Standalone icons, navigation |
| `--icon-xl` | `32pt` | Large feature icons, empty states |

## Layout tokens

### Grid

```
--grid-columns: 12;
--grid-gutter: var(--space-m); /* 24pt */
--grid-margin-mobile: var(--space-s); /* 16pt */
--grid-margin-tablet: var(--space-l); /* 32pt */
--grid-margin-desktop: var(--space-xxl); /* 80pt */
```

### Container max-widths

```
--container-max: 1200pt; /* page content max width */
--reading-max: 720pt;    /* long-form prose max width */
```

## Animation tokens

```
--duration-fast: 150ms;       /* small interactions: hover, focus */
--duration-default: 250ms;    /* most state changes */
--duration-slow: 400ms;       /* large layout shifts, page transitions */

--ease-default: cubic-bezier(0.4, 0, 0.2, 1);   /* "ease-out" feel */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1); /* playful */
```

Keep animations subtle. Respect `prefers-reduced-motion`.

## Z-index tokens

A simple, ordered scale:

```
--z-base: 0;
--z-raised: 10;       /* cards, sticky elements */
--z-dropdown: 100;    /* dropdowns, autocomplete */
--z-sticky: 200;      /* sticky headers */
--z-overlay: 300;     /* modal backdrop */
--z-modal: 400;       /* modal */
--z-popover: 500;     /* popovers, tooltips */
--z-toast: 600;       /* toasts (always on top) */
```

Avoid arbitrary values like `z-index: 9999`. Use the scale.

## Putting it all together — a worked example

For a blue-brand product, the tokens flow into actual components like:

**Primary button:**
- Background: `--brand`
- Text: `#FFFFFF`
- Padding: `--space-s` `--space-m` (16pt vertical, 24pt horizontal)
- Min height: `--target-default` (48pt)
- Border radius: `--radius-sm` (8pt)
- Font: `--text-body` weight bold

**Card:**
- Background: `--background`
- Border: 1pt `--stroke-weak`
- Border radius: `--radius-md` (16pt)
- Padding: `--space-m` (24pt)
- Shadow: `--shadow-raised`

**Input field:**
- Background: `--background`
- Border: 1pt `--stroke-strong`
- Border radius: `--radius-sm` (8pt)
- Padding: `--space-s` (16pt)
- Min height: `--target-default` (48pt)
- Font: `--text-body`
- Label: `--text-small` weight bold, color `--text-strong`, gap `--space-xs` (8pt) to input

## Naming conventions

Use **semantic** (role-based) names for tokens, not appearance-based names:

| Good                | Bad           |
|---------------------|---------------|
| `--text-strong`     | `--grey-900`  |
| `--brand`           | `--blue-500`  |
| `--space-m`         | `--space-24`  |
| `--target-default`  | `--height-48` |

If you need both, layer them: appearance-based primitives at the bottom (`--blue-500`), semantic tokens that reference them on top (`--brand: var(--blue-500)`). The UI references semantic tokens. Brand changes update one mapping.
