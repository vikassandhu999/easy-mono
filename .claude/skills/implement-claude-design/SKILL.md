---
name: implement-claude-design
description: Use when implementing, porting, or matching Claude Design or .dc.html screens inside an existing React, Tailwind, or HeroUI application, before editing UI code.
---

# Implement Claude Design

Implement a local Claude Design reference inside an existing application. Translate established design decisions faithfully. Never silently invent product decisions.

## Persistence

ACTIVE for the entire design implementation task once triggered. Apply the change-classification gate and both decision ladders before the first UI edit and again for every new screen, component, or token. Continue across turns until the implementation is verified, the user changes workflows, or the required reference is unavailable.

## Sources of Truth

Use these authorities in order:

1. Existing application code and approved specs: behavior, data, permissions, routes, and navigation.
2. Local Claude Design `.dc.html`: visual hierarchy, composition, responsive intent, and visible states.
3. Design CSS and browser-computed styles: exact visual values and geometry.
4. Screenshots: composition and regression evidence, never the sole source for numeric values.

Do not infer a design from application code when a matching design reference exists. Do not copy a generated design project wholesale.

## Required Inputs

Establish before implementation:

- Local `.dc.html` file or directory
- Target application and route
- Target screen, section, or workflow
- Required desktop and mobile viewports
- Relevant loading, empty, error, permission, and populated states
- Interaction path required to reach each referenced state

Search the repository and design files for missing inputs before asking the user. When a Claude Design link is provided without a local file, request a synced or exported local reference; this skill does not assume access to DesignSync.

## Workflow

### 1. Discover

- Read relevant `AGENTS.md` files and project instructions.
- Load the project-local Insider skill when present. Follow its current command contract instead of duplicating CLI instructions here.
- Inspect the router, app shell, target page, shared components, theme, state management, API calls, tests, and canonical dev command.
- Reuse a running development server. Otherwise start the repository's canonical command and obtain the actual port from config or server output.
- Locate all relevant screens and states in the design files.

### 2. Render and Inspect

- Prefer Insider for inspecting the instrumented application's DOM structure, computed styles, bounding boxes, geometry, component ownership, and source references.
- Use an available browser controller to open routes, authenticate, drive interactions, reach required states, resize viewports, and capture screenshots.
- Serve the design directory locally if direct file navigation does not work.
- Open the design and application at identical, explicit viewports.
- When a design state requires interaction, use Chrome to operate the mockup instead of inferring the state from static source or screenshots.
- Capture reference screenshots after reaching each required state.
- Inspect the design HTML, CSS source, responsive rules, and visible interactions. Use browser-computed values when the static design source is ambiguous.
- Inspect the corresponding application through Insider, then read the owning source components and current behavior.

### 3. Reach Interactive Mockup States

For every design state that is not visible on initial load:

1. Open the served mockup in Chrome at the required viewport.
2. Start from a known initial state.
3. Perform the visible interaction sequence needed to reach the target state.
4. Record the controls used, state transitions, resulting URL or local state, and any prerequisites.
5. Capture a screenshot at each materially different state.
6. Capture an Insider/AXI snapshot when the page is instrumented and snapshot support is available.
7. Inspect the reached state's DOM and CSS rather than relying only on the screenshot.
8. Reproduce the same sequence in the application during verification.

Do not treat the final screen as the entire requirement. The transition, intermediate states, dismissal behavior, back behavior, focus movement, and persistence may be part of the design.

If the required interaction is missing, ambiguous, or implies a structural, route, or workflow decision, use the Product-Decision Gate before implementing it.

### 4. Classify Every Difference

| Type | Examples | Action |
| --- | --- | --- |
| Visual | Color, typography, spacing, radius, icon size | Apply the style ladder autonomously |
| Responsive | Stack, collapse, hide, resize | Proceed only when represented clearly in the design |
| Structural | New hierarchy, moved controls, replaced shell, split panels | Pause and discuss |
| Route/navigation | New route, renamed route, tabs becoming pages, changed back behavior | Pause and discuss |
| Interaction | Drawer versus modal, row click, menus, confirmation flow | Pause and discuss |
| Product workflow | New state, action, permission, persistence, or sequence | Pause and discuss |
| Missing reference | Required page, component, state, or interaction is absent | Request the exact reference |

### 5. Product-Decision Gate

Before any structural, route, interaction, or workflow change, gather evidence and present:

```text
Observed design:
Existing application:
Material difference:
Behavioral impact:
Recommended interpretation:
Alternatives:
Question requiring your decision:
```

Ask no more than three related questions at once. Recommend an answer and explain the consequence of each alternative. Ask for a specific file, page name, component, route, screenshot, state, or interaction example when evidence is missing.

