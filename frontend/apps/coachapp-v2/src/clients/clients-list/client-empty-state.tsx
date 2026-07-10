import {Button} from '@heroui/react';
import {SearchX, UserPlus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

export default function ClientEmptyState({
  hasFilter,
  onClearFilters,
}: {
  hasFilter: boolean;
  onClearFilters: () => void;
}) {
  const navigate = useNavigate();
  const Icon = hasFilter ? SearchX : UserPlus;

  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface-secondary text-muted">
        <Icon size={26} />
      </span>
      <h2 className="font-grotesk text-lg font-bold text-foreground">
        {hasFilter ? 'No clients match this view' : 'No one here yet'}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted">
        {hasFilter
          ? 'Try a different search or status filter to find the right client.'
          : 'Invite your first client to start building your roster.'}
      </p>
      <Button
        className="mt-5 min-h-11 px-4 font-semibold"
        onPress={hasFilter ? onClearFilters : () => navigate(ROUTES.INVITE_CLIENT)}
        variant={hasFilter ? 'secondary' : 'primary'}
      >
        {hasFilter ? 'Clear filters' : 'Invite client'}
      </Button>
    </div>
  );
}
