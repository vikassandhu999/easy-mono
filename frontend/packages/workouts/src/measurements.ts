import {type MetricKey, metricLabel} from './metrics.ts';

export type MeasurementField = {
  field: string;
  scope: 'both' | 'detail';
  integer: boolean;
  min?: number;
  max?: number;
};

export const measurementFields = {
  reps: {field: 'reps', scope: 'both', integer: true, min: 0},
  weight: {field: 'weight_kg', scope: 'both', integer: false},
  duration: {field: 'duration_s', scope: 'both', integer: false, min: 0},
  distance: {field: 'distance_m', scope: 'both', integer: false, min: 0},
  elevation_gain: {field: 'elevation_gain_m', scope: 'both', integer: false, min: 0},
  height: {field: 'height_cm', scope: 'both', integer: false, min: 0},
  calories: {field: 'calories_kcal', scope: 'both', integer: false, min: 0},
  speed: {field: 'avg_speed_m_s', scope: 'both', integer: false, min: 0},
  incline: {field: 'incline_pct', scope: 'both', integer: false},
  level: {field: 'level', scope: 'both', integer: true, min: 1},
  power: {field: 'avg_power_w', scope: 'both', integer: false, min: 0},
  cadence: {field: 'avg_cadence_per_min', scope: 'both', integer: false, min: 0},
  heart_rate: {field: 'avg_heart_rate_bpm', scope: 'both', integer: false, min: 0},
  effort: {field: 'effort', scope: 'both', integer: false, min: 1, max: 10},
  reserve: {field: 'reserve', scope: 'detail', integer: false, min: 0, max: 10},
  successes: {field: 'successes', scope: 'both', integer: true, min: 0},
  attempts: {field: 'attempts', scope: 'both', integer: true, min: 0},
  score: {field: 'score', scope: 'both', integer: false},
  result: {field: 'result', scope: 'both', integer: false},
  tempo: null,
} as const satisfies Record<MetricKey, MeasurementField | null>;

export type ParsedMeasurement = {ok: true; value: number | string | null} | {ok: false; message: string};

const unitFactors: Partial<Record<MetricKey, Record<string, number>>> = {
  reps: {count: 1, reps: 1},
  weight: {kg: 1, lb: 0.45359237},
  duration: {s: 1, min: 60, 'h:mm:ss': 1},
  distance: {m: 1, km: 1000, mi: 1609.344, yd: 0.9144},
  elevation_gain: {m: 1, ft: 0.3048},
  height: {cm: 1, in: 2.54},
  calories: {kcal: 1},
  speed: {'m/s': 1, 'km/h': 1 / 3.6, mph: 0.44704},
  incline: {'%': 1},
  level: {level: 1},
  power: {W: 1},
  cadence: {rpm: 1, spm: 1},
  heart_rate: {bpm: 1},
  effort: {RPE: 1},
  reserve: {RIR: 1},
  successes: {count: 1},
  attempts: {count: 1},
  score: {points: 1},
};

const paceDistances: Record<string, number> = {'min/km': 1000, 'min/mi': 1609.344, 'min/100m': 100};

export function parseMeasurement(metric: MetricKey, input: string, unit?: string): ParsedMeasurement {
  const definition: MeasurementField | null = measurementFields[metric];
  if (definition === null) {
    return {ok: false, message: `${metricLabel(metric)} is a target, not a recorded measurement.`};
  }
  const text = input.trim();
  if (text === '') {
    return {ok: true, value: null};
  }
  if (metric === 'result') {
    return ['win', 'draw', 'loss'].includes(text)
      ? {ok: true, value: text}
      : {ok: false, message: 'Choose Win, Draw, or Loss.'};
  }

  const clockInput = text.includes(':');
  const paceDistance = metric === 'speed' && unit ? paceDistances[unit] : undefined;
  const clockAllowed = metric === 'duration' || paceDistance !== undefined;
  const value = clockInput && clockAllowed ? parseClock(text) : parseNumber(text);
  if (!Number.isFinite(value)) {
    return {ok: false, message: `Enter a finite ${metricLabel(metric)} value.`};
  }

  let canonical = value;
  if (paceDistance !== undefined) {
    canonical = paceDistance / (clockInput ? value : value * 60);
  } else if (unit !== undefined) {
    const factor = unitFactors[metric]?.[unit];
    if (factor === undefined) {
      return {ok: false, message: `Use a registered unit for ${metricLabel(metric)}.`};
    }
    canonical = clockInput ? value : value * factor;
  }

  if (!Number.isFinite(canonical) || (definition.integer && !Number.isInteger(canonical))) {
    return {ok: false, message: definition.integer ? 'Enter a whole number.' : 'Enter a finite number.'};
  }
  if (definition.min !== undefined && canonical < definition.min) {
    return {ok: false, message: `Enter ${definition.min} or more.`};
  }
  if (definition.max !== undefined && canonical > definition.max) {
    return {ok: false, message: `Enter ${definition.max} or less.`};
  }
  return {ok: true, value: canonical};
}

function parseNumber(text: string): number {
  const normalized = text.replace(',', '.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function parseClock(text: string): number {
  if (!/^\d+(?::\d{1,2}){1,2}(?:\.\d+)?$/.test(text)) {
    return Number.NaN;
  }
  const parts = text.split(':').map(Number);
  if (parts.slice(1).some((value) => value >= 60)) {
    return Number.NaN;
  }
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}
