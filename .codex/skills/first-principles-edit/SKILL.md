---
name: first-principles-edit
description: >
  Destructively rewrite code from first principles. Use when the user asks to
  rebuild, rewrite, or rethink code from scratch; replace a patched or inherited
  design; or create the code that should exist without preserving its present
  architecture. Prefer full replacement and deletion over incremental fixes,
  compatibility layers, or conservative refactoring.
---

# First-principles edit

Treat the implementation inside the requested scope as disposable.

Do not patch the design that exists. Determine what the system fundamentally needs
to do, build the implementation that should exist, migrate the codebase to it, and
delete what it replaces.

Destructive means destructive to code: implementations, interfaces, abstractions,
files, tests, types, wrappers, flags, and obsolete contracts may be deleted or
replaced. It never means deleting user data, production resources, credentials, or
unrelated user-owned work.

Do not invoke or pair this skill with `codebase-design`. This is an editing mode, not
an architecture-review process.

## Governing rule

Prefer a ground-up rewrite over an incremental patch.

The present code is evidence about requirements, not a template for the solution.
Preserve only constraints that remain true. Everything else must justify its
continued existence.

Do not optimize for a small diff. Optimize for the clearest correct system after the
rewrite.

## Phase 1: State the fundamental job

Describe the problem without referring to the present implementation.

Answer:

* What outcome must this code produce?
* Who or what depends on that outcome?
* What would the ideal implementation accomplish if no code had been written yet?
* How will we know the rewrite is correct?

Separate the job from its symptoms. "Add another condition" is not a job. "Represent
these states without allowing an invalid transition" is a job.

### Gate

Do not edit until the job and success criteria can be stated without naming the
implementation being replaced.

## Phase 2: Challenge every inherited assumption

Assume the following are replaceable until proven otherwise:

* File and directory structure.
* Function, class, component, context, and module boundaries.
* Public and internal interfaces inside the requested scope.
* State shape and ownership.
* Framework patterns and project conventions copied without a concrete reason.
* Tests that encode implementation details.
* Compatibility wrappers, deprecated paths, feature flags, and migration scaffolding.
* Comments and documentation that describe the design being removed.

For each assumption, ask:

* Is this required by the user or product outcome?
* Is it imposed by a real external system?
* Is it a data, security, language, or runtime invariant?
* Is there evidence that violating it causes failure?
* Does it exist only because earlier code was shaped this way?

Keep the first three categories. Delete the last category. Investigate anything that
remains uncertain and materially changes the rewrite.

Tests are claims about behavior, not laws. Keep tests that protect real outcomes.
Delete or rewrite tests that protect obsolete structure.

## Phase 3: Establish ground truths

Write the irreducible facts the replacement must satisfy. Use only facts that survive
Phase 2.

Ground truths may include:

* Required user-visible and domain outcomes.
* Data invariants and persisted formats that cannot be migrated in this change.
* Security, authorization, privacy, and tenant-isolation requirements.
* External protocols or consumers that the user explicitly requires compatibility
  with.
* Error, ordering, idempotency, concurrency, and performance requirements.
* Language, runtime, platform, and repository constraints.

Current interfaces are not ground truths merely because callers use them. Update the
callers when the target design makes those interfaces unnecessary.

Current behavior is not automatically sacred. Preserve behavior required by the job.
Change incidental behavior when doing so produces the correct design, and report the
change explicitly.

### Gate

Every preserved constraint must have a reason outside the implementation being
replaced.

## Phase 4: Design from zero

Ignore the present decomposition and reason upward from the ground truths.

1. Choose the simplest complete model that performs the fundamental job.
2. Define the state and ownership rules directly.
3. Give each abstraction one clear responsibility.
4. Add a layer, dependency, branch, or extension point only when a ground truth
   requires it.
5. Make invalid states unrepresentable where practical.
6. Design one authoritative path with one source of truth.
7. Design tests around outcomes produced by the target system.

Do not begin by adapting current classes, helpers, or files. Write the target shape
first, then compare it with the code that will be destroyed.

A valid target may replace many files with one, one file with several, change every
internal interface, move ownership, or remove an abstraction entirely.

### Removal test

For every part of the present design, ask: "Would I create this if the repository did
not already contain it?"

If the answer is no, remove it.

## Phase 5: Rewrite destructively

Build the target system directly.

* Replace implementations rather than wrapping them.
* Update callers rather than preserving obsolete interfaces for their convenience.
* Replace state models rather than translating back into the former shape.
* Rewrite tests around the target behavior.
* Update types, schemas, documentation, configuration, and examples to describe one
  system.
* Delete superseded files and code as soon as their callers move.
* Remove dead flags, adapters, aliases, branches, comments, and tests.

Do not leave:

* A compatibility wrapper around the former implementation.
* A second implementation selected by a flag.
* Deprecated aliases with no external migration requirement.
* An adapter that translates the target model back into the obsolete model.
* Commented-out code or "temporary" duplicate paths.
* Tests whose only purpose is protecting the removed design.

Compatibility is opt-in, not the default. Add a compatibility path only when the
user explicitly requires one. State what external consumer needs it and when it can
be deleted.

When the rewrite exposes more of the same broken idea inside the requested area,
continue replacing it. Do not stop at an arbitrary file boundary and build a shim.

## Phase 6: Verify the replacement

Verify the system that should exist, not resemblance to the system that was removed.

Run the relevant tests, type checks, linters, builds, and end-to-end probes. Then
confirm:

* The fundamental job succeeds.
* Ground truths remain true.
* All intended callers use the target design.
* No active path depends on the removed interfaces or state model.
* No duplicate source of truth or compatibility shadow remains.
* Searches for deleted symbols, flags, files, and concepts return no stale usages.
* Tests describe target behavior rather than removed implementation details.
* The final code is coherent when read without knowledge of the former design.

If a check fails because a caller still expects the obsolete design, migrate the
caller. Do not restore the obsolete layer merely to make the check pass.

## Failure patterns

### Patch disguised as rewrite

The diff adds conditions, options, wrappers, or helpers around the same design. Stop
and replace the design itself.

### Rewrite beside the former system

The target exists, but the former path remains active. Migrate its callers and delete
it.

### Compatibility by reflex

The rewrite preserves every interface in case something depends on it. Find actual
consumers. Migrate internal consumers and keep only compatibility the user requires.

### Test obedience

The target is distorted to satisfy tests coupled to private structure. Delete those
tests and test the required outcome.

### Timid scope

The rewrite stops where the wrong abstraction crosses a file boundary. Follow the
wrong idea through the requested scope and remove it completely.

### Aesthetic replacement

Names and files change, but state, ownership, and control flow remain the same. The
underlying design survived, so the rewrite failed.

## Output contract

Before editing, state:

```markdown
Fundamental job:
Ground truths:
Inherited assumptions being discarded:
Target design:
Code to delete or replace:
Verification:
```

Keep this brief and concrete. It is a demolition and rebuild brief, not a menu of
options.

After editing, report:

* What was rebuilt.
* What was deleted.
* Which interfaces, behaviors, tests, or assumptions were intentionally broken.
* Which ground truths were preserved.
* Exact verification commands and results.
* Any compatibility code that remains because the user explicitly required it.

## Completion gate

The edit is incomplete while the former design remains active, callers depend on
obsolete interfaces, duplicate paths exist, or tests still define the removed
implementation.

Done means the target design stands alone and the superseded design is gone.
