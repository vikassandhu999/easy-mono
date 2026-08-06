import {Button, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ArrowRight} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useWorkbenchCountsQuery, type WorkbenchCounts} from '@/api/workbench';
import {DashboardSectionHeading} from '@/dashboard/components/dashboard-section-heading';

/**
 * Count cards deep-linking into the workbench queues — the dashboard's summary
 * of the rail, replacing the old client-row priority queue so triage lives on
 * ONE surface (spec §9: two surfaces at 80% overlap teach the coach to trust
 * neither).
 */

type CardDef = {
  countKey: keyof WorkbenchCounts;
  label: string;
  view: string;
};

const CARDS: CardDef[] = [
  {countKey: 'check_ins', label: 'Check-ins to review', view: 'check-ins'},
  {countKey: 'replies', label: 'Waiting for a reply', view: 'replies'},
  {countKey: 'programming', label: 'Need programming', view: 'programming'},
  {countKey: 'expiring', label: 'Expiring soon', view: 'expiring'},
  {countKey: 'quiet', label: 'Gone quiet', view: 'quiet'},
  {countKey: 'new_clients', label: 'New clients', view: 'new'},
];

function CountCard({card, count, isError}: {card: CardDef; count: number | undefined; isError: boolean}) {
  const navigate = useNavigate();
  const drained = count === 0;

  return (
    <Button
      className="button--row flex-col items-start justify-center gap-px rounded-card border border-border bg-surface px-5 py-4"
      onPress={() => navigate(`${ROUTES.CLIENTS}?view=${card.view}`)}
      variant="ghost"
    >
      <Typography
        className={cn('type-metric font-grotesk font-semibold tabular-nums', drained && 'text-muted-2')}
        type="h4"
      >
        {isError ? '—' : (count ?? '—')}
      </Typography>
      <span className="flex items-center gap-1 whitespace-nowrap type-eyebrow font-normal text-muted">
        {card.label}
        <ArrowRight className="size-3" />
      </span>
    </Button>
  );
}

export function WorkbenchCards({leadCount}: {leadCount: number}) {
  const navigate = useNavigate();
  const {data, isError} = useWorkbenchCountsQuery();
  const counts = data?.data;
  const total = counts
    ? counts.check_ins + counts.replies + counts.programming + counts.expiring + counts.quiet + counts.new_clients
    : null;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <DashboardSectionHeading
        count={total !== null && total > 0 ? `${total} ${total === 1 ? 'item' : 'items'}` : null}
        title="Needs you today"
      />

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <CountCard
            card={card}
            count={counts?.[card.countKey]}
            isError={isError}
            key={card.view}
          />
        ))}
      </div>

      {leadCount > 0 ? (
        <Button
          className="button--row justify-between rounded-card border border-border bg-surface px-5 py-3"
          onPress={() => navigate(ROUTES.PROSPECTS)}
          variant="ghost"
        >
          <span className="type-body font-medium">
            {leadCount} new lead{leadCount === 1 ? '' : 's'} to review
          </span>
          <ArrowRight className="size-4 text-muted" />
        </Button>
      ) : null}

      {total === 0 ? (
        <div className="rounded-card border border-border bg-surface px-5 py-6">
          <Typography type="body">You're all caught up</Typography>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            Check-ins, programming, renewals, and new clients show up here.
          </Typography>
        </div>
      ) : null}
    </section>
  );
}
