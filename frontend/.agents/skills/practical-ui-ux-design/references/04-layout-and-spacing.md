# Chapter 4: Layout and spacing

How to group, space, and align elements to create clear visual hierarchies. Read this when sizing/spacing components, building grids, debugging cluttered layouts, or evaluating visual hierarchy.

## Group related elements

Information is easier to understand when broken into smaller groups of related elements. Four ways to group, from strongest to subtlest:

### 1. Place related elements in the same container (common region)

The strongest visual cue. Use borders, shadows, or background colors to define a container. Cards, dialogs, panels, sections all use this principle.

When a list of items has variable-length descriptions, use containers (cards) to make groupings unambiguous. Otherwise, varying gaps between author and adjacent article descriptions cause confusion about what belongs to what.

### 2. Space related elements close together (proximity)

Without a container, proximity becomes the dominant cue. The closer two elements are, the more they appear related.

The cardinal rule: **closer = more related; farther = less related.** Apply this systematically:

- Spacing inside a group should be smaller than spacing between groups.
- Innermost rectangles get the smallest spacing; spacing grows as you move outward.
- A label and its input field should sit close (S = 16pt or M = 24pt). The next field should sit farther (L = 32pt) to indicate it's a different group.

### 3. Make related elements look similar (similarity)

Same color, size, weight, shape → perceived as related. This is the principle behind tag pills, lists of similar cards, lists of recent activity items.

Conversely: if two elements *aren't* related, don't style them similarly. Don't make a non-interactive icon container look like a button.

### 4. Align related elements in a continuous line (continuity)

Items aligned along a common edge read as part of the same group. The eye follows lines.

Combine these methods for stronger groupings. A card's header, body, and footer use container + proximity + alignment together.

## Create a clear visual hierarchy

Visual hierarchy = the order of importance of elements, communicated visually. Without one, everything competes for attention and nothing wins.

### Six levers for prominence

| Lever     | Increases prominence by... |
|-----------|---------------------------|
| Size      | Making elements bigger |
| Color     | Stronger brand color or higher contrast |
| Contrast  | Darker on light / lighter on dark |
| Spacing   | More whitespace around (gives the eye room) |
| Position  | Higher up, leftmost (in left-to-right reading) |
| Depth     | More elevation (shadows) |

Most strong hierarchies use **multiple levers in concert** — the primary button is bigger AND more saturated AND placed last (Serial Position Effect: people best remember the first and last items).

### Step-by-step: fixing visual hierarchy

1. **Group related information into sections.** Put more important sections higher.
2. **Within each section, order elements by importance.**
3. **For the most important element**, use multiple levers (large + bold + Text strong color).
4. **For the primary action**, make it a filled brand-color button. Pin it where it's always reachable (e.g., bottom on mobile). Place value indicators (price, key benefit) near it.
5. **For secondary information**, decrease prominence: smaller, weak text color, lower contrast. Reuse style for similar items so the group reads together.
6. **For supporting/decorative info**, lowest prominence: smallest size, weakest color, no decoration.

## Test visual hierarchy using the Squint Test

A diagnostic. Squint your eyes (or blur the design, or step back, or zoom out). The most important elements should still stand out and tell you what the screen is for.

Variations:

- **Squint** — fastest.
- **Step back** from the monitor.
- **Zoom out** in your design tool.
- **Apply a Gaussian blur** to a screenshot.

If the page reads as a uniform mush, hierarchy is broken. Find the elements that should pop and pump them. Find the ones that shouldn't and dampen them.

## Use depth to create visual hierarchy

Elevation (via shadows) signals prominence. Higher elevation = closer to the viewer = more important.

Common elevation tiers:

- **Page background** — flat, default.
- **Surface / card** — slight raised shadow.
- **Sticky header** — moderate shadow above scrolling content.
- **Primary CTA** — slightly raised shadow.
- **Modal / popover / tooltip** — strong overlay shadow above everything.

