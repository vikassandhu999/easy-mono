---
name: practical-ui
description: Comprehensive UI/UX design guidelines from "Practical UI" by Adham Dannaway, covering visual design, accessibility, layout, typography, color, copywriting, buttons, and forms. Use this skill any time you design, build, review, or improve a user interface — whether you're writing React/HTML/CSS components, designing landing pages, dashboards, mobile screens, forms, buttons, color palettes, design systems, marketing sites, or any web/app UI. Use it even when the user doesn't explicitly say "UI design" — if the task involves making something look or work well on screen (a component, a page, a mockup, a redesign, a "make this look better"), apply these guidelines. Use it for accessibility reviews, design critiques, design system creation, picking colors/fonts/spacing, writing button text or error messages, or any decision about visual hierarchy, contrast, or interaction. The guidelines are opinionated, evidence-based, and accessibility-first (WCAG 2.1 AA).
---

# Practical UI

A logic-driven approach to UI design. Every design decision should have a reason that improves usability — not an aesthetic gut feeling.

This skill is based on *Practical UI, 2nd edition* by Adham Dannaway. It distills ~80 guidelines into actionable defaults plus deeper references for each chapter.

## The four foundational goals

Every guideline in this skill ladders up to one or more of these:

1. **Minimise usability risk** — keep interfaces simple, familiar, and clear. If something is vague or could be misread, fix it.
2. **Minimise interaction cost** — the sum of physical and mental effort (looks, clicks, scrolls, reads, types, thinks). Lower is better.
3. **Minimise cognitive load** — the brain power required to use the interface. Group, simplify, and use conventions.
4. **Ensure accessibility** — meet WCAG 2.1 level AA at minimum. Good accessibility *is* good usability.

When two guidelines conflict, the one that reduces risk for the broadest range of users wins. Subjective taste loses to logical reasons.

## How to use this skill

For most UI tasks, the **defaults section below is enough** — apply it directly and cite the rationale when relevant. For deeper questions, consult the relevant reference file:

- **Designing or critiquing a component / screen** → start here, then `references/04-layout-and-spacing.md`
- **Picking or evaluating colors** → `references/03-color.md`
- **Picking or evaluating typography** → `references/05-typography.md`
- **Writing UI text (labels, buttons, errors, headings)** → `references/06-copywriting.md`
- **Designing buttons** → `references/07-buttons.md`
- **Designing forms** → `references/08-forms.md`
- **Reducing complexity in a busy UI** → `references/02-less-is-more.md`
- **Establishing principles, design systems, or interaction states** → `references/01-fundamentals.md`
- **Building a design token set from scratch** → `references/design-system-tokens.md`
- **Accessibility audit / pre-ship checklist** → `references/accessibility-checklist.md`

Read the relevant reference file before writing detailed code or recommendations — the references contain the "why" and the edge cases that the defaults below skip for brevity.

## Design philosophy (apply to every UI task)

These six rules are non-negotiable defaults. They override personal taste.

