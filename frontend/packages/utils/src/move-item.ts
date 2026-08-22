/**
 * Move one element of a list to another index, returning a new list. An
 * out-of-range `from` or `to` is a no-op, so a caller may compute either from
 * a drag offset without bounds-checking first.
 *
 * Three copies of this used to live in the apps: `moveId` for the two plan
 * builders and a swap-shaped `moveInList` in the check-in builder. Moving an
 * element to an adjacent index and swapping it with its neighbour are the same
 * operation, so the swap version was this function with a narrower signature.
 */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const moved = items[from];
  if (moved === undefined || to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
