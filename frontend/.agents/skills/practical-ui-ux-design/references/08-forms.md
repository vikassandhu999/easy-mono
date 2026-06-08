# Chapter 8: Forms

Patterns and principles to help people complete forms more quickly and correctly. Read this when designing any form (signup, login, checkout, settings, surveys, multi-step), choosing input types, or fixing form abandonment.

## Stack forms in a single column layout

A single column form is the safest and most efficient layout. Why:

- **Lower interaction cost** — users move down in a straight line; no zig-zag.
- **Lower cognitive load** — users don't think about where to look next.
- **Fewer skipped fields** — one downward path means nothing is missed in a second column.
- **Better for screen magnifiers** — users with limited viewing windows don't miss right-column fields.

### Stack labels on top of inputs

Place the label *above* the input, not to the left.

Why:

- **Single visual fixation** — the eye sees label and input in one focus.
- **Consistent left edge** — labels on the left create jagged or right-aligned alignments that hurt scanning.
- **Long labels work** — labels can be any length without breaking layout.
- **Faster completion times** documented across multiple studies.

### Stack checkboxes and radio buttons

Vertical, not horizontal. Same reasons:

- Easier to scan top-to-bottom.
- Clearer separation prevents accidental selection.
- Long option labels don't break layout.

### What about height?

Single-column forms are taller. Two ways to mitigate:

- **Pair short related fields side by side** within the column. Card expiry date + CVC together fits naturally — the side-by-side fields are *short*, so they stay in the column's bounds.
- **Break long forms into multiple steps.** Reduces perceived length and lets users focus on one chunk.

Don't sacrifice the single-column principle to fit everything above the fold.

## Minimise the number of form fields

Every additional field reduces completion. People don't want to give away personal info, and more fields mean more work and more chances to mistype.

Each field should be **essential** to the product or service. Default to "remove it" unless you can articulate why it's needed.

Common removable fields on signup forms:

- First name (do you need it before they sign up?)
- Last name
- Company name
- Phone number
- Title / role
- Address (only collect if shipping or legal compliance demands it)

A subscription form with three fields likely has a lower completion rate than the same form with one (just email).

## Mark optional fields

Required fields must be filled before the form submits. Optional fields don't.

If you have any optional fields, **mark them as optional** by adding `(optional)` next to the label:

> Mobile number (optional)

This way users know they can skip without trying it and getting an error.

## Try to avoid optional fields by using opt-ins

Cleaner pattern: instead of listing an optional field, ask whether the user wants the feature it enables. Show the field only if they say yes.

Example: instead of an optional "Mobile number" field on a signup form, ask:

> ☐ Receive updates via text message

Only when checked, reveal the mobile number field. Benefits:

- Simpler form for everyone who doesn't want the feature.
- No cluttered "(optional)" labels.
- Self-documents *why* the field exists.

## Mark both required and optional fields

Two camps exist. The book's recommendation: mark both.

**Why both:**

- Some users miss the "Required fields are marked with an asterisk" instruction at the top.
- Marking both eliminates ambiguity entirely.
- It's also the screen-reader accessibility requirement.

### How to mark required

**Asterisk method** (concise, conventional):

> Email *

Don't color the asterisk red — red implies error.

**Word method** (clearer, more cluttered):

> Email (required)

Use the word method when:

- Your audience is less tech-literate.
- The form is short, so clutter isn't an issue.
- Usability testing shows asterisks are missed.

### When you don't need to mark required fields

To reduce clutter, you can skip marking required fields if:

- Every field on the form is required (no optional fields exist).
- The form is short and familiar (single-field newsletter, login).
- Each step of a multi-step form asks one question with clear context.
- Usability testing confirms users figure it out.

## Match field width to the intended input

The width of a field sets users' expectations for the input length. A wide field for a 4-digit postcode confuses; a narrow field for a long company name frustrates.

- **Postcode (Australia, 4 digits):** narrow field sized for ~4 digits.
- **Year:** narrow.
- **CVC:** narrow.
- **Email / address:** wide.
- **Names:** medium-wide.

When expected length varies, size to the typical case (or the longest reasonable case).

Don't make all fields the same width "for tidiness" — it actively misleads.

## Stick with conventional form field styles

Per Jakob's Law, use conventional field styles. Users have strong mental models from years of forms.

A standard text input:

