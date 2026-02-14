# UI Design Rules for Agents (Coachapp v2)

Source distilled from `apps/coachapp/ui-guidelines/guidelines.md`.

Use this file as the practical decision checklist when designing new screens or refactoring UI.

## 1) Core decision principles

1. Every visual detail must have a functional reason. If you cannot explain why it improves clarity, speed, or trust, remove it.
2. Optimize for low interaction cost (fewer clicks, less scrolling, shorter pointer travel, fewer precise taps).
3. Optimize for low cognitive load (fewer choices, clear grouping, predictable patterns, consistent language).
4. Prefer familiar patterns over novelty unless there is strong evidence a custom pattern is better.
5. Apply the 80/20 rule: prioritize the few flows and controls used most often.

## 2) Accessibility baseline (non-negotiable)

1. Meet WCAG 2.1 AA at minimum.
2. Contrast minimums:
   - Text <= 18px: 4.5:1
   - Large text: 3:1
   - UI boundaries/components (inputs, buttons, controls): 3:1
3. Never rely on color alone for meaning. Pair color with icon, underline, shape, label, or text.
4. Keep keyboard and focus usability intact (`focus-visible`, logical tab flow).
5. Tap/click targets: minimum 44px, prefer 48px.
6. Form and state errors must be perceivable without color (icon + message + border/state).

## 3) Information architecture and hierarchy

1. One page = one dominant primary action.
2. Put highest-importance content/actions first (top/left in LTR interfaces).
3. Keep related actions close to the content they affect.
4. Group related items with one or more of: shared container, close spacing, visual similarity, alignment continuity.
5. Prefer visible important actions over hidden menus when space allows.
6. Use progressive disclosure for secondary detail, not for critical path controls.

## 4) Spacing and layout system

1. Use a predefined spacing scale only (8pt base). Default steps: 8, 16, 24, 32, 48, 80.
2. Spacing expresses relationship:
   - closer = more related
   - farther = less related
3. Start with small spacing inside components, increase spacing as you move outward to larger sections.
4. Be generous with whitespace; if groups blur together in a quick squint/zoom-out check, increase spacing.
5. Align primary page structure to a responsive 12-column grid on desktop.
6. Keep gutters as spacing, not content containers.

## 5) Typography rules

1. Prefer one sans-serif typeface for UI body/copy; add a second face only when intentional and controlled.
2. Use regular and bold as default weights.
3. Use a type scale; avoid arbitrary text sizes.
4. Long body text line height >= 1.5.
5. Ideal line length: 40-80 characters.
6. Left-align long body text; avoid center/justified paragraphs.
7. Avoid pure black body text on white; use accessible dark gray.

## 6) Color system rules

1. Start in black/white + neutrals, then add brand color purposefully.
2. Use one primary interactive brand color where possible.
3. Reserve red/amber/green for system semantics (error/warning/success), not decorative emphasis.
4. Use semantic color tokens (role-based naming) rather than raw color values in component decisions.
5. Define consistent interaction states (default, hover, active, focus, disabled).
6. If brand color contrast is weak, prioritize accessibility over purity (adjust color, border, or text color).

## 7) Buttons and actions

1. Use a 3-weight action system:
   - Primary: most important action
   - Secondary: alternative or equal-importance actions
   - Tertiary: least prominent or utility actions
2. One primary button per view/section.
3. Button labels must describe action clearly (prefer verb + noun, e.g., `Save plan`).
4. Avoid disabled buttons when possible; prefer enabled submit with validation feedback.
5. Destructive actions need friction proportional to risk (confirm dialog, warning copy, optional typed/checked confirmation for severe actions).
6. Keep adequate spacing between neighboring actions to reduce misclicks.

## 8) Forms

1. Default to single-column forms.
2. Place labels above fields; keep label-field spacing tight and consistent.
3. Do not use placeholder text as the only label.
4. Minimize fields to essential inputs only.
5. Mark required/optional fields clearly and consistently.
6. Match field width to expected input length where reasonable.
7. Prefer radio buttons for small option sets, autocomplete for long lists, stepper for small numeric adjustments, checkbox/toggle for binary choices.
8. Prefer positive checkbox phrasing.
9. Split long forms into logical steps with visible progress.
10. Validation strategy:

- baseline: validate on submit
- add on-blur or on-change validation where it materially helps completion

## 9) Copy and microcopy

1. Be concise and plain-language first.
2. Use sentence case for UI labels/buttons/headings by default.
3. Front-load important words (put key meaning first).
4. Use consistent vocabulary across the product (`Sign up` vs `Register`, pick one).
5. Prefer numerals for numbers (`2,420` not `two thousand four hundred and twenty`).
6. Make link/button text meaningful out of context; avoid vague `Learn more` when possible.
7. Error messages must state: what happened, why, and what to do next.

## 10) Consistency and resilience

1. Similar-looking elements must behave similarly.
2. Similar actions should use consistent wording and visual weight.
3. Design for edge cases: long names, long numbers, empty states, overflow, no-data states.
4. Do not truncate critical identifiers in ways that remove differentiation.
5. Test at mobile first, then scale up.

## 11) Agent review checklist (before finalizing UI)

1. Is there exactly one dominant primary action?
2. Are related controls grouped and near their data/results?
3. Are all contrast and non-color cues compliant?
4. Are target sizes and spacing safe on mobile?
5. Is copy concise, consistent, and sentence case?
6. Is the form (if any) single-column and label-clear?
7. Are destructive actions de-emphasized with proper friction?
8. Does the screen remain understandable when squinting/zooming out?
