# Implement required-services capture in the apps

Type: task
Status: open
Blocked by: 14
Parent: [Coach workbench v1 delivery](../map.md)

## Question

Implement the locked required-services capture flow in CoachApp and the Intake answer control in ClientApp using generated API types.

## Locked interaction

* Use [Design required-services capture](./02-design-required-services-capture.md) and its prototype as the interaction reference.
* Add optional Training/Nutrition selection to CoachApp Invite and a required non-empty selection when a coach edits an accepted client. Show Unclassified truthfully until a selection exists.
* Add `Service type` to the CoachApp form builder only for Intake. It has no option editor, can appear once, and is absent from Check-in palettes and presets.
* Render the fixed Training, Nutrition, or both answer control in ClientApp Intake. Submit the generated `services` array shape and render the submitted answer in the review surface.
* Derive all request, response, and question types from generated schemas. Mutation hooks own invalidation for client detail, client lists, Workbench counts, and queue lists.

## Edit surface

* CoachApp Invite, Edit client, generated-type API adapters, and `src/checkins/` builder vocabulary
* ClientApp `src/checkins/checkin-field.tsx`, `fill-checkin.tsx`, and its API type adapter
* Do not edit either generated `schema.ts` file.

## Acceptance

* Invite omission, Invite selection, accepted-client edit, Intake builder, Intake submission, Intake review, and Unclassified display match the locked prototype and domain rules.
* Check-in forms cannot create, render, or submit `service_type`.
* Error handling uses the apps' standard form helpers, and successful writes refresh every affected surface.

## Verification

Build CoachApp and ClientApp. Verify Invite, accepted-client edit, Intake builder, and client Intake completion at 375px; verify the CoachApp forms at desktop width as well.
