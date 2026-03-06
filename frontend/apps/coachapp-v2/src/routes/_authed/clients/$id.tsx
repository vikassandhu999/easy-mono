import {createFileRoute} from '@tanstack/react-router';

import ClientViewPage from '@/features/clients/ClientViewPage';

export const Route = createFileRoute('/_authed/clients/$id')({
  component: ClientViewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
});
