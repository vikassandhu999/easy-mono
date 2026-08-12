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
 * label vocabulary.
 */
export function TodayCell() {
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
    </section>
  );
}
