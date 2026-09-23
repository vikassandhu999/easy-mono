import type {ChatMessageHistory} from './schema';

export const cursorPagination = {
  initialPageParam: 'start',
  getNextPageParam: (page: Pick<ChatMessageHistory, 'next_cursor'>) => page.next_cursor,
  staleTime: 30_000,
};

export type CursorPage<Item> = Pick<ChatMessageHistory, 'count' | 'next_cursor'> & {data: Item[]};

export function latestPageCount(pages: ReadonlyArray<Pick<ChatMessageHistory, 'count'>>) {
  return pages.at(-1)?.count ?? null;
}
