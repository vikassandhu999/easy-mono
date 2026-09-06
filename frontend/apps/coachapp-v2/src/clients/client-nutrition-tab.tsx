import {AlertDialog, Button, Chip, ProgressBar, toast, useOverlayState} from '@heroui/react';
import {useEffect, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import type {Client} from '@/api/clients';
import {
  type NutritionPlan,
  useGetCoachClientNutritionCoverageQuery,
  useListCoachNutritionDaysQuery,
  useUpdateNutritionPlanMutation,
} from '@/api/nutrition-plans';
import {dayWindowRange, formatDayMonth, formatKcal, formatRowDate, lastNDays} from '@/clients/client-detail-data';
import {adherenceBand, caloriePct, type DayTotals, nutritionDayTotals} from '@/clients/client-nutrition-summary';
import PlanAssignControl from '@/clients/client-plan-assign';
import {SectionCard} from '@/clients/client-section-card';
import {handleStaleNutritionPlanConflict} from '@/library/nutrition-plans/stale-nutrition-plan-conflict';
import {ROUTES} from '@/routes';
import {ErrorState} from '@/ui/error-state';
import {toastMutationError} from '@/ui/mutation-toast';

/** CD-NU: the active plan, then 14 days of adherence. */
export function NutritionTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [assignOpen, setAssignOpen] = useState(() => params.get('assign') === 'plan');
  const updatePlan = useUpdateNutritionPlanMutation();
  const endDialog = useOverlayState();

  useEffect(() => {
    if (params.get('assign') !== 'plan') {
      return;
    }
    const next = new URLSearchParams(params);
    next.delete('assign');
    setParams(next, {replace: true});
  }, [params, setParams]);

  const days = lastNDays(14);
  const plans = useGetCoachClientNutritionCoverageQuery(client.id);
  const nutritionDays = useListCoachNutritionDaysQuery(client.id, dayWindowRange(days));

  const coverage = plans.data?.data;
  const plan = coverage?.current;

  const endPlan = async (activePlan: NutritionPlan) => {
    try {
      if (!coverage) {
        return;
      }
      await updatePlan.mutateAsync({
        id: activePlan.id,
        body: {expected_revision: activePlan.revision, end_date: coverage.date},
      });
      endDialog.close();
      toast.success('Plan ends after today');
    } catch (err) {
      const handled = await handleStaleNutritionPlanConflict(err, {
        refetchLatest: async () => plans.refetch({throwOnError: true}),
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
      <SectionCard
        title="Nutrition plans"
        action={
          <>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setAssignOpen(true)}
            >
              Assign plan
            </Button>
            <PlanAssignControl
              clientId={client.id}
              clientName={client.first_name ?? 'this client'}
              kind="nutrition"
              isOpen={assignOpen}
              onOpenChange={setAssignOpen}
            />
          </>
        }
      >
        {plans.isError ? (
          <ErrorState
            message="Couldn't load nutrition plans."
            onRetry={plans.refetch}
          />
        ) : plans.isLoading ? (
          <div className="m-4 h-20 animate-pulse rounded-panel bg-surface-secondary" />
        ) : (
          <div className="space-y-4 p-4">
            <div>
              <p className="type-eyebrow text-muted">Current plan</p>
              {plan ? (
                <>
                  <p className="type-body font-semibold">{plan.name}</p>
                  <p className="type-body-sm text-muted">
                    {plan.start_date ? formatDayMonth(plan.start_date) : ''} –{' '}
                    {plan.end_date ? formatDayMonth(plan.end_date) : 'Open-ended'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', plan.id))}
                    >
                      Open plan
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isDisabled={plan.end_date === coverage?.date}
                      onPress={endDialog.open}
                    >
                      End after today
                    </Button>
                  </div>
                </>
              ) : (
                <p className="type-body text-muted">No plan covers today.</p>
              )}
            </div>
            {(coverage?.upcoming.length ?? 0) > 0 && (
              <div className="space-y-3">
                <p className="type-eyebrow text-muted">Upcoming plans</p>
                {coverage?.upcoming.map((upcoming) => (
                  <div
                    key={upcoming.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="type-body font-semibold">{upcoming.name}</p>
                      <p className="type-body-sm text-muted">
                        {upcoming.start_date ? formatDayMonth(upcoming.start_date) : ''} –{' '}
                        {upcoming.end_date ? formatDayMonth(upcoming.end_date) : 'Open-ended'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', upcoming.id))}
                    >
                      Open plan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>
      <AlertDialog.Backdrop
        isOpen={endDialog.isOpen}
        onOpenChange={endDialog.setOpen}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>End after today?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {plan?.name} covers the rest of today in this client's timezone. A new plan can start tomorrow. Logged
              meals stay available.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
                isDisabled={updatePlan.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isPending={updatePlan.isPending}
                onPress={() => {
                  if (plan) {
                    endPlan(plan);
                  }
                }}
              >
                End after today
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

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
