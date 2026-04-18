import {formatDurationFromNow} from '@easy/utils';
import {AlertDialog, Button, Separator, TextArea} from '@heroui/react';
import {Trash2, X} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import type {WorkoutExercise} from '@/workout/components/workout-types';

import {ROUTES} from '@/@config/routes';
import {useCompleteWorkoutSessionMutation, useDiscardWorkoutSessionMutation} from '@/api/workoutSessions';
import {clearWorkoutLocalState} from '@/workout/components/use-workout-local-state';

function computeSummary(exercises: WorkoutExercise[]): {
  completed: number;
  totalPlanned: number;
  totalSets: number;
} {
  let completed = 0;
  let totalPlanned = 0;
  let totalSets = 0;

  for (const ex of exercises) {
    if (!ex.isAdded) {
      totalPlanned++;
      if (ex.isReplaced || ex.status === 'done' || ex.status === 'in_progress') {
        completed++;
      }
    }
    totalSets += ex.sets.length;
  }

  return {completed, totalPlanned, totalSets};
}

const MOOD_OPTIONS = [
  {emoji: '😰', label: 'tough', value: 1},
  {emoji: '😊', label: 'solid', value: 3},
  {emoji: '🔥', label: 'strong', value: 5},
] as const;

export default function FinishWorkout({
  exercises,
  onCancel,
  sessionId,
  startedAt,
  workoutTitle,
}: {
  exercises: WorkoutExercise[];
  onCancel: () => void;
  sessionId: string;
  startedAt: string;
  workoutTitle: string;
}) {
  const navigate = useNavigate();
  const [sorenessRating, setSorenessRating] = useState<null | number>(null);
  const [notes, setNotes] = useState('');
  const [completeSession, {isLoading: isCompleting}] = useCompleteWorkoutSessionMutation();
  const [discardSession, {isLoading: isDiscarding}] = useDiscardWorkoutSessionMutation();

  const summary = computeSummary(exercises);
  const duration = formatDurationFromNow(startedAt);

  const handleComplete = async () => {
    try {
      await completeSession({
        body: {
          notes: notes || null,
          soreness_rating: sorenessRating,
        },
        id: sessionId,
      }).unwrap();
      clearWorkoutLocalState(sessionId);
      navigate(ROUTES.TRAINING);
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleDiscard = async () => {
    try {
      await discardSession(sessionId).unwrap();
      clearWorkoutLocalState(sessionId);
      navigate(ROUTES.TRAINING);
    } catch {
      // Error handled by RTK Query
    }
  };

  return (
    <div className="rounded-xl border border-divider bg-content1 p-4">
      <div className="mb-1 flex justify-end">
        <button
          aria-label="Close"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground-400 transition-colors hover:bg-content2 active:bg-content2"
          onClick={onCancel}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold">💪 Workout complete</h3>
        <p className="mt-1 text-sm text-foreground-500">
          {workoutTitle} · {duration}
        </p>
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        <p className="text-sm">{summary.totalSets} sets logged</p>
        <p className="text-sm text-foreground-500">
          {summary.completed} of {summary.totalPlanned} exercises completed
        </p>
      </div>

      <Separator className="my-4" />

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium">How did it feel?</p>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map((option) => (
            <button
              className={`flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-sm transition-colors ${
                sorenessRating === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-divider text-foreground-500 hover:bg-content2 active:bg-content3'
              }`}
              key={option.value}
              onClick={() => setSorenessRating((prev) => (prev === option.value ? null : option.value))}
              type="button"
            >
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium">Note for your coach (optional)</p>
        <TextArea
          className="w-full"
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="Bench felt great today"
          rows={2}
          value={notes}
        />
      </div>

      <Button
        className="w-full"
        isPending={isCompleting}
        onPress={handleComplete}
        variant="primary"
      >
        Done
      </Button>

      <Separator className="my-3" />

      <AlertDialog>
        <Button
          className="w-full text-danger"
          variant="ghost"
        >
          <Trash2 size={14} />
          Discard workout
        </Button>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Discard workout?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>All logged sets will be lost. This cannot be undone.</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                >
                  Cancel
                </Button>
                <Button
                  isPending={isDiscarding}
                  onPress={handleDiscard}
                  variant="danger"
                >
                  {isDiscarding ? 'Discarding...' : 'Discard'}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
