# Accessibility Checklist

A pre-ship audit aligned with WCAG 2.1 level AA, drawn from the Practical UI book's accessibility guidance across all chapters. Run this checklist on any UI before shipping. Most failures fall into the same handful of categories.

> **Why this matters.** A significant share of users have permanent disabilities (low vision, motor impairment, color blindness, cognitive impairments). A larger share have temporary or situational ones (an arm injury, sun glare, a noisy room, holding a baby). Good accessibility = great usability.

## Color & contrast

- [ ] **Body text contrast ≥ 4.5:1** against its background.
- [ ] **Large text contrast ≥ 3:1** (large = ≥18px bold or ≥24px regular).
- [ ] **UI element contrast ≥ 3:1** (form borders, meaningful icons, focus rings, button outlines, toggle switches, checkbox/radio borders).
- [ ] **Pure black text avoided** on white backgrounds — eye strain at 21:1.
- [ ] **Light grey text avoided** for body content — fails 4.5:1.
- [ ] **Placeholder text contrast ≥ 4.5:1** if used as the only label (special case in search fields).
- [ ] **Disabled element contrast ≥ 3:1** if used at all.
- [ ] **Text on photos** has overlay/gradient/background to ensure contrast against the *darkest* part of the image behind it.

## Don't rely on color alone

- [ ] **Form errors** show color *plus* an icon, thicker border, background tint, or message.
- [ ] **Text links in body content are underlined** (not just colored).
- [ ] **Selected states** use color *plus* checkmark, fill, border, or position.
- [ ] **Required fields** marked with asterisk *and* explained at the top — or with the word "required."
- [ ] **Status indicators** (success, warning, error) use color *plus* an icon (✓ ⚠ ✕).
- [ ] **Active vs inactive elements** differ in weight, size, opacity, or position — not just color.
- [ ] **Greyscale test**: render the design in greyscale. Can you still tell what's interactive, what's an error, what's selected?

## Touch targets & spacing

- [ ] **All touch targets ≥ 48pt × 48pt** (or 44pt minimum per strict WCAG).
- [ ] **Frequently-used buttons larger** than the minimum.
- [ ] **Adjacent interactive elements separated by ≥ 8pt** to prevent fat-finger errors.
- [ ] **Small visual elements have extended invisible touch zones** beyond their visual bounds (link rows, icon buttons).
- [ ] **Hover/focus states indicate the larger touch zone** so users perceive what they can hit.

## Interaction states (5 of them)

For every interactive element:

- [ ] **Default** — visually clear that it's interactive.
- [ ] **Hover** — feedback when cursor is over.
- [ ] **Press / active** — feedback during interaction.
- [ ] **Focus** — visible focus ring with ≥ 3:1 contrast (for keyboard users).
- [ ] **Disabled** — clearly different and explained.
- [ ] **Focus ring is visible at 3:1 contrast** against both the element and the background. Don't outline-none focus styles.

## Keyboard accessibility

- [ ] **Every interactive element is reachable via Tab.**
- [ ] **Tab order matches reading order.**
- [ ] **Focus visible at every step.**
- [ ] **Custom controls (sliders, toggles, dropdowns) handle Enter/Space/arrow keys** as expected.
- [ ] **Modals trap focus** — Tab cycles within the modal; Escape closes.
- [ ] **Skip links** at top of page allow jumping past nav to main content.
- [ ] **No keyboard traps** — users can always Tab/Esc out.

## Screen reader / semantic markup

- [ ] **Heading hierarchy is logical** (h1 → h2 → h3, no skipped levels).
- [ ] **Each heading is descriptive** when read out of context (screen-reader users skim heading lists).
- [ ] **Form inputs have associated labels** (`<label for="">` or `aria-labelledby`).
- [ ] **Icons that convey meaning have text alternatives** (`aria-label` or visible label).
- [ ] **Decorative icons hidden from screen readers** (`aria-hidden="true"`).
- [ ] **Link text describes the destination** when read out of context — no "click here," no multiple "learn more"s.
- [ ] **Buttons describe the action** when read out of context — verb + noun.
- [ ] **Images have alt text** that describes the content/purpose. Decorative images: `alt=""`.
- [ ] **Form errors announce when they appear** (`role="alert"` or `aria-live`).
- [ ] **Dynamic content updates announced** appropriately.

## Forms

