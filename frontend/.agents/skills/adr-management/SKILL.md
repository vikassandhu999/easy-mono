---
name: adr-management
description: "Architecture Decision Records management. Use when important architectural, design, or UX decisions are made during development. Triggers on: new feature modules, container/layout decisions, data flow patterns, API integration strategies, component architecture choices, state management decisions, or when the user says 'update the ADR', 'record this decision', 'document this'. Keywords: ADR, architecture decision, decision record, document decision."
metadata:
  author: coachapp
  version: "1.1.0"
---

# ADR Management Skill

ADRs are **quick-reference documents derived from the actual code**. They capture the essence of decisions that were made, not prescriptions for what to build.

**The flow is always: Code -> ADR. Never ADR -> Code.**

The code is the single source of truth. An ADR is a summary a developer can scan in 2 minutes to understand why a feature is structured the way it is, what containers were chosen, and what's left to build.

---

## Core Principle: ADRs Must Be Factual and Accurate

An ADR is a **fact document**, not a plan or proposal. Every statement in an ADR must be verifiable by reading the code it describes.

**Before writing or updating any ADR, you MUST:**

1. Read ALL existing ADRs in `apps/coachapp-v2/docs/adr-*.md` to understand what's already documented and avoid contradictions
2. Read the actual source files the ADR describes — screen files, components, API types, route config
3. Only write what is true right now in the code. Never speculate, assume, or describe intent that isn't implemented

If the code and the ADR disagree, the code is right and the ADR must be fixed.

---

## One ADR Per Feature, Always Current

There is exactly **one ADR per feature module** (or cross-cutting pattern). It is a living document that is overwritten in place to reflect the current state of the code. There is no versioning or history — the ADR is always a snapshot of right now.

### Create a NEW ADR when:

- A new feature module has been built with non-trivial decisions
- A reusable pattern has been established that other features should follow
- The user explicitly asks to record/document decisions

### Sync an EXISTING ADR when:

- The code it describes has changed (new components, revised decisions, removed code)
- The user asks to sync/update the ADR

### Do NOT create a separate ADR for:

- Changes to a feature that already has an ADR — update the existing one instead
- Trivial bug fixes or styling tweaks
- Standard CRUD that follows an established pattern without new decisions
- Work that hasn't been implemented yet (ADRs document what IS, not what WILL BE)

---

## Verification Workflow

### Creating a new ADR

1. Read ALL existing ADRs: `ls apps/coachapp-v2/docs/adr-*.md` — read each one
2. Read the actual code: screen files, components, API files, route config
3. Determine next ADR number
4. Write the ADR from what the code actually does, using the template
5. Cross-check every table entry (components, routes, endpoints) against the real files

### Syncing an existing ADR

1. Read ALL existing ADRs (not just the one being synced)
2. Read the ADR being synced fully — understand its existing style, structure, and tone
3. Read the current code the ADR describes — screen files, components, API files, route config
4. Identify what specifically changed in the code since the ADR was last written
5. Surgically update only the sections affected by the change — do not rewrite sections that are still accurate
6. Match the existing style of the document (heading levels, table formats, phrasing patterns)

---

## ADR Location & Naming

```
apps/coachapp-v2/docs/
├── adr-001-nutrition-plan-builder.md
├── adr-002-{feature-name}.md
└── ...
```

- **Path:** `apps/coachapp-v2/docs/adr-NNN-{kebab-case-title}.md`
- **Numbering:** Sequential, zero-padded to 3 digits
- One ADR per feature module or cross-cutting pattern (not per screen)

---

## ADR Template

Sections marked (if applicable) can be omitted when not relevant.

