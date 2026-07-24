/**
 * The redesign draws many controls as plain `div` / `span` / bare `button`
 * elements, so they compute the browser's default typography while the app's
 * HeroUI equivalents impose their own. These recipes put the UA defaults back
 * so the two compare equal under design-handoff/scripts/style-diff.mjs —
 * invisible on an icon-only node, but the script measures every property.
 */

/** A design node that is a plain `div` / `span`, not a control. */
export const AS_TEXT = 'text-metric font-normal leading-[normal]';

/** A design node with no `gap` of its own — HeroUI controls ship one. */
export const NO_GAP = '[row-gap:normal] [column-gap:normal]';

/** An icon-only design `button` with no font rules of its own. */
export const AS_ICON_BUTTON =
  '[font-family:Arial] [font-size:13.3333px] font-normal leading-[normal] px-1.5 py-px [row-gap:normal] [column-gap:normal]';
