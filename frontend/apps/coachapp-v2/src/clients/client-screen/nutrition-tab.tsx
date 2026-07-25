import {Chip} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {useListCoachClientNutritionPlansQuery, useListCoachMealLogsQuery} from '@/api/generated';
import {PlanPanel} from '@/clients/client-screen/plan-panel';
import {DetailRow} from '@/clients/components/detail-row';
import {SectionCard} from '@/clients/components/section-card';
import {formatKcal, formatRowDate, lastNDays} from '@/clients/lib/client-detail-data';

/** CD-NU: the active plan, then 14 days of adherence. */
export function NutritionTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const days = lastNDays(14);
  const plans = useListCoachClientNutritionPlansQuery({clientId: client.id, status: 'active'});
  const logs = useListCoachMealLogsQuery({
    clientId: client.id,
    from: days[0]!,
    to: days[days.length - 1]!,
  });

  const plan = plans.data?.data?.[0];

  // One row per day, newest first — including days with nothing logged, which the
  // design shows as "Not logged" rather than omitting.
  const byDay = new Map<string, {added: number; logged: number; planned: number}>();
  for (const log of logs.data?.data ?? []) {
    const day = log.date.slice(0, 10);
    const acc = byDay.get(day) ?? {added: 0, logged: 0, planned: 0};
    acc.logged += log.logged_calories ?? 0;
    acc.planned += log.planned_calories ?? 0;
    for (const entry of log.food_log_entries) {
      // "Added" is an entry with no `planned_item_index` — it was not in the plan.
      // A `FoodLogEntry` has no `status` field, so this is the only claim the API
      // actually supports. The design also shows "Swapped N", which needs
      // reconciling each entry against `planned_snapshot` by position; that is not
      // derivable from this endpoint alone, so it is left out rather than guessed.
      if (entry.planned_item_index == null) {
        acc.added += 1;
      }
    }
    byDay.set(day, acc);
  }

  return (
    <div className="flex flex-col gap-4">
      <PlanPanel
        emptyBody={`Assign a plan so ${client.first_name ?? 'this client'} can log meals against it.`}
        emptyTitle="No nutrition plan"
        meta={
          plan
            ? [
                plan.target_calories ? `${formatKcal(plan.target_calories)} kcal` : null,
                plan.target_protein_g ? `P ${plan.target_protein_g} g` : null,
                plan.target_carbs_g ? `C ${plan.target_carbs_g} g` : null,
                plan.target_fat_g ? `F ${plan.target_fat_g} g` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null
        }
        name={plan?.name}
        onOpen={plan ? () => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', plan.id)) : undefined}
      />

      <SectionCard
        divided
        title="Adherence · last 14 days"
      >
        {[...days].reverse().map((day) => {
          const totals = byDay.get(day);
          const pct = totals && totals.planned > 0 ? Math.round((totals.logged / totals.planned) * 100) : null;
          return (
            <div
              className="px-2"
              key={day}
            >
              <DetailRow
                leading={formatRowDate(day)}
                meta={
                  totals
                    ? [
                        totals.added ? `Added ${totals.added}` : null,
                        totals.planned > 0 ? `${formatKcal(totals.logged)} / ${formatKcal(totals.planned)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                title={totals ? (pct == null ? 'Logged' : `${pct}%`) : 'Not logged'}
                to={totals ? ROUTES.CLIENT_NUTRITION_DAY.replace(':id', client.id).replace(':date', day) : undefined}
                tone={totals ? 'default' : 'muted'}
                trailing={
                  pct != null && (
                    <Chip
                      color={pct >= 90 && pct <= 110 ? 'success' : 'warning'}
                      size="sm"
                      variant="soft"
                    >
                      {pct >= 90 && pct <= 110 ? 'On target' : pct > 110 ? 'Over' : 'Under'}
                    </Chip>
                  )
                }
              />
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}
