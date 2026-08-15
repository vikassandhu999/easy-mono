# 01 — Move exercise ownership into Training Library

**What to build:** Move exercise, muscle, equipment, visibility, and deletion behavior behind the Training Library interface while preserving the user-facing exercise library and its stored data.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] Coaches and clients can perform every supported exercise-library read through Training Library.
- [x] Coaches can create, update, duplicate, and delete eligible exercises through Training Library.
- [x] Exercise visibility has one tenant-aware implementation that Programming and Execution can consume.
- [x] Deleting an exercise used by a Prescription returns the existing in-use conflict; historical Performed Sets may retain their frozen names after the live reference disappears.
- [x] Muscle, equipment, and media behavior remains unchanged.
- [x] Exercise controllers, tests, seeds, and internal callers no longer depend on the replaced generic exercise context.
- [x] Focused exercise-library tests and backend precommit checks pass.
