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
 * token.
 *
 * The colour used to be written as an arbitrary `color:` property, because a
 * custom size and a colour both lived in `text-*` and tw-merge dropped one
 * (RM-134). Sizes are `type-*` now, so there is no collision and `text-accent` is
 * correct — and overridable, which the arbitrary property was not.
 *
 * Every use is on a `Button`, so the height came from the control-height block
 * all along; the `min-h-11 … sm:min-h-0` pair it used to carry was already dead.
 */
export const INLINE_LINK =
  'rounded-none bg-transparent px-0 font-semibold leading-[normal] text-accent [row-gap:normal] [column-gap:normal]';
