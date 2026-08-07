import {Button} from '@heroui/react';
import {ArrowRight} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {TodayCard} from '@/@components/today-card';
import {ROUTES} from '@/@config/routes';
import {useWorkbenchCountsQuery} from '@/api/workbench';
import {queueEntries} from '@/clients/lib/workbench-queues';

/**
 * The dashboard's Today section: the SAME TodayCard the workbench renders
 * (spec §9 — two surfaces at 80% overlap teach the coach to trust neither, so
 * the dashboard shows the identical object, detailed density, deep-linking
 * into the queues). It replaced a bespoke six-tile count grid with its own
 * label vocabulary. Leads ride below — they're work too, but not a workbench
 * queue (they live in Prospects).
 */
export function TodayCell({leadCount}: {leadCount: number}) {
  const navigate = useNavigate();
  const {data} = useWorkbenchCountsQuery();
  const entries = queueEntries(data?.data);

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <TodayCard
        detailed
        entries={entries}
        onSelect={(id) => navigate(`${ROUTES.CLIENTS}?view=${id}`)}
      />
      {leadCount > 0 ? (
        <Button
          className="button--row w-full justify-between rounded-card border border-border bg-surface px-5 py-3"
          onPress={() => navigate(ROUTES.PROSPECTS)}
          variant="ghost"
        >
          <span className="type-body font-medium">
            {leadCount} new lead{leadCount === 1 ? '' : 's'} to review
          </span>
          <ArrowRight className="size-4 text-muted" />
        </Button>
      ) : null}
    </section>
  );
}
