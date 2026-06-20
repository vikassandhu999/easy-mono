import type {PlannedSet} from '@/api/trainingPlans';
import {parseNonNegativeInt, parseNonNegativeNumber} from '@/training-plans/lib/parse';

type LoadUnitValue = NonNullable<PlannedSet['load_unit']>;

export type InlineExerciseDraft = {
  exerciseNotes: string;
  loadUnit: LoadUnitValue;
  loadValue: string;
  reps: string;
  rest: string;
  restUnit: 'min' | 'sec';
  sets: string;
};

export function isValidSetCountInput(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1;
}

export function deriveRestFromReps(reps: string): string {
  const parsed = parseRepLowerBound(reps);
  if (parsed == null) {
    return '';
  }
  if (parsed <= 6) {
    return '120';
  }
  if (parsed <= 12) {
    return '90';
  }
  return '60';
}

function parseRepLowerBound(value: string): null | number {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const match = cleaned.match(/\d+/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPlannedSetsFromForm(values: InlineExerciseDraft): PlannedSet[] {
  const setsCount = Math.max(1, parseNonNegativeInt(values.sets) ?? 1);
  const loadValue = parseNonNegativeNumber(values.loadValue);
  const restRaw = parseNonNegativeNumber(values.rest);
  const restSeconds = restRaw != null ? Math.round(values.restUnit === 'min' ? restRaw * 60 : restRaw) : null;

  const one: PlannedSet = {
    load_unit: values.loadUnit,
    ...(values.reps && {target_reps: values.reps}),
    ...(loadValue != null && {load_value: loadValue}),
    ...(restSeconds != null && {rest_seconds: restSeconds}),
  };

  return Array.from({length: setsCount}, () => ({...one}));
}

export function deriveFormFromSets(
  defaults: InlineExerciseDraft,
  sets: PlannedSet[],
  fallbackLoadUnit: LoadUnitValue = 'kg',
): InlineExerciseDraft {
  const first = sets[0];
  const count = sets.length;
  if (!first) {
    return {...defaults, loadUnit: fallbackLoadUnit};
  }
  return {
    ...defaults,
    exerciseNotes: '',
    loadUnit: (first.load_unit as LoadUnitValue | undefined) ?? fallbackLoadUnit,
    loadValue: first.load_value != null ? String(first.load_value) : '',
    reps: first.target_reps ?? '',
    rest: first.rest_seconds != null ? String(first.rest_seconds) : '',
    restUnit: 'sec',
    sets: String(Math.max(1, count)),
  };
}

export function toggleRestUnitValue({rest, restUnit}: {rest: string; restUnit: 'min' | 'sec'}): {
  rest: string;
  restUnit: 'min' | 'sec';
} {
  const nextUnit: 'min' | 'sec' = restUnit === 'sec' ? 'min' : 'sec';
  const trimmed = rest.trim();
  if (!trimmed) {
    return {rest, restUnit: nextUnit};
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return {rest, restUnit: nextUnit};
  }

  const converted = nextUnit === 'min' ? parsed / 60 : parsed * 60;
  const rounded = Math.round(converted * 100) / 100;
  return {
    rest: String(rounded),
    restUnit: nextUnit,
  };
}
