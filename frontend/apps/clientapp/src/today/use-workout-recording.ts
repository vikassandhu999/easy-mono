import {useDraftController} from '@easy/utils/use-draft-controller';
import {
  createRecordingController,
  emptyWorkoutDraft,
  parseWorkoutDraft,
  type SessionOperation,
} from '@easy/workouts/session';
import {useRecording, type WorkoutLog} from '../api/workout-logs';
import {useDurableDraft} from '../ui/use-durable-draft';

export function useWorkoutRecording({
  initial,
  resource,
  onAcknowledged,
}: {
  initial: WorkoutLog | null;
  resource: string;
  onAcknowledged: (operation: SessionOperation) => void;
}) {
  const recording = useRecording();
  const durable = useDurableDraft({initial: emptyWorkoutDraft(), resource, parse: parseWorkoutDraft, label: 'workout'});
  return useDraftController({
    initial,
    durable,
    ...recording,
    createController: createRecordingController<WorkoutLog>,
    onAcknowledged,
  });
}
