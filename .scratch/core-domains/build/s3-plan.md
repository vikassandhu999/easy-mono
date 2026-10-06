# Slice 3 implementation plan

The source of truth is the owner's slice-3 request, decisions.md, overview.md and check-ins/spec.md. Work stays in this working tree on codex/core-domains. Do not commit, push, create branches or worktrees, or change clientapp-v2. Prefix shell commands with rtk. Preserve existing work.

## Tasks

- [x] Restore current-model controller, library, correction, concurrency and write-gate coverage. Precommit passed: 715 tests, zero failures, up from 672. Root confirmed with seed 946774. No production fixes.
- [x] Build Tracker persistence and context operations: library, dated assignments, shared templates, first-term default copy, journalled records, private ordered attachments, requests, calculated due items, metrics and coverage. Added 37 Tracker tests.
- [x] Add typed coach/client routes, formatters, settings and PDF/captured_on attachment fields. Generated 165 typed routes for the retained apps.
- [x] Build coach library, template/default settings, client list, requests, recording and history/metrics/photo/report screens.
- [x] Build client Today, all-kind recording with recoverable drafts, history, after-workout and after-meal prompts.
- [x] Run live browser flows for Training, Nutrition and Trackers; save screenshots at the required viewports. All finish gates passed; s3-report.md written. Final backend: 752 tests, zero failures, seed 998290. Both source reviews have no open findings.

## Boundaries

Reuse Easy.Plans templates, Easy.RecordJournal.write_for_client, the records view and Easy.Units. Assignment history is separate from plans. Due and open states are queries. Private files use Easy.Attachments. Public contexts take Ctx first. Dates use the client's local day. Only clients write training and nutrition records.

## Review focus

Tenant and client boundaries; retry identity after uncertain responses; same-day timing replacements and overlapping ranges; default copy once under the coaching transaction; unit conversion and attachment order across client/coach views.

## Evidence

Baseline: rtk mix precommit passed, 672 tests, zero failures, 126 typed routes. Existing work was already present at task start.
