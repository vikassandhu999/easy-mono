# Coachapp Calm Coaching Studio design

**Date:** 2026-07-14
**App:** `frontend/apps/coachapp-v2`
**Status:** Approved concept; implementation not started

## Goal

Turn the current coach application into one coherent, responsive product with clear
visual hierarchy and a recognisable coaching identity.

The direction is **Calm Coaching Studio**: a coach opens a quiet working studio where
today's clients, conversations, plans, and priorities are already arranged. The app
should feel human, prepared, and operational. It must not resemble a technical SaaS
console, a fitness marketing site, or a collection of analytics widgets.

## Sources of truth

This design is derived only from:

1. The current rendered coach application.
2. The current `coachapp-v2` source and shared component structure.
3. The current routes, supported API data, permissions, and working interactions.
4. The repository's accessibility, mobile, HeroUI, and semantic-token rules.

Historical visual concepts and discarded design artifacts are not inputs to this
direction. A visual treatment that requires unsupported data or actions is omitted.

## Problems to solve

The current app is functionally responsive, but its visual system does not yet bind
the routes into one product.

- The client workspace has a clear layered environment, while several top-level
  routes feel like unrelated white administration pages.
- Borders carry too much of the hierarchy. Canvas, cards, toolbars, lists, and empty
  states often have nearly equal visual weight.
- Page titles, section headings, important values, and row titles do not form a
  sufficiently distinct type hierarchy.
- Desktop screens alternate between narrow columns with unused space and rows that
  stretch across the entire available width.
- CoachEasy blue identifies navigation and buttons but does not connect the content
  into a recognisable environment.
- Real coaching signals such as people, progress, recency, attention, and unread
  messages are present but visually secondary.
- The desktop sidebar gives daily work, library tools, and account administration
  similar prominence.
- The mobile shell exposes six bottom-navigation destinations, which weakens
  recognition and one-handed use.
- Responsive behaviour is often dimensional rather than compositional: desktop
  regions shrink or stack without an explicit mobile information order.
- `Page` supplies shared scrolling and gutters, but does not establish content
  widths, surface roles, density, or responsive page archetypes. Feature screens
  therefore make these decisions independently.

## Design principles

### Coaching activity creates the personality

The app feels alive through real work: client identity, check-in status, progress,
recent conversations, plan state, and next actions. Decoration, background motion,
fake analytics, and unsupported activity are not substitutes.

### Calm means ordered, not empty

Whitespace separates decisions and related work. It must not leave large areas that
make content appear unfinished. Desktop screens use bounded content widths and
intentional grids.

### One visual hierarchy everywhere

Every page follows the same order:

1. Context and identity.
2. Primary action or current priority.
3. Main work surface.
4. Supporting information.
5. Administrative or destructive actions.

### Colour is a signal

CoachEasy blue marks active context and primary actions. Success, warning, and danger
colours communicate real state. Large decorative colour fields and status-chip
collections are avoided.

### Mobile has its own composition

Mobile preserves the same purpose and information priority as desktop, but not the
same geometry. Side rails, toolbars, grids, and secondary actions transform according
to defined patterns rather than ad hoc hiding.

## Visual language

### Canvas and surfaces

Use three visual layers:

1. **Studio frame:** the navigation shell and a warm, low-contrast neutral canvas.
2. **Work surface:** white or lightly raised areas containing the roster,
   conversation, form, plan, or client work.
3. **Signals:** small tinted areas for attention, progress, unread state, and active
   context.

The standard card radius is `16px`; compact controls and nested rows use `12px`.
Pills are reserved for chips, segmented controls, and compact statuses. Borders
provide structure. Shadows are subtle and appear only when one region genuinely sits
above another.

All colours remain semantic theme tokens. Components must not introduce literal
brand colours.

### Typography

- Page identity: `30-32px`, compact line height, semibold.
- Important metric: `28-32px`, semibold or bold, tabular numbers.
- Section heading: `16-18px`, sentence case, semibold.
- Row title: `14-16px`, medium or semibold.
- Body and supporting copy: `14px`.
- Metadata: `12-13px`, muted.

Inter remains the working typeface. The already-available Space Grotesk may be used
sparingly for page identity and important numeric values. Uppercase is reserved for
small categorical labels, not general section headings.

### Spacing and width

The spacing system remains based on 4px increments, with common composition gaps of
`8`, `12`, `16`, `24`, and `32px`.

- Mobile page gutter: `16px`.
- Tablet page gutter: `24px`.
- Desktop page gutter: `32px`.
- Standard desktop content width: up to `1120px`.
- Lists and rosters: approximately `960-1040px` where a wider layout adds no value.
- Reading, settings, and forms: approximately `640-720px`.

