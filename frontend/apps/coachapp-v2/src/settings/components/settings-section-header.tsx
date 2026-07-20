/**
 * The header that opens each settings tab panel. The redesign shows two
 * treatments of the same thing: a title + one-line description on desktop, and
 * a compact uppercase eyebrow on mobile (both visible in the ST refs), so this
 * renders the pair responsively instead of each tab hand-rolling it.
 */
import {Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import SectionHeading from '@/@components/section-heading';

export function SettingsSectionHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 md:items-end">
      <div className="min-w-0">
        <SectionHeading
          className="mb-0 md:hidden"
          title={title}
        />
        <Typography
          className="hidden font-grotesk md:block"
          type="h4"
          weight="semibold"
        >
          {title}
        </Typography>
        <Typography
          className="mt-0.5 hidden md:block"
          color="muted"
          type="body-sm"
        >
          {description}
        </Typography>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
