import {createFileRoute} from '@tanstack/react-router';

import LibraryPage from '@/features/library/LibraryPage';

export const Route = createFileRoute('/_authed/library/')({
  component: LibraryPage,
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search.filter === 'string' ? search.filter : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
    sort: typeof search.sort === 'string' ? search.sort : undefined,
  }),
});
