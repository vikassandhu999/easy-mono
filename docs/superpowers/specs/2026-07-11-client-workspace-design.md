# Client workspace design

**Date:** 2026-07-11  
**Scope:** `frontend/apps/coachapp-v2`, client list to client workspace  
**Status:** Approved

## References

* Claude Design reference: `docs/design/mockups/coachez-dashboard-and-client.dc.html`, section `#2a`
* Client list design: `docs/superpowers/specs/2026-07-11-clients-list-focus-design.md`
* Client detail design: `docs/superpowers/specs/2026-06-26-client-detail-redesign-design.md`

This spec replaces the page composition from the June 26 client detail design. It keeps the approved backend-backed plan, profile, assignment, and editing behavior from that spec.

## Scope

Selecting a client on `/clients` opens a client workspace. The workspace uses the compact global navigation and client-local navigation shown in the Claude Design reference. It rearranges client capabilities that the coach app already supports.

The first workspace view is Progress at every viewport. Chat remains a separate route.

## Routes and navigation

* `/clients/:id` renders the workspace with Progress selected by default.
* `/clients/:id?tab=nutrition` renders Nutrition plan.
* `/clients/:id?tab=training` renders Training plan.
* `/clients/:id?tab=check-in` renders Client check-in.
* `/clients/:id?tab=detail` renders Detail.
* `/clients/:id/messages` renders Chat in the same workspace chrome.
* An absent or invalid `tab` value resolves to Progress.
* Tab changes replace the URL rather than add browser history entries. Refresh keeps the selected tab; browser Back returns to the client list or the route that opened the client.
* The mobile Chat action navigates to `/clients/:id/messages`. Back from Chat returns to `/clients/:id`.

## Module seam

Add `ClientWorkspaceShell` under `src/@components/` because both client Detail and the Messages feature use it. Its interface accepts a client and children. Keep workspace route and tab helpers under `src/clients/lib/`.

The shell owns:

* client identity and status chrome;
* desktop client-local navigation;
* the mobile tab strip and Chat action;
* active navigation styling;
* workspace sizing and overflow behavior.

The shell does not fetch section data or render section-specific cards. `/clients/:id` owns tab parsing and section content. `/clients/:id/messages` owns conversation data. This keeps data errors local to the affected surface.

`AppShell` owns the global compact mode. It detects only the client workspace and client Chat routes, collapses the desktop sidebar to an icon rail, and adjusts the main content offset. Other client routes keep the standard app shell.

## Responsive composition

At desktop width, the page has three regions:

1. The compact global icon rail.
2. A 274px client-local navigation column.
3. The selected workspace content.

At mobile width, the app bottom navigation stays hidden as it does on non-top-level routes. The workspace shows:

1. A back action and client identity.
2. A Chat action.
3. A horizontally scrollable tab strip.
4. The selected content in one scroll container.

The mobile and desktop routes select the same initial view. This intentionally differs from the mockup's desktop Chat-first transition.

## Supported sections

### Progress

For active clients, compose `ClientStatStrip` and `ClientWeight`. For pending clients, render `InvitationWidget` instead of active-client progress modules. Do not add the mockup's fabricated streaks or progress summaries.

### Nutrition plan

Compose `ClientNutritionAdherence` and the nutrition `PlanAssignControl`. Preserve macro editing, plan progress, empty and error states, and the builder link.

### Training plan

Compose `ClientWorkoutHistory` and the training `PlanAssignControl`. Preserve program progress, this-week sessions, empty and error states, and the builder link.

### Client check-in

Compose `ClientCheckins`. Preserve schedule controls, assignment actions, submissions, history, loading, and error states.

### Detail

Compose:

* `ClientDetailCard` for profile, goals, membership status, and subscription dates;
* `ClientTrainerCard` for the assigned trainer and reassignment;
* `InlineNotes` for coach notes.

Assigned trainer and Subscription are not separate tabs. They are part of Detail.

### Chat

Reuse `ClientConversation` and `ConversationView`. Keep the conversation endpoint, message pagination, sending, read tracking, and prefilled message behavior.

## Client states

The client query controls the shared identity chrome.

* Loading renders a stable workspace-shaped skeleton with the back action present.
* A missing, forbidden, or failed client renders the current client error copy and a route-aware Back action.
* Pending clients keep invitation controls. Progress-only modules that require an active client stay hidden.
* Inactive clients keep their status treatment.
* Clients awaiting a paid seat keep the owner Add Seats action or the non-owner guidance.
* Section query failures render inside their section and do not replace the workspace.

## Visual rules

Use the Claude Design reference for hierarchy, dimensions, spacing, and responsive composition. Use CoachEasy semantic theme tokens and HeroUI primitives for implementation. Do not copy raw hex colors or generated mockup markup into the app.

Interactive targets remain at least 44px. The mobile tab strip must be keyboard accessible and horizontally scrollable without hiding tab labels.

The `.dc.html` source was inspected for this design. No rendered browser was available during the design session, so implementation must compare the live app against a rendered reference if that surface becomes available. Static-source mapping alone is not sufficient to mark the visual work complete.

## Out of scope

* Trainer check-ins
* A separate Subscription tab
* Media galleries
* Trainer ratings, client counts, specialties, or review history not supplied by the API
* Manual reminder actions
* Membership pause, cancel, remove, or renewal flows
* Emergency contacts or tags absent from the generated client contract
* New backend endpoints or frontend dependencies
* A generic tabs framework or route-layout rewrite

## Verification

Verify the list-to-workspace flow at 375px and 1280px:

* row selection opens Progress;
* each supported tab renders and refresh preserves it;
* Chat opens and returns to the workspace;
* browser Back returns to the source route without cycling through tabs;
* pending, inactive, awaiting-seat, loading, empty, and error states keep their behavior;
* the desktop global shell compacts only on workspace routes;
* mobile content has no horizontal page overflow.

Run:

```sh
pnpm -C apps/coachapp-v2 build
just check-rm
git diff --check
```

Run focused Biome checks on every changed frontend file. Review any formatter writes before committing.
