import {Typography} from '@heroui/react';

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
