import type {Exercise, ExerciseCreate} from '../api/exercises';

export const kinds = ['movement', 'activity', 'sport', 'practice'] as const;
export const goals = ['strength', 'endurance', 'power', 'mobility', 'balance', 'skill', 'recovery'] as const;
export const places = ['gym', 'home', 'outdoor', 'pool', 'court/field', 'studio'] as const;
export const placeLabels: Record<string, string> = {'court/field': 'Court / field'};
export const metricInfo: Record<string, {label: string; unit: string; text?: boolean}> = {
  reps: {label: 'Reps', unit: 'reps'},
  weight: {label: 'Weight', unit: 'kg'},
  duration: {label: 'Time', unit: 'seconds or m:ss'},
  distance: {label: 'Distance', unit: 'm'},
  elevation_gain: {label: 'Elevation gain', unit: 'm'},
  height: {label: 'Height', unit: 'cm'},
  calories: {label: 'Calories', unit: 'kcal'},
  speed: {label: 'Speed', unit: 'm/s'},
  incline: {label: 'Incline', unit: '%'},
  level: {label: 'Level', unit: ''},
  power: {label: 'Power', unit: 'W'},
  cadence: {label: 'Cadence', unit: 'per minute'},
  heart_rate: {label: 'Heart rate', unit: 'bpm'},
  effort: {label: 'Effort', unit: 'RPE 1–10'},
  reserve: {label: 'Reserve', unit: 'RIR 0–10'},
  successes: {label: 'Successes', unit: 'count'},
  attempts: {label: 'Attempts', unit: 'count'},
  score: {label: 'Score', unit: 'points'},
  result: {label: 'Result', unit: '', text: true},
  grade: {label: 'Grade', unit: '', text: true},
  tempo: {label: 'Tempo', unit: '', text: true},
  rest: {label: 'Rest', unit: 'seconds or m:ss'},
};
export const metricKeys = Object.keys(metricInfo).filter((key) => key !== 'rest');
export const kindLabels = {movement: 'Movement', activity: 'Activity', sport: 'Sport', practice: 'Practice'};
export const defaults = {
  movement: ['reps', 'weight'],
  activity: ['distance', 'duration'],
  sport: ['duration', 'result', 'score'],
  practice: ['duration'],
};
export function exerciseBody(exercise?: Exercise): ExerciseCreate {
  return exercise
    ? {
        name: exercise.name,
        kind: exercise.kind,
        goals: exercise.goals,
        places: exercise.places,
        metrics: exercise.metrics,
        count_label: exercise.count_label,
        grade_scale: exercise.grade_scale,
        unilateral: exercise.unilateral,
        equipment: exercise.equipment,
        muscles: exercise.muscles,
        media: exercise.media,
      }
    : {
        name: '',
        kind: 'movement',
        goals: ['strength'],
        places: ['gym'],
        metrics: ['reps', 'weight'],
        count_label: null,
        grade_scale: [],
        unilateral: false,
        equipment: [],
        muscles: [],
        media: null,
      };
}
export function labelOf(key: string, exercise?: Pick<Exercise, 'count_label'>) {
  if (exercise?.count_label) {
    if (key === 'reps') {
      return exercise.count_label;
    }
    if (key === 'successes' || key === 'attempts') {
      return `${exercise.count_label} · ${metricInfo[key]?.label}`;
    }
  }
  return metricInfo[key]?.label ?? key;
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
