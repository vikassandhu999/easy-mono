# Chapter 6: Copywriting

How to write interface text that communicates clearly. Read this when writing button labels, form labels, error messages, headings, link text, microcopy, or any UI string.

## Be concise

Every word competes for attention. More words ≠ more communication — people scan, they don't read. Aim to **say more with fewer words**.

If a word can be removed without losing information or hurting usability, remove it.

### How to be concise

- **Cut filler words:** "actually," "basically," "really," "truthfully," "quite."
- **Cut articles** when they don't add meaning: "a," "an," "the." (Use judgment — "the" can clarify; "the user" reads better than "user" in some contexts.)
- **Cut intro phrases:** "would you like to," "in order to," "when it comes to," "are you sure," "there are," "it is."
- **Use shorter words** when they convey the same meaning: "use" not "utilize," "help" not "facilitate," "now" not "at this time."
- **Keep sentences under 20 words.** Long sentences with multiple commas lose the reader.

### Before / after examples

| Before | After |
|--------|-------|
| Would you like to save the article? Don't worry, you'll still be able to publish it at a later date. You can always find saved articles in your library. | Save article? Save the article to your library to publish later. |
| In order to subscribe to our newsletter, please enter your email address below. | Subscribe to the newsletter |
| Are you sure you want to delete this message? | Delete message? |

## Use sentence case

**Sentence case** = capitalize the first word and proper nouns only. *"This is sentence case."*

**Title case** = capitalize most words. *"This Is Title Case."*

Use sentence case for almost everything in UI:

- Button labels.
- Form labels.
- Headings.
- Menu items.
- Dialog titles.
- Notifications.

Why:

- Easier to read — capitals interrupt scanning.
- Less cognitively expensive — your brain expects lowercase letters mid-sentence.
- Title case has complex rules that aren't universally standardized — easy to get wrong.

Title case still works for proper book/article titles in editorial content, but UI is not editorial.

## Use plain and simple language

Many people have trouble reading. Some have cognitive impairments or learning disabilities. Many are non-native English readers.

### Tips

- **Imagine talking to a 6th-grade student** unfamiliar with the topic.
- **Avoid jargon** — specialized terms only your industry uses.
- **Avoid slang** — informal terms specific to a culture or group.
- **Choose short, simple words** over complex ones.
- **Use contractions** ("you're," "we'll," "it's") — they sound more natural and conversational.

### Example

| Complex | Simple |
|---------|--------|
| Custom domains are the bee's knees for brands | Strengthen your brand with a custom domain |
| Look slick and help your customers locate you online by executing a custom domain | Look professional and help your customers find you online by adding a custom domain |
| Let's roll | Add domain |
| More deets | Learn more |

## Front-load text

Put the most important information at the start of headings, lists, and links. People scan left-to-right; they grab the first words and decide whether to keep reading.

| Not front-loaded | Front-loaded |
|------------------|--------------|
| Subscribe to my newsletter to learn UI design | Learn UI design by subscribing to my newsletter |
| Sign up today for 30% off | 30% off if you sign up today |
| You should read these 5 UI design eBooks | 5 UI design eBooks you should read |

## Use the inverted pyramid

For longer text blocks, structure as an inverted pyramid:

1. **Most important info first** — the headline/lead. Many readers stop here. They should still get the main point.
2. **Supporting info** in the middle.
3. **Background details** last (or hidden behind a "Learn more" link).

This is journalism's structure. It works in UI for the same reason: people skim. The reader who quits after one sentence still gets what matters.

## Limit the use of abbreviations and acronyms

Abbreviations save space but make people think — increases cognitive load.

- "Dept." → "department."
- "ETA" → "estimated time of arrival."
- "COB" → "close of business."

If you must use an abbreviation, **explain it on first use:** "ETA (estimated time of arrival)."

In space-constrained labels (table headers, narrow columns), abbreviations may be unavoidable — pair with a tooltip or explain elsewhere.

## Limit the use of UPPERCASE

Uppercase is loud and harder to read. When you read, you recognize words by their *shape*. Lowercase letters have ascenders and descenders that vary the silhouette. Uppercase forces all letters into the same rectangle — your brain has to read letter-by-letter.

```
SHAPE   →  uniform rectangle
Shape   →  varied silhouette
```

Avoid uppercase for:

- Body text.
- Headings.
- Buttons (use sentence case).
- Most UI labels.

**When uppercase is OK:** small bold labels with increased letter spacing, used as accents (e.g., section eyebrow labels, category tags). At 14px bold with +2px letter spacing, uppercase becomes a deliberate visual style — quiet, not shouty.

## Break up content using descriptive headings and bullets

Long blocks of paragraph text are intimidating. Break them up.

- **Use descriptive headings** as scan anchors.
- **Use bullets** for lists of similar items.
- **Use short paragraphs** (2–4 sentences max).

