# Chapter 7: Buttons

How to design accessible, descriptive buttons with a clear visual hierarchy. Read this when designing button systems, debugging confusing CTAs, choosing between primary/secondary/tertiary, sizing touch targets, or handling destructive actions.

## Define 3 button weights

Most interfaces need three button weights to express importance:

| Weight | Style | Used for |
|--------|-------|----------|
| **Primary**   | Filled rectangle, brand color, white text | The single most important action on the screen |
| **Secondary** | Outlined rectangle, brand color border + text | Less important alternatives |
| **Tertiary**  | Text-only with underline, brand color | Least important / multiple repeat actions |

Plus, you may need smaller and larger size variants depending on context.

### Why these defaults are safe

- **Familiar** — match conventions across the web.
- **Accessible** — clear visual hierarchy that doesn't depend on color alone.
- **Distinct** — each weight differs in shape *and* fill, not just color (so colorblind users can still tell them apart).
- **Versatile** — work on light and dark backgrounds with palette adjustments.

### Style notes

- **Primary** — solid fill in brand color, white text. Use border-radius from your scale (typically 8pt small).
- **Secondary** — *outlined*, not light grey filled. A light grey fill is too easily confused with a disabled state. Use the brand color for both border and text.
- **Tertiary** — looks like a text link. **Underline** the text so colorblind users can identify it as interactive.

## Use a single primary button for the most important action

One screen, one primary action. If everything is "primary," nothing is.

**Why:**

- Visual hierarchy demands it — multiple primaries fight each other.
- The primary button signals "this is what you came here to do." More than one is confusing.
- Reduces cognitive load — the user doesn't have to choose between two equally-strong options.

**Common offenses:**

- Two side-by-side filled buttons with the same color.
- A "Cancel" button styled as primary because the design system only has one button style.
- Hero sections with multiple CTAs all in the same brand fill.

**The fix:** keep one primary; demote the rest to secondary or tertiary.

## Use secondary buttons for less important actions

Secondary buttons are for actions that are useful but not the main goal. "Cancel," "Save as draft," "Learn more" alongside a "Sign up" primary.

Visual cues:

- Outlined, not filled.
- Same brand color as primary, on the border and text.
- Same size as primary (so they read as a peer, not an afterthought).

## Use tertiary buttons for the least important actions

Tertiary buttons disappear into text-link styling. Good for:

- Multiple secondary actions in a row (a list of "Remove" buttons next to each row item).
- Destructive actions you want to *de-emphasize* (so users don't trigger them accidentally).
- "Cancel" in a confirmation dialog where the destructive action is also subdued.

The tertiary style's low prominence is a feature, not a bug. It says "this is here if you need it; don't worry about it otherwise."

## Try to avoid disabled buttons

Disabled buttons can't be pressed. Designers reach for them to prevent invalid actions (e.g., disabling Submit until all fields are filled). But disabled buttons cause real problems:

- **Users get stuck.** A disabled button that doesn't tell you why is frustrating.
- **Low contrast.** Disabled styling is intentionally faded — often falls below accessibility thresholds.
- **Not keyboard-accessible.** Keyboard users can't focus them, so screen-reader users may not know they exist.

### Better alternatives

#### 1. Enable the button and validate on submit

Let the user press it. If something is missing or invalid, surface clear errors next to the offending fields. This works because:

- The user gets immediate, specific feedback.
- They never wonder "why can't I press this."
- Easier to implement than per-field validation.

#### 2. Remove the unavailable action entirely

If an action isn't applicable, don't show a disabled version of it. Show *only* what's available, and explain why others aren't (e.g., "Private account — request to follow" replaces a disabled Message button).

#### 3. Add a lock icon to "premium" buttons

For features that require payment/upgrade, instead of disabling, show a fully-styled button with a lock icon. Communicates clearly: "this is here, but locked." On press, explain how to unlock.

### When you must use a disabled button

If product constraints make alternatives impossible:

- **Place an explanation nearby:** "You need to fill out all fields to register."
- **Add a tooltip** on hover/focus: "Complete all required fields to continue."
- **Make the button keyboard-accessible** so screen-reader users know it exists.
- **Verify the disabled-state contrast** still meets the 3:1 UI element threshold.

## Left align buttons

Order buttons from left to right, **most important first**. The primary is leftmost.

### Why

- English reads left-to-right, top-to-bottom (F-pattern). The eye lands on the left edge first.
- **Right-aligned buttons can be missed** on large screens (the eye doesn't reach them) and by users of screen magnifiers (who see only a portion of the screen).
- Placing the most-used action first decreases interaction cost for the majority case.

### Multi-step forms

Stay consistent: keep the primary "Next" button left-aligned, the same place across every step. Place "Back" at the **top left** of the form (familiar position from mobile, browsers, and breadcrumbs). This:

- Avoids users hitting Back instead of Next at the bottom.
- Doesn't require users to scroll back up to navigate backward.
- Reduces the chance of mistakenly losing form data.

### Exceptions

- **Single-field forms** like search or newsletter subscription — attach the primary button to the *right* of the field. The visual connection clarifies what the button submits.
- **Some platforms** (iOS) use right-aligned primary in modals. Follow platform conventions when on a specific platform.

## Ensure button text describes the action

The simplest rule that works: **verb + noun.** "Save post." "Delete account." "Edit article."

Why descriptive button text matters:

- Users often look at buttons first (high prominence). Descriptive text lets them act without reading body copy.
- Screen-reader users skip directly to buttons and links — labels need to make sense in isolation.

### Examples

| Vague | Descriptive |
|-------|-------------|
| OK    | Save post |
| Submit | Send message |
| Cancel | (acceptable — universally understood) |
| Continue | Continue to payment |
| Yes / No | Save post / Discard post |

"Cancel" is OK as-is; it's universally understood. "OK," "Submit," and "Yes/No" usually aren't enough.

## Ensure buttons have a sufficient target size

### Recommended minimums

- **48pt × 48pt** — recommended (slightly larger than WCAG's 44pt and aligns with 8pt grid).
- **Frequently-used buttons** — go bigger.
- **Separate buttons by ≥8pt** — prevents fat-finger mis-presses.

### Extending target areas

For small visual elements (link in a list, icon button), make the **clickable area** larger than the visual:

- Pad the click target with extra invisible space.
- Indicate the target on hover/focus with a subtle background — users see the larger zone.

This reduces interaction cost (users don't aim precisely) and accessibility risk (users with motor impairments succeed more often).

## Balance icon and text pairs

When icons and text appear together, they should feel like equal partners, not one dominating.

### Three levers

- **Weight** — match the icon's stroke weight to the text's weight. Bold text → bolder icon.
- **Size** — match icon height to text x-height roughly.
- **Contrast** — if you can't match weight and size, balance with contrast. A larger/heavier icon at a slightly weaker color pairs with smaller/lighter text at a stronger color.

For nav bar icon-text pairs, common pattern:

- Icon: Stroke strong color, slightly larger.
- Label: Text weak color, smaller.

The contrast difference balances the size/weight difference.

## Add friction to destructive actions

Destructive actions (delete, archive, unsubscribe) cause irreversible or expensive harm. Add friction proportional to severity to prevent accidents.

### Levels of friction

#### Initial friction
*Make the action less prominent so it isn't pressed casually.*

- Use a tertiary button (looks like a quiet text link).
- Place it away from primary actions.
- Don't color it red — red increases prominence, which is the opposite of what you want for everyday destructive actions like "Remove user from list."

#### Light friction
*Confirmation dialog without escalation.*

> Delete message?
> Are you sure you want to delete this message?
> [Delete message] [Cancel]

#### Moderate friction
*Confirmation dialog with red highlight signaling severity.*

> Delete article?
> Are you sure you want to delete this article? You won't be able to recover it.
> [Delete article (red)] [Cancel]

#### Heavy friction
*Confirmation dialog with a checkbox the user must tick to enable the destructive action.*

> Delete account?
> Are you sure? Your profile and all your articles will be permanently deleted and you won't be able to recover them.
> ☐ I confirm I want to delete my account
> [Delete account (red, disabled until checked)] [Cancel]

### Allow undo

Even with friction, mistakes happen. Where possible, allow users to undo destructive actions:

> Message deleted. [Restore message]

A toast with an undo CTA, lasting 5–10 seconds, removes most of the risk that friction couldn't.

### Pick the right level

| Severity                        | Friction level |
|---------------------------------|---------------|
| Minor (remove from list, archive) | Initial       |
| Moderate (delete message)        | Light         |
| Severe (delete article, content) | Moderate      |
| Catastrophic (delete account)    | Heavy + undo  |

## Common button mistakes

When auditing buttons, look for:

1. **Two buttons styled as primary.**
2. **Light grey secondary** that looks disabled.
3. **Insufficient contrast** on borders or text.
4. **Inconsistent shapes** between primary and secondary — they should be the same shape.
5. **Tertiary not underlined** — colorblind users can't identify it.
6. **Disabled buttons that don't explain why.**
7. **Right-aligned primary** that gets missed.
8. **Vague button text** ("OK," "Submit").
9. **Touch target < 48pt.**
10. **Insufficient gap (<8pt) between adjacent buttons.**
11. **Destructive actions with too little or too much friction** for their severity.
12. **Icon and text imbalanced** — one dominates.
13. **Non-interactive elements styled like buttons** — confuses users.
14. **Buttons without visible focus state** — keyboard users can't see where they are.

## Chapter summary

- Define 3 button weights: primary (filled), secondary (outlined), tertiary (text + underline).
- One primary action per screen.
- Avoid disabled buttons. Enable and validate on submit, or remove unavailable actions.
- Left-align buttons, most important first.
- Verb + noun for button text. Make it descriptive out of context.
- 48pt × 48pt minimum touch target. Separate by ≥8pt.
- Balance icons and text via weight, size, and contrast.
- Add friction to destructive actions proportional to severity. Allow undo.
