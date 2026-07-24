/**
 * CD shell §2.2 — the four-tile stat strip. One bordered container: 2×2 grid
 * with 1px `--border` gaps on mobile, 4-across flex row with divider elements
 * on desktop (matching the dc.html's two computed layouts exactly).
 */
import {ChevronRight, TrendingDown} from 'lucide-react';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import {useGetCoachClientConversationQuery} from '@/api/conversations';
import type {Client} from '@/api/generated';
import {
  useListClientFormAssignmentsForCoachQuery,
  useListClientWeightEntriesQuery,
  useListCoachClientTrainingSessionsQuery,
  useListCoachMealLogsQuery,
} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import {
  activePlan,
  averageLoggedCalories,
  completedSessionDates,
  isoDate,
  lastDays,
  loggedMealDates,
  relativeDay,
  weightDelta,
} from '@/clients/client-detail/data';
import {EYEBROW} from '@/clients/client-detail/ui';

const CELL = 'bg-surface px-3 py-3 sm:flex-1 sm:bg-transparent sm:px-5 sm:py-4';
const VALUE = 'font-grotesk text-heading font-bold sm:mt-1.5 sm:text-metric mt-1';
const UNIT = 'text-eyebrow font-semibold text-muted sm:text-body';
const SUB = 'text-eyebrow text-muted sm:mt-1 sm:text-eyebrow';
const DIVIDER = 'hidden w-px self-stretch bg-border sm:block';

function Tile({
  children,
  isValueMuted,
  label,
  sub,
  testid,
}: {
  children: React.ReactNode;
  isValueMuted?: boolean;
  label: string;
  sub: React.ReactNode;
  testid?: string;
}) {
  return (
    <div
      className={CELL}
      data-testid={testid}
    >
      <div
        className={`${EYEBROW} text-eyebrow sm:text-eyebrow`}
        data-testid={testid ? `${testid}-label` : undefined}
      >
        {label}
      </div>
      <div
        className={`${VALUE}${isValueMuted ? ' text-muted' : ''}`}
        data-testid={testid ? `${testid}-value` : undefined}
      >
        {children}
      </div>
      {sub}
    </div>
  );
}

