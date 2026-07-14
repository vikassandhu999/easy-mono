# Claude Design workflow

This guide defines how CoachEasy product capabilities become approved UX/UI designs in Claude Design and then working software. It applies to the coach and client products.

Claude Design is the UX/UI design authority. Claude Code implements approved designs. The capability library describes what the product supports without prescribing screens, routes, navigation, or component composition.

## Core rules

* Keep one design source in Claude Design. Do not maintain a parallel design in code.
* Start with supported product capabilities. Do not invent backend behavior as part of routine design work.
* Give Claude Design product truth, not the application structure.
* Let Claude Design reconsider information architecture, interaction flow, hierarchy, and visual treatment.
* Keep every design project bounded. If its Design Envelope becomes difficult to scan, split the product area.
* Ask the user to approve additions to product capability before including them as assumptions.
* Implement only after the relevant design has been approved.

## Sources of product truth

Agents build and verify the capability library using these sources, in order:

1. Backend OpenApiSpex schemas and controller operations, which define the frontend-backend contract.
2. Backend contexts and schemas, which define lifecycle rules, conditions, side effects, and validation.
3. Frontend API adapters and feature behavior, which reveal interaction details that materially affect the experience.
4. Functional product specifications, when they agree with the code and API contract.

Routes, screens, dialogs, sheets, and components may be inspected as a discovery checklist so capabilities are not missed. They are not design inputs.

Technical evidence stays in the capability library. Claude Design does not receive source paths, endpoint names, database fields, tests, or implementation notes.

## Design inputs

Each bounded-area Claude Design project receives only:

* The published CoachEasy design system.
* One bounded Design Envelope.
* Realistic content examples needed to exercise the design.
* Approved brand assets, when available.

Do not provide:

* The CoachEasy source code as a visual reference.
* Current routes, screen inventories, layouts, or component trees.
* Screenshots of the application for visual direction.
* Full API schemas or backend documentation.
* Unrelated capability areas.
* Unapproved product ideas presented as supported behavior.

## Phase 1: establish the visual foundation

Start in Claude Design with HeroUI v3 rather than the CoachEasy interface.

