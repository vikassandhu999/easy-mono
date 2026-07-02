import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';

// Thin preset over the shared ListEmptyState (was a byte-for-byte copy of it).
export default function ClientEmptyState({hasFilter}: {hasFilter: boolean}) {
  return (
    <ListEmptyState
      createLabel="Invite Client"
      createRoute={ROUTES.INVITE_CLIENT}
      emptyDescription="Invite your first client to get started."
      filterDescription="Try adjusting your search or filter to find what you're looking for."
      hasFilter={hasFilter}
      nounPlural="clients"
    />
  );
}