Content remains left-aligned within these bounds. It is not centred as a floating
island unless the route is an authentication or onboarding flow.

### Motion

Motion confirms interaction rather than decorating the interface.

- Selection, hover, disclosure, and state transitions: `140-180ms`.
- Route-level content must not slide large distances.
- Loading uses layout-shaped skeletons.
- Reduced-motion preferences disable nonessential transitions.

## Product signals

These patterns make the app feel like a coaching product:

- People-first rows with restrained, deterministic avatar colours.
- Clear unread and recent-conversation treatment.
- Progress bars, trends, and completion states only where backed by real data.
- Short next-action language such as “Review check-in” or “Assign plan” instead of
  several equally prominent passive chips.
- Date or time context only when it changes what the coach should do.
- Positive empty states that communicate completion and the next expected event.

## Responsive system

The implementation is mobile-first at `375px`, enhanced at the repository's `md`
and `lg` breakpoints.

| Concern | Desktop pattern | Mobile pattern |
| --- | --- | --- |
| Global navigation | Grouped sidebar | Five primary bottom destinations |
| Account and settings | Bottom of sidebar | Profile/account entry outside bottom navigation |
| Page header | Title, context, and actions in one row | Title and one primary action; secondary actions in overflow |
| Dashboard | Bounded multi-column priority layout | Ordered single-column daily sequence |
| Client workspace | Client identity/navigation beside content | Identity app bar, scrollable tabs, single content stack |
| Lists | Structured rows within a bounded region | Full-width compact rows with secondary metadata reduced |
| Side panels | Adjacent contextual region | Inline disclosure, dedicated route, or tap-only sheet |
| Builders | Main work surface plus optional context | One continuous work column with keyboard-safe actions |
| Tables | Structured or horizontally contained | Purpose-built rows/cards, or deliberate horizontal scrolling |

The recommended mobile bottom navigation is:

**Home · Clients · Prospects · Messages · Library**

Settings moves into a profile/account entry. This removes the current six-way
competition without hiding a daily coaching destination.

Responsive transformations follow these rules:

- Side-by-side regions stack with the primary task first.
- Client-local navigation becomes a horizontally scrollable tab strip with a visible
  continuation cue.
- A header exposes one primary action. Secondary and destructive actions move to an
  overflow menu or the relevant detail surface.
- Fixed navigation and actions account for device safe areas.
- Keyboard-heavy work uses full pages with keyboard-safe actions, not modal dialogs.
- No critical content or action is removed solely because the viewport is narrow.
- Interactive targets remain at least `44px`.

## Page archetypes

### Daily desk

Used by `/dashboard`.

The page answers three questions in order: what is happening, what needs attention,
and what can wait. Desktop uses a bounded priority grid; mobile becomes a single
sequence. Only the existing profile, client summary, attention, check-in review,
prospect, conversation, subscription, and setup data may appear.

### Roster and inbox

Used by `/clients`, `/prospects`, and `/messages`.

These pages use a consistent header, bounded list width, sticky search/filter region
when needed, and scan-friendly rows. Identity leads each row; the next relevant state
or action follows. Empty space is managed by the content bound rather than stretching
rows across the viewport.

### Client studio

Used by `/clients/:id` and `/clients/:id/messages`.

Preserve the current contextual model: client identity, client-local navigation, and
one selected work surface. This is the reference archetype for the app's layered
canvas. Desktop keeps identity/navigation beside the work; mobile uses an identity
bar, scrollable client tabs, and one card stack. The global bottom navigation remains
absent while a client is the active context.

### Catalog

Used by exercise, food, and recipe lists and detail pages.

Lists share the roster rhythm but use domain icons or thumbnails instead of client
avatars. Detail screens separate the read surface from explicit editing. Mobile uses
the same information order in one column.

### Builder workbench

Used by nutrition plans, training plans, forms, and their builders.

Desktop provides a bounded main work surface and may place real contextual controls
beside it. Mobile becomes one continuous editing flow. Persistent actions remain
reachable above the keyboard and safe area. Builder-specific density is allowed, but
the page identity, surfaces, and action hierarchy remain part of Calm Studio.

### Toolbox

Used by `/library`.

Library is the coach's toolbox rather than a generic settings menu. Desktop uses a
small responsive tile grid with recognisable domain icons and concise descriptions.
Mobile uses a compact stacked list. The same destinations and permissions remain.

### Administration

Used by `/settings`, landing-page management, billing, and team management.

Administrative pages are intentionally quieter than daily coaching routes. They use
the reading/form width, grouped work surfaces, and explicit edit affordances. Billing
and destructive account actions remain visually separated from profile and team work.

### Focused entry

Used by authentication, invitation acceptance, and business registration.

