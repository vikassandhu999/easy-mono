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
import {useListCoachMealLogsQuery} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import {computeDailyNutritionSummaries, getDayPercent} from '@/domain/client-nutrition';

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-3xl border-[1.5px] border-separator bg-surface px-3 py-4 text-center">
      <div className="font-grotesk text-2xl font-bold">{value}</div>
      <Typography
        className="mt-1 text-[11px] font-semibold"
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
    const planned = nutritionData?.data?.find((plan) => plan.status === 'active')?.target_calories ?? 0;
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
    <div className="grid grid-cols-3 gap-3">
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
