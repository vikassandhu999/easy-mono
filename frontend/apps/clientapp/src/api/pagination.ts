import type {ClientFormAssignmentIndex} from './schema';

export const cursorPagination = {
  initialPageParam: 'start',
  getNextPageParam: (page: Pick<ClientFormAssignmentIndex, 'next_cursor'>) => page.next_cursor,
  staleTime: 30_000,
};
