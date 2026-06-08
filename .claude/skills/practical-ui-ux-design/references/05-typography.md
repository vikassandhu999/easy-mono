# Chapter 5: Typography

A logical system for making text beautiful and easy to read. Read this when picking a typeface, sizing text, evaluating long-form readability, building a type scale, or fixing illegible UI text.

## Use a single sans serif typeface

The single safest choice for most UI: one sans serif typeface, used everywhere.

### Five typeface classifications

| Classification | Look | Best for |
|----------------|------|----------|
| **Serif**       | Decorative tails on letters | Traditional, classic, formal moods. Some legible at small sizes; some not. |
| **Sans serif**  | No decorative tails. Simple, modern. | UI text, body content, generally everything. Highly legible at all sizes. |
| **Script**      | Based on handwriting | Formal/casual moods at *large* sizes only. Low legibility at small sizes. |
| **Display**     | Decorative, designed for headlines | Large text only. Lots of personality, low legibility small. |
| **Monospaced**  | Every char takes equal width | Code, numbers (faster to compare), tabular data. |

### Three reasons to use a single sans serif

1. **Legibility** — sans serif is the most legible at small sizes. UI text exists to communicate, not decorate.
2. **Neutrality** — sans serif fits with most brand personalities, lets content lead, less risk of mismatch.
3. **Simplicity** — sans serif has less visual character. Multiple typefaces can be distracting and increase cognitive load.

Once you're confident, you can introduce a second typeface (typically a serif or display) for *headings only* — small numbers of large characters where legibility matters less.

### Tips for choosing a sans serif

- **Popular** — sort font directories by popularity. Tried and tested.
- **Wide weight range** — light, regular, medium, semibold, bold available. Better-built typefaces have more weights.
- **Tall lowercase letters** (large x-height) — more legible at small sizes. Compare Inter (high x-height) to League Spartan (low x-height) — Inter is far more readable in body text.
- **Generous letter spacing** — also helps small-size legibility.
- **Multilingual support** — if your product needs it, verify the typeface supports the languages.
- **OpenType features** — better quality, more language support, advanced features.
- **System default** when unsure — it's reliable and loads instantly.

### Solid default choices

- **Inter** — modern, high x-height, great UI legibility, free.
- **System UI fonts** (`-apple-system`, `Segoe UI`, etc.) — zero loading cost, native feel.
- **Roboto** — Android default, well-tested.
- **IBM Plex Sans** — distinctive but readable.
- **Source Sans Pro** — Adobe, broad weight range.

## Evoke emotion using a second typeface for headings

Once comfortable, add personality with a second typeface for headings only. Body text stays with the safe sans serif.

| Typeface mood | When |
|---------------|------|
| Sans serif    | Neutral, minimal, modern |
| Serif         | Traditional, established, classic |
| Rounded sans  | Fun, soft, playful |
| Casual script | Personal, handmade |
| Formal script | Formal, feminine, elegant |
| Light sans    | Chic, modern, luxurious |

Mood is subjective and culture-dependent. Test typefaces with users when feasible. Use this as a loose guide, not a rule.

## Use regular and bold font weights only

Two weights cover ~90% of needs:

- **Regular (400)** for body, labels, secondary text.
- **Bold (700)** for headings, emphasis, active states.

Adding more weights (light, medium, semibold) usually:

- Reduces hierarchy distinctiveness — a semibold next to a bold confuses which is more important.
- Increases page weight (more font files to load).
- Makes the design feel busier.

Light weights are particularly risky — thin strokes fail accessibility at small sizes.

Use additional weights only when you genuinely need an additional level of hierarchy that two can't express.

## Use a type scale to set font sizes

Don't pick sizes ad hoc. Define a type scale where each size is a fixed multiple of the previous.

### Recommended scale: 1.200 ratio

| Role        | Size | Line height |
|-------------|------|-------------|
| Heading 1   | 40px | 48px        |
| Heading 2   | 32px | 40px        |
| Heading 3   | 24px | 32px        |
| Heading 4   | 20px | 28px        |
| Body / Small | 16px | 24px       |
| Tiny        | 14px | 20px        |

Each step is ~1.2× the next-smaller. This produces sizes with clear visual difference but harmonious proportions.

### Other common ratios

- **1.125** (Major Second) — subtle steps, lots of levels.
- **1.250** (Major Third) — distinctive steps; what most apps use.
- **1.333** (Perfect Fourth) — bigger jumps, dramatic hierarchy.
- **1.414** (Augmented Fourth) — striking; large headlines.
- **1.500** (Perfect Fifth) — dramatic, editorial.
- **1.618** (Golden Ratio) — classic, slightly indulgent.

Pick one ratio and a base size (usually 16px or 18px), then generate the scale.

### Why a scale matters

- **Consistent rhythm** — text feels harmonious across the product.
- **Clear hierarchy** — distinct steps are visually obvious.
- **Faster decisions** — choose from 6 sizes, not infinity.
- **Easier responsive scaling** — multiply the base by 1.1× on tablet, 1.2× on desktop, and the whole scale shifts in proportion.

## Make long body text bigger

Most websites have small body text. Designers tend to prefer it (looks tidier). But people read at arm's length on phones, tablets, and desktops — and at that distance, small text is hard.

**For long body text, use ≥18px.** Larger sizes (20–22px) read even better at the cost of more vertical space. Save 14px for tertiary metadata, captions, helper text — not the main reading content.

