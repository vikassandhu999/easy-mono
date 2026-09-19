# Intake and check-ins

A client opens a request from their coach, answers it, and returns knowing the response is saved. Pending work and history are separate views of the same mobile list. The server owns membership, ordering, filtering, count, and cursor; the app follows `next_cursor` unchanged.

Use one scrollable form grouped by the coach's sections. A question-at-a-time wizard adds navigation and makes reviewing related answers harder, so reserve it for evidence of a real usability need. Keep a reachable Submit response action and show required labels before submission. Use the established shadcn Select, plain radio choices for yes/no, and appropriate mobile keyboards. Saved responses use the frozen question snapshot, with the saved time and a return link.

Entry: a pending action on Today or the Forms destination. Exit: server-confirmed response, then back to pending work. Empty pending state says there is nothing to complete; history distinguishes completed, missed, and dismissed requests. Initial/load-more errors have separate retries. A failed detail read never opens an empty editable form.

Drafts use the verified client and assignment ID, survive restarts and rejected login, and clear on explicit logout. Preserve the template identity with the draft and handle changed questions explicitly. Disable submission during uploads. Read back assignment status after a lost submission response before allowing another attempt; the existing backend locks the assignment and rejects a second submission after completion. The UI must show that saved response rather than treating it as a generic validation failure.

Backend preparation: replace the unbounded client assignment index with the repository's `CursorPage` response (`data`, filtered `count`, `next_cursor`), default limit 20, max 100, newest timestamp plus ID order. Optional `state=pending|history` and `purpose=intake|check_in` filters are applied before both paging and counting. Pending means the backend's open statuses; missed and dismissed requests cannot be submitted. The same client/tenant scope applies to page rows, counts, detail, submissions, and attachments.

Verify with real router tests for cursor continuation, tied timestamps, deleted anchors, empty data, invalid input, filtering/counts, and account/tenant isolation. Then exercise all supported answer types, save/read-back, stale-template recovery, lost-response deduplication, photo upload failure/retry, and draft restoration in mobile browser and native apps. Native photo permissions and denial recovery remain part of this workflow, not a browser-only substitute.

Contract verification: `just gen-api` and all 21 client assignment router tests passed on 2026-09-19. Full backend precommit passes 1,799 tests after recovery from an environment disk-full error. Client build, Biome, and shape checks pass. This is the API prerequisite; the mobile list, answer editor, and photo workflow are not yet delivered.