### Make headings descriptive

A heading like "Location" is vague. "Beautiful waterfront location" is specific and informative. Descriptive headings:

- Communicate the key point even if no one reads further.
- Make sense out of context — important for screen-reader users skimming heading lists.

| Vague | Descriptive |
|-------|-------------|
| Location | Beautiful waterfront location |
| Check-in | Fast check-in experience |
| Parking | Free secure parking |

## Avoid using "my" on form labels

A form labeled "my email address" is ambiguous — *whose* email? The interface's? The user's? Imagine the interface as a person talking to the user. Then "my email" is the *interface's* email.

"Your email" is clearer. But often unnecessary altogether — just **"Email"** is shortest and clearest. Avoid both "my" and "your" if possible.

If you do use one, be consistent — never mix.

## Use vocabulary consistently

Use the same word for the same concept everywhere. Inconsistent vocabulary forces users to figure out whether two terms mean the same thing.

Common inconsistency traps:

- Cart vs bag
- Sign up vs register
- Log in vs sign in
- Delete vs remove
- Subscribe vs join
- Publish vs post

Pick one term per concept; document it; use it everywhere.

## Use numerals for numbers

Use numerals (245), not words (two hundred and forty-five).

- **Easier to scan** — different shape from letters.
- **Faster to read.**
- **Expected** — when seeking a number, people expect digits.
- **More concise.**

Format consistently: use commas for thousands (1,000 not 1000). For very large numbers, simplify with letters (1 billion, 1B, not 1,000,000,000) — saves users from counting digits.

## Avoid full stops if possible

Most UI text is short — fragments, labels, headings. Full stops add noise without value.

**Rules of thumb:**

- **Use full stops** when text forms a complete sentence with commas.
- **Skip full stops** for short labels, single-line items, list bullets without commas.
- **Be consistent** within similar elements — don't have full stops on some bullets and not others.

## Ensure text length is similar across similar interface elements

If you have a row of three feature cards, write headings of similar length. Wildly varying lengths break the visual rhythm and look unbalanced.

Same goes for descriptions. If one card has a 5-word description and another has 50 words, the row looks lopsided.

## Ensure text links describe their destination

Link text should make sense out of context. Screen-reader users often jump straight to lists of links — they need to know where each one goes.

| Bad link text | Good link text |
|---------------|----------------|
| Click here | 5 UI design eBooks |
| Learn more (multiple times on one page, all linking to different pages) | "Email marketing features," "How affiliates work" — distinct, descriptive |
| More info | Read about our refund policy |

Avoid "click here" altogether:

- Inaccessible — not descriptive when read out of context.
- "Click" is wrong for users on mobile, keyboard, or voice.
- It's redundant — links *afford* clicking; you don't need to say so.

If multiple "Learn more" links are on a page, replace each with a descriptive label, or turn the heading itself into the link.

## Write clear error messages

Error messages should: tell the user a problem occurred, why, and how to fix it.

### Tips

- **Don't blame the user.** Be positive and helpful, not accusatory.
- **Be concise.** Avoid unnecessary words like "please," "sorry," "oops."
- **Don't talk like a robot.** Conversational and clear, not technical.
- **Make headings and buttons descriptive** so users don't have to read body text to act.

### Examples

| Unclear | Clear |
|---------|-------|
| Oops, something went wrong! Your payment wasn't successful as an error occurred. [Ok] | Payment failed. Update your payment details and try again. [Update payment details] |
| Error 404: The resource you requested could not be located on the server. | We can't find that page. [Go to homepage] |
| Invalid input. | Enter a valid email address (like name@example.com) |

## Common copywriting mistakes

When auditing UI copy, look for:

1. **Filler words and intro phrases.**
2. **Title case** (use sentence case).
3. **Jargon and slang.**
4. **Unfront-loaded headings.**
5. **Vague headings** (replace with descriptive).
6. **"My" on form labels.**
7. **Inconsistent vocabulary** (cart vs bag).
8. **Numbers spelled out** (use numerals).
9. **Inconsistent full stops** in similar elements.
10. **Generic link text** ("click here," "learn more").
11. **Blameful error messages** ("you entered an invalid value").
12. **UPPERCASE BODY TEXT.**
13. **Abbreviations without explanation.**
14. **Long sentences** (>20 words).

## Chapter summary

- Be concise. Cut filler, intro phrases, and unnecessary articles.
- Use sentence case (not Title Case).
- Plain, conversational language at a 6th-grade reading level.
- Front-load text — important info first.
- Use the inverted pyramid for longer blocks.
- Limit abbreviations, acronyms, and UPPERCASE.
- Break up content with descriptive headings and bullets.
- Avoid "my" on form labels.
- Use vocabulary consistently.
- Use numerals for numbers.
- Avoid full stops in short labels.
- Make link and button text descriptive.
- Write error messages that explain the problem and how to fix it.
