/**
 * CD/NU — Nutrition tab. Spec §5; design `Client Detail.dc.html` data-ref
 * CD-NU-{desktop,mobile}. Active-plan card (shared with CD/TR) + a 14-day
 * adherence list. Style fidelity: manifests/CD-NU.json.
 *
 * Like CD/TR the list is a plain semantic list: rows are mixed (tappable
 * logged days and inert "Not logged" days).
 */
import {Chip, ProgressBar, toast} from '@heroui/react';
import {Utensils, UtensilsCrossed} from 'lucide-react';
import {useMemo} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import type {Client, MealLog, NutritionPlan} from '@/api/generated';
import {useListCoachMealLogsQuery, useUpdateNutritionPlanMutation} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {getApiErrorMessage} from '@/api/shared';
import {formatRowDate, isoDate, lastDays} from '@/clients/client-detail/data';
import {EmptyPlanCard, PlanCard} from '@/clients/client-detail/plan-card';
import {CARD, CardError, CardSkeleton, CHIP} from '@/clients/client-detail/ui';

const GRP = 'px-0 pt-2 pb-1.5 text-eyebrow font-bold uppercase tracking-grp text-muted';
const ROW = 'flex items-center gap-3.5 rounded-panel px-1 py-2.5 sm:px-2 sm:py-2.75';
/** `.lbrow` sits in the page's inherited text context; HeroUI Button imposes its
 *  own 14px/20px/default-foreground, which then cascades into the meter. */
const ROW_TEXT = 'text-title font-normal leading-[normal] text-foreground';
const NOT_LOGGED_ROW = 'flex items-center gap-3.5 rounded-panel px-1 py-2.75 sm:px-2';
const ROW_DATE = 'text-eyebrow font-semibold text-muted sm:w-19 sm:flex-none';
const SEP = 'h-px bg-border';
/** `.chip.out` — transparent, hairline, muted (RECIPES R5 outline chip). */
const OUT_CHIP = `${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`;

type DayRow = {
  added: number;
  date: string;
  logged: number;
  percent: null | number;
  planned: number;
  swapped: number;
};

/** success 85–110% of target, warning below, danger above (spec §5.2). */
function toneFor(percent: number): 'danger' | 'success' | 'warning' {
  if (percent > 110) {
    return 'danger';
  }
  return percent < 85 ? 'warning' : 'success';
}

const FILL_CLASS = {
  danger: 'bg-danger',
  success: 'bg-success',
  warning: 'bg-warning',
} as const;

const PCT_CLASS = {
  danger: 'text-danger-soft-foreground',
  success: 'text-success-soft-foreground',
  warning: 'text-warning-soft-foreground',
} as const;

function buildDays(logs: MealLog[], plan: NutritionPlan): DayRow[] {
  const byDate = new Map<string, {added: number; logged: number; planned: number; swapped: number}>();
  for (const log of logs) {
    const day = byDate.get(log.date) ?? {added: 0, logged: 0, planned: 0, swapped: 0};
    day.logged += log.logged_calories ?? 0;
    day.planned += log.planned_calories ?? 0;
    for (const entry of log.food_log_entries) {
      if (entry.source === 'replacement') {
        day.swapped += 1;
      } else if (entry.source === 'unplanned') {
        day.added += 1;
      }
    }
    byDate.set(log.date, day);
  }

  const planStart = plan.start_date;
  return lastDays(14)
    .map((d) => isoDate(d))
    .filter((date) => (planStart ? date >= planStart : true))
    .reverse()
    .map((date) => {
      const day = byDate.get(date);
      // A day's own planned total is authoritative; fall back to the plan target
      // for days the client logged against no planned meals.
      const planned = day && day.planned > 0 ? day.planned : (plan.target_calories ?? 0);
      const logged = day?.logged ?? 0;
      return {
        added: day?.added ?? 0,
        date,
        logged,
        percent: logged > 0 && planned > 0 ? Math.round((logged / planned) * 100) : null,
        planned,
        swapped: day?.swapped ?? 0,
      };
    });
}