1. **Have a logical reason for every detail.** "Looks nice" isn't a reason. Be ready to articulate why each color, size, position, and word is the way it is.
2. **Use common design patterns** (Jakob's Law). People come to your interface with mental models from other products. Honor those models. Innovate only where it's the unique value of the product, not on form fields.
3. **Be consistent.** Similar elements should look and work similarly — both within your product and against established conventions (links are underlined, checkboxes are squares with ticks, primary buttons are filled).
4. **Indicate interactivity clearly.** Use the brand color for interactive elements; never use it for decoration. People should never have to guess what's clickable.
5. **Show the five interaction states.** Every interactive element needs: default, hover, press/active, focus (keyboard), disabled.
6. **Design for the smallest screen first.** Constraints force prioritization. Then expand to larger screens — don't fill the space just because it's there.

## Default design tokens

When you need to pick values and there's no reason to deviate, use these. They are the book's recommended starting point.

### Spacing — 8pt grid

Use t-shirt sizes. Increment by ~8pt and grow proportionally:

| Token | Value | Use |
|-------|-------|-----|
| XS    | 8pt   | inside small components (e.g. icon-to-text) |
| S     | 16pt  | between closely related items |
| M     | 24pt  | between items in a group |
| L     | 32pt  | between groups |
| XL    | 48pt  | between sections |
| XXL   | 80pt  | between major page regions |

**Rule:** more closely related elements get smaller spacing. Start with the innermost rectangles using small spacing and increase as you move outward.

### Typography

- **One sans-serif typeface** (e.g. Inter, system UI font). Add a second only for headings, only for brand personality, only after you're confident.
- **Two weights only:** Regular (400) and Bold (700). No light, no semibold by default.
- **Type scale (1.200 ratio):** 14 / 16 / 20 / 24 / 32 / 40 px with line heights 20 / 24 / 28 / 32 / 40 / 48 px respectively.
- **Body text:** at least 18px for long-form reading. Line height ≥1.5. Line length 40–80 characters.
- **Decrease line height as font size grows** — headings need ~1.2–1.3, not 1.5.
- **Always left-align** body text. Never justify. Center-align only short headings or short standalone text.
- **Avoid pure black** (#000) and very light grey for body text. Use a dark grey for text strong (see palette below).

### Color — the 5-variation palette

Build the palette from a single brand hue using HSB. Each variation has one job:

| Variation     | HSB (example, hue=230) | Purpose                                                 |
|---------------|------------------------|---------------------------------------------------------|
| Brand         | 230, 65, 85            | Interactive elements only (links, primary button fills) |
| Text strong   | 230, 57, 24            | Headings, body text, form labels                        |
| Text weak     | 230, 27, 48            | Secondary text, captions                                |
| Stroke strong | 230, 23, 65            | Borders on inputs, icons (must read as a UI element)    |
| Stroke weak   | 230,  5, 94            | Decorative borders, dividing lines                      |
| Fill          | 230,  2, 98            | Secondary backgrounds (tags, badges, subtle panels)     |
| Background    | 0,    0, 100 (#FFF)    | Page background                                         |

**Constraint:** Brand, Text strong, Text weak must hit 4.5:1 contrast against Fill. Stroke strong must hit 3:1 against Fill.

**System colors:** add 3 more (red for errors, amber for warnings, green for success). Each gets the same 4 opacity variations.

For complex apps with multiple background colors, use the transparent-color approach — see `references/03-color.md`.

### Border radius

3 sizes only: 8pt (small components), 16pt (medium — cards, dialogs), 32pt (large — hero panels). Be consistent within each tier.

### Shadows

2 elevation levels: **raised** (subtle, for cards/buttons that lift slightly) and **overlay** (stronger, for menus/modals/popovers).

## Accessibility minimums (WCAG 2.1 AA)

Never ship below these:

- **Small text (≤18px regular, ≤14px bold):** contrast ratio ≥ 4.5:1
- **Large text (≥18px bold or ≥24px regular):** contrast ratio ≥ 3:1
- **UI elements** (form borders, icons that convey meaning, focus rings): contrast ratio ≥ 3:1
- **Touch targets:** at least 48pt × 48pt, separated by at least 8pt
- **Never rely on color alone** to convey meaning — pair color with icon, underline, label, position, or shape
- **Underline text links** in body content (so colorblind users can distinguish them)
- **All five interaction states** are visible and accessible (default, hover, press, focus, disabled)

For a full pre-ship audit, read `references/accessibility-checklist.md`.

## Default behaviors when generating UI

When asked to design or build any UI without specific direction, follow these defaults:

- **Mobile-first.** Start with the small-screen layout, then adapt up.
- **Single column for forms.** Stack labels above inputs. Mark both required (with `*`) and optional (with the word "optional") fields.
- **One primary action per screen.** Use a single filled primary button. Other actions get secondary (outlined) or tertiary (text-link) treatment.
- **Left-align everything.** Including buttons (most important first, leftmost). Mix alignments only with strong reason.
- **Place the brand color only on interactive elements.** Headings get Text strong, not Brand.
- **Sentence case** for all UI text (`Save post` not `Save Post`). No UPPERCASE except small bolded labels with letter-spacing.
- **Verb + noun** for button labels (`Save post`, `Delete account`). No `OK` / `Submit` / `Click here`.
- **Concise text.** Cut "would you like to", "please", "in order to", "actually", articles where they don't add meaning. Sentences under 20 words.
- **Use icons with text**, not icons alone, unless the icon is universally recognized (×, ←, ⚙).
- **Add friction proportional to severity** for destructive actions: dim the action → confirmation dialog → red dialog → checkbox-confirm → undo toast.
- **Avoid disabled buttons.** Enable them and validate on submit, surfacing clear errors.

## Working with this skill in practice

When the user asks for a UI:

1. **Apply the defaults above** without asking — these are the "no specific direction" baseline.
2. **Check the accessibility minimums** before considering the work done. If the user supplied colors/sizes that fail, flag it and propose accessible values.
3. **For specific concerns** (a tricky color question, a complex form, dense typography decisions), open the relevant reference file and apply its detail.
4. **Articulate the rationale** when explaining choices. "Filled brand color because primary action; left-aligned because English reads left-to-right and screen-magnifier users can miss right-aligned buttons; 48pt height for thumb-reach."
5. **When the user pushes back with subjective feedback** ("make it more modern" / "I don't like that gray"), don't abandon the principles — restate the constraint and offer a variation that still respects it.

## What this skill is *not*

- It's not a brand identity guide — it concerns interface design, not logo work, illustration style, or marketing voice.
- It's not platform-specific. It applies to web and mobile generally; for iOS/Android-specific patterns (haptics, native navigation), defer to Apple HIG / Material Design where they conflict.
- It's not exhaustive. Conduct usability testing for important flows — these guidelines reduce risk but don't eliminate it.

## A reminder on innovation

Following these guidelines isn't an excuse to make boring interfaces. The point is to spend your creative energy on the *unique value* of the product (the core experience, the differentiator), and to play it safe on the conventions (forms, buttons, navigation). Innovate where it counts.