This conflicts slightly with the type scale above, where 16px is suggested as Small. The reconciliation: use 16px as your Small token, but for **long-form prose** (articles, terms of service, anything users read for minutes), bump up to 18px.

## Use at least 1.5 line height for long body text

Line height = vertical distance between lines. For body text, use **1.5–2.0** (sometimes called 150–200%).

Why:

- Lines feel separated; eyes don't accidentally re-read the same line.
- Text feels comfortable, not cramped.
- Improves accessibility for cognitive impairments.

### Adjust based on the typeface

- **Longer lines** need taller line height — eyes travel farther between lines.
- **Darker / heavier typefaces** need taller line height — visual weight pushes lines into each other.
- **High x-height typefaces look bigger** at the same px size — need taller line height.

## Decrease line height as font size increases

A 1.5 line height at 16px is comfortable. At 40px, it's a chasm. Larger text needs **smaller** line-height ratios.

| Font size | Line height ratio |
|-----------|-------------------|
| ≤18px     | 1.5–1.6           |
| 20–24px   | 1.3–1.4           |
| 32px+     | 1.1–1.3           |

Pin the *absolute* line height into the type scale (e.g., H1 = 40px / 48px line height = 1.2 ratio). The eye sees consistent gaps regardless of the percent ratio.

## Ensure ideal line length

40–80 characters per line, including spaces, is the readable sweet spot.

- **Too short** (<40) — eyes work too hard returning to the start. Reading feels choppy.
- **Too long** (>80) — eyes lose place between lines. Tracking fatigue.

For full-width hero text on desktop, this often means constraining the text to a max-width even when the column allows more. Don't span text to the full page width just because you can.

For multi-column layouts and narrow phone screens, you usually land in range automatically — so the issue is mostly with desktop body text.

## Left align text

English reads left-to-right in an F-shaped scan pattern. Left alignment provides a consistent left edge to anchor the eye.

- **Left align** body, labels, lists, captions, most UI text.
- **Center align** is OK for short headings, short standalone text (a single line), and small components like icon labels in nav bars.
- **Don't justify** — uneven word spacing creates "rivers" of whitespace that distract; harder for dyslexic readers.
- **Don't right-align** body text. Reserve right-align for things like numerical columns in tables or specific cases where the right edge is more meaningful (e.g., timestamps in chat bubbles you sent).

## Decrease letter spacing for large text

Many typefaces are designed for body sizes ("text type") and have generous letter spacing for legibility at small sizes. At 32px+, that spacing looks loose.

- **Body sizes** (≤18px) — use the typeface's default spacing.
- **Large headings** (≥24px) — decrease letter spacing slightly (typically -1% to -3%).
- **Display sizes** (≥40px) — decrease more (-2% to -4%).

"Display type" typefaces designed for large sizes already have tight default spacing — leave them alone.

A small detail, but a tight headline reads as more deliberate, more polished.

## Ensure text on photos is legible

Plain text on a photo almost always fails contrast — photos are visually busy and have variable luminance. Four common solutions:

### 1. Linear gradient overlay
Place a dark gradient (e.g., 90% opacity at the bottom fading to 0% halfway up) behind the text. The text sits at the bottom against the dark portion. Add a subtle text shadow for extra contrast.

### 2. Semi-transparent solid overlay
Place a dark grey ~50% opacity overlay across the entire photo. Reduces image vibrancy but guarantees text legibility. Add a text shadow.

### 3. Blurred semi-transparent overlay
Same as above plus a blur — the photo becomes a soft background. Especially effective for hero imagery.

### 4. Solid text background
Place text on a solid (often dark grey) background, like video captions. Most reliable but disrupts the image.

In all cases: verify final contrast meets the 3:1 (large) or 4.5:1 (small) thresholds against the *darkest part of the photo behind the text*, not against the average.

## Avoid light grey and pure black text

Two opposite mistakes:

### Light grey text
Looks "soft" and "minimal." But fails 4.5:1 contrast easily and excludes anyone with low vision. Avoid.

### Pure black text on white
21:1 contrast — *too high*. Causes eye strain and fatigue, especially on long body text. The brightness gap forces eyes to adapt constantly.

The right answer: **dark grey** (Text strong from your palette, e.g., HSB(brand_hue, 57, 24)). Plenty of contrast for accessibility, easier on the eyes than pure black, and slightly tinted with your brand for cohesion.

## Common typography mistakes

When auditing typography, look for:

1. **Too many typefaces** — pick one (max two).
2. **Too many weights** — regular and bold only by default.
3. **Body text too small** — 14px or smaller for long reading.
4. **Body line height too tight** — <1.5 for body.
5. **Large headings with body line-height** — 32px text at 1.5 line height is sparse.
6. **Centered body text** — slows reading.
7. **Justified text** — rivers, harder to read.
8. **Uppercase body text** — harder to read; reserve for tiny labels with letter-spacing.
9. **Light grey text** — fails contrast.
10. **Pure black text** — eye strain.
11. **Unconstrained line length on desktop** — ≤80 characters.

## Chapter summary

- Use a single sans serif typeface for most UI. Add a second only for headings, only after you're confident.
- Limit weights to regular and bold.
- Use a type scale (1.200 ratio works well) — define sizes once, reuse.
- Body text ≥18px for long-form reading.
- Line height ≥1.5 for body. Decrease as font size grows.
- Line length 40–80 characters.
- Left-align text. Don't justify.
- Decrease letter spacing for large text.
- Ensure 4.5:1 contrast (small) / 3:1 (large). Avoid pure black; avoid very light grey.
- For text on photos, use overlays or solid backgrounds.