- Rectangle.
- Visible border (≥3:1 contrast).
- Label *above* the field.
- Empty interior (or hint that's clearly distinguishable from a value).
- Sufficient height for tap and read (40–48pt typical).

Common deviations to avoid:

- Labels *inside* the field as the only label (looks pre-filled, disappears on focus).
- Underline-only fields without visible borders (confuses with text).
- Pill / fully-rounded fields (uncommon enough to feel weird).
- Fields without borders (no affordance).

If you do modify field styles, **keep the iconic elements**: rectangle shape, visible border, clear label.

## Display hints above form fields

When a field needs an explanation (format requirements, examples), put the hint **above the field** (between the label and the input), not below.

Why:

- **Mobile autofill menus appear below the field** — they cover hints below.
- **On-screen keyboards appear at the bottom** — they push hints below the field offscreen.
- The label-hint-field stack reads top-to-bottom in one visual fixation.

> Email *
> We'll never share your email
> [____________________]

## Don't use placeholder text instead of a label

Placeholder text inside the field as the only label seems space-saving but causes problems:

- **Disappears on input** — users forget what the field was for.
- **Looks pre-filled** — users skip fields they think are already done.
- **Almost always too low contrast** — by design, placeholders are faint, which makes them inaccessible.

### Tips for form labels

- Always show a short descriptive label *above* the field.
- Add a hint *below the label, above the field* if more info is needed.
- Don't use placeholder text in most cases.
- Avoid instructional verbs in labels: "Type your email" or "Enter email here" is unnecessary — the input field already implies it.

### The exception

Single search boxes are fine with placeholder-only labels (a magnifying glass icon usually accompanies them, and the context is clear). When you do this:

- Increase placeholder contrast to ≥4.5:1 (most defaults are too light).
- Ensure there's an accessible label for screen readers (aria-label).

## Ensure form field labels are close to their fields

Spacing between a label and its field signals their relationship. If the label is far away, users have to mentally connect them — increasing interaction cost.

**Rule:** the gap between a label and its field should be **smaller** than the gap between fields.

| Bad spacing | Good spacing |
|-------------|--------------|
| Label ↓16pt → Field ↓16pt → Label ↓16pt → Field | Label ↓4pt → Field ↓32pt → Label ↓4pt → Field |

In bad spacing, all gaps are equal — labels feel equally related to the fields above and below them. In good spacing, the close gap binds label and field; the larger gap separates groups.

## Try to use radio buttons instead of dropdowns

For ~10 options or fewer, radio buttons beat dropdowns:

- **Lower interaction cost** — one tap, not a click-scroll-click.
- **Always visible** — can compare options at a glance.
- **No "looks pre-filled"** problem — clearly empty until selected.
- **Easier for motor-impaired users** — bigger targets, fewer precise interactions.

Use a dropdown only when:

- More than 10 options.
- Saving vertical space is genuinely important.

## Use an autocomplete instead of a long dropdown

For long lists where users know what they want (country, product, article), use an autocomplete (predictive search) field rather than a dropdown.

Tips:

- Autocomplete works for **known-item search.** For browsing-when-unsure, a dropdown or grouped multi-step works better.
- For very long lists, consider **breaking into multiple smaller dropdowns.** "Industry" → "Occupation within industry" beats one massive occupation list.
- **Limit suggestions to ~10.** Choice paralysis is real; the goal is to reduce, not show, options.
- **Bold the matching characters** so users can quickly differentiate similar suggestions.

## Use steppers for numeric fields instead of dropdowns

For small numeric changes (quantity, guests, items), steppers (with -/+ buttons) beat dropdowns:

- **One tap per increment**, instead of click-scroll-click.
- **Type for fast input.**
- **Lower interaction cost.**

Don't use steppers for arbitrary numbers (e.g., "enter your age") — there a regular numeric input is better.

## Use a checkbox or toggle switch for 2 options

Both express a binary state, but they're not interchangeable.

| Component | Use when |
|-----------|----------|
| **Checkbox** | The change takes effect *after* form submission. |
| **Toggle switch** | The change takes effect *immediately* (live setting). |

Examples:

- **Checkbox**: "I agree to the terms" — applies on submit.
- **Toggle**: "Notifications on/off" in settings — applies the moment toggled.

This convention is widely respected across iOS, Android, and major web apps.

## Use positive phrasing for checkboxes

Describe what *will* happen when the checkbox is checked, not what won't.

| Negative (confusing) | Positive (clear) |
|----------------------|------------------|
| ☐ Don't allow automatic updates | ☐ Allow automatic updates |
| ☐ Unsubscribe from email updates | ☐ Receive email updates |

Test by reading the checkbox aloud with "Yes" prepended:

- "Yes, *don't allow automatic updates*" — confusing.
- "Yes, *allow automatic updates*" — clear.

If the "Yes" version is awkward, rephrase to positive.

## Break up long forms into multiple steps

A 30-question form on one screen is intimidating; the same 30 questions across 6 steps of 5 related questions each feels manageable.

### Tips for multi-step forms

- **Tell users upfront** how long it'll take and what they'll need (so they don't start without their info ready).
- **Group ~5 related questions per step.** Don't over-fragment (30 steps of 1 question is its own problem).
- **Order questions easiest-first** so users get early wins.
- **Show progress** ("Step 2 of 4," progress bar). The Goal-Gradient Effect: motivation increases as users approach the end.
- **Allow review and edit** before final submit.
- **Show success state** with clear next steps after submission.

## Group related fields under headings

If you can't break a long form into steps, group related fields under section headings within the same form:

> **Postal address**
> [Street address]
> [Suburb]
> [State]
> [Postcode]
>
> **Contact details**
> [Email]
> [Mobile number]

Headings serve as scan anchors, give users a sense of structure, and make the form feel less overwhelming.

## Ensure form field borders are high contrast

Form field borders are a common contrast failure. Light grey borders on white fail the 3:1 UI element threshold.

Borders are **not** decorative — they're how users identify the field. Treat them as UI elements: ≥3:1 contrast against the surrounding background.

This applies to: input borders, checkbox borders, radio button borders, toggle switch borders, stepper borders.

If your design genuinely needs subtle borders, increase the input's *padding* and use a subtle background fill instead — that creates affordance without relying on a border.

## Choose your form validation approach

Three approaches, each with trade-offs.

### 1. Validate on submit

Simplest. The user fills the form, presses submit, and errors appear if any.

**Implementation tips:**

- **Display error messages above invalid fields** (not below — autofill menus and on-screen keyboards cover the area below).
- **Red border + background tint + icon** on invalid fields. Don't rely on color alone.
- **Show a list of errors at the top** of the form for multi-error cases. Make each item a link that scrolls to the offending field.
- **Don't disable the submit button** — enable it, validate on press.

**Advantages:**
- Easy to implement.
- Users focus on completing the form without distraction.

**Disadvantages:**
- Users have no idea if they're filling things correctly until the end.
- Multiple errors at once can overwhelm.
- Users lose context returning to fix earlier errors.
- Doesn't help users with progressive feedback (e.g., creating a password to certain criteria).

### 2. Validate after the user leaves a field (on blur)

When the user tabs out of or clicks away from a field, validate it immediately. If valid, no message; if invalid, show an error.

**Implementation tips:**

- Show success states (✓) where helpful (e.g., "username available," "password meets criteria").
- Once the user starts editing again, hide the error until next blur.
- Combined with on-type validation: if the user fixes the error mid-edit, clear the error in real time.

**Advantages:**
- Immediate feedback per field.
- Users fix while they still have context.
- Supports progressive feedback (password strength, etc.).

**Disadvantages:**
- Users get distracted switching between answering and fixing.
- Doesn't work for grouped inputs (a list of checkboxes).
- More complex to build.

### 3. Validate as the user types

Continuous validation as keystrokes happen, with a small delay before showing errors (so users aren't told they're wrong while they're still typing).

**Implementation tips:**

- Wait until the user stops typing for ~500ms before validating.
- Best for fields where users actively work toward an answer (password requirements, username availability, real-time character counters).

**Advantages:**
- Helps users hit specific criteria in real time.
- Immediate positive/negative feedback.

**Disadvantages:**
- Premature errors frustrate ("you're wrong" before the user finishes).
- Hard to time correctly for varied typing speeds.
- Most complex to implement.

### Combining approaches

Most production apps use a mix:

- **On-type** for password fields and username availability.
- **On-blur** for email, phone, format-validated fields.
- **On-submit** for everything else and as a final catch-all.

## Common form mistakes

When auditing forms, look for:

1. **Multi-column layout** when single column would work.
2. **Labels to the left** of fields instead of above.
3. **Optional fields not marked.**
4. **Required fields not marked** (and no instruction at top).
5. **Placeholder text used as label.**
6. **Hint text below the field** (gets covered by autofill).
7. **All fields the same width** regardless of content.
8. **Light grey borders** failing 3:1 contrast.
9. **Disabled submit buttons.**
10. **Long dropdowns** where radio buttons or autocomplete would be better.
11. **Dropdowns for small numbers** where a stepper fits.
12. **Negative checkbox phrasing.**
13. **Long single-step forms** that should be split.
14. **No progress indicator** on multi-step forms.
15. **Errors appearing below fields** (covered by mobile keyboards/autofill).
16. **Generic errors** ("invalid input") instead of specific ones.
17. **Color-only error indication.**

## Chapter summary

- Stack forms in a single column with labels above inputs.
- Minimise fields. Each one should earn its place.
- Mark both required (asterisk) and optional fields.
- Use opt-ins instead of optional fields where possible.
- Match field width to expected input.
- Stick with conventional field styles.
- Place hints above fields, not below.
- Don't use placeholder text instead of a label.
- For ≤10 options, prefer radio buttons over dropdowns.
- Use autocomplete for long known-item lists; steppers for small numeric inputs.
- Checkbox = applies on submit; Toggle = immediate effect.
- Use positive phrasing for checkboxes.
- Break long forms into steps; show progress.
- Group related fields under headings.
- Ensure ≥3:1 contrast on field borders.
- Pick a validation approach (on submit / on blur / on type) based on the field; combine when needed.