function planMeta(plan: NutritionPlan, isDesktop: boolean): string {
  const parts: string[] = [];
  if (plan.target_calories) {
    parts.push(`${Math.round(plan.target_calories).toLocaleString()} kcal`);
  }
  const macros: [string, null | number | undefined][] = [
    ['P', plan.target_protein_g],
    ['C', plan.target_carbs_g],
    ['F', plan.target_fat_g],
  ];
  for (const [letter, value] of macros) {
    if (value) {
      parts.push(isDesktop ? `${letter} ${Math.round(value)} g` : `${letter}${Math.round(value)}`);
    }
  }
  return parts.join(' · ');
}

function AdherenceBar({percent}: {percent: number}) {
  const tone = toneFor(percent);
  return (
    <>
      <ProgressBar
        aria-label="Calories logged against target"
        className="w-full flex-1 sm:max-w-57.5"
        value={Math.min(percent, 100)}
      >
        <ProgressBar.Track
          className="h-1.75 overflow-hidden rounded-pill bg-surface-tertiary"
          data-testid="nu-bar-track"
        >
          <ProgressBar.Fill
            className={`h-full rounded-pill ${FILL_CLASS[tone]}`}
            data-testid="nu-bar-fill"
          />
        </ProgressBar.Track>
      </ProgressBar>
      <span
        className={`flex-none text-eyebrow font-bold sm:text-eyebrow ${PCT_CLASS[tone]}`}
        data-testid="nu-pct"
      >
        {percent}%
      </span>
    </>
  );
}

function CountChips({added, isDesktop, swapped}: {added: number; isDesktop: boolean; swapped: number}) {
  if (swapped + added === 0) {
    return null;
  }
  // Mobile compresses both counts into one `+n` chip (the design's mobile frame).
  if (!isDesktop) {
    return (
      <Chip
        className={OUT_CHIP}
        data-testid="nu-chip"
      >
        +{swapped + added}
      </Chip>
    );
  }
  return (
    <>
      {swapped > 0 ? (
        <Chip
          className={OUT_CHIP}
          data-testid="nu-chip"
        >
          Swapped {swapped}
        </Chip>
      ) : null}
      {added > 0 ? (
        <Chip
          className={OUT_CHIP}
          data-testid={swapped > 0 ? undefined : 'nu-chip'}
        >
          Added {added}
        </Chip>
      ) : null}
    </>
  );
}

function NutritionPlanCard({client, plan}: {client: Client; plan: NutritionPlan}) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [updatePlan, {isLoading: isEnding}] = useUpdateNutritionPlanMutation();

  const endPlan = async () => {
    try {
      // the nutrition update contract is a full request — `name` is required
      await updatePlan({id: plan.id, nutritionPlanRequest: {name: plan.name, status: 'archived'}}).unwrap();
      toast.success('Plan ended');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Plan wasn't ended"));
    }
  };

  return (
    <PlanCard
      client={client}
      endBody="The client will no longer see planned meals."
      icon={<Utensils className="size-4.75 sm:size-5.25" />}
      isEnding={isEnding}
      kind="nutrition"
      meta={planMeta(plan, isDesktop)}
      name={plan.name}
      onEnd={endPlan}
      onOpen={() => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', plan.id))}
      testId="nu"
    />
  );
}

