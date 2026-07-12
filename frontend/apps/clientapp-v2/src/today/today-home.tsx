import {Spinner} from '@heroui/react';
import {ChevronRight, Dumbbell, MessageCircle, Play, TrendingUp, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useListClientFormAssignmentsQuery} from '@/api/checkins';
import {useListClientMealLogsQuery, useListClientNutritionPlansQuery} from '@/api/nutrition';
import {useGetClientProfileQuery} from '@/api/profile';
import {
  useCreateClientTrainingSessionMutation,
  useListClientTrainingPlansQuery,
  useListClientTrainingSessionsQuery,
} from '@/api/training';
import CheckinNudgeCard from '@/checkins/checkin-nudge-card';
import IntakeCard from '@/checkins/intake-card';
import {dayTotals, planTargets} from '@/nutrition/nutrition-utils';
import {estimatedMinutes, todayWorkout, totalSets, workoutPreviewPath} from '@/training/training-utils';

function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initials(firstName?: null | string, lastName?: null | string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export default function TodayHome() {
  const navigate = useNavigate();
  const {data: profileData} = useGetClientProfileQuery();
  const {data: plansData, isLoading: plansLoading} = useListClientTrainingPlansQuery({status: 'active'});
  const {data: sessionsData, isLoading: sessionsLoading} = useListClientTrainingSessionsQuery({});
  const {data: nutritionPlans} = useListClientNutritionPlansQuery({status: 'active'});
  const {data: mealLogs, isLoading: nutritionLoading} = useListClientMealLogsQuery({date: localToday()});
  const {data: assignments} = useListClientFormAssignmentsQuery();
  const [createSession, {isLoading: starting}] = useCreateClientTrainingSessionMutation();
  const profile = profileData?.data;
  const plan = plansData?.data[0];
  const workout = todayWorkout(plan);
  const activeSession = sessionsData?.data.find((session) => session.state === 'active');
  const coachName = profile?.coach.first_name || 'your coach';
  const firstName = profile?.first_name || 'there';

  const openWorkout = async () => {
    if (activeSession) {
      navigate(ROUTES.WORKOUT_ACTIVE);
      return;
    }
    if (!workout) {
      navigate(ROUTES.TRAINING);
      return;
    }
    try {
      await createSession({trainingSessionRequest: {training_workout_id: workout.id}}).unwrap();
      navigate(ROUTES.WORKOUT_ACTIVE);
    } catch {
      // RTK Query surfaces the request error.
    }
  };

  const consumed = dayTotals(mealLogs?.data ?? []);
  const targets = planTargets(nutritionPlans?.data[0]);
  const kcalLeft = targets.calories == null ? null : Math.max(0, targets.calories - consumed.calories);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const completedThisWeek = (sessionsData?.data ?? []).filter(
    (session) => session.state === 'completed' && new Date(session.started_at) >= weekStart,
  ).length;
  const completedCheckins = (assignments?.data ?? []).filter((assignment) => assignment.status === 'completed').length;

  return (
    <div className="px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-[18px] flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
            {new Intl.DateTimeFormat(undefined, {day: 'numeric', month: 'long', weekday: 'long'}).format(new Date())}
          </p>
          <h1 className="mt-1 text-[25px] font-extrabold leading-[1.05] tracking-[-0.025em]">
            Good morning, {firstName}
          </h1>
        </div>
        <button
          aria-label="Open settings"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-[15px] font-extrabold text-white"
          onClick={() => navigate(ROUTES.SETTINGS)}
          type="button"
        >
          {initials(profile?.first_name, profile?.last_name)}
        </button>
      </header>

      <IntakeCard />
      <CheckinNudgeCard />

      <p className="mb-3 mt-[22px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
        Today&apos;s plan
      </p>
      {plansLoading || sessionsLoading ? (
        <div className="grid min-h-36 place-items-center rounded-[20px] border border-border bg-surface">
          <Spinner />
        </div>
      ) : (
        <div className="mb-3 rounded-[20px] border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-surface-secondary">
              <Dumbbell size={20} />
            </span>
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => (workout ? navigate(workoutPreviewPath(workout.id)) : navigate(ROUTES.TRAINING))}
              type="button"
            >
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">
                Workout · today
              </span>
              <span className="mt-0.5 block truncate text-[17px] font-extrabold tracking-[-0.02em]">
                {workout?.name ?? (plan ? 'Rest day' : 'Plan on the way')}
              </span>
            </button>
            {workout || activeSession ? (
              <button
                className="flex items-center gap-1 rounded-[11px] bg-accent px-3.5 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
                disabled={starting}
                onClick={openWorkout}
                type="button"
              >
                <Play
                  fill="currentColor"
                  size={12}
                />{' '}
                {activeSession ? 'Resume' : 'Start'}
              </button>
            ) : null}
          </div>
          {workout ? (
            <div className="mt-3.5 grid grid-cols-3 rounded-[13px] bg-surface-secondary py-2.5 text-center">
              <div>
                <b className="block text-[15px]">{workout.workout_elements.length}</b>
                <span className="text-[10px] font-semibold text-muted">exercises</span>
              </div>
              <div className="border-l border-field-border">
                <b className="block text-[15px]">{totalSets(workout)}</b>
                <span className="text-[10px] font-semibold text-muted">sets</span>
              </div>
              <div className="border-l border-field-border">
                <b className="block text-[15px]">{estimatedMinutes(workout) ? `~${estimatedMinutes(workout)}` : '—'}</b>
                <span className="text-[10px] font-semibold text-muted">min</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-[20px] border border-border bg-surface p-4">
        <button
          className="flex w-full items-center gap-3 text-left"
          onClick={() => navigate(ROUTES.NUTRITION)}
          type="button"
        >
          <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-surface-secondary">
            <UtensilsCrossed size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Food · {kcalLeft == null ? 'today' : `${Math.round(kcalLeft)} kcal left`}
            </span>
            <span className="mt-0.5 block text-[17px] font-extrabold tracking-[-0.02em]">
              {Math.round(consumed.calories)}{' '}
              <span className="text-xs font-semibold text-muted">/ {targets.calories ?? '—'} kcal</span>
            </span>
          </span>
          <span className="rounded-[11px] bg-accent px-3.5 py-2.5 text-[13px] font-extrabold text-white">Log</span>
        </button>
        {nutritionLoading ? (
          <div className="mt-3 h-10 animate-pulse rounded-xl bg-surface-secondary" />
        ) : (
          <div className="mt-3.5 space-y-2.5">
            {[
              ['Protein', consumed.protein, targets.protein],
              ['Carbs', consumed.carbs, targets.carbs],
              ['Fat', consumed.fat, targets.fat],
            ].map(([label, value, target]) => {
              const numericValue = Number(value);
              const numericTarget = target == null ? null : Number(target);
              return (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-[10px] font-semibold text-muted">
                    <span>{label}</span>
                    <span className="text-foreground">
                      {Math.round(numericValue)} / {numericTarget == null ? '—' : Math.round(numericTarget)}g
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[#e6e7e4]">
                    <div
                      className="h-full rounded-full bg-[#9aa3b2]"
                      style={{width: `${numericTarget ? Math.min(100, (numericValue / numericTarget) * 100) : 0}%`}}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="my-4 h-px bg-separator" />
      <div className="mb-1">
        <p className="mb-3 text-[13px] font-bold">This week</p>
        <div className="flex items-center">
          <div className="flex-1">
            <b className="text-[22px] font-extrabold">{completedThisWeek}</b>
            <span className="text-[13px] font-bold text-muted">/{Math.max(1, plan?.plan_items.length ?? 0)}</span>
            <span className="mt-1 block text-[10px] font-semibold text-muted">Sessions</span>
          </div>
          <div className="h-8 w-px bg-separator" />
          <div className="flex-1 pl-4">
            <b className="text-[22px] font-extrabold">
              {targets.calories ? Math.round((consumed.calories / targets.calories) * 100) : 0}
              <span className="text-[13px] text-muted">%</span>
            </b>
            <span className="mt-1 block text-[10px] font-semibold text-muted">Nutrition today</span>
          </div>
          <div className="h-8 w-px bg-separator" />
          <div className="flex-1 pl-4">
            <b className="text-[22px] font-extrabold">{completedCheckins}</b>
            <span className="mt-1 block text-[10px] font-semibold text-muted">Check-ins</span>
          </div>
        </div>
      </div>
      <div className="my-4 h-px bg-separator" />
      <button
        className="flex w-full items-center gap-3 text-left"
        onClick={() => navigate(ROUTES.MESSAGES)}
        type="button"
      >
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-accent text-white">
          <MessageCircle size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13px]">Coach {coachName}</b>
          <span className="block truncate text-xs text-muted">Open your coaching conversation</span>
        </span>
        <ChevronRight
          className="text-muted"
          size={17}
        />
      </button>
      <div className="my-4 h-px bg-separator" />
      <button
        className="flex min-h-11 w-full items-center gap-3 text-left"
        onClick={() => navigate(ROUTES.PROGRESS)}
        type="button"
      >
        <TrendingUp
          className="text-accent"
          size={20}
        />
        <span className="flex-1 text-[13px] font-bold">Weight progress</span>
        <ChevronRight
          className="text-muted"
          size={17}
        />
      </button>
    </div>
  );
}
