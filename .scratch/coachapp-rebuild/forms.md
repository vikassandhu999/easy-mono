# Forms

When preparing intake or check-ins, a coach needs to create reusable questions so clients can provide useful answers. The user selected listing and creation, then approved the connected list/editor slice, reopening for editing, preview, and default intake selection.

## Screen brief

- Entry: a compact Clients / Forms navigation under the existing app header.
- List: search by name, filter by purpose, show purpose, question count, archived state, and an explicitly selected default intake. Open a row to edit; Create form starts a new form.
- Editor: name, immutable-after-save purpose, titled sections, ordered questions, supported answer types, required flag, and choices for single/multiple choice. Service type is intake-only and occurs at most once. Stable question IDs survive edits and reordering.
- Preview: a responsive dialog with labelled example answer controls, section grouping, and required state. Preview answers are temporary and never submitted.
- Save: persist through existing endpoints, invalidate list/detail/default-intake/assignment caches, and return to the list with confirmation. Errors preserve editor values. Block accidental navigation away from unsaved work; reload warns before losing it. No stored browser draft of sensitive question content.
- Default intake: explicit action on a saved active Intake. Explain that this applies to future invitations; existing assignments are unchanged. A failed selection remains retryable.
- Mobile: one column, 44px minimum targets, 16px input text, reachable save action. Desktop gives form details a narrow column and questions the main column.
- Keep template deletion, archive actions, assignment, and recurring schedules outside this slice. Existing archived forms remain visible and labelled.

A modal-only editor was considered; the dedicated route supports longer forms, reload, and editing existing forms without crowding phone overlays. Reordering uses labelled buttons rather than drag-only interaction.

## Implementation steps

- [x] Write and run a real API browser scenario that fails because Forms navigation and authoring do not exist. Cover create, choices, required flags, reorder, preview, failed save/retry, reopen/edit, default intake, and invitation preview at 375px and 1280px.
- [x] Extend `src/api/forms.ts` and `keys.ts` with list/detail/create/update/default hooks using generated types, cancellation, and the existing session identity guard.
- [x] Build `src/forms/forms.tsx`, `form-editor.tsx`, `form-section.tsx`, and `form-preview.tsx`; wire routes and compact navigation. Download needed shadcn primitives with the CLI.
- [x] Verify browser scenarios, unsaved navigation, empty/error states, immutable purpose, and stale mutation completion after account switch. Run coach build, targeted Biome, and `just check-rm`.
- [x] Review the implementation, fix material findings, record results, and update rebuild plan/README. Preserve staging; no commit or deployment.

## Contract evidence

Existing `FormTemplateController` exposes list/show/create/update and set-default-intake. `Easy.Forms.Templates` supplies a built-in weekly check-in during listing, so a fresh account normally has that form. `FormTemplate.update_changeset` fixes purpose after creation. Generated `FormTemplateCreate` and question types match the source. Graph `cbm refs FormTemplate --verify` refreshed with no recorded gaps for the frontend type, but backend discovery was insufficient; exact backend controller, type, model, and context were read.

## Verification and limits

The real API browser suite passes at 375px and 1280px. It covers Intake and Check-in creation, required flags, single/multiple choices, stable IDs after editing, question and section reordering, removing questions, preview focus return, validation, failed list/detail/save/default requests and recovery, default intake in the invitation preview, unsaved navigation/discard, fresh server reads on reopening, and a held save completing after an account change. A 375×480 viewport check confirms the save action is reachable and input text is at least 16px. Empty-list rendering uses a response fixture; the backend normally creates a built-in check-in.

The existing auth, trainer-invitation, client-invitation, mobile-foundation, and overview suites pass. The coach build, targeted Biome, `just check-rm`, and diff whitespace checks pass. The API contract check ran 21 controller tests and `just gen-api`; no new endpoint was needed. The existing bundle warning remains, at approximately 619 kB uncompressed JavaScript.

Review corrections: wait for a fresh successful detail request before initializing an editor; retain local edits during subsequent refetches; clear stale save errors when the draft changes; preserve keyboard focus when changing answer type; use the client's 1–5 rating range. New Service type questions are required and lock their identity/type, with only one allowed on an Intake. The unsaved-dialog regression waits for focus restoration before typing. shadcn downloaded native-select, textarea, and checkbox; their imports and sizing use the app's existing helper and mobile tokens.

Preview answers are temporary and do not upload photos. Unsaved work stays in memory; browser reload warns before discarding it. Physical-device keyboards and safe areas, and a target-coach usability review, remain unverified. No commit, push, or deployment was requested.
