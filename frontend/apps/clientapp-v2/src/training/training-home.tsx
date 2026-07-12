import {TRAINING_DAY_LABELS, type TrainingWeekday} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {Activity, ChevronRight, Eye, Play} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {
  type ClientTrainingPlan,
  type TrainingPlanWorkout,
  type TrainingSession,
  useCreateClientTrainingSessionMutation,
  useListClientTrainingPlansQuery,
  useListClientTrainingSessionsQuery,
} from '@/api/training';
import {
  currentPlanWeek,
  currentWeekDates,
  estimatedMinutes,
  todayWorkout,
  totalSets,
  workoutForDay,
  workoutPreviewPath,
} from '@/training/training-utils';
import {formatDayDate, snapshotOf} from '@/workout/session-utils';

function ResumeBanner({session, onResume}: {onResume: () => void; session: TrainingSession}) {
  return (
    <button
      className="mb-3.5 flex w-full items-center gap-3 rounded-[20px] bg-[var(--ink-card)] p-4 text-left text-white"
      onClick={onResume}
      type="button"
    >
      <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-white/10 text-accent">
        <Activity size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8fc4f9]">
          Workout in progress
        </span>
        <b className="mt-0.5 block truncate">{snapshotOf(session).workout_name ?? 'Workout'}</b>
        <span className="text-xs text-[#9aa3b2]">{session.performed_sets.length} sets logged</span>
      </span>
      <span className="rounded-[11px] bg-accent px-3.5 py-2.5 text-[13px] font-extrabold">Resume</span>
    </button>
  );
}

function PlanCard({plan}: {plan: ClientTrainingPlan}) {
  const week = currentPlanWeek(plan);
  return (
    <div className="mb-[22px] rounded-[20px] border border-border bg-surface p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Current plan</p>
      <h2 className="mt-2 text-lg font-extrabold tracking-[-0.02em]">{plan.name}</h2>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e6e7e4]">
          <div
            className="h-full rounded-full bg-accent"
            style={{width: `${Math.min(100, (week.current / week.total) * 100)}%`}}
          />
        </div>
        <span className="whitespace-nowrap text-[11px] font-bold text-muted">
          Week {week.current} of {week.total}
        </span>
      </div>
    </div>
  );
}

function WeekList({
  plan,
  active,
  starting,
  onStart,
}: {
  active?: TrainingSession;
  onStart: (workout: TrainingPlanWorkout) => void;
  plan: ClientTrainingPlan;
  starting: boolean;
}) {
  const navigate = useNavigate();
  const today = new Date().toDateString();
  return (
    <div className="mb-[22px] overflow-hidden rounded-[20px] border border-border bg-surface">
      {currentWeekDates().map(({day, date}) => {
        const workout = workoutForDay(plan, day);
        const isToday = date.toDateString() === today;
        return (
          <div
            className={`flex min-h-[62px] items-center gap-3 border-t border-separator px-3.5 py-2.5 first:border-t-0 ${isToday ? 'border-l-[3px] border-l-accent bg-accent-soft/50' : ''}`}
            key={day}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-[11px] text-center ${isToday ? 'bg-accent text-white' : 'bg-surface-secondary'}`}
            >
              <span>
                <b className="block text-xs leading-none">{date.getDate()}</b>
                <span className="mt-0.5 block text-[8px] font-bold uppercase">
                  {TRAINING_DAY_LABELS[day].slice(0, 3)}
                </span>
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <b className={`block truncate text-sm ${workout ? '' : 'text-muted'}`}>{workout?.name ?? 'Rest day'}</b>
              {workout ? (
                <span className="block text-[10px] text-muted">
                  {workout.workout_elements.length} exercises · {totalSets(workout)} sets
                  {estimatedMinutes(workout) ? ` · ~${estimatedMinutes(workout)} min` : ''}
                </span>
              ) : (
                <span className="text-[10px] text-muted">Recovery</span>
              )}
            </span>
            {workout ? (
              <div className="flex shrink-0 gap-1.5">
                <button
                  aria-label={`View ${workout.name}`}
                  className="grid size-9 place-items-center rounded-[10px] border border-border text-muted"
                  onClick={() => navigate(workoutPreviewPath(workout.id))}
                  type="button"
                >
                  <Eye size={15} />
                </button>
                {isToday ? (
                  <button
                    aria-label={active ? 'Resume workout' : `Start ${workout.name}`}
                    className="grid size-9 place-items-center rounded-[10px] bg-accent text-white disabled:opacity-50"
                    disabled={starting}
                    onClick={() => (active ? navigate(ROUTES.WORKOUT_ACTIVE) : onStart(workout))}
                    type="button"
                  >
                    <Play
                      fill="currentColor"
                      size={13}
                    />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function TrainingHome() {
  const navigate = useNavigate();
  const {data: plans, isLoading: loadingPlans} = useListClientTrainingPlansQuery({status: 'active'});
  const {data: sessions, isLoading: loadingSessions} = useListClientTrainingSessionsQuery({});
  const [createSession, {isLoading: starting}] = useCreateClientTrainingSessionMutation();
  const plan = plans?.data[0];
  const active = sessions?.data.find((session) => session.state === 'active');
  const recent = (sessions?.data ?? []).filter((session) => session.state === 'completed').slice(0, 3);

  const start = async (workout: TrainingPlanWorkout) => {
    try {
      await createSession({trainingSessionRequest: {training_workout_id: workout.id}}).unwrap();
      navigate(ROUTES.WORKOUT_ACTIVE);
    } catch {
      // RTK Query surfaces the request error.
    }
  };

  if (loadingPlans || loadingSessions) {
    return (
      <PageLayout title="Training">
        <div className="grid min-h-56 place-items-center">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Training">
      {!plan ? (
        <div className="rounded-[20px] border border-border bg-surface px-6 py-9 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Activity size={21} />
          </div>
          <b className="text-[15px]">Your plan is on the way</b>
          <p className="mx-auto mt-1.5 max-w-60 text-xs leading-5 text-muted">
            Your coach is putting your training plan together.
          </p>
        </div>
      ) : (
        <>
          {active ? (
            <ResumeBanner
              onResume={() => navigate(ROUTES.WORKOUT_ACTIVE)}
              session={active}
            />
          ) : null}
          <PlanCard plan={plan} />
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">This week</p>
          <WeekList
            active={active}
            onStart={start}
            plan={plan}
            starting={starting}
          />
          {todayWorkout(plan) == null ? (
            <div className="mb-5 rounded-2xl bg-surface-secondary p-4 text-center text-sm text-muted">
              Rest day — recover well.
            </div>
          ) : null}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Recent</p>
            <button
              className="text-xs font-bold text-accent"
              onClick={() => navigate(ROUTES.WORKOUT_HISTORY)}
              type="button"
            >
              View all history
            </button>
          </div>
          {recent.map((session) => (
            <button
              className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left"
              key={session.id}
              onClick={() => navigate(ROUTES.SESSION_DETAIL.replace(':sessionId', session.id))}
              type="button"
            >
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{snapshotOf(session).workout_name ?? 'Workout'}</b>
                <span className="text-[11px] text-muted">
                  {formatDayDate(session.started_at)} · {session.performed_sets.length} sets
                </span>
              </span>
              <ChevronRight
                className="text-muted"
                size={16}
              />
            </button>
          ))}
        </>
      )}
    </PageLayout>
  );
}
