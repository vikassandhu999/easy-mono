import {defaultMetrics} from '@easy/workouts/metrics';
import type {Exercise, ExerciseCreate} from '../api/exercises';

export const kinds = ['movement', 'activity', 'sport', 'practice'] as const;
export const goals = ['strength', 'endurance', 'power', 'mobility', 'balance', 'skill', 'recovery'] as const;
export const places = ['gym', 'home', 'outdoor', 'pool', 'court/field', 'studio'] as const;
export const placeLabels: Record<string, string> = {'court/field': 'Court / field'};
export const kindLabels = {movement: 'Movement', activity: 'Activity', sport: 'Sport', practice: 'Practice'};
export function exerciseBody(exercise?: Exercise): ExerciseCreate {
  return exercise
    ? {
        name: exercise.name,
        kind: exercise.kind,
        instructions: exercise.instructions,
        goals: exercise.goals,
        places: exercise.places,
        metrics: exercise.metrics,
        equipment: exercise.equipment,
        muscles: exercise.muscles,
        media: exercise.media,
      }
    : {
        name: '',
        kind: 'movement',
        instructions: null,
        goals: [],
        places: [],
        metrics: defaultMetrics.movement.map((key) => ({key, label: null})),
        equipment: null,
        muscles: [],
        media: [],
      };
}
export function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
}
