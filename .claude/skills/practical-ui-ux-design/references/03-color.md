# Chapter 3: Color

How to use color sparingly and purposefully to add meaning. Read this when picking a brand color, building or auditing a color palette, designing dark mode, or evaluating contrast.

## Ensure sufficient contrast

Contrast = the perceived difference in brightness between two colors. Expressed as a ratio from 1:1 (no contrast) to 21:1 (black on white). Contrast is the single most common accessibility failure in UI design.

### WCAG 2.1 AA requirements

Two ratios to memorize:

| Ratio | Applies to |
|-------|-----------|
| **3:1**   | Large text (≥18px bold or ≥24px regular) and UI elements (form borders, icons that convey meaning, focus rings) |
| **4.5:1** | Small text (anything smaller than the "large text" thresholds above) |

Decorative elements that don't convey meaning don't need to meet these — but be honest about what's decorative. A form-field border *looks* decorative but is required to identify the field as a field, so it's a UI element.

### Common contrast failures

- Light grey form borders on white.
- Light grey body text on white (the "elegant minimal" trap).
- White text on a low-saturation brand-color button.
- Placeholder text in inputs (almost always too light).
- Icons placed directly on photos without an overlay.
- Star ratings as faint outlines without backgrounds.

### APCA — the newer method

WCAG 2.1's contrast formula has known flaws (e.g., it doesn't model dark mode well). The Accessible Perceptual Contrast Algorithm (APCA), part of the WCAG 3 draft, is more accurate.

APCA uses unitless contrast values (higher = more contrast):

| APCA value | Use |
|------------|-----|
| 90  | Preferred for body text (≥14px regular) |
| 75  | Minimum for body text (≥18px regular) |
| 60  | Minimum for ≥24px regular or ≥16px bold |
| 45  | Minimum for ≥36px regular or ≥24px bold, and UI elements |
| 30  | Absolute floor (placeholder text, disabled buttons) |
| 15  | Minimum for non-text elements |

**When to use which:** for personal projects, use APCA — better results, especially for dark UI. For commercial projects where compliance matters, stick with WCAG 2.1 until WCAG 3 lands. For best results, hit both.

## Don't rely on color alone

Multiple types of color blindness exist; the most common (red-green) affects ~8% of men. Some people see no color at all. Color-only signals fail for them.

**Always pair color with something else:**

| Signal | Pair with |
|--------|-----------|
| Form error (red field) | Icon, thicker border, background tint, error message text |
| Text link (brand color) | Underline (especially in body text) |
| Selected state | Filled background, border, checkmark, position |
| Required field | Asterisk *and* the word "required" or instructions at top |
| Status (success/warning/error) | Icon (✓ / ⚠ / ✕) plus color |
| Hierarchy (active vs inactive) | Weight, size, opacity, not just color |

Test by viewing your design in greyscale — if you can no longer tell what's interactive, what's an error, or what's selected, color is doing too much work.

## Use system colors for status

Conventional system colors save explanation:

| Status   | Color | Why |
|----------|-------|-----|
| Error    | Red   | Universally recognized; aligns with traffic-light metaphor |
| Warning  | Amber | Caution without alarm |
| Success  | Green | Positive confirmation |
| Info     | Blue  | Neutral notice (often the brand color when blue) |

Reserve red for genuine errors. Don't tint required-field asterisks red — it confuses people who think the field is in error.

## Use color to define visual hierarchy

Color affects prominence. Strong color = high prominence; weak/neutral color = low prominence. Use this deliberately:

- **Most important** (primary action) → strong brand color, filled.
- **Secondary** → outline in brand color, no fill.
- **Tertiary** → text-only with brand color and underline.
- **Supporting text** → text-weak (lower contrast grey) so it doesn't compete with the heading.

Don't rely on color alone to set hierarchy — pair with size, weight, position, depth.

## Use black and white for a timeless aesthetic

Many of the world's most respected interfaces are mostly black and white plus one accent. Reasons:

- Maximum contrast (great accessibility).
- Trend-resistant.
- Lets the content lead.
- Drastically simplifies palette decisions.

**Approaches:**

- **Mostly white background, mostly black foreground:** clean, neutral, professional.
- **Mostly black background, mostly white foreground:** dramatic, powerful, luxurious.

### Avoid pure black