- [ ] **Single column layout** with labels stacked above inputs.
- [ ] **Required fields marked with asterisk *and* the convention explained** at the top of the form, OR marked with the word "required."
- [ ] **Optional fields marked with "(optional)"** when mixed with required fields.
- [ ] **Hints placed above the field** (between label and input), not below.
- [ ] **Field width matches expected input length** — narrow fields for short inputs.
- [ ] **Conventional field styles** — rectangle, visible border, label above.
- [ ] **Field borders ≥ 3:1 contrast.**
- [ ] **Don't use placeholder text as the label** (except acceptable in search fields with proper aria-label).
- [ ] **Submit buttons enabled** (validate on submit; don't disable preemptively).
- [ ] **Error messages are specific** ("Enter a valid email like name@example.com") and **non-blaming**.
- [ ] **Errors appear above the field** (mobile keyboards/autofill cover the area below).
- [ ] **Multi-step forms show progress** ("Step 2 of 4").
- [ ] **Long forms grouped** under descriptive headings or split into steps.

## Buttons

- [ ] **One primary button per screen** (or per dialog).
- [ ] **Primary, secondary, tertiary differ in shape/fill** — not just color.
- [ ] **Tertiary buttons are underlined** (so they're identifiable as interactive without color).
- [ ] **No light grey "secondary" buttons** that look disabled.
- [ ] **Button text is descriptive** out of context — "Save post" not "OK" or "Submit."
- [ ] **Buttons left-aligned**, most important first (with documented exceptions like single-field forms).
- [ ] **Disabled buttons explained** with nearby message or tooltip if used.
- [ ] **Destructive actions have friction** proportional to severity (initial / light / moderate / heavy).
- [ ] **Undo available** for destructive actions where possible.

## Typography

- [ ] **Body text ≥ 18px** for long-form prose (16px acceptable for UI labels).
- [ ] **Line height ≥ 1.5** for body text.
- [ ] **Line length 40–80 characters** for long-form text.
- [ ] **Left-aligned** body text. Not justified. Not centered (for body).
- [ ] **No UPPERCASE body text.** Uppercase reserved for small bold accent labels with letter-spacing.
- [ ] **Font weight ≥ regular** for body text. Light weights are inaccessible at small sizes.
- [ ] **Two weights only** by default (regular and bold).
- [ ] **One typeface** by default (or two — body sans + heading personality).

## Visual hierarchy

- [ ] **Squint Test passes:** squint or blur the design — most important elements still stand out.
- [ ] **Primary action is the most prominent** element on the screen.
- [ ] **Headings descend in size** matching their level (h1 > h2 > h3).
- [ ] **Related elements grouped** via container, proximity, similarity, or alignment.
- [ ] **Related elements sit close** (small spacing); unrelated elements separated (larger spacing).
- [ ] **Single alignment per section** — avoid mixing left/center/right within a small region.

## Content & language

- [ ] **Plain language at ~6th-grade reading level.**
- [ ] **Sentence case** for UI text. No Title Case. No UPPERCASE except small accent labels.
- [ ] **Concise** — no filler, intro phrases, unnecessary articles. Sentences under 20 words.
- [ ] **Front-loaded** — important info first.
- [ ] **No jargon, slang, or unexplained abbreviations.**
- [ ] **Numerals for numbers** ("245" not "two hundred forty-five").
- [ ] **Vocabulary consistent** — same word for the same concept.
- [ ] **Error messages helpful** — what happened, why, how to fix.

## Images, video, audio

- [ ] **All meaningful images have alt text** describing content/purpose.
- [ ] **Decorative images** marked `alt=""` to be skipped by screen readers.
- [ ] **Videos have captions.**
- [ ] **Audio content has transcripts.**
- [ ] **No autoplay video with sound** (annoying, accessibility-hostile, often blocked).
- [ ] **Video/audio have play/pause controls** that are keyboard-accessible.

## Motion & animation

- [ ] **`prefers-reduced-motion` respected** — animations disabled or simplified for users who request it.
- [ ] **No flashing content** at 3+ flashes per second (seizure risk).
- [ ] **Auto-rotating carousels can be paused.**
- [ ] **Animations don't block content** — users can interact while or before the animation finishes.

## Responsive & zoom

- [ ] **Layout works at 200% zoom** without horizontal scroll on the main content.
- [ ] **Text reflows at 320pt viewport width** (smallest reasonable mobile).
- [ ] **No fixed font sizes** that prevent user zoom.
- [ ] **Touch targets remain ≥ 48pt** at all viewport sizes.

## Common high-impact failures (audit these first)

In order of frequency, these are the most common accessibility failures in real-world UI:

1. **Insufficient contrast** — text or UI elements failing 4.5:1 / 3:1.
2. **Color-only signals** — errors that show only red, links that are only blue.
3. **Tiny touch targets** — buttons or links smaller than 48pt × 48pt.
4. **Missing focus indicators** — `outline: none` without replacement.
5. **Generic link/button text** — "click here," "more," "OK."
6. **Placeholder-as-label** patterns.
7. **Missing form-field labels** or labels disconnected from fields.
8. **Disabled submit buttons** without explanation.
9. **Inaccessible custom controls** — toggles, sliders, dropdowns built without keyboard support.
10. **Right-aligned primary buttons** that get missed by screen-magnifier users.

## Tools

For automated checks (catches a subset of issues):

- **Browser DevTools Lighthouse** — accessibility audit built in.
- **axe DevTools** (browser extension) — more thorough.
- **WAVE** (browser extension) — visual flagging.
- **Stark** (Figma/Sketch plugin) — contrast and color blindness simulation in design.
- **macOS VoiceOver / Windows Narrator / NVDA** — actual screen-reader testing.

Automated tools catch ~30–50% of accessibility issues. **Manual testing — keyboard-only navigation, screen reader, zoom — catches the rest.**

## When you can't fix everything

If shipping a partially-accessible product, prioritize fixes in this order:

1. **Critical content** (error messages, primary actions, sign up/log in flows) before secondary.
2. **Most-used screens** before edge cases.
3. **Failures affecting the most users** (contrast, touch targets) before niche issues.
4. **Things that can be fixed in CSS** (contrast, focus rings) — quick wins.

Document remaining issues, file them, and prioritize them in the backlog. Don't pretend they aren't there.
