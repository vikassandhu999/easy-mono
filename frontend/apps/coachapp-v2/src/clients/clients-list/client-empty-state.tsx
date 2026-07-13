import {Button, Typography} from '@heroui/react';

import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';

export default function ClientEmptyState({
  hasFilter,
  onClearFilters,
}: {
  hasFilter: boolean;
  onClearFilters: () => void;
}) {
  if (!hasFilter) {
    return (
      <ListEmptyState
        createLabel="Invite Client"
        createRoute={ROUTES.INVITE_CLIENT}
        emptyDescription="Invite your first client to get started."
        hasFilter={false}
        nounPlural="clients"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Typography type="h5">No clients found</Typography>
      <Typography
        color="muted"
        type="body-xs"
      >
        Try adjusting your search or filter to find what you're looking for.
      </Typography>
      <Button
        className="mt-3 min-h-11"
        onPress={onClearFilters}
        size="sm"
        variant="secondary"
      >
        Clear filters
      </Button>
    </div>
  );
}
