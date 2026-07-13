import { Button } from '@heroui/react';
import { SearchX, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/@config/routes';

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
    <div className="mt-3.5 flex flex-col items-center justify-center rounded-4xl [border-width:1.5px]! border-dashed border-border bg-surface px-5 py-10 text-center sm:m-5 sm:min-h-72 sm:rounded-[18px] sm:px-6 sm:py-14">
      <span className="mb-4 hidden size-14 place-items-center rounded-2xl bg-surface-secondary text-field-placeholder sm:grid">
        <Icon
          size={26}
          strokeWidth={1.8}
        />
      </span>
      <h2 className="font-grotesk text-base font-bold text-foreground sm:text-lg">
        {hasFilter ? 'No clients match this view' : 'No one here yet'}
      </h2>
      <p className="mt-1.5 mb-0 max-w-70 text-[12.5px] text-muted sm:mt-2 sm:mb-[18px] sm:text-[13.5px]">
        {hasFilter
          ? 'Try a different search or status filter to find the right client.'
          : 'Invite your first client to start building your roster.'}
      </p>
      <Button
        className={`hidden min-h-11 rounded-[11px]! px-4 py-2.25! text-[13px] font-semibold sm:flex ${hasFilter ? 'border-[1.5px]! border-separator bg-surface text-foreground' : 'bg-accent text-accent-foreground'
          }`}
        onPress={hasFilter ? onClearFilters : () => navigate(ROUTES.INVITE_CLIENT)}
        variant={hasFilter ? 'secondary' : 'primary'}
      >
        {hasFilter ? 'Clear filters' : 'Invite client'}
      </Button>
    </div>
  );
}
