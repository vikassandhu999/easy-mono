# Chapter 1: Fundamentals

The overarching principles that make the rest of the guidelines coherent. Read this when establishing first principles, building a design system from scratch, debating UI decisions, or auditing why an interface "feels off."

## Minimise usability risks

Many design decisions should be governed by **risk** — the chance that someone could have difficulty using the interface. Examples of common risks:

- **Thin, light grey text** looks sleek but risks being unreadable for users with low vision.
- **Icons without labels** look minimal but risk being misunderstood, especially by users with cognitive or vision impairments.
- **Colored heading text** may be mistaken for a link.

You usually don't know exactly who will use the product, so cater to the broadest range possible: people with low vision, low computer literacy, motor impairments, cognitive impairments, dyslexia, color blindness. Aim for **WCAG 2.1 level AA** as a floor.

When something is even slightly vague, confusing, or ambiguous, simplify it before investing in usability testing. Testing catches large risks; the small ones can slip through.

## Have a logical reason for every design detail

Every interface detail should have a rationale. "It looks nice" or "I don't like that" are subjective opinions, not decisions. Designing using objective logic instead of taste:

- Speeds up decision-making.
- Lets you defend choices in critique.
- Lets you give constructive feedback to others.

Even purely decorative elements should have a logic ("this whitespace gives the eye a rest after a dense section"). When you can't justify an element, it's a candidate for removal.

## Minimise interaction cost

Interaction cost = the sum of physical and mental effort to complete a task. It's measurable. Looking, scrolling, searching, reading, clicking, waiting, typing, thinking, and remembering all add to it.

The three most effective ways to reduce it:

1. **Keep related actions close** (Fitts's Law: the closer and larger a target, the faster it is to acquire). Aim for at least 48pt × 48pt targets.
2. **Reduce distractions** — animated banners, pop-ups, unnecessary visuals pull attention from the task.
3. **Minimise choice** (Hick's Law: decision time grows with the number and complexity of choices). Reduce options or recommend a default.

**Concrete example:** changing a quantity dropdown to a stepper component reduces "1 click + 1 scroll + 1 click" to "1 click." Moving the "Add to cart" button next to the quantity selector eliminates a mouse traverse. This kind of small reduction, applied across every interaction, adds up.

## Minimise cognitive load

Cognitive load = brain power required to use the interface. Frees up mental resources for the task itself.

Quick wins:

- Remove unnecessary styles, info, and decisions.
- Break information into smaller, related groups.
- Use conventional patterns (no relearning).
- Maintain consistency (no surprises).
- Establish a clear visual hierarchy.

**Example:** A long, complex form with 12 questions on one screen is more cognitively expensive than the same form broken into 4 steps of 3 questions each, even though the total work is the same.

## Create a design system

A design system is the apparatus for fast, consistent decisions. Build it in three steps:

### 1. Set predefined style options ("tokens")

Don't choose colors / sizes / spacing ad hoc. Pre-define a small set:

- **Color palette** — see Chapter 3.
- **Type scale** — see Chapter 5.
- **Spacing scale** (8pt grid: XS=8, S=16, M=24, L=32, XL=48, XXL=80) — see Chapter 4.
- **Border radius:** 3 sizes (8pt small, 16pt medium, 32pt large).
- **Shadows:** 2 levels (raised, overlay).

Limiting options improves consistency and speeds up decisions.

### 2. Create reusable modules (components)

Build atomically:

- Start with the smallest pieces — buttons, avatars, input fields.
- Combine them into larger components — cards, dialogs, list rows.
- Arrange components into reusable page templates.

The full collection is a "component library" or "UI kit." A button reused inside ten different cards costs once, ships ten times.

### 3. Define usage guidelines

This is what most design systems forget. Without rules for *how* to use the components, you'll get inconsistency. Useful default rules:

- Indicate interactive elements using the brand color.
- Use sentence case.
- Left-align buttons and text.
- Avoid disabled buttons.
- Front-load text.
- Be concise; use plain language.

Each rule should have a rationale documented next to it (so the next designer doesn't undo it for aesthetic reasons).

## Ensure accessibility

A significant share of the population has some form of permanent disability. Many more have temporary or situational disabilities (an arm injury, a sunny day glare, a noisy room). An accessible interface benefits everyone.

### What to design for

- **Blindness / low vision** — sufficient contrast, screen-reader-friendly markup, never color-only signals.
- **Color blindness** — pair color with another indicator (icon, underline, shape, label).
- **Motor impairments** — large enough targets, generous spacing, no hover-only interactions, keyboard accessibility.
- **Cognitive impairments** — plain language, conventional patterns, clear hierarchy, error recovery.

### Assistive technology to keep in mind

- **Screen readers** describe the interface via speech or braille. Mostly handled in front-end code (semantic HTML, ARIA), but as a designer:
  - Ensure heading text is descriptive in isolation (screen-reader users skim heading lists).
  - Ensure link and button text describes its destination/action.
  - Ensure form labels are associated with their fields.
- **Screen magnifiers** show only a small region of the screen at a time:
  - Don't put critical actions far to the right (they get missed).
  - Keep related items close together.
  - Don't hide important content in collapsed areas without strong cues.

### The compliance floor

Aim for **WCAG 2.1 level AA** by default. Concretely:

- **Body text contrast ≥ 4.5:1** against its background.
- **Large text (≥18px bold, ≥24px regular) and UI elements contrast ≥ 3:1.**
- **Touch targets ≥ 44pt × 44pt** (the book recommends 48pt × 48pt for an 8pt-grid alignment).
- **Don't rely on color alone.**
- **All interactive states perceivable.**

> Mantra: **"Good accessibility = great usability."**

## Use common design patterns (Jakob's Law)

People use many products. They build mental models from the ones they use most. When your product matches those models, they use it without thinking. When it doesn't, they have to *learn* — and many won't bother.

**Examples of conventions to keep:**

- Text links are colored *and* underlined.
- Checkboxes are small squares with a tick when selected.
- Radio buttons are small circles with a dot when selected.
- Form fields are rectangles with a label *above* them.
- Primary buttons are filled rectangles with rounded corners.
- The logo is in the top left and links to the home page.
- Cart icons are top right; menu icons are top left or top right.

**When to deviate:** for the unique value of your product. The differentiator. Not for forms, buttons, or navigation. Innovate where users come to you for something special; play it safe everywhere else.

## Use the 80/20 Rule (Pareto Principle)

Roughly 80% of effects come from 20% of causes. In product:

- ~80% of users use ~20% of features.
- ~80% of complaints come from ~20% of issues.
- ~80% of attention is spent on ~20% of a page.

Prioritize accordingly. Optimize the common paths; don't spend disproportionate effort on edge cases that affect few users.

## Keep costs in mind

Time = money on commercial projects. Ways to be more efficient:

- Use existing design systems, templates, icon sets where possible.
- Outsource time-intensive specialty work (illustrations).
- Stick with familiar UI patterns (saves usability testing money).
- Learn how interfaces are coded — design within technical constraints.
- Talk to developers early. The simple approach is usually cheaper to build and easier for users.

## Be consistent

Two flavors:

### Within your product
Same elements look and work the same way. Same vocabulary for the same concept (don't say "cart" in one place and "bag" in another).

### With other products
If your product runs on iOS or Android, follow the platform conventions unless they test poorly. Otherwise, follow web/mobile conventions broadly.

## Clearly indicate the 5 interaction states

Every interactive element needs all five visible states:

| State        | Trigger                       | Purpose                                           |
|--------------|-------------------------------|---------------------------------------------------|
| **Default**  | not interacted with           | indicates the element is interactive              |
| **Hover**    | cursor is over the element    | feedback that it's interactive                    |
| **Press / active** | element is being pressed | feedback that the action is happening             |
| **Focus**    | reached via keyboard          | tells keyboard users where they are               |
| **Disabled** | element is not actionable     | indicates the action is currently unavailable     |

Common ways to signal each state: change in fill, border, opacity, shadow, scale, or color brightness. Focus rings should have ≥3:1 contrast against the background.

## Chapter summary

- Design every detail with a logical reason that improves usability.
- Minimise interaction cost and cognitive load.
- Build a design system — predefined tokens, reusable components, usage rules.
- Treat accessibility (WCAG 2.1 AA) as a floor, not a goal.
- Use common design patterns; innovate only where it's the product's differentiator.
- Be consistent and indicate all five interaction states.
