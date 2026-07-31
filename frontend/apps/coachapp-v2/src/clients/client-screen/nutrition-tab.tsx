import {Chip, ProgressBar} from '@heroui/react';
import {useQueryClient} from '@tanstack/react-query';
import {UtensilsCrossed} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {clientKeys, nutritionPlanKeys} from '@/api/keys';
import {
  useListCoachClientNutritionPlansQuery,
  useListCoachMealLogsQuery,
  useUpdateNutritionPlanMutation,
} from '@/api/nutrition-plans-list';
import {PlanPanel} from '@/clients/client-screen/plan-panel';
import PlanAssignControl from '@/clients/components/plan-assign-control';
import {SectionCard} from '@/clients/components/section-card';
import {
  entryStatus,
  formatKcal,
  formatRowDate,
  lastNDays,
  plannedMealItems,
  skippedPlannedItems,
} from '@/clients/lib/client-detail-data';

/** CD-NU: the active plan, then 14 days of adherence. */
export function NutritionTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const updatePlanMutation = useUpdateNutritionPlanMutation();
  const isEnding = updatePlanMutation.isPending;

  // "End plan" archives it — the plan and its logged history stay, it just stops
  // being the client's active plan. Confirmed in PlanPanel before it fires.
  // `NutritionPlanRequest` is a full replace rather than a patch, so the name has
  // to be sent back unchanged — omitting it fails validation.
  const endPlan = async (planId: string, planName: string) => {
    try {
      await updatePlanMutation.mutateAsync({id: planId, body: {name: planName, status: 'archived'}});
      // The update mutation leaves detail(id) to the builders' optimistic
      // patches; nothing patches here, so refetch the plan (Open is one tap
      // away) and the client (archiving flips the server-derived needs_plan).
      qc.invalidateQueries({queryKey: nutritionPlanKeys.detail(planId)});
      qc.invalidateQueries({queryKey: clientKeys.detail(client.id)});
      qc.invalidateQueries({queryKey: clientKeys.lists()});
    } catch (err) {
      toastMutationError(err, "The plan wasn't ended. Try again.");
    }
  };
  const days = lastNDays(14);
  const plans = useListCoachClientNutritionPlansQuery(client.id, {status: 'active'});
  const logs = useListCoachMealLogsQuery(client.id, {
    from: days[0]!,
    to: days[days.length - 1]!,
  });

  const plan = plans.data?.data?.[0];

  // One row per day, newest first — including days with nothing logged, which the
  // design shows as "Not logged" rather than omitting.
  const byDay = new Map<string, {added: number; logged: number; planned: number; skipped: number; swapped: number}>();
  for (const log of logs.data?.data ?? []) {
    const day = log.date.slice(0, 10);
    const acc = byDay.get(day) ?? {added: 0, logged: 0, planned: 0, skipped: 0, swapped: 0};
    acc.logged += log.logged_calories ?? 0;
    acc.planned += log.planned_calories ?? 0;
    // Reconciled positionally against `planned_snapshot.items` — see the lib.
    const plannedItems = plannedMealItems(log.planned_snapshot);
    for (const entry of log.food_log_entries) {
      const status = entryStatus(entry, plannedItems);
      if (status === 'added') {
        acc.added += 1;
      } else if (status === 'swapped') {
        acc.swapped += 1;
      }
    }
    acc.skipped += skippedPlannedItems(log.planned_snapshot, log.food_log_entries).length;
    byDay.set(day, acc);
  }

  return (
    <div className="flex flex-col gap-4">
      <PlanPanel
        icon={UtensilsCrossed}
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
        name={plan?.name}
        onEnd={plan ? () => endPlan(plan.id, plan.name) : undefined}
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

type DayTotals = {added: number; logged: number; planned: number; skipped: number; swapped: number};

/**
 * One adherence day, as the design draws it: the date, a bar banded by how close
 * the day landed, the percentage in the band's colour, what the client changed,
 * and the kcal pair on the right. The bar is the point — a coach scans the column
 * of bars, not the numbers.
 *
 * `ProgressBar` (GAPS #5) rather than a hand-styled div, and it needs its compound
 * children or it renders nothing at all.
 */
function AdherenceRow({date, pct, to, totals}: {date: string; pct: null | number; to?: string; totals?: DayTotals}) {
  const shape = 'flex w-full items-center gap-3 rounded-panel px-2 py-3 text-left';
  const band = pct == null ? null : pct > 110 ? 'danger' : pct < 90 ? 'warning' : 'success';
  const PCT_COLOR = {
    danger: 'text-danger-soft-foreground',
    success: 'text-success-soft-foreground',
    warning: 'text-warning-soft-foreground',
  } as const;

  const body = (
    <>
      <span className="w-19 shrink-0 type-eyebrow font-semibold text-muted">{date}</span>
      {pct == null || band == null ? (
        <span className="type-body font-semibold text-muted">{totals ? 'Logged' : 'Not logged'}</span>
      ) : (
        <>
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
            {totals?.swapped ? (
              <Chip
                className="chip--outline shrink-0"
                size="sm"
              >
                Swapped {totals.swapped}
              </Chip>
            ) : null}
            {totals?.added ? (
              <Chip
                className="chip--outline shrink-0"
                size="sm"
              >
                Added {totals.added}
              </Chip>
            ) : null}
            {totals?.skipped ? (
              <Chip
                className="chip--outline shrink-0"
                size="sm"
              >
                Skipped {totals.skipped}
              </Chip>
            ) : null}
          </div>
          <span className="shrink-0 type-eyebrow font-semibold">
            {formatKcal(totals?.logged ?? 0)} / {formatKcal(totals?.planned ?? 0)}
          </span>
        </>
      )}
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
