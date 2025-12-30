# CoachEasy UI rules (distilled)

This file is a project-specific checklist distilled from the UI references in this folder.
It is written in our own words to be actionable for implementation (theme + components).

## 1) Reduce usability risk (default to clarity)
- Prefer conventional patterns over novelty (standard form controls, predictable navigation).
- If something could plausibly confuse a first-time user, simplify before adding features.

## 2) Accessibility first
- Maintain strong contrast between text and its background (aim for WCAG 2.1 AA).
- Never rely on color alone to convey meaning (use icons/labels/underlines/states).
- Ensure all interactive elements have clear hover + focus-visible states.
- Minimum touch/click targets: 44px (comfortable: 48px). Use `--touch-target-min`.

## 3) Use a small set of reusable tokens
- **Spacing**: use the `--space-*` scale (4px base grid). Avoid one-off spacing.
- **Radius**: use `--radius-*` options only.
- **Shadows**: use `--shadow-*` options only (subtle by default).
- **Typography**: use the `--text-*` scale + `--leading-*` line-heights.

## 4) Typography defaults
- Body text should be readable and not cramped: default line-height should be ~1.5 (`--leading-relaxed`).
- Use fewer weights (regular + semibold/bold) and reserve bold for hierarchy.
- For large headings, line-height can be tighter than body text.
- Avoid extremes (very light gray text, pure black text). Prefer semantic text tokens.
- Keep long-form text within a readable line length (target ~65ch).

## 5) Layout & spacing rules
- Group related elements by keeping internal spacing smaller than external spacing.
- Align elements consistently; avoid mixing multiple alignments in the same region.
- Keep related actions close to what they affect to reduce interaction cost.
- Prefer whitespace over decorative noise.

## 6) Color rules
- Use a single brand color for primary interactive affordances.
- Use semantic surfaces (primary/secondary/tertiary) and semantic borders.
- Use consistent system colors for status (error/success/warning).

## 7) Interaction states
- Every interactive component must support:
  - Default, hover, active, focus-visible
  - Disabled
  - Invalid/error (where applicable)
- Focus-visible should be obvious and consistent (use a shared focus shadow token).

## 8) Buttons
- Use a single primary button per view for the main action.
- Ensure button text describes the action.
- Avoid disabled buttons when possible; prefer making the next step possible.

## 9) Forms
- Prefer single-column forms.
- Labels should be visible (don’t use placeholders as labels).
- Keep labels close to inputs; show hints and errors consistently.
- Prefer radios/toggles/steppers for common cases over dropdowns.

## 10) Copywriting (component defaults can help)
- Prefer sentence case.
- Use short, plain language.
- Avoid unnecessary ALL CAPS.

## Theme mapping
- CSS variables live in `apps/coachapp/src/theme/default-css-variables.css`.
- Mantine theme implementation lives in `apps/coachapp/src/theme/theme-with-css-modules.tsx`.
