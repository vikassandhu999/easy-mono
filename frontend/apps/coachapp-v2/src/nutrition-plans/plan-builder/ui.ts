/**
 * Screen-local class recipes for the plan builder (badge NB).
 * Style fidelity: design-handoff/manifests/NB.json.
 *
 * The generic "put the browser default back" recipes this screen also needs
 * live in `@/@components/ua-defaults` — they aren't NB-specific.
 */

/** `.ptag` — the slot tag and both meal chips start here and tint from there. */
export const TAG =
  'inline-flex min-h-0 items-center whitespace-nowrap rounded-chip border border-border bg-background px-2 py-1 type-eyebrow font-medium leading-[normal] [box-shadow:none]';

/**
 * `+ Add …` affordances the design draws as accent spans. Callers add the size
 * token: pairing a custom `text-*` size with a `text-*` colour in one HeroUI
 * className makes tw-merge drop one of them, so the colour is an arbitrary
 * property here and the size stays a plain utility.
 */
export const INLINE_LINK =
  'min-h-11 rounded-none bg-transparent px-0 font-semibold leading-[normal] [color:var(--color-accent)] [row-gap:normal] [column-gap:normal] sm:min-h-0';
