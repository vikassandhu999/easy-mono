/**
 * Class recipes shared by the two plan builders (badges NB and TB).
 *
 * They started in `nutrition-plans/plan-builder/ui.ts` and the training builder
 * imported them across the feature boundary. Both builders are `builder-kit`
 * clients, so this is where they belong.
 *
 * The generic "put the browser default back" recipes live in
 * `@/@components/ua-defaults` — those aren't builder-specific.
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
 * Every use is on a `Button`, so the height comes from the control-height block.
 */
export const INLINE_LINK =
  'rounded-none bg-transparent px-0 font-semibold leading-[normal] text-accent [row-gap:normal] [column-gap:normal]';