export default function StatStrip({client}: {client: Client}) {
  const clientId = client.id;
  const days = useMemo(() => lastDays(7), []);
  const from = isoDate(days[0]!);
  const to = isoDate(days[6]!);
  const since = useMemo(() => isoDate(lastDays(90)[0]!), []);

  const sessions = useListCoachClientTrainingSessionsQuery({clientId, from, to});
  const meals = useListCoachMealLogsQuery({clientId, from, to});
  const weights = useListClientWeightEntriesQuery({clientId, since});
  const assignments = useListClientFormAssignmentsForCoachQuery({clientId});
  const conversation = useGetCoachClientConversationQuery({clientId});
  const {data: trainingPlans} = useListCoachClientTrainingPlansQuery({clientId});
  const {data: nutritionPlans} = useListCoachClientNutritionPlansQuery({clientId});

  const trainingPlan = activePlan(trainingPlans?.data);
  const nutritionPlan = (nutritionPlans?.data ?? []).find((plan) => plan.status === 'active');

  const completedDates = completedSessionDates(sessions.data?.data);
  const scheduledPerWeek = trainingPlan?.plan_items.length ?? 0;
  const behind = trainingPlan != null && completedDates.size < scheduledPerWeek - 1;

  const loggedDays = loggedMealDates(meals.data?.data).size;
  const avgCalories = averageLoggedCalories(meals.data?.data);

  const entries = weights.data?.entries ?? [];
  const latestWeight = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const goal = client.goal_weight_value == null ? null : Number(client.goal_weight_value);
  const delta = weightDelta(entries, goal);

  const lastActive = useMemo(() => {
    const candidates: {at: string; source: string}[] = [];
    for (const session of sessions.data?.data ?? []) {
      if (session.state === 'completed' && session.date) {
        candidates.push({at: session.date, source: 'workout'});
      }
    }
    for (const log of meals.data?.data ?? []) {
      if ((log.logged_calories ?? 0) > 0) {
        candidates.push({at: log.date, source: 'meal log'});
      }
    }
    for (const assignment of assignments.data?.data ?? []) {
      if (assignment.latest_submission) {
        candidates.push({at: assignment.latest_submission.submitted_at, source: 'check-in'});
      }
    }
    const lastMessage = conversation.data?.data.last_message_at;
    if (lastMessage) {
      candidates.push({at: lastMessage, source: 'message'});
    }
    candidates.sort((a, b) => (a.at < b.at ? 1 : -1));
    return candidates[0] ?? null;
  }, [assignments.data, conversation.data, meals.data, sessions.data]);

  return (
    <div
      className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border sm:mt-5 sm:flex sm:bg-transparent sm:[column-gap:normal] sm:[row-gap:normal]"
      data-testid="cd-strip"
    >
      <Tile
        isValueMuted={!trainingPlan}
        label="Workouts"
        sub={
          <div
            className={SUB}
            data-testid="cd-stat-workouts-sub"
          >
            {trainingPlan ? 'last 7 days' : 'No plan'}
          </div>
        }
        testid="cd-stat-workouts"
      >
        {trainingPlan ? (
          <span className={behind ? 'inline-flex items-center gap-1 text-danger' : undefined}>
            {behind ? <TrendingDown className="size-4" /> : null}
            {completedDates.size}
            <span
              className={UNIT}
              data-testid="cd-stat-workouts-unit"
            >
              {' '}
              of {scheduledPerWeek}
            </span>
          </span>
        ) : (
          '—'
        )}
      </Tile>
      <div className={DIVIDER} />
      <Tile
        isValueMuted={!nutritionPlan}
        label="Meals logged"
        sub={
          <div className={SUB}>
            {nutritionPlan
              ? avgCalories == null
                ? 'no meals logged'
                : `avg ${avgCalories.toLocaleString()} kcal a day`
              : 'No plan'}
          </div>
        }
      >
        {nutritionPlan ? (
          <>
            {loggedDays}
            <span className={UNIT}> of 7 days</span>
          </>
        ) : (
          '—'
        )}
      </Tile>
      <div className={DIVIDER} />
      <Link
        className={`${CELL} cursor-pointer transition-colors hover:bg-background`}
        data-testid="cd-stat-weight"
        to={ROUTES.CLIENT_WEIGHT.replace(':id', clientId)}
      >
        <div className="flex items-center justify-between">
          <div className={`${EYEBROW} text-eyebrow sm:text-eyebrow`}>Weight</div>
          <ChevronRight className="hidden size-3.5 text-muted sm:block" />
        </div>
        <div className={`${VALUE}${latestWeight ? '' : ' text-muted'}`}>
          {latestWeight ? (
            <>
              {Number(latestWeight.value).toFixed(1)}
              <span className={UNIT}> {latestWeight.unit}</span>
            </>
          ) : (
            '—'
          )}
        </div>
        <div
          className={
            latestWeight && delta
              ? `text-eyebrow font-semibold sm:mt-1 sm:text-eyebrow ${
                  delta.tone === 'success'
                    ? 'text-success-soft-foreground'
                    : delta.tone === 'danger'
                      ? 'text-danger-soft-foreground'
                      : 'text-muted'
                }`
              : SUB
          }
          data-testid="cd-stat-weight-sub"
        >
          {latestWeight && delta
            ? `${delta.direction === 'down' ? '▼' : '▲'} ${delta.value.toFixed(1)} ${latestWeight.unit} in 4 weeks`
            : 'No entries'}
        </div>
      </Link>
      <div className={DIVIDER} />
      <Tile
        isValueMuted={!lastActive}
        label="Last active"
        sub={<div className={SUB}>{lastActive ? lastActive.source : 'No activity yet'}</div>}
      >
        {lastActive ? relativeDay(lastActive.at) : '—'}
      </Tile>
    </div>
  );
}
