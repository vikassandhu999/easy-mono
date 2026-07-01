import type {ReactNode} from 'react';

// Two tightly-paired short fields side by side on >=sm (first/last name,
// start/end date, macro pairs). One responsive token instead of ad-hoc grids.

export function FieldRow({children}: {children: ReactNode}) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
