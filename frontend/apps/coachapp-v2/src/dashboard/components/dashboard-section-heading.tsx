import {Typography} from '@heroui/react';
import type {ReactNode} from 'react';

/**
 * The dashboard's section caption: title-case Grotesk with an optional muted
 * count beside it and an optional trailing slot (`Sorted by priority`, `Inbox`).
 *
 * Deliberately not `@/@components/section-heading` — that one is the uppercase
 * builder/detail eyebrow, and the DB reference sets these headings title-case at
 * both widths.
 */
export function DashboardSectionHeading({aside, count, title}: {aside?: ReactNode; count?: ReactNode; title: string}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <Typography
          className="font-grotesk"
          type="h5"
        >
          {title}
        </Typography>
        {count === null || count === undefined ? null : (
          <Typography
            className="shrink-0 font-medium"
            color="muted"
            type="body-sm"
          >
            {count}
          </Typography>
        )}
      </div>
      {aside}
    </div>
  );
}
