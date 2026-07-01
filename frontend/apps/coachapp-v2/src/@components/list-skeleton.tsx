import {Skeleton} from '@heroui/react';
import {cn} from '@heroui/styles';

// Placeholder rows shown while a browse list makes its first load. Mirrors the
// browse row layout (leading media + two text lines + trailing chip) so the real
// rows swap in without the list shifting. `avatar` renders a round leading block
// (client lists); the default is the rounded-square media block every other list
// uses.
const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'] as const;

type ListSkeletonProps = {
  avatar?: boolean;
  rows?: number;
};

export function ListSkeleton({avatar = false, rows = 6}: ListSkeletonProps) {
  return (
    <div
      aria-hidden
      className="flex flex-col"
    >
      {ROW_KEYS.slice(0, rows).map((key) => (
        <div
          className="flex items-center gap-3 px-4 py-3 sm:px-8"
          key={key}
        >
          <Skeleton className={cn('size-10 shrink-0', avatar ? 'rounded-full' : 'rounded-lg')} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5 rounded" />
            <Skeleton className="h-3 w-3/5 rounded" />
          </div>
          <Skeleton className="hidden h-5 w-14 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
