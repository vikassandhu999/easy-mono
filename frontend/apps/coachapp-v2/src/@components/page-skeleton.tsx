import {Skeleton} from '@heroui/react';

// Placeholder for a detail/settings page's first load. Top-aligned blocks that
// approximate a heading + cards, so the real content swaps in without the
// centered-Spinner -> full-layout jump. Pair with the page's real Page.Header
// (header parity) and render this inside Page.Content.
export function PageSkeleton() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-4"
    >
      <Skeleton className="h-6 w-1/3 rounded" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
