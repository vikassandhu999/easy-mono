import type {TrainingPlan, TrainingPlanUpdate} from '../api/training-plans';
export type TrainingContent = TrainingPlan['content'];
export type DraftWorkout = TrainingContent['workouts'][number];
export type DraftBlock = DraftWorkout['blocks'][number];
export type DraftItem = DraftBlock['items'][number];
export type DraftSet = DraftItem['sets'][number];
export type PrescriptionDraft = TrainingContent & {name: string; description: string};
export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export function newSet(): DraftSet {
  return {
    id: crypto.randomUUID(),
    kind: 'working',
    reps: null,
    load: null,
    rpe: null,
    rir: null,
    tempo: null,
    duration_s: null,
    distance: null,
    rest_s: null,
    notes: null,
  };
}
export function draftFromPlan(plan?: TrainingPlan): PrescriptionDraft {
  return {
    name: plan?.name ?? 'Untitled training plan',
    description: plan?.description ?? '',
    ...structuredClone(plan?.content ?? {workouts: [], schedule: {cycle_weeks: 1, entries: []}}),
  };
}
export function prescriptionBody(
  draft: PrescriptionDraft,
  revision: number,
): TrainingPlanUpdate & {content: TrainingContent} {
  return {
    expected_revision: revision,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    content: {workouts: draft.workouts, schedule: draft.schedule},
  };
}
export function duplicateWorkout(workout: DraftWorkout): DraftWorkout {
  return {
    ...structuredClone(workout),
    id: crypto.randomUUID(),
    name: `${workout.name} (copy)`,
    blocks: workout.blocks.map((block) => ({
      ...structuredClone(block),
      id: crypto.randomUUID(),
      items: block.items.map((item) => ({
        ...structuredClone(item),
        id: crypto.randomUUID(),
        sets: item.sets.map((set) => ({...structuredClone(set), id: crypto.randomUUID()})),
      })),
    })),
  };
}