export default function NutritionTab({client}: {client: Client}) {
  const isDesktop = useIsDesktop();
  const plans = useListCoachClientNutritionPlansQuery({clientId: client.id});
  const range = useMemo(() => {
    const days = lastDays(14);
    return {from: isoDate(days[0]!), to: isoDate(days[13]!)};
  }, []);
  const logs = useListCoachMealLogsQuery({clientId: client.id, from: range.from, to: range.to});

  const plan = (plans.data?.data ?? []).find((p) => p.status === 'active');
  const days = useMemo(() => (plan ? buildDays(logs.data?.data ?? [], plan) : []), [logs.data, plan]);
  const hasAnyLogged = days.some((day) => day.logged > 0);

  return (
    <div className="flex flex-col gap-3 p-3.5 sm:gap-4 sm:p-0">
      {plans.isLoading ? (
        <CardSkeleton lines={2} />
      ) : plans.isError ? (
        <CardError
          label="nutrition"
          onRetry={plans.refetch}
        />
      ) : plan ? (
        <NutritionPlanCard
          client={client}
          plan={plan}
        />
      ) : (
        <EmptyPlanCard
          body={`Assign a plan so ${client.first_name ?? 'this client'} can log meals against it.`}
          client={client}
          icon={<UtensilsCrossed className="size-5.5 sm:size-6" />}
          kind="nutrition"
          testId="nu"
          title="No nutrition plan"
        />
      )}

      {!plan ? null : logs.isLoading ? (
        <CardSkeleton />
      ) : logs.isError ? (
        <CardError
          label="nutrition"
          onRetry={logs.refetch}
        />
      ) : !hasAnyLogged ? (
        <div className={`${CARD} px-3.5 py-6 text-center sm:px-4.5`}>
          <span className="text-eyebrow [color:var(--color-muted)] sm:text-eyebrow">
            No meals logged yet. Days appear here as {client.first_name ?? 'this client'} logs food.
          </span>
        </div>
      ) : (
        <div
          className={`${CARD} px-3.5 pt-1.5 pb-2.5 sm:px-4.5 sm:pt-2 sm:pb-3`}
          data-testid="nu-history"
        >
          <div
            className={GRP}
            data-testid="nu-group"
          >
            Adherence · last 14 days
          </div>
          <ul>
            {days.map((day, index) => (
              <li key={day.date}>
                {index > 0 ? (
                  <div
                    className={SEP}
                    data-testid="nu-row-sep"
                  />
                ) : null}
                {day.percent == null ? (
                  <div
                    className={`${NOT_LOGGED_ROW} ${ROW_TEXT}`}
                    data-testid="nu-notlogged"
                  >
                    <span
                      className={ROW_DATE}
                      data-testid="nu-notlogged-date"
                    >
                      {formatRowDate(day.date, {withMonth: true})}
                    </span>
                    <span className="flex-1" />
                    <span
                      className="text-eyebrow [color:var(--color-muted)]"
                      data-testid="nu-notlogged-text"
                    >
                      Not logged
                    </span>
                  </div>
                ) : (
                  <Link
                    className={`${ROW} ${ROW_TEXT} h-auto w-full justify-start bg-transparent [box-shadow:none] hover:bg-background sm:items-center`}
                    data-testid="nu-row"
                    to={ROUTES.CLIENT_NUTRITION_DAY.replace(':id', client.id).replace(':date', day.date)}
                  >
                    {isDesktop ? (
                      <>
                        <span
                          className={ROW_DATE}
                          data-testid="nu-row-date"
                        >
                          {formatRowDate(day.date, {withMonth: true})}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2.75">
                          <AdherenceBar percent={day.percent} />
                          <CountChips
                            added={day.added}
                            isDesktop
                            swapped={day.swapped}
                          />
                        </span>
                        <span
                          className="flex-none text-eyebrow font-semibold"
                          data-testid="nu-kcal"
                        >
                          {Math.round(day.logged).toLocaleString()} / {Math.round(day.planned).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between">
                          <span
                            className={ROW_DATE}
                            data-testid="nu-row-date"
                          >
                            {formatRowDate(day.date, {withMonth: true})}
                          </span>
                          <span
                            className="text-eyebrow font-semibold"
                            data-testid="nu-kcal"
                          >
                            {Math.round(day.logged).toLocaleString()} / {Math.round(day.planned).toLocaleString()}
                          </span>
                        </span>
                        <span className="mt-1.75 flex items-center gap-2.25">
                          <AdherenceBar percent={day.percent} />
                          <CountChips
                            added={day.added}
                            isDesktop={false}
                            swapped={day.swapped}
                          />
                        </span>
                      </span>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
