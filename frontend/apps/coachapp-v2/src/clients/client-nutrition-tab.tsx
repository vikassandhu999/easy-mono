import {Chip, ProgressBar, toast} from '@heroui/react';
import {UtensilsCrossed} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import type {Client} from '@/api/clients';
import {clientPlanLifecycleLabel, nutritionPlanRevisionRequest} from '@/api/nutrition-plan-lifecycle';
import {
  type NutritionPlan,
  useArchiveNutritionPlanMutation,
  useListCoachClientNutritionPlansQuery,
  useListCoachNutritionDaysQuery,
} from '@/api/nutrition-plans';
import {dayWindowRange, formatDayMonth, formatKcal, formatRowDate, lastNDays} from '@/clients/client-detail-data';
import {adherenceBand, caloriePct, type DayTotals, nutritionDayTotals} from '@/clients/client-nutrition-summary';
import PlanAssignControl from '@/clients/client-plan-assign';
import {PlanPanel} from '@/clients/client-plan-panel';
import {SectionCard} from '@/clients/client-section-card';
import {handleStaleNutritionPlanConflict} from '@/library/nutrition-plans/stale-nutrition-plan-conflict';
import {ROUTES} from '@/routes';
import {toastMutationError} from '@/ui/mutation-toast';

/** CD-NU: the active plan, then 14 days of adherence. */
export function NutritionTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [assignFromUrl] = useState(() => params.get('assign') === 'plan');
  const archivePlanMutation = useArchiveNutritionPlanMutation();
  const isEnding = archivePlanMutation.isPending;

  useEffect(() => {
    if (params.get('assign') !== 'plan') {
      return;
    }
    const next = new URLSearchParams(params);
    next.delete('assign');
    setParams(next, {replace: true});
  }, [params, setParams]);

  const days = lastNDays(14);
  const plans = useListCoachClientNutritionPlansQuery(client.id, {status: 'active'});
  const nutritionDays = useListCoachNutritionDaysQuery(client.id, dayWindowRange(days));

  const plan = plans.data?.data?.[0];

  const endPlan = async (activePlan: NutritionPlan) => {
    try {
      await archivePlanMutation.mutateAsync({
        id: activePlan.id,
        body: nutritionPlanRevisionRequest(activePlan),
      });
    } catch (err) {
      const handled = await handleStaleNutritionPlanConflict(err, {
        refetchLatest: async () => (await plans.refetch()).data?.data?.find(({id}) => id === activePlan.id),
        notify: (message) => {
          toast.info(message, {timeout: 4000});
        },
      });

      if (handled) {
        return;
      }

      toastMutationError(err, "The plan wasn't ended. Try again.");
    }
  };

  // One row per day, newest first — including days with nothing logged, which the
  // design shows as "Not logged" rather than omitting.
  const byDay = new Map<string, DayTotals>();
  for (const day of nutritionDays.data?.data ?? []) {
    if (day.slots.length === 0) {
      continue;
    }
    byDay.set(day.date.slice(0, 10), nutritionDayTotals(day));
  }

  return (
    <div className="flex flex-col gap-4">
      <PlanPanel
        icon={UtensilsCrossed}
        defaultAssignOpen={assignFromUrl}
        emptyBody={`Assign a plan so ${client.first_name ?? 'this client'} can log meals against it.`}
        emptyTitle="No nutrition plan"
        meta={
          plan
            ? [
                plan.lifecycle ? clientPlanLifecycleLabel(plan.lifecycle) : null,
                plan.start_date ? `Started ${formatDayMonth(plan.start_date)}` : null,
                plan.target_calories ? `${formatKcal(plan.target_calories)} kcal` : null,
                plan.target_protein_g ? `P ${plan.target_protein_g} g` : null,
                plan.target_carbs_g ? `C ${plan.target_carbs_g} g` : null,
                plan.target_fat_g ? `F ${plan.target_fat_g} g` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null
        }
        assign={(control) => (
          <PlanAssignControl
            {...control}
            clientId={client.id}
            clientName={client.first_name ?? 'this client'}
            kind="nutrition"
          />
        )}
        assignLabel="Assign plan"
        isEnding={isEnding}
        name={plan?.name ?? null}
        onEnd={plan ? () => endPlan(plan) : undefined}
        onOpen={plan ? () => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', plan.id)) : undefined}
      />

      <SectionCard
        divided
        title="Adherence · last 14 days"
      >
        {[...days].reverse().map((day) => {
          const totals = byDay.get(day);
          const pct = caloriePct(totals);
          return (
            <div
              className="px-2"
              key={day}
            >
              <AdherenceRow
                date={formatRowDate(day)}
                pct={pct}
                to={totals ? ROUTES.CLIENT_NUTRITION_DAY.replace(':id', client.id).replace(':date', day) : undefined}
                totals={totals}
              />
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}

/**
 * One adherence day, as the design draws it: the date, a bar banded by backend
 * calorie adherence, the percentage in the band's colour, what the client changed,
 * and the kcal pair on the right. Unknown calories keep counts visible and skip
 * the verdict. The bar is the point — a coach scans the column of bars, not the
 * numbers.
 *
 * `ProgressBar` (GAPS #5) rather than a hand-styled div, and it needs its compound
 * children or it renders nothing at all.
 */
function AdherenceRow({
  date,
  pct,
  to,
  totals,
}: {
  date: string;
  pct: null | number;
  to?: string | undefined;
  totals?: DayTotals | undefined;
}) {
  const shape = 'flex w-full items-center gap-3 rounded-panel px-2 py-3 text-left';
  const band = adherenceBand(totals);
  const PCT_COLOR = {
    danger: 'text-danger-soft-foreground',
    success: 'text-success-soft-foreground',
    warning: 'text-warning-soft-foreground',
  } as const;

  const chips = totals ? (
    <>
      {totals.swapped ? (
        <Chip
          className="chip--outline shrink-0"
          size="sm"
        >
          Swapped {totals.swapped}
        </Chip>
      ) : null}
      {totals.added ? (
        <Chip
          className="chip--outline shrink-0"
          size="sm"
        >
          Added {totals.added}
        </Chip>
      ) : null}
      {totals.skipped ? (
        <Chip
          className="chip--outline shrink-0"
          size="sm"
        >
          Skipped {totals.skipped}
        </Chip>
      ) : null}
    </>
  ) : null;

  const kcalPair = totals ? (
    <span className="shrink-0 type-eyebrow font-semibold">
      {totals.logged == null ? '—' : formatKcal(Number(totals.logged))} /{' '}
      {totals.target == null ? '—' : formatKcal(Number(totals.target))}
    </span>
  ) : null;

  const body = (
    <>
      <span className="w-19 shrink-0 type-eyebrow font-semibold text-muted">{date}</span>
      {pct == null || band == null ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="type-body font-semibold text-muted">
            {totals ? (totals.hasIntake ? 'Logged' : 'Not logged') : 'Not logged'}
          </span>
          {chips}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ProgressBar
            aria-label={`${pct}% of target`}
            className="min-w-0 max-w-58 flex-1"
            color={band}
            value={Math.min(pct, 100)}
          >
            <ProgressBar.Track className="h-1.75 rounded-pill bg-surface-tertiary">
              <ProgressBar.Fill className="rounded-pill" />
            </ProgressBar.Track>
          </ProgressBar>
          <span className={`shrink-0 type-eyebrow font-bold ${PCT_COLOR[band]}`}>{pct}%</span>
          {chips}
        </div>
      )}
      {kcalPair}
    </>
  );

  return to ? (
    <Link
      className={`${shape} hover:bg-background`}
      to={to}
    >
      {body}
    </Link>
  ) : (
    <div className={shape}>{body}</div>
  );
}
