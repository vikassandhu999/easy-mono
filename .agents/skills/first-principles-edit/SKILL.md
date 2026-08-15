---
name: first-principles-edit
description: >
  Destructively rewrite code from first principles. Use when the user asks to
  rebuild, rewrite, or rethink code from scratch; replace a patched or inherited
  design; or create the code that should exist without preserving its present
  architecture.
---

# First-principles edit

The implementation inside the requested scope is **disposable**. Determine the
fundamental job, build the implementation that should exist, migrate every caller to
it, and delete what it replaced. Optimize for the clearest correct system after the
rewrite, not for a small diff.

Destructive applies to code only: implementations, interfaces, abstractions, files,
tests, types, wrappers, flags, obsolete contracts. User data, production resources,
credentials, and unrelated work stay untouched.

Architecture is in scope: module boundaries, interfaces, and ownership are as
disposable as any function body. When the rewrite redraws them, load
`codebase-design` during step 3 for the deep-module vocabulary — then keep moving;
this skill ends in executed code, not a review.

## 1. State the fundamental job

Describe the problem without referring to the present implementation: what outcome
must this code produce, who or what depends on it, and how the rewrite will be
judged correct. Separate job from symptom — "add another condition" is a symptom;
"represent these states so an invalid transition is unrepresentable" is a job.

**Gate:** the job and success criteria are stated without naming the implementation
being replaced.

## 2. Sort ground truths from habits

Everything inherited — file layout, module boundaries, interfaces, state shape,
framework patterns, tests, wrappers, flags — is replaceable until it survives one of
three tests:

* Required by the user or product outcome.
* Imposed by a real external system — one you can name, not a speculated consumer.
* A data, security, language, or runtime invariant.

What survives is a **ground truth**: write the full list down. Everything that fails
all three exists only because earlier code was shaped that way — demolition
material. Investigate anything uncertain that would materially change the rewrite.

Current interfaces are not ground truths merely because callers use them — callers
migrate. Current behavior is preserved when the job requires it; incidental behavior
changes when the correct design demands, reported explicitly. Tests are claims, not
laws: keep tests that protect real outcomes, delete tests that protect structure.

**Gate:** every preserved constraint has a reason outside the code being replaced.

## 3. Design greenfield

Reason upward from the ground truths as if the repository were empty: the simplest
complete model that does the job, state and ownership defined directly, one
authoritative path with one source of truth, invalid states unrepresentable where
practical. Each abstraction, layer, dependency, and branch earns its place by citing
a ground truth. A valid target may replace many files with one, one with several, or
remove an abstraction entirely.

Apply the **removal test** to every part of the present design: "would I create this
if the repository did not already contain it?" No → it goes.

## 4. Write the demolition brief

Before editing, state briefly and concretely:

```markdown
Fundamental job:
Ground truths:
Inherited assumptions being discarded:
Target design:
Code to delete or replace:
Verification:
```

## 5. Rewrite destructively

Build the target directly: replace implementations, migrate callers to the new
interfaces, rebuild the state model in its target shape, rewrite tests around target
behavior, and update types, schemas, docs, and config to describe one system. Delete
superseded code the moment its callers move — files, flags, adapters, aliases,
comments describing the old design, and tests that only protected it.

External contracts that survived step 2 are honored by the target design itself. A
shim translating for the obsolete interface is different — that is opt-in: add one
only when the user names the consumer that needs it, and record when it can be
deleted. When the rewrite exposes more of
the same broken idea inside the requested scope, keep replacing — follow the idea to
its end, not to the nearest file boundary.

## 6. Verify the replacement

Run the relevant tests, type checks, linters, builds, and end-to-end probes. When a
check fails because a caller expects the obsolete design, migrate the caller — the
obsolete layer stays gone.

**Done means the target design stands alone:**

* The fundamental job succeeds and every ground truth holds.
* All callers use the target design; searches for deleted symbols, flags, and files
  return nothing.
* One source of truth, one active path — no compatibility shadow.
* Tests describe target behavior.
* Every piece of surviving structure passed the removal test on merit — structure
  that persists only under new names means the former design survived and the
  rewrite is still open.
* The code reads coherently with no knowledge of the former design.

Then report: what was rebuilt, what was deleted, which interfaces, behaviors, tests,
or assumptions were intentionally broken, which ground truths were preserved, exact
verification commands and results, and any compatibility code the user explicitly
required.