Don't elevate everything — the differentiation is the point.

## Understand the box model

Every UI element is a rectangle. Each can have an outer **margin**, a **border**, and an inner **padding**. Content sits inside.

```
┌────────── Margin ──────────┐
│ ┌──────── Border ────────┐ │
│ │ ┌────── Padding ─────┐ │ │
│ │ │      Content       │ │ │
│ │ └────────────────────┘ │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

- **Margin** — separation from neighboring boxes.
- **Border** — the stroke (visible or not).
- **Padding** — internal whitespace, between content and border.

Interfaces are *rectangles within rectangles*. Spacing inside the innermost rectangle (padding inside a button) is the smallest. Spacing grows outward (between cards, between sections, around the page).

## Design @1x using points

A "point" (pt) is the unit of design. On legacy 72-ppi screens, 1pt = 1px. On modern @2x or @3x displays, 1pt = 4px or 9px. Always design in **points** (also called working "@1x"). Most design tools default to this.

This separates design from device pixel density. Designs translate cleanly to all screen resolutions.

## Create a set of predefined spacing options (8pt grid)

Don't space ad hoc. Define a small scale and reuse it everywhere.

### The recommended scale

| Token | Value | Typical use |
|-------|-------|-------------|
| XS    | 8pt   | inside small components (icon-to-text gap) |
| S     | 16pt  | between closely related items |
| M     | 24pt  | between items in a group |
| L     | 32pt  | between groups |
| XL    | 48pt  | between sections |
| XXL   | 80pt  | between major page regions |

### Why 8pt

- Most popular screen sizes are divisible by 8 (good for grid alignment).
- More flexibility than 10pt without being too granular.
- Aligns with the 48pt minimum touch target (6 × 8).

For finer-grained interfaces, 4pt increments give more control without losing the structural benefits.

### Why scale grows non-linearly

Spacing should be proportional. A 32pt → 40pt jump is barely noticeable; 32pt → 48pt is. Larger spacing tokens grow by larger amounts so each step is visually distinct.

### Benefits of using the scale strictly

- **Simpler designs** — less variation to perceive.
- **Improved consistency** — same spacing everywhere creates rhythm.
- **Faster decisions** — fewer options means less deliberation.
- **Easier handoff** — developers reuse the same tokens.

When you find yourself wanting to "fix" spacing with an off-grid value (25pt, 39pt), step back and figure out which standard token belongs there.

## Space elements based on how closely related they are

The spacing scale isn't arbitrary — each token roughly corresponds to a relationship strength:

```
Closely related ←————————————————————————→ Not related
   XS    S     M      L         XL          XXL
   8pt  16pt  24pt   32pt      48pt        80pt