Pure black (#000) on pure white (#FFF) has 21:1 contrast. That's *too much* — it causes eye strain and fatigue, especially in long body text. Use a dark grey instead. The book recommends Text strong = HSB(brand_hue, 57, 24) with the chosen brand hue, which gives a near-black with a faint tinge of brand.

## Add a tinge of color to black and white

To differentiate from pure-monochrome brands, tint black and white with a hint of the brand hue. This:

- Keeps the simplicity and contrast of monochrome.
- Adds personality.
- Subtly reinforces the brand color throughout the interface (everything has a faint family resemblance).

Practical implementation: build greys from the brand HSB hue with high brightness and very low saturation (e.g., HSB(230, 5, 94) instead of HSB(0, 0, 94)).

## Use 1 brand color

Many of the world's best-known brands use a single signature color. It's recognizable, easy to apply, and avoids the multi-color juggling problem.

### Color psychology isn't universal

Conventional wisdom says green = nature/success, yellow = happiness, blue = trust. **Don't rely on this.** Color associations vary by:

- Culture.
- Personal experience.
- Color-blindness type.
- Surrounding context (colors, shapes, type, imagery).
- Tint, shade, and tone (different blues feel different).

Use color psychology as a *loose* guideline. Test the brand color with real users.

### Tips for choosing a brand color

- **Distinctive** — helps the brand stand out.
- **Avoid colors with strong universal meanings** for general use. Red is risky as a brand color because it competes with the error state. If you must use red, lean toward darker burgundies or pinks for the brand and reserve bright red for system errors.
- **Test it** with real users where possible.

## Apply the brand color to interactive elements

Use color sparingly and with purpose. Start with black and white; introduce color where it conveys meaning. The simplest, most powerful rule:

**Brand color → interactive elements only.**

This teaches users what's clickable. Example targets for the brand color:

- Text links.
- Primary buttons (filled).
- Secondary buttons (outline + text).
- Tertiary buttons (text + underline).
- Active tab indicator.
- Selected radio/checkbox.

**Don't** apply the brand color to:

- Headings (they get Text strong).
- Decorative icons.
- Body text.
- Status colors (those are system colors).

Note: not every interactive element needs the brand color — buttons can also signal interactivity through shape, position, and convention. But everything that *does* carry the brand color should be interactive.

## Create a color palette with rules

Don't pick colors ad hoc per screen. Predefine a palette with usage rules. The book's recommended starter palette is **5 variations of the brand color** plus white. Each has one job:

| Variation     | Purpose | Contrast requirement |
|---------------|---------|----------------------|
| **Brand**         | Indicates interactivity (links, buttons) | ≥4.5:1 against Fill |
| **Text strong**   | Headings, body, form labels | ≥4.5:1 against Fill |
| **Text weak**     | Secondary text, captions | ≥4.5:1 against Fill |
| **Stroke strong** | Form borders, meaningful icons | ≥3:1 against Fill |
| **Stroke weak**   | Decorative borders, dividers | (decorative; no requirement) |
| **Fill**          | Secondary backgrounds (badges, panels) | (text on it must hit ratios above) |
| **Background**    | Page background | white #FFFFFF |

This system works for ~80% of cases. For complex apps, add transparency (see below).

## Use the HSB color system

HSB (Hue, Saturation, Brightness) is far easier to reason about than HEX or RGB:

- **Hue** (0–360) — the color itself, around the rainbow. 0 red, 120 green, 240 blue.
- **Saturation** (0–100) — intensity. 0 = grey. 100 = full color.
- **Brightness** (0–100) — lightness. 0 = black (regardless of hue). 100 = lightest version.

To make variations of a brand color: **keep the hue constant**, change saturation and brightness.

### A worked example (brand hue = 230, blue)

| Variation     | HSB           | Notes |
|---------------|---------------|-------|
| Brand         | 230, 65, 85   | The flagship color |
| Text strong   | 230, 57, 24   | Very dark, heavily saturated to keep the brand tinge visible |
| Text weak     | 230, 27, 48   | Mid-grey with brand tinge |
| Stroke strong | 230, 23, 65   | Lighter grey; strong enough for borders |
| Stroke weak   | 230,  5, 94   | Near-white; decorative only |
| Fill          | 230,  2, 98   | Almost-white panel background |
| Background    | 0,    0, 100  | White |

### How variations are constructed

- **Text strong:** drop brightness drastically (24); saturate heavily (57) so the brand tinge survives at low brightness.
- **Text weak:** moderate brightness (48); moderate saturation (27).
- **Stroke strong:** higher brightness (65); lower saturation (23). Lighter than text but readable as a UI element.
- **Stroke weak:** very high brightness (94); minimal saturation (5).
- **Fill:** even lighter than stroke weak; even less saturation. Just a hint of color.

Each variation must hit its required contrast ratio against Fill. Adjust saturation and brightness to land on the right numbers.

## 5 color variations is often all you need

Resist the urge to build a 50-color palette. For most apps, the 5 variations above plus white plus 3 system colors (red/amber/green, each with the same 4-variation structure) is plenty. Adding more usually creates ambiguity, not flexibility.

If the design *genuinely* needs more colors (e.g., a data visualization app, a project-tagging system), add them with explicit purposes and rules.

## Create a dark color palette

For dark mode, mirror the structure but invert lightness:

- **Background:** very dark (not pure black — too high contrast with white text).
- **Fill:** slightly lighter than background.
- **Stroke weak / Stroke strong:** darker greys with brand tinge, scaled down from light mode.
- **Text weak / Text strong:** light greys to whites.
- **Brand:** typically *lighter* than light-mode brand to maintain contrast against the dark background.

The brand HSB usually shifts in dark mode — the same hue, but higher brightness and lower saturation, so it reads well on dark.

## Add depth using color and shadows

Depth indicates hierarchy and interactivity. Elements that "lift" off the surface read as more prominent and more clickable.

Two elevation tiers:

- **Raised** — subtle shadow. Cards, buttons, tabs at rest.
- **Overlay** — stronger shadow. Menus, modals, popovers, tooltips.

Use depth to:

- Reinforce hierarchy (primary button slightly raised; secondary flat).
- Indicate interactivity (cards on hover lift slightly).
- Separate stacked surfaces (header above scrolling content).

Don't overuse — every element raised = nothing raised.

## Consider using transparent colors

For complex apps with multiple background colors, the solid-palette approach breaks: a button on white looks fine, but the same button on a light-blue panel looks wrong because contrasts shift.

**The transparent-color approach:** instead of solid grey shades, define palette variations as the brand color at different opacities. Each variation looks consistent regardless of what's behind it.

### Transparent color palette structure

For light mode (brand HSB(230, 65, 85)):

| Variation     | Color        | Opacity | Purpose |
|---------------|--------------|---------|---------|
| Text          | brand        | 100%    | Body / labels (must hit 4.5:1 vs lightest background) |
| Stroke strong | brand        | 80%     | Form borders, icons |
| Stroke weak   | brand        | 20%     | Decorative borders |
| Fill          | brand        | 5%      | Subtle highlight backgrounds |

In dark mode, use a brighter brand color and the same opacity steps.

The text and strokes will pick up tinting from the background, but contrast remains predictable because they're a fixed opacity over a known surface.

### When to use transparent vs solid

- **Solid palette** — simpler apps with a single white/dark background.
- **Transparent palette** — complex apps with multiple panel colors, theming, or where colored content sits on multiple surfaces.

You can use both: solid grey palette for the main UI, transparent overlays for specific layered surfaces.

## Use transparent layers for interaction states

For hover/press/focus states, instead of defining a separate color per state, layer a **transparent overlay** on top of the element:

- **Hover** — 5–10% darken (or lighten on dark mode).
- **Press / active** — 15–20% darken.
- **Focus** — outline in brand color (3:1 contrast against background).

This works across any element color. Saves you from defining N states × M colors.

## Name colors to keep them organised

Two naming approaches:

### By appearance (color-based)
`blue-500`, `red-100`, `grey-900`. Used by Tailwind, Material, etc. Simple, but doesn't communicate purpose.

### By role (semantic)
`text-strong`, `stroke-weak`, `fill`, `brand`. Communicates intent. The book recommends this approach.

**Best practice:** layer them. Color tokens at the bottom (`blue-500`), semantic tokens on top (`brand: blue-500`, `text-strong: grey-900`). The UI references semantic tokens; if the brand changes, you update one mapping.

## Adjust photo color temperature to match the palette

If photos appear next to brand-colored UI, mismatched color temperatures clash. A warm-orange photo next to a cool-blue brand looks accidental.

Subtle shifts in the photo's color temperature toward the brand hue create visual harmony without being obviously edited.

## Chapter summary

- Ensure 4.5:1 contrast for body text and 3:1 for large text and UI elements (WCAG 2.1 AA). Consider APCA for newer projects.
- Never rely on color alone to convey meaning.
- Design in black and white first; introduce color where it conveys meaning.
- Use one brand color, apply it only to interactive elements.
- Build a 5-variation palette with HSB; each variation has one job.
- Use system colors (red/amber/green) for errors, warnings, success.
- Use transparent palettes for complex apps with multiple background colors.
- Avoid pure black; tint your darks with brand hue.
- Name colors semantically (text-strong, stroke-weak) for clarity.
