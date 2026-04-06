import {formatDurationFromNow} from '@easy/utils';
import {AlertDialog, Button, Separator, TextArea} from '@heroui/react';
import {Check, Clock, Dumbbell, Trash2} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import type {WorkoutExercise} from '@/workout/components/workout-types';

import {ROUTES} from '@/@config/routes';
import {useCompleteWorkoutSessionMutation, useDiscardWorkoutSessionMutation} from '@/api/workoutSessions';
import {clearWorkoutLocalState} from '@/workout/components/use-workout-local-state';

// ── Helpers ──────────────────────────────────────────────────

function computeSummary(exercises: WorkoutExercise[]): {
  added: number;
  completed: number;
  replaced: number;
  skipped: number;
  totalPlanned: number;
  totalSets: number;
} {
  let completed = 0;
  let replaced = 0;
  let skipped = 0;
  let added = 0;
  let totalSets = 0;
  let totalPlanned = 0;

  for (const ex of exercises) {
    if (ex.isAdded) {
      added++;
    } else {
      totalPlanned++;
      if (ex.status === 'skipped') {
        skipped++;
      } else if (ex.isReplaced) {
        replaced++;
        completed++;
      } else if (ex.sets.length > 0) {
        completed++;
      } else {
        skipped++;
      }
    }
    totalSets += ex.sets.length;
  }

  return {added, completed, replaced, skipped, totalPlanned, totalSets};
}

const SORENESS_OPTIONS = [1, 2, 3, 4, 5] as const;

// ── Component ────────────────────────────────────────────────

export default function FinishWorkout({
  exercises,
  onCancel,
  sessionId,
  startedAt,
}: {
  exercises: WorkoutExercise[];
  onCancel: () => void;
  sessionId: string;
  startedAt: string;
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
      navigate(ROUTES.DASHBOARD);
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleDiscard = async () => {
    try {
      await discardSession(sessionId).unwrap();
      clearWorkoutLocalState(sessionId);
      navigate(ROUTES.DASHBOARD);
    } catch {
      // Error handled by RTK Query
    }
  };

  return (
    <div className="rounded-xl border border-divider bg-content1 p-4">
      <h3 className="text-base font-semibold">Finish workout?</h3>

      {/* Duration + counts */}
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-foreground-500">
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {duration}
        </span>
        <span className="flex items-center gap-1.5">
          <Dumbbell size={14} />
          {summary.completed}/{summary.totalPlanned} exercises
        </span>
        <span className="flex items-center gap-1.5">
          <Check size={14} />
          {summary.totalSets} sets
        </span>
      </div>

      {/* Detail chips */}
      {summary.replaced > 0 || summary.skipped > 0 || summary.added > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-foreground-400">
          {summary.replaced > 0 ? <span>{summary.replaced} replaced</span> : null}
          {summary.replaced > 0 && (summary.skipped > 0 || summary.added > 0) ? <span>&middot;</span> : null}
          {summary.skipped > 0 ? <span>{summary.skipped} skipped</span> : null}
          {summary.skipped > 0 && summary.added > 0 ? <span>&middot;</span> : null}
          {summary.added > 0 ? <span>{summary.added} added</span> : null}
        </div>
      ) : null}

      <Separator className="my-4" />

      {/* Soreness rating */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-foreground-500">How are you feeling?</p>
        <div className="flex gap-2">
          {SORENESS_OPTIONS.map((rating) => (
            <button
              className={`flex size-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                sorenessRating === rating
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-divider text-foreground-500 hover:bg-content2 active:bg-content3'
              }`}
              key={rating}
              onClick={() => setSorenessRating((prev) => (prev === rating ? null : rating))}
              type="button"
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <TextArea
          className="w-full"
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="How was the session? (optional)"
          rows={2}
          value={notes}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          isPending={isCompleting}
          onPress={handleComplete}
          variant="primary"
        >
          <Check size={16} />
          Complete workout
        </Button>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Continue training
        </Button>
      </div>

      <Separator className="my-3" />

      {/* Discard — with confirmation dialog */}
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
