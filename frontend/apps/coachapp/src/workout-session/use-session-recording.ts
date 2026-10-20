import {useDraftController} from '@easy/utils/use-draft-controller';
import {createRecordingController, emptyWorkoutDraft, parseWorkoutDraft} from '@easy/workouts/session';
import {useRecording, type WorkoutLog} from '../api/workout-logs';
import {useDurableDraft} from '../ui/use-durable-draft';
import {recordingStorageKey} from './model';

export function useSessionRecording({initial, clientId}: {initial: WorkoutLog; clientId: string}) {
  const recording = useRecording(clientId);
  const durable = useDurableDraft({
    initial: emptyWorkoutDraft(),
    resource: (owner) => recordingStorageKey(owner, clientId, initial.id),
    parse: (raw) => parseWorkoutDraft(raw, initial.id),
    label: 'workout',
  });
  return useDraftController({initial, durable, ...recording, createController: createRecordingController<WorkoutLog>});
}
