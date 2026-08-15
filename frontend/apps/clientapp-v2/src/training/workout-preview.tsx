import {Spinner} from '@heroui/react';
import {ArrowLeft, Play} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {
  useCreateClientTrainingSessionMutation,
  useGetClientActiveTrainingSessionQuery,
  useResolveClientTrainingCoverageQuery,
} from '@/api/training';
import {estimatedMinutes, totalSets} from '@/training/training-utils';

export default function WorkoutPreview() {
  const {workoutId} = useParams();
  const navigate = useNavigate();
  const {data, isLoading} = useResolveClientTrainingCoverageQuery();
  const {data: activeData, isLoading: activeLoading} = useGetClientActiveTrainingSessionQuery();
  const createSession = useCreateClientTrainingSessionMutation();
  const starting = createSession.isPending;
  const workout = data?.data?.plan.workouts.find((candidate) => candidate.id === workoutId);
  const active = activeData?.data;

  const start = async () => {
    if (active) {
      navigate(ROUTES.WORKOUT_ACTIVE);
      return;
    }
    if (!workout) {
      return;
    }
    try {
      await createSession.mutateAsync({training_workout_id: workout.id});
      navigate(ROUTES.WORKOUT_ACTIVE);
    } catch {
      // the mutation's error state surfaces the failure.
    }
  };

  if (isLoading || activeLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }
  if (!workout) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-muted">Workout not found.</div>
    );
  }

  return (
    <div className="px-5 pb-7 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <button
        aria-label="Back"
        className="-ml-1 mb-3 grid size-[38px] place-items-center rounded-[11px]"
        onClick={() => navigate(-1)}
        type="button"
      >
        <ArrowLeft size={22} />
      </button>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent">Training plan</p>
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-[-0.025em]">{workout.name}</h1>
      <p className="mt-1 text-[13px] text-muted">
        {workout.workout_elements.length} exercises · {totalSets(workout)} sets
        {estimatedMinutes(workout) ? ` · ~${estimatedMinutes(workout)} min` : ''}
      </p>

      <p className="mb-3 mt-5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Exercises</p>
      <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
        {workout.workout_elements.map((element, index) => (
          <div
            className="flex items-center gap-3 border-t border-separator p-3.5 first:border-t-0"
            key={element.id}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-surface-secondary text-xs font-extrabold text-muted">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm">{element.exercise?.name ?? 'Exercise'}</b>
              <span className="mt-0.5 block text-[11px] text-muted">
                {element.planned_sets.length} sets · {element.exercise?.tracking_type?.replaceAll('_', ' ') ?? 'reps'}
              </span>
            </span>
          </div>
        ))}
      </div>
      <button
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[15px] bg-accent text-base font-extrabold text-white disabled:opacity-50"
        disabled={starting}
        onClick={start}
        type="button"
      >
        <Play
          fill="currentColor"
          size={16}
        />
        {active ? 'Resume workout' : starting ? 'Starting…' : 'Start workout'}
      </button>
    </div>
  );
}
