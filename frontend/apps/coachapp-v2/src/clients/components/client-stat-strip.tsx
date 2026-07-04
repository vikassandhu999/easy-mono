/**
 * ClientStatStrip — the 3-up "how is this client doing" summary under the hero.
 *
 * All three stats reuse queries the page's sections already run (RTK Query
 * dedupes by cache key), so this adds no extra network cost:
 *  - Active plans = assigned nutrition + training plan counts
 *  - Workouts     = total logged training sessions (list `count`)
 *  - Adherence    = this-week average nutrition adherence, via the same
 *                   `client-nutrition` helpers ClientNutritionAdherence uses.
 *
 * Streak is intentionally absent — it is not modelled in the API.
 */
import {getCurrentWeekRange} from '@easy/utils';
import {Typography} from '@heroui/react';
import {useMemo} from 'react';

import {useCoachClientTrainingSessionsInfiniteQuery} from '@/api/client-training-sessions';
import {
  useListCoachClientNutritionPlansQuery,
  useListCoachClientTrainingPlansQuery,
  useListCoachMealLogsQuery,
} from '@/api/generated';
import {
  computeDailyNutritionSummaries,
  getDayPercent,
  getPlannedDailyCalories,
  resolveNutritionMacrosGoal,
} from '@/domain/client-nutrition';

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="px-3 py-3 text-center">
      <Typography type="h5">{value}</Typography>
      <Typography
        className="text-[11px]"
        color="muted"
      >
        {label}
      </Typography>
    </div>
  );
}

export default function ClientStatStrip({clientId}: {clientId: string}) {
  const {from, to} = useMemo(() => getCurrentWeekRange(), []);
  const {data: nutritionData} = useListCoachClientNutritionPlansQuery({clientId});
  const {data: trainingData} = useListCoachClientTrainingPlansQuery({clientId});
  const {data: logsData} = useListCoachMealLogsQuery({clientId, from, to});
  const sessions = useCoachClientTrainingSessionsInfiniteQuery({clientId});

  const activePlans = (nutritionData?.data?.length ?? 0) + (trainingData?.data?.length ?? 0);
  const workouts = sessions.data?.pages[0]?.count ?? 0;

  const adherence = useMemo(() => {
    const summaries = computeDailyNutritionSummaries(logsData?.data ?? []);
    const macrosGoal = resolveNutritionMacrosGoal({plans: nutritionData?.data});
    const planned = getPlannedDailyCalories(macrosGoal);
    const percents = summaries
      .filter((s) => s.total_entries > 0)
      .map((s) => getDayPercent(s, planned))
      .filter((p): p is number => p != null);
    if (percents.length === 0) {
      return null;
    }
    return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
  }, [logsData, nutritionData]);

  return (
    <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
      <Stat
        label="Adherence"
        value={adherence == null ? '—' : `${adherence}%`}
      />
      <Stat
        label="Workouts"
        value={String(workouts)}
      />
      <Stat
        label="Active plans"
        value={String(activePlans)}
      />
    </div>
  );
}
