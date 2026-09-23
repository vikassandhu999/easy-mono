---
name: design-pro
description: Use for visual work on the React apps: a screen that looks wrong, theme changes, component variants, or inconsistent styling across screens.
---

# Design consistency

Use the target app's component system and theme as the visual authority. A shared
visual rule belongs in the theme or component that owns it. A screen uses that
rule through the component's public API.

## Read the target app

1. Read the root, frontend, and target app's `AGENTS.md`. Read an app-specific UI
   contract only when that app provides one.
2. Inspect the app's `src/index.css`, shared `src/ui/` primitives, and package
   manifest. The coach app uses its shadcn primitives; the retained HeroUI client
   app uses its own HeroUI wrappers. Each app keeps its own tokens and variants.
3. Find a comparable screen in the same app. For an approved design handoff,
   inventory its states and map its elements to the target app's primitives.
4. Read `field-notes.md` when working with HeroUI or debugging CSS behavior.
   Verify a note against the installed package and rendered DOM before applying it.

Done when the affected states, shared components, and theme rules are identified.

## Place the change

1. A rule shared by every instance belongs in the owning component or theme.
   Inspect the cascade layers before overriding vendor styles.
2. An intentional second appearance belongs in that component's variant API.
   Follow the app's conventions for naming and implementing variants.
3. Screen-specific layout uses the app's existing spacing, type, and color tokens.
4. If the requested design requires a theme change, change the shared definition
   and inspect its other consumers in the same pass.

For an inconsistency, enumerate the affected call sites before editing. Consolidate
repeated styling into the owner, then remove redundant call-site declarations.
Keep user-approved differences that serve different tasks or states.

Done when each shared decision has one owner and every affected call site uses it.

## Verify the rendered result

Use the app URL from its development configuration and preserve authenticated
browser state. Follow the root browser workflow for deterministic scenarios.

- Check mobile and desktop widths required by the app contract.
- Exercise loading, empty, error, validation, pending, focus, and overlay states
  that the change affects.
- For a CSS rule, confirm the selector matches the intended nodes, its custom
  properties resolve, and computed values match the intended result.
- Inspect other consumers of a shared component or theme rule. A screenshot of
  one screen cannot establish the effect across the app.
- Use approved visual baselines when available. Record deliberate differences
  and their reason instead of silently changing the baseline.

Run the target app's build and the repository guard checks. HeroUI selector and
color checks in `scripts/check-theme-selectors.sh` and
`scripts/check-color-utilities.sh` target `clientapp-v2`; use them for changes to
that app. Read package scripts for other app-specific checks.

Done when the checks pass and the touched flow has been exercised at its required
widths. Report evidence paths and any states that remain unverified. Recurring
failures belong in the matching section of `docs/agents/recurring-mistakes.md`.