These routes remain centred and narrow because they are single-task flows outside the
application shell. They adopt the Calm Studio typography, colour, fields, and motion
without inheriting the full navigation frame.

## Route application

| Route family | Primary archetype | Required emphasis |
| --- | --- | --- |
| `/dashboard` | Daily desk | Today's priorities and real coaching activity |
| `/clients` | Roster | Client identity, coaching state, next action |
| `/clients/:id` | Client studio | Client context and selected coaching surface |
| `/clients/:id/messages` | Client studio | Conversation inside the same client context |
| `/prospects` and prospect detail | Roster/detail | Acquisition state and supported next action |
| `/messages` and conversation detail | Inbox/detail | Unread state, recency, and correspondence |
| `/library` | Toolbox | Fast recognition of coaching resources |
| Exercise, food, and recipe routes | Catalog | Browse, inspect, then explicitly edit |
| Nutrition and training plan routes | Builder workbench | Plan structure and focused editing |
| Form/check-in routes | Builder workbench | Form structure, assignments, and review |
| `/settings` and children | Administration | Profile, acquisition, billing, team, account |
| Authentication and onboarding | Focused entry | One task with minimal distraction |

## Shared implementation seams

The design should deepen existing shared owners rather than create a parallel design
system.

- `src/index.css` owns semantic canvas, surface, type, radius, and motion tokens.
- `src/@components/app-shell.tsx` owns the global desktop and mobile frame.
- `src/@components/page.tsx` owns page gutters, header hierarchy, content bounds, and
  scroll behaviour through a small set of explicit variants.
- Existing HeroUI components remain the primitive layer.
- Existing browse, skeleton, error, form, and responsive overlay components remain
  canonical.
- Feature screens choose a page archetype and supply their domain content. They do
  not invent new global shells or token families.

No new frontend dependency, generic layout framework, or component-library project is
required.

## States and accessibility

Every archetype must define populated, empty, loading, error, and permission states
inside stable geometry. Long names, long translated labels, large counts, and narrow
screens must not break the hierarchy.

The existing accessibility baseline remains mandatory:

- Semantic headings follow the visual hierarchy.
- Keyboard focus remains visible.
- Colour is never the only state indicator.
- Interactive targets are at least `44px`.
- Reduced motion is respected.
- Horizontally scrollable regions remain keyboard accessible and visibly scrollable.

## Delivery sequence

### 1. Shared frame

Define the semantic tokens, `Page` variants, content bounds, header hierarchy, and
five-destination mobile navigation. Verify the existing routes before redesigning
individual feature content.

### 2. Daily coaching loop

Apply the system to Dashboard, Clients, Prospects, and Messages. These routes establish
the product's primary rhythm and expose most cross-route inconsistencies.

### 3. Client studio

Harmonise the existing client workspace with the shared frame while preserving its
working routes, tabs, data, and interaction model.

### 4. Coaching tools

Apply the Catalog, Builder Workbench, and Toolbox archetypes to Library, plans, forms,
exercises, foods, and recipes.

### 5. Administration and entry

Finish Settings, billing, team, landing-page management, authentication, and
onboarding using the same hierarchy at their deliberately quieter density.

Each delivery slice must preserve backend-supported behaviour and include live desktop
and mobile verification. A route is not complete from build success alone.

## Verification strategy

Visual verification covers at least:

- `375x812` small mobile.
- `430x932` large mobile.
- `768px` tablet width.
- `1280px` desktop.
- One wider desktop check for bounded-content behaviour.

For each changed archetype, exercise:

- Populated content.
- Empty content.
- Loading skeletons.
- Query or mutation error state.
- Long names and labels.
- Keyboard navigation and visible focus.
- Mobile software-keyboard interaction where inputs are involved.
- Fixed-navigation and safe-area spacing.

Repository verification remains the coachapp build, focused Biome checks,
`just check-rm`, and `git diff --check`, plus live route verification at the affected
viewports.

## Out of scope

- New backend endpoints or unsupported dashboard data.
- Decorative analytics or fake activity.
- A new frontend dependency or replacement component library.
- A generic layout-builder abstraction.
- A route architecture rewrite.
- Changes to `clientapp-v2`.
- Pixel matching against historical design artifacts.

## Acceptance criteria

- Every coachapp route belongs to a named page archetype.
- Page identity, type hierarchy, gutters, content bounds, surfaces, and actions are
  consistent across routes.
- The product feels rooted in clients, coaching work, progress, and conversations
  rather than generic technology patterns.
- Mobile composition is explicitly defined and verified, not inferred from desktop.
- Top-level mobile navigation contains five primary destinations.
- Existing supported behaviour, accessibility, and responsive interactions remain
  intact.
- No historical visual concept is used as a requirement or comparison target.
