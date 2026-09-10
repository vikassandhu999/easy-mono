import type {FormTemplateIndex} from './schema';

export type CursorPage<Item> = Omit<FormTemplateIndex, 'data'> & {data: Item[]};

export const cursorPagination = {
  initialPageParam: 'start',
  getNextPageParam: (page: Pick<FormTemplateIndex, 'next_cursor'>) => page.next_cursor,
  staleTime: 30_000,
};
