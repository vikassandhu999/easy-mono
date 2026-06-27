import {Button, Chip} from '@heroui/react';
import {Check, ChevronDown, ChevronUp, Plus, RefreshCw, SkipForward} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useGetClientExerciseQuery} from '@/api/exercises';
import ExercisePicker from '@/workout/components/exercise-picker';
import type {WorkoutExercise} from '@/workout/components/workout-types';

// ── Status badge ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, undefined | {color: 'danger' | 'default' | 'success' | 'warning'; label: string}> =
  {
    done: {color: 'success', label: 'Done'},
    in_progress: {color: 'warning', label: 'In progress'},
    skipped: {color: 'default', label: 'Skipped'},
  };

// ── Set summary for collapsed view ──────────────────────────

function formatCollapsedSummary(exercise: WorkoutExercise): string {
  const totalPlanned = exercise.plannedSets.length;
  const totalLogged = exercise.sets.length;

  if (totalPlanned > 0) {
    const firstSet = exercise.plannedSets[0];
    const reps = firstSet?.target_reps ?? '';
    const load = firstSet?.load_value ? `${firstSet.load_value} ${firstSet.load_unit ?? ''}`.trim() : '';
    const scheme = [totalPlanned.toString(), reps ? `\u00D7 ${reps}` : '', load ? `@ ${load}` : '']
      .filter(Boolean)
      .join(' ');
    if (totalLogged > 0) {
      return `${scheme} \u00B7 ${totalLogged}/${totalPlanned} done`;
    }
    return scheme;
  }

  if (totalLogged > 0) {
    return `${totalLogged} set${totalLogged !== 1 ? 's' : ''} logged`;
  }
  return 'No sets';
}

// ── Component ────────────────────────────────────────────────

export default function ExerciseRow({
  children,
  exercise,
  isExpanded,
  onReplace,
  onSkip,
  onToggle,
}: {
  children?: React.ReactNode;
  exercise: WorkoutExercise;
  isExpanded: boolean;
  onReplace?: (selected: {id: string; name: string}) => void;
  onSkip: () => void;
  onToggle: () => void;
}) {
  const [showReplacePicker, setShowReplacePicker] = useState(false);

  // Fetch the original exercise's muscles for smart replacement suggestions
  const {data: exerciseDetail} = useGetClientExerciseQuery(exercise.exerciseId, {
    skip: !showReplacePicker,
  });
  const replaceMuscleIds = useMemo(() => {
    const muscles = exerciseDetail?.data?.muscles;
    if (!muscles || muscles.length === 0) {
      return undefined;
    }
    return muscles.map((m) => m.id).join(',');
  }, [exerciseDetail]);

  const statusConfig = STATUS_CONFIG[exercise.status];
  const summary = formatCollapsedSummary(exercise);
  const canSkip = exercise.status === 'not_started' && !exercise.isAdded;
  const canReplace =
    (exercise.status === 'not_started' || exercise.status === 'in_progress') &&
    !exercise.isAdded &&
    !exercise.isReplaced;

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Header — always visible, tappable */}
      <Button
        className="flex h-auto min-h-11 w-full items-center gap-3 rounded-none px-4 py-3 text-left"
        onPress={onToggle}
        variant="ghost"
      >
        {/* Status indicator */}
        <div className="flex size-6 shrink-0 items-center justify-center">
          {exercise.status === 'done' ? (
            <Check
              className="text-success"
              size={18}
            />
          ) : exercise.status === 'skipped' ? (
            <SkipForward
              className="text-muted"
              size={16}
            />
          ) : (
            <div className="size-2.5 rounded-full bg-default" />
          )}
        </div>

        {/* Exercise info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{exercise.exerciseName}</p>
            {exercise.isReplaced ? (
              <RefreshCw
                className="shrink-0 text-muted"
                size={12}
              />
            ) : null}
            {exercise.isAdded ? (
              <Plus
                className="shrink-0 text-muted"
                size={12}
              />
            ) : null}
          </div>
          {!isExpanded ? <p className="mt-0.5 truncate text-xs text-muted">{summary}</p> : null}
          {exercise.isReplaced && isExpanded ? (
            <p className="mt-0.5 text-xs text-muted">Replaces {exercise.originalExerciseName}</p>
          ) : null}
        </div>

        {/* Status chip + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          {statusConfig ? (
            <Chip
              color={statusConfig.color}
              size="sm"
              variant="soft"
            >
              {statusConfig.label}
            </Chip>
          ) : null}
          {isExpanded ? (
            <ChevronUp
              className="text-muted"
              size={16}
            />
          ) : (
            <ChevronDown
              className="text-muted"
              size={16}
            />
          )}
        </div>
      </Button>

      {/* Expanded content */}
      {isExpanded ? (
        <div className="px-4 pb-4">
          {/* Action buttons: Replace + Skip */}
          {canReplace || canSkip ? (
            <div className="mb-3 flex items-center gap-2">
              {canReplace && onReplace ? (
                <Button
                  onPress={() => setShowReplacePicker((prev) => !prev)}
                  size="sm"
                  variant="ghost"
                >
                  <RefreshCw size={14} />
                  Replace
                </Button>
              ) : null}
              {canSkip ? (
                <Button
                  onPress={onSkip}
                  size="sm"
                  variant="ghost"
                >
                  <SkipForward size={14} />
                  Skip
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* Replace exercise picker */}
          {showReplacePicker && onReplace ? (
            <div className="mb-3">
              <ExercisePicker
                defaultMuscleIds={replaceMuscleIds}
                onSelect={(selected) => {
                  onReplace(selected);
                  setShowReplacePicker(false);
                }}
                placeholder="Search replacement exercise..."
              />
            </div>
          ) : null}

          {/* Children = set logging UI */}
          {children}
        </div>
      ) : null}
    </div>
  );
}
