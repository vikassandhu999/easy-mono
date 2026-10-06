# Tracker screen briefs

## Coach library and templates

Entry: library navigation. Search/filter a server-paginated list of built-in and custom Trackers. Create a custom Tracker with name, kind, and the relevant unit or scale. An existing Tracker permits name edits and archive/restore; deletion is available only when the server permits it. Explain why kind, unit and scale cannot change. Keep failed form values. Show clear loading, empty and retry states without clearing loaded rows.

Template editing uses the shared templates resource for the trackers domain. Items select a Tracker and timing, with a weekday for weekly items. The business owner can select the default in Business settings. Save the complete item list atomically.

## Coach client Trackers

Entry: the client's overview. Primary actions: add a Tracker, change timing, end an assignment, apply a template, record for the client, or request a Tracker. Display open requests with their date and a cancel action. Display readable assignment timing and preserve older records after list changes.

History selects a Tracker and range. Show server-provided numeric metrics and a chart, unit controls for built-ins, event coverage, photo comparison (latest versus previous or first), and ordered document attachments with view/download links. Mark coach authorship as "Recorded by coach". Empty states say that no entries exist. Failed saves retain inputs; refresh errors retain readable results.

## Client Today and recording

Entry: Today "To record" and "Your coach asked for". A saved entry removes a satisfied prompt. "Add something else" opens the searchable library without changing assignments. The form matches the Tracker kind and starts with the client's units. A report holds ordered PDF/image files; photos hold images. Keep draft values, request identity and files through interruption; do not discard an uncertain save.

After-workout prompts appear in the finish flow and save entries linked to the completed session. After-meal prompts appear in the meal logger and link to the saved meal. Recovery must retain the successful event record and any unanswered prompts.

History stays readable after coaching ends. It shows entries, numeric trends, attachments and coach authorship. All client screens use the existing mobile composition.

## Browser evidence

Use the requested live acceptance, assignment, request, imperial weight, habit, completed workout energy, report upload and coach waist journey. Capture coach at 1280px and 375px and client at 375px in `s3-screens/`. Also rerun the retained slice-1 and slice-2 flows.
