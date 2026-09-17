import type {FormTemplateIndex} from './schema';

export type CursorPage<Item> = Omit<FormTemplateIndex, 'data' | 'count'> & {data: Item[]; count: number | null};

export const cursorPagination = {
  initialPageParam: 'start',
  getNextPageParam: (page: Pick<FormTemplateIndex, 'next_cursor'>) => page.next_cursor,
  staleTime: 30_000,
};

export function latestPageCount(pages: ReadonlyArray<{count: number | null}>): number | null {
  for (let index = pages.length - 1; index >= 0; index -= 1) {
    const count = pages[index]?.count;
    if (count !== null && count !== undefined) {
      return count;
    }
  }
  return null;
}