Do not ask about values available in HTML or computed CSS. Do not ask about behavior already established by application code or approved specs. Wait for the user's answer, freeze the decision, then resume. Reopen discussion only for a new material ambiguity.

### 6. Map Before Editing

Create a temporary mapping for the target slice:

```text
Design selector -> UI role -> Existing app owner -> Structure choice -> Style/token choice -> Preserved behavior
```

Do not require a committed mapping document unless the user requests one.

## Insider Inspection

When the project provides Insider, it is the default application-inspection path:

1. Ensure the canonical dev server is running.
2. Open the target route in a connected browser tab and drive it to the required state.
3. Confirm Insider can reach the actual dev-server URL and page.
4. Use overview and find operations to locate the relevant rendered regions.
5. Read only the necessary structure, bounding boxes, computed style properties, component ownership, and source references.
6. Capture a tagged snapshot when a stable before-state or interaction state is needed.
7. After edits and HMR, query the same locators or snapshot-equivalent regions and compare numeric values.

Prefer narrow style queries over dumping every computed property. Use source references to close the loop from rendered evidence to the owning React component.

Insider does not replace browser control. Use browser tools for navigation, authentication, interaction driving, viewport changes, screenshots, and states that Insider cannot create. Fall back to browser DOM inspection only when Insider is unavailable, disconnected, or cannot observe the required reference. Report the fallback explicitly.

## Structure Ladder

For each design region, stop at the first rung that fits:

1. Keep the existing route and app shell.
2. Reuse an existing component that represents the same concept.
3. Add a legitimate variant or slot to that component.
4. Compose existing primitives locally.
5. Keep unique UI page-local.
6. Extract a shared component only when the same UI concept repeats across pages, states, or domain workflows.
7. Add a new abstraction only when it removes real duplication or owns meaningful behavior.

Never mirror the design HTML hierarchy mechanically. Component boundaries follow application concepts and behavior, not visual wrappers.

## Style Ownership Ladder

For every visual value, stop at the first rung that fits:

1. **Existing component API or variant**: use it when it already expresses the intended role.
2. **Existing semantic theme token**: use a token with the same meaning even when its raw value differs slightly.
3. **New theme token**: create only when the value has a semantic name, applies across unrelated components, is expected to vary by theme or brand, or repeatedly represents one system-wide role.
4. **Component-level token or variant**: use when the value repeats across instances or states of one component family but has no application-wide meaning.
5. **Standard Tailwind utility**: use for local layout, spacing, sizing, alignment, overflow, and responsive composition that fits the configured scale.
6. **Tailwind arbitrary value**: use for an exact, static, one-off design value with no semantic reuse. Repetition requires reconsidering a component or theme token.
7. **Inline style**: use only for runtime-calculated values, user-provided values, or dynamic CSS custom properties.
8. **No rung fits**: stop and reconsider the component boundary instead of inventing another styling mechanism.

Name tokens by role, not raw value. Prefer `foreground-secondary` over `gray-52525b`. Static colors, spacing, typography, and radii must not become inline styles.

## Implementation Order

Implement one vertical slice at a time:

1. Preserve and test existing behavior.
2. Add or adjust theme tokens.
3. Add component variants or component-level tokens.
4. Build page structure with existing primitives.
5. Connect existing queries, mutations, forms, permissions, and navigation.
6. Implement populated, loading, empty, error, disabled, and permission states.
7. Implement responsive behavior represented by the design.
8. Polish exact visual values after structure and behavior are stable.

## Browser Verification Loop

After each meaningful slice:

1. Reopen the design and application at the same viewport.
2. Use Chrome to replay the recorded mockup interaction path and capture the exact reference state.
3. Replay the equivalent application interaction path.
4. Query the application through Insider using the same rendered regions, style properties, and bounding boxes captured before the edit.
5. Compare structure, geometry, typography, tokens, wrapping, overflow, transitions, and responsive behavior.
6. Use browser control to capture updated screenshots and drive the next interaction state.
7. Exercise navigation, persistence, dismissal, back behavior, focus, keyboard behavior, and relevant states.
8. Capture tagged Insider/AXI snapshots for states that must remain comparable across iterations.
9. Repeat until mismatches are resolved or documented as approved deviations.

Screenshots alone are insufficient. Prefer Insider's rendered geometry and computed-style evidence for the application.

## Completion Gate

Do not claim completion until:

- The requested screens match at every required viewport.
- Existing behavior, data wiring, routes, and permissions still work.
- Relevant states and interactions have been exercised.
- Build, lint, typecheck, focused tests, and repository-required checks pass.
- Remaining deviations are explicit and justified.

Report completed screens, verification evidence, preserved behavior, approved decisions, deviations, and anything not verified.
