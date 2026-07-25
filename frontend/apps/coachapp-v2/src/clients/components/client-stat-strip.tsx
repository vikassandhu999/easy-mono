import {Skeleton} from '@heroui/react';
import {ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {
  useListClientWeightEntriesQuery,
  useListCoachClientTrainingSessionsQuery,
  useListCoachMealLogsQuery,
} from '@/api/generated';
import {
  averageLoggedCalories,
  completedSessionDates,
  formatKcal,
  formatWeight,
  lastNDays,
  loggedMealDates,
  relativeDay,
  weightTrend,
} from '@/clients/lib/client-detail-data';

/**
 * `.statcell` × 4 — the live stat bar under the identity header.
 *
 *   .statcell  flex:1; padding:15px 20px; .tap gets a pointer + hover
 *   label      `.eyebrow`
 *   value      23px/700 grotesk -> `--type-metric`, with a muted 13px suffix
 *   note       11.5px muted -> `--type-eyebrow`
 *
 * Fetches its own three windows rather than taking them as props: the caller then
 * passes one client and gets the whole bar, and RTK Query dedupes these against
 * the tab bodies that need the same windows. The alternative — threading three
 * query results through `ClientScreen` — makes the interface wider to no benefit,
 * since nothing else decides what the strip shows.
 *
 * All four cells read "no data" differently on purpose, and the design draws each:
 * a client with no plan gets "No plan", not a zero, because zero implies they had
 * a target and missed it.
 */
/**
 * 2x2 on mobile, four across from `sm` — the design draws both, and a stacked
 * column of four would push the tabs off a 375px screen on its own.
 *
 * The hairlines are the wrapper's border colour showing through a 1px gap, not
 * `divide-*`: `divide-x`/`divide-y` select `:not(:last-child)`, which draws the
 * wrong lines in a 2x2 grid. It is also exactly what the design does.
 */
const STRIP = 'grid grid-cols-2 gap-px bg-border sm:grid-cols-4';

export function ClientStatStrip({client, weeklyTarget}: {client: Client; weeklyTarget: null | number}) {
  const week = lastNDays(7);
  const from = week[0]!;
  const to = week[6]!;

  const sessions = useListCoachClientTrainingSessionsQuery({clientId: client.id, from, to});
  const meals = useListCoachMealLogsQuery({clientId: client.id, from, to});
  const weights = useListClientWeightEntriesQuery({clientId: client.id});

  const isLoading = sessions.isLoading || meals.isLoading || weights.isLoading;

  const doneDays = completedSessionDates(sessions.data?.data);
  const loggedDays = loggedMealDates(meals.data?.data);
  const avgKcal = averageLoggedCalories(meals.data?.data);
  const trend = weightTrend(weights.data?.entries, weights.data?.goal?.value ?? null);

  // "Last active" is the most recent thing the client did, whichever it was — the
  // design labels the value with which kind it came from ("meal log").
  // `Array.at` is ES2022 and this app's tsconfig target is older, so index from
  // the end by hand rather than widening `lib` for one call.
  const newest = (days: Set<string>): string | undefined => {
    const sorted = [...days].sort();
    return sorted[sorted.length - 1];
  };
  const lastSession = newest(doneDays);
  const lastMeal = newest(loggedDays);
  const lastActive = newest(new Set([lastSession, lastMeal].filter((d): d is string => Boolean(d))));
  const lastActiveKind = lastActive && lastActive === lastMeal ? 'meal log' : 'workout';

  if (isLoading) {
    return (
      <div className={STRIP}>
        {[0, 1, 2, 3].map((i) => (
          <div
            className="bg-surface px-4 py-3 sm:px-5 sm:py-4"
            key={i}
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={STRIP}
      data-testid="cd-stats"
    >
      <StatCell
        label="Workouts"
        note="last 7 days"
        suffix={weeklyTarget == null ? undefined : ` of ${weeklyTarget}`}
        value={weeklyTarget == null ? 'No plan' : String(doneDays.size)}
      />
      <StatCell
        label="Meals logged"
        note={avgKcal == null ? undefined : `avg ${formatKcal(avgKcal)} kcal a day`}
        suffix=" of 7 days"
        value={String(loggedDays.size)}
      />
      <StatCell
        label="Weight"
        note={
          trend && trend.weeks > 0
            ? `${trend.direction === 'down' ? '▼' : trend.direction === 'up' ? '▲' : '—'} ${formatWeight(trend.magnitude, trend.latest.unit)} in ${trend.weeks} weeks`
            : undefined
        }
        to={ROUTES.CLIENT_WEIGHT.replace(':id', client.id)}
        value={trend ? formatWeight(trend.latest.value, trend.latest.unit) : 'No entries'}
      />
      <StatCell
        label="Last active"
        note={lastActive ? lastActiveKind : undefined}
        value={lastActive ? (relativeDay(lastActive) ?? '—') : 'Never'}
      />
    </div>
  );
}

function StatCell({
  label,
  note,
  suffix,
  to,
  value,
}: {
  label: string;
  note?: ReactNode;
  suffix?: string;
  /** Makes the cell `.statcell.tap` — a link with a chevron, as CD-OV's Weight cell is. */
  to?: string;
  value: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {to && <ChevronRight className="size-3.5 shrink-0 text-muted" />}
      </div>
      <div className="mt-1.5 font-grotesk type-metric font-bold">
        {value}
        {suffix && <span className="type-body font-semibold text-muted">{suffix}</span>}
      </div>
      {note != null && <div className="mt-0.5 type-eyebrow text-muted">{note}</div>}
    </>
  );

  if (to) {
    return (
      <Link
        className="bg-surface px-4 py-3 hover:bg-background sm:px-5 sm:py-4"
        to={to}
      >
        {body}
      </Link>
    );
  }
  return <div className="bg-surface px-4 py-3 sm:px-5 sm:py-4">{body}</div>;
}
