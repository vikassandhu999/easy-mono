import {cn} from '@heroui/styles';
import type {ReactNode} from 'react';

// Two tightly-paired short fields side by side on >=sm (first/last name,
// start/end date, macro pairs). One responsive token instead of ad-hoc grids.
// Pairs the redesign keeps side-by-side even on mobile pass `grid-cols-2`.

export function FieldRow({children, className}: {children: ReactNode; className?: string}) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}
