# Slice 1 progress

Plan: `s1-plan.md`. Work remains in `codex/core-domains`; no commit or push.

- Backend and typed contract implemented. Backend worker is completing final precommit and removing the unused exercise description field. Dev database migrated and library seeds run. No nutrition table replacement.
- Coach and client source implemented. Both builds passed before final review fixes. Full frontend lint passed before the last small formatting changes; final checks remain.
- Live Playwright `frontend/apps/coachapp/tests/training/core-domains.browser.mjs` passed after Phoenix restart. Extended run also passed offline draft saving, blank unit preservation and extra free workout. Required screenshots in `s1-screens/`.
- Client correction/retry browser regression passed and is saved as `frontend/apps/clientapp/tests/training/corrections.browser.mjs`.
- `test:visual-hierarchy` passed all 16 screen/viewport combinations. Evidence in `/tmp/coachapp-hierarchy/s1`; copy relevant evidence into build before report.
- Client and coach source reviews have no open findings. Backend review fixes are in source; reviewer will verify after worker finishes. Reports are `s1-client-review.md`, `s1-coach-review.md`, `s1-backend-review.md`.

## Choices recorded for the final report

- JSON node ids are UUIDs. Assignment copies content including local node ids; occurrence identity includes plan id.
- An initial assignment may start in the past. Existing dates obey M4. Future plans archive by clearing future dates; started plans end today and retain past coverage.
- Future scheduled coverage is reserved even before a coaching term exists. Overlap ignores only terms that have actually ended in the client's local today. This prevents invitation acceptance or extension of a future coaching end from activating overlapping prepared plans.
- Occurrence range is limited to 367 inclusive dates. Completed unscheduled sessions are extra work. Duplicate fulfilment selects one completed session, with stable ordering.
- Blank unit selections do not write zero. Local drafts use version 2; retired shape drafts are rejected rather than converted.
- Exercises use one seeded image as media_id (first source image). Backend report will confirm seed choice and counts.
- Existing training browser scripts for the retired shape were replaced by a live core-domains scenario and isolated correction/retry regression. Training test commands point to the replacements.

## Completion

- Backend precommit passed all 1,020 tests and static checks. Dev/test migrations are up through 20261005000400; seeds and weighted-exercise audit pass.
- Final root API generation passed (126 routes); both app builds and frontend lint passed.
- Final live Playwright passed against restarted final Phoenix, including scheduled-content preview, offline draft saving, extra session and earlier occurrence. Client correction/retry and 16 visual hierarchy combinations passed.
- Source reviews report no confirmed open findings. Required report is `s1-report.md`.
- No commit, push, new branch, worktree, or clientapp-v2 change.
