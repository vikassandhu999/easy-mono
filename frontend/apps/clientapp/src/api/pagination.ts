import type {ClientFormAssignmentIndex} from './schema';

export const cursorPagination = {
  initialPageParam: 'start',
  getNextPageParam: (page: Pick<ClientFormAssignmentIndex, 'next_cursor'>) => page.next_cursor,
  staleTime: 30_000,
};

export type CursorPage<Item> = Omit<ClientFormAssignmentIndex, 'data'> & {data: Item[]};

export function latestPageCount(pages: ReadonlyArray<Pick<ClientFormAssignmentIndex, 'count'>>) {
  return pages.at(-1)?.count ?? null;
}