```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD
**Context:** One-line summary of what this decision is about

---

## Context

Why this decision was needed. What problem are we solving?
Include the data model if this is a feature ADR.

---

## Decision: {Summary of what was decided}

Describe the approach chosen. For feature modules, describe the user flow.

---

## Container Decisions

(if applicable — for any feature with UI)

| Action | Keyboard? | Container | Rationale |
| ------ | --------- | --------- | --------- |

---

## Component Architecture

(if applicable — for feature modules)

### Screens

| File | Route | Purpose |
| ---- | ----- | ------- |

### Components

| Component | Purpose | Used by |
| --------- | ------- | ------- |

---

## Data Flow

(if applicable)

How data moves through the feature. Which hooks/mutations fire from which components.

---

## Key Design Decisions

Numbered list of the important choices made, each with a brief rationale.

---

## API Endpoints Used

(if applicable)

| Endpoint | Hook | Purpose |
| -------- | ---- | ------- |

---

## What's Not Built Yet

(if applicable)

Explicit list of deferred features, noting which API endpoints/mutations already exist for them.
```

---

## Rules

### 0. Pre-commit ADR check (MANDATORY)

Before every commit, you MUST evaluate whether the changes require an ADR update or a new ADR. This is not optional.

1. Look at the files being committed
2. Read all existing ADRs: `ls apps/coachapp-v2/docs/adr-*.md`
3. Ask: do these changes affect any decision documented in an existing ADR? (new component, changed container, new endpoint wired up, removed code)
4. Ask: do these changes introduce a new feature module or cross-cutting pattern that has no ADR yet?
5. If YES to either — sync the existing ADR or create a new one as part of the same commit
6. If NO to both — proceed with the commit, no ADR work needed

**This check must happen every time. Skipping it means ADRs drift from code, which defeats their purpose.**

### 1. Code is the source of truth

ADRs describe what the code does. If you're unsure about a detail, go read the file. Never write from memory or assumption.

### 2. Read all ADRs before writing any ADR

Before creating or updating an ADR, read every existing ADR. This ensures consistency, avoids contradictions, and enables proper cross-referencing.

### 3. Be surgical — don't rewrite what's correct

When syncing, update only the specific sections affected by the change. Do not rewrite entire documents. Do not remove content that is still accurate. Only remove content that is now wrong.

### 4. Match existing style

Read the ADR before updating it. Match its heading levels, table formats, phrasing patterns, and tone. Don't impose a new format on an existing document.

### 5. Respect repo conventions

If the repo has `CLAUDE.md` or `CONTRIBUTING.md`, read and follow its conventions for branch naming, commit messages, and PR practices.

### 6. Container decisions are mandatory for UI features

Any ADR for a feature with UI MUST include the Container Decisions table. Every user-facing action must be mapped. Reference the container decision hierarchy from `AGENTS.md`:

```
INLINE (default) -> DIALOG (zero-input confirmations) -> DRAWER (read-only previews) -> NEW PAGE (2+ inputs)
```

### 7. "What's Not Built Yet" reflects reality

This section lists API endpoints/mutations that exist in the code but have no UI yet. When syncing, check the actual API files against what's built — don't guess.

### 8. Cross-reference between ADRs

If decisions overlap between features, reference the other ADR.

### 9. Every table entry must be verifiable

Every file, route, component, and endpoint listed in an ADR must exist in the codebase. If you list `meal-section.tsx`, that file must exist at the path described. If you list `useCreateMealMutation`, that hook must be exported from the API file.

---

## Existing ADRs

| ADR | Feature |
| --- | --- |
| [ADR-000](../../apps/coachapp-v2/docs/adr-000-architecture-and-stack.md) | Architecture & Stack |
| [ADR-001](../../apps/coachapp-v2/docs/adr-001-nutrition-plan-builder.md) | Nutrition Plan Builder + Meal Logging |
| [ADR-002](../../apps/coachapp-v2/docs/adr-002-training-plan-builder.md) | Training Plan Builder + Workout Logging |
| [ADR-003](../../apps/coachapp-v2/docs/adr-003-storefront-and-leads.md) | Coach Storefront & Client Acquisition (hidden for MVP) |
| [ADR-004](../../apps/coachapp-v2/docs/adr-004-client-invitation-and-onboarding.md) | Client Invitation & Onboarding |
