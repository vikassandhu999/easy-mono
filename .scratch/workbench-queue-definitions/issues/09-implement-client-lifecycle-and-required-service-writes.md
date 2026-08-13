# Implement client lifecycle and required-service writes

Type: task
Status: resolved
Blocked by: 08
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Implement every write that owns `joined_at`, `required_services`, the Intake-only `service_type` question, and the single-Intake invariant.

## Locked behavior

* `Easy.Clients.accept_invite/3` sets `joined_at` in the same guarded write that links the user and activates the client. Invite and coach/client edits cannot set or rewrite it.
* Invite may omit or send an empty `required_services` set. A supplied coach edit must contain at least one service. Both paths normalize Training before Nutrition.
* `service_type` is a closed question type with no configurable options. It is allowed at most once on Intake templates and rejected on Check-in templates.
* Its submitted answer is a canonical non-empty services array. Intake submission replaces the client's set inside the existing submission transaction; Intake without the question leaves the set untouched; Check-in submission never changes it.
* Assigning an Intake locks the client row and returns `:conflict` if any Intake assignment exists in any status. Do not add a database uniqueness constraint.
* Add a tenant- and visibility-scoped Forms context command that sends an Intake reminder without completing, dismissing, or otherwise changing queue membership. Use the existing notification boundary.

## Edit surface

* `backend/lib/easy/clients.ex` and `backend/lib/easy/clients/client.ex`
* `backend/lib/easy/forms.ex`
* `backend/lib/easy/forms/form_template.ex`, `form_assignment.ex`, and `form_submission.ex`
* Focused context and changeset tests under `backend/test/easy/clients/` and `backend/test/easy/forms/`

## Acceptance

* Concurrent invitation acceptance cannot rewrite `joined_at`.
* Concurrent Intake assignment attempts create one assignment and return one conflict.
* Direct edits and Intake submissions follow latest-successful-write-wins semantics.
* Invalid purpose, duplicate question, invalid answer, empty edit, and cross-tenant reminder cases fail through the standard context return contract.
* Tests cover every required-services case listed in the source specification.

## Verification

Run the focused Clients and Forms tests, then `mix precommit` from `backend/`.

## Answer

Implemented the canonical lifecycle and required-services write paths.

* `Easy.Clients.accept_invite/3` now sets microsecond `joined_at` in the existing guarded pending-client update. The guard makes later or concurrent acceptance attempts return `:race_lost` without rewriting it, and no Invite, coach-edit, or client-edit changeset casts the field.
* Invite and coach-edit changesets now cast the closed `required_services` set, normalize Training before Nutrition, reject duplicates and unknown services, and translate the database constraint. Invite may omit or clear the set; a supplied coach edit rejects an empty set.
* Form templates accept one optionless `service_type` question only on Intake templates, including update and system-content paths. Form submissions require its answer and accept only `[training]`, `[nutrition]`, or canonical `[training, nutrition]`.
* Intake submission replaces the client's services inside the existing submission transaction. Intake without the question and every Check-in submission leave services unchanged, so direct edits and Intake submissions retain latest-successful-write-wins behavior.
* Intake assignment now locks the tenant- and visibility-scoped client row, checks every existing Intake status, and returns `:conflict` after the first assignment. No uniqueness constraint was added.
* `Easy.Forms.send_intake_reminder/2` verifies tenant visibility and Intake purpose, sends through `Easy.MailerDelivery`, and does not mutate assignment status, completion, or due-date facts. Missing email, invalid purpose, invisible clients, and cross-tenant assignments return standard context errors.

Verification completed:

* New focused lifecycle/services suite: 20 tests, 0 failures, including real-connection acceptance and Intake-assignment races.
* All Clients and Forms tests: 141 tests, 0 failures.
* Backend `mix precommit`: 1,131 tests, 0 failures. Credo reported only the pre-existing `Easy.Clients.attention_facts/2` complexity advisory already recorded by [Add canonical workbench persistence](./08-add-canonical-workbench-persistence.md).