```

Practical application: in a card with avatar + name + description + action,

- avatar to name: XS (8pt) — they describe the same person.
- name to role: XS — same group.
- card padding (content to edge): M (24pt).
- card to next card: L (32pt) — different content, same surface type.
- card group to next section: XL (48pt) — different content type.

**Common mistake:** using one spacing value (e.g., 16pt) everywhere. Result: cluttered, no hierarchy, hard to scan.

## Be generous with white space

Whitespace isn't wasted space. It:

- Separates groups, reinforcing structure.
- Gives the eye rest, reducing fatigue.
- Increases perceived elegance and quality.
- Highlights the elements present (more breathing room → more attention).

Designers under pressure to "fit more on screen" often cut whitespace. This usually backfires — denser screens get harder to scan, slowing comprehension and lowering perceived quality.

## Align the main layout to a 12 column grid

For desktop and tablet layouts, align elements to a 12-column grid. 12 is the most common because:

- Divides cleanly into halves, thirds, fourths, sixths.
- Provides flexibility without complexity.
- Aligns with most front-end frameworks.

### Anatomy

- **Columns** — the vertical stripes of content.
- **Gutters** — the gaps between columns.
- **Margins** — the outer space between columns and the screen edges. Wider on larger screens.

Mobile layouts typically collapse to 4 or fewer columns; tablets to ~8; desktops to 12. Margins shrink on smaller screens (e.g., 80pt XXL on desktop → 16pt S on mobile).

Some experienced designers find 12 columns restrictive — but for most cases, the constraint helps.

## Align text to improve readability

Left-aligned text is the easiest to read because each line starts on the same vertical edge. Your eyes find the next line by jumping back to that edge.

Center alignment is acceptable for **short** headings or small standalone text. Avoid for body text — the eye has to find a new starting point each line, slowing reading.

Justified text (the kind used in books) creates uneven word spacing and "rivers" of whitespace. It's harder to read for everyone, especially people with dyslexia. Avoid it in UI.

### Align horizontal text to the baseline

The baseline is the invisible line text sits on. When different-sized text appears in a horizontal line, align to the baseline rather than the vertical center. Reads more naturally.

Example: "$10 /month" — the smaller "/month" should sit on the same baseline as the "$10," not float above it.

## Try to avoid using multiple alignments

Mixing left, center, and right alignments within a small section makes the eye zig-zag. Looks messy, increases cognitive load.

Stick with a single alignment within each component. If you need to mix (e.g., centered hero with left-aligned content below), make the transition deliberate and the boundary clear.

## Keep related actions close (Fitts's Law)

Fitts's Law: the closer and larger a target, the faster it is to acquire.

Practical applications:

- Place actions near the elements they affect. A "Remove" button next to the row it removes; a "Save" button at the bottom of the form it saves.
- Make important targets large. Primary buttons should be at least 48pt tall.
- For small interactive elements, **extend the touch target beyond the visual** — make the clickable area larger than the icon.
- **Indicate the larger target area** (with a hover background, focus ring, or subtle hover-state) so users perceive what they can hit.

## Ensure your interface is unbreakable

Designs need to survive variable real-world content:

- Long names that wrap.
- Empty states (no items in the list).
- Error states (data didn't load).
- Loading states (data is loading).
- Maximum-length content (50-item carts, 1000-character bios).

Test each component with: empty data, minimal data, typical data, maximum-realistic data, error data, loading.

A "perfect" design with three perfectly sized cards breaks the moment a real card has a 100-character title.

## Use the Rule of Thirds for photos

Divide a photo into a 3×3 grid. Place key subjects on the gridlines or at the intersections (not centered). Creates more dynamic, visually interesting compositions than dead-center subjects.

For UI, this matters when:

- Cropping hero images.
- Choosing photos for cards.
- Composing illustrations.

Some hero images break this rule deliberately for symmetry. Make it a default, not a rule.

## Common layout mistakes

When auditing a layout, look for:

1. **Uniform spacing** — same gap between everything; no grouping reads.
2. **Too many alignments** — eyes zig-zag.
3. **Same prominence on competing elements** — Squint Test fails.
4. **Centered body text** — slows reading.
5. **Off-grid spacing** — 25pt, 39pt values that don't match the scale.
6. **Dense screens** — no whitespace, no rest.
7. **Hidden hierarchy** — primary action looks like secondary.
8. **Right-aligned primary buttons** — easy to miss on large screens or with screen magnifiers.
9. **Container without enough padding** — content touches edges.
10. **Text floating away from its label/icon** — broken proximity.

## Chapter summary

- Group related elements via container, proximity, similarity, or alignment.
- Build a clear visual hierarchy with size, color, contrast, spacing, position, and depth.
- Test hierarchy with the Squint Test.
- Use the box model: margin (outer), border, padding (inner).
- Design in points at @1x.
- Use an 8pt spacing scale (XS=8, S=16, M=24, L=32, XL=48, XXL=80).
- Closer = more related. Innermost rectangles get smallest spacing; grow outward.
- Align main layout to a 12-column grid.
- Left-align text. Avoid mixing alignments.
- Keep actions close to what they affect (Fitts's Law).
- Stress-test components with empty/long/error/loading content.
