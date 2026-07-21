import {Typography} from '@heroui/react';

/**
 * A read-surface section (Nutrition / Ingredients / Notes...): mobile runs
 * sections together with hairline separators (FD/RD mobile refs); desktop's
 * card layering already separates them.
 */
export const DETAIL_SECTION_CLASS = 'mt-8 border-t border-separator pt-8 sm:border-0 sm:pt-0';

// The section caption on read surfaces (food/recipe/exercise detail): a normal
// dark h6 with an optional muted "· qualifier" suffix, e.g. "Nutrition · per 100 g".
//
// Deliberately NOT `@components/section-heading`, which is the small muted
// uppercase eyebrow used in builder/summary chrome. Same job, different register —
// they share a name by accident, not a treatment.

export function DetailSectionHeading({detail, title}: {detail?: string; title: string}) {
  return (
    <div className="flex items-baseline gap-2">
      <Typography type="h6">{title}</Typography>
      {detail && (
        <Typography
          color="muted"
          type="body-sm"
        >
          · {detail}
        </Typography>
      )}
    </div>
  );
}