Use the official [HeroUI repository](https://github.com/heroui-inc/heroui) as the supported source for design-system import or sync. Use the [HeroUI v3 theming documentation](https://heroui.com/en/docs/react/getting-started/theming) as a visual and token reference. A documentation URL is a reference; it is not a substitute for an importable source when Claude Design requires one.

HeroUI v3 remains the implementation and accessibility layer. Claude Design may redefine the theme, including color, typography, spacing, density, shape, elevation, motion, and responsive composition. The result should use concepts that can be expressed through HeroUI semantic tokens, Tailwind v4 theme variables, component composition, and documented style overrides.

The user approves the visual foundation before it is published as the CoachEasy design system. Every later Claude Design project inherits that published system.

### Foundation output

The approved foundation records:

* Semantic color roles and states.
* Typography roles and scale.
* Spacing and density principles.
* Shape, border, elevation, and surface rules.
* Interaction and motion principles.
* Responsive principles.
* Treatment of common controls and content patterns.
* Token names or mappings that can be implemented centrally.

The foundation defines a system, not application screens.

## Phase 2: establish the global behavior contract

Shared behavior is defined once and inherited by every bounded project. Area envelopes do not repeat it.

The global behavior contract requires designs to account for:

* Initial loading without misleading empty content.
* Empty results, including filtered and unfiltered cases when both can occur.
* Recoverable loading errors and retry behavior.
* Pending mutations that prevent duplicate actions.
* Success and failure feedback.
* Confirmation for consequential or destructive actions.
* Disabled and unavailable actions with enough context to understand why.
* Missing, partial, long, and high-volume content.
* Keyboard, screen-reader, focus, and touch interaction supported by HeroUI and React Aria.
* Usable responsive behavior for phone and desktop widths.

Area envelopes add only domain states that change the experience, such as an expired invitation, an active workout, or a client waiting for a seat.

## Phase 3: design the global shell

The first application design project covers the global shell and navigation. Claude Design may rethink the shell while preserving the supported product areas and access conditions.

Prepare a Shell Envelope using the same rules as a Design Envelope. It names the product areas each actor can access, global account conditions, and cross-area signals such as unread or attention state. It does not describe the current navigation, route tree, or shell layout.

Before approval, exercise the shell with lightweight representatives of these experience types:

* A list or collection.
* A record or detail experience.
* A form.
* A complex builder.
* Messaging.

These representatives test the shell; they are not separate product designs. Once approved, the shell becomes the common frame for bounded-area projects.

## Phase 4: maintain the capability library

The capability library is organized by product area and user outcome, not by route or screen. It contains UX-relevant product truth and internal verification evidence.

Store canonical entries under `docs/product-capabilities/`, with one file per bounded product area. Create the directory with the first capability entry; do not add empty scaffolding. A generated Design Envelope is a project input, not a second source of product truth.

Each capability has one canonical owner. Another area may reference it without copying its definition. For example, Messaging owns conversations and unread state. A client-relationship capability may state that a conversation and unread signal are available, but it does not redefine messaging or decide where that signal appears.

Specific entity fields are included when their meaning changes the design. A subscription capability may name status, start date, end date, seat usage, price, and renewal state. Internal identifiers and implementation fields are omitted.

### Capability entry template

```markdown
# <Capability name>

Owner: <Product area>

## Supported outcome

<Optional. One sentence describing what becomes possible, without UI language.>

## Available information

<Semantic information groups. Include exact fields or values only when they affect the experience.>

## Supported actions

* <Actor> can <action> to <target> when <condition>, resulting in <outcome>.

## Lifecycle

<Optional. Include only state transitions that materially constrain the experience.>

## Conditions

<Optional. Actor, ownership, status, source, or account conditions that change visible information or supported actions.>

## UX-relevant constraints

<Only rules that change input, availability, recovery, feedback, or expected outcome.>

## Related capabilities

* <Capability reference>: <One sentence describing what is available to this area.>

## Unsupported assumptions

<Likely assumptions the designer must not treat as supported without approval.>

## Verification evidence

<Internal source references used by agents. This section is not sent to Claude Design.>
```

### Inclusion test

A fact belongs in a capability entry only if it changes at least one of these:

* What a user can see.
* What a user can do.
* When an action is available.
* What the product must communicate.
* What happens after an action.

Do not include a general permission matrix. Add a condition only when it changes the capability. In CoachEasy, examples include owner-only team and billing actions, assigned-client visibility for trainers, client seat status, and read-only source records.

## Phase 5: produce a Design Envelope

An agent creates a Design Envelope from the relevant capability entries immediately before a bounded Claude Design project. The agent revalidates the entries against the code and API contract first.

The envelope contains the minimum product truth needed for design. It contains no verification evidence and no current UI structure.

### Design Envelope template

```markdown
# Design Envelope: <Bounded product area>

## Supported outcome

<Optional. One non-UI sentence. Omit it if the capability set already makes the outcome clear.>

## Available information

* <Semantic group>: <Information available to the designer.>

## Supported actions

* <Actor> can <action> to <target> when <condition>, resulting in <outcome>.

## Lifecycle

<Optional. Only material state transitions.>

## Conditions

<Optional. Only conditions that change available information or actions.>

## UX-relevant constraints

* <Constraint that changes interaction or feedback.>

## Related capabilities

* <Capability>: <What can be used here, without prescribing placement.>

## Unsupported assumptions

* <Capability that requires explicit approval before use.>

## Example content

<A small, realistic data set covering the important states.>
```

Do not enforce a fixed word count. Apply the inclusion test to every line. If the result is difficult to scan in one sitting, narrow the project boundary instead of compressing product rules into vague language.

## Phase 6: design a bounded product area

Create a separate Claude Design project for each bounded area and attach the published CoachEasy design system. Give the project its Design Envelope and content examples.

Claude Design acts as the UX/UI designer. It may reorganize flows and frontend composition within the envelope. CoachEasy layouts and components have no design authority.

Claude Design should cover the supported outcome, meaningful lifecycle states, global behavior contract, responsive behavior, and accessibility. It should also provide a clear implementation handoff, but producing the best experience remains its primary task.

### Capability proposals

Claude Design may find that a better experience needs a capability absent from the envelope. In that case it must:

1. Identify the capability as unsupported.
2. Explain the user benefit and where the supported design falls short.
3. Ask the user directly for approval.
4. Record an approved capability as product/backend work in the design and handoff.

Claude Code is not inserted into this design approval loop. Claude Design must not quietly add the capability or present it as supported.

If the user declines, Claude Design continues within the supported envelope.

## Phase 7: approve and hand off

The user approves each bounded-area design in Claude Design before implementation begins.

The handoff must include:

* The approved Claude Design project and relevant states.
* The published design-system reference.
* Interaction behavior and state transitions.
* Responsive behavior.
* Token usage and any proposed token additions.
* Component intent that can be implemented with HeroUI v3.
* Content and asset requirements.
* Capability coverage.
* Approved capability additions that require product/backend work.
* Decisions still requiring user input.

A handoff is incomplete if implementation would require guessing product behavior or visual intent.

## Phase 8: implement with Claude Code

Claude Code implements the approved design with HeroUI v3, Tailwind v4, the published tokens, and the current API contract. It does not create a second visual direction.

Before changing backend or product behavior, Claude Code checks whether the design relies on an approved capability addition. Approved additions enter implementation planning as explicit scope. If an addition is infeasible, Claude Code stops and returns the conflict to the user instead of silently changing the design.

Implementation acceptance checks:

* Supported capabilities behave as documented.
* Approved additions are implemented or clearly separated from the supported slice.
* The result matches the approved Claude Design states and responsive behavior.
* HeroUI behavior and accessibility are preserved.
* Loading, empty, error, pending, and destructive states work as designed.
* The exact product flow is verified on phone and desktop widths.

## Keeping the workflow current

Update the owning capability entry whenever backend or product behavior changes. Do not edit every referencing area; update references only when their one-line description becomes inaccurate.

Before starting another Claude Design project:

1. Revalidate the relevant capability entries against the code and API contract.
2. Produce a fresh bounded Design Envelope.
3. Confirm that the published design system and shell remain applicable.
4. Pass only the approved inputs to Claude Design.

The capability library records what CoachEasy supports. Claude Design records what CoachEasy should look and feel like. The implementation records how the approved experience works in production.
