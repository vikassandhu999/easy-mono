# HeroUI and CSS verification notes

These notes support work on the retained HeroUI client app. The target app's
`AGENTS.md`, installed package, theme, and rendered DOM determine the applicable
component API. The coach app's shadcn components have their own APIs and styles.

## Component behavior

- Inspect compound component slots and the installed TypeScript definitions
  before changing a widget. A valid HTML element is not necessarily a valid
  collection child.
- Selection widgets can use selection callbacks instead of action callbacks.
  Exercise keyboard and pointer selection against the real component.
- Loading and error states must preserve useful input and leave a visible retry
  action. Test the result after retry, not only the button's pending appearance.
- Icon-only controls need accessible names even when responsive styles hide a
  text label. Inspect the computed accessible name at both widths.

## CSS behavior

- Inspect actual vendor selectors; composite widgets may use different surface
  classes for dialogs, popovers, menus, and pickers.
- A custom property without a value can invalidate a declaration at computed
  style time. Renaming a property requires checking its `var(...)` consumers.
- CSS cascade layers affect which declaration wins. An unlayered declaration
  takes precedence over normal layered declarations.
- Transform utilities and the CSS `transform` property can coexist. Read the
  computed transform during a pressed state before choosing an override.
- Grid and flex children may require `min-width: 0` to allow wrapping. Check long
  names, large values, and translated text at the narrow viewport.
- Overlay geometry and scroll locking need browser verification with the mobile
  keyboard visible. Account for visual viewport offsets and nested overlays.

## Browser evidence

Wait for a concrete loaded state rather than network idleness. Find the actual
scroll container before testing scroll behavior. Keep credentials and access
tokens out of logs and screenshots. Use the root browser workflow and record the
viewport, state, and evidence path for each claim.
