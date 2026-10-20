export const metricKeys = [
  'reps',
  'weight',
  'duration',
  'distance',
  'elevation_gain',
  'height',
  'calories',
  'speed',
  'incline',
  'level',
  'power',
  'cadence',
  'heart_rate',
  'effort',
  'reserve',
  'successes',
  'attempts',
  'score',
  'result',
  'tempo',
] as const;

export type MetricKey = (typeof metricKeys)[number];
export type MetricInfo = {label: string; unit: string; text?: boolean};

export const metricCatalogue: Record<MetricKey, MetricInfo> = {
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
  tempo: {label: 'Tempo', unit: '', text: true},
};

export const historicalMetrics = {grade: {label: 'Grade', unit: '', text: true}};

export const defaultMetrics: Record<'movement' | 'activity' | 'sport' | 'practice', MetricKey[]> = {
  movement: ['reps', 'weight'],
  activity: ['distance', 'duration'],
  sport: ['duration', 'result', 'score'],
  practice: ['duration'],
};

export function metricLabel(key: MetricKey | 'grade', metric?: {label: string | null}): string {
  return metric?.label ?? (key === 'grade' ? historicalMetrics.grade.label : metricCatalogue[key].label);
}
