# Chapter 2: Less is more

Practical techniques to simplify interfaces by removing unnecessary detail. Read this when an interface feels busy, cluttered, or hard to navigate, or when starting a new design from a blank canvas.

## Remove unnecessary information

Every element competes with every other element. Unnecessary information is a distraction that increases cognitive load. Each element should earn its place.

Quick wins:

- **Remove repeated elements.** A list of "UI Design Course - Chapter 1," "UI Design Course - Chapter 2," etc. simplifies to a single subheading "UI Design Course" with "Chapter 1," "Chapter 2," etc. underneath.
- **Avoid unneeded words and intro phrases.** "Would you like to" / "in order to" / "are you sure you want to" usually add no information.
- **Reveal less important info gradually** (progressive disclosure — see below).

## Remove unnecessary styles

Unnecessary styles are decorative-only — they don't convey information. Avoid:

- Lines, colors, backgrounds, animations that lack purpose.
- Heading text colored *and* underlined when it isn't a link.
- Decorative icons placed where they could be mistaken for buttons.
- Icons that are all very prominent and compete for attention.

Aesthetics matter, but they shouldn't hinder usability. Test by removing the style and asking: did anything important get lost?

### Style trends fade

It's tempting to use the latest trend (glassmorphism, neumorphism, etc.). But:

- Trends change; designs that lean heavily on them age fast.
- Some popular styles fundamentally fight usability — glassmorphism and neumorphism, for instance, struggle to achieve sufficient contrast and hierarchy.

Stick with minimal, content-forward styles for longevity. Experiment with visual styles only where they don't compromise usability or accessibility.

## Not all links need to be underlined

The default (and safest) link treatment is **colored + underlined**. But within blocks like navigation menus, footers, lists of cards — places where the *context* makes interactivity obvious — underlines can be removed for cleanliness.

**Rule of thumb:**

- **Underline links inside body text**, where they sit beside non-link text.
- **Don't necessarily underline links in clearly-interactive contexts**: nav menus, lists of clearly-clickable cards, footer link lists.

When unsure, underline.

## Use progressive disclosure

Show only what someone needs *right now* to complete the current task. Make additional detail accessible but not in the way.

Examples:

- A long-form benefit description collapses to a short summary with a "Benefits of a custom domain" link that expands the rest.
- A "Receive updates via text message" checkbox reveals the mobile-number field only when ticked. Avoids an optional field for everyone.
- An accordion of FAQs — questions visible, answers expand on demand.

Progressive disclosure adds an interaction step but significantly reduces cognitive load and speeds decision-making. Worth the trade in most cases.

## Don't confuse minimalism with simplicity

**Minimal ≠ simple.** Minimal interfaces have fewer elements; simple interfaces are easy to understand and use. They often align, but not always.

Symptoms of over-minimization:

- Pages, navigation, or controls without labels.
- Selected states so subtle no one notices.
- Important actions hidden behind interactive menus.
- Insufficient contrast on icons.

Simplification is *not* just removal — it's removal of the unnecessary while preserving (and clarifying) the necessary. When in doubt, label the thing. Add the icon. Make the selected state obvious.

## Make sure important content is visible

People don't use what they can't see. Hiding things behind menus, hover-reveals, or fold-down panels is a tempting cleanliness trick — but it's risky.

Guidelines:

- **If there's space, keep important actions visible.** Don't tuck primary nav links behind a hamburger on desktop unless space genuinely demands it.
- **For carousels and horizontal scrollers, expose the edge** of the next item so people know there's more.
- **For collapsed content, signal its existence** with a clear cue ("3 more").

If you do need to hide content for space reasons, ensure the affordance to reveal it is unmistakable.

## Design for the smallest screen first

Start mobile, then expand. Reasons:

- The constraint forces prioritization. Only the essentials fit.
- The result is simpler on larger screens too — you didn't develop the habit of filling every pixel.
- Most products are used across screen sizes; mobile is usually the lower bound and the highest-traffic surface.

> Analogy: living in a small home forces you to keep only the essentials. Living in a large home tempts you to fill every corner.

## Reduce choice to speed up decision making

Hick's Law: decision time grows with the number and complexity of choices.

Four ways to reduce choice:

### 1. Remove choices

The most direct method. For every option, ask "does this earn its place?" In forms: do you need first name and company, or just email? Removing two fields can dramatically increase completion rates.

### 2. Group or categorise choices

If you can't remove options, organize them. A 30-item navigation menu is overwhelming; the same 30 items grouped under 5 categories is scannable.

### 3. Break choices into multiple steps

A long form of 30 questions is intimidating; the same 30 questions across 6 steps of 5 related questions feels manageable. Each step is a small commitment.

### 4. Recommend choices

When you must offer many options, highlight a default or recommended one. Pricing tables that mark a "Most popular" plan use this pattern. People satisfice — they often pick the recommended one rather than evaluating all of them.

## Common simplification patterns

When given a busy interface, look for these issues in order:

1. **Repeated text or visual elements** — collapse them.
2. **Decorative styles that don't convey information** — remove them.
3. **Multiple competing visual hierarchies** — pick one and downgrade the rest.
4. **Long forms** — break up, remove fields, or use opt-ins.
5. **Long pages of dense content** — apply progressive disclosure or chunk with descriptive headings.
6. **Long option lists** — group, recommend, or break into steps.
7. **Icons without labels** — add labels (unless the icon is universally recognized: ×, ←, ⚙, ⌕, ♥).

## Chapter summary

- Remove unnecessary information and styles to reduce cognitive load.
- Reveal information gradually rather than all at once. This speeds decision-making.
- Minimal ≠ simple. Don't strip critical info just for aesthetics.
- Important content should be visible or easily discoverable.
- Reduce choice by removing, grouping, breaking into steps, or recommending defaults.
