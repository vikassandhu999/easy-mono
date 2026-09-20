import type {Profile} from '../api/auth';
import {type Goal, type GoalSave, profileGoal} from '../api/goal';

export type GoalDraft = {value: string; unit: 'kg' | 'lbs'; expected: Goal; attempt: GoalSave | null};

export function initialGoalDraft(profile: Profile): GoalDraft {
  return {
    value: profile.goal_weight_value ?? '',
    unit:
      profile.goal_weight_unit === 'lbs' || (!profile.goal_weight_unit && profile.default_weight_unit === 'lbs')
        ? 'lbs'
        : 'kg',
    expected: profileGoal(profile),
    attempt: null,
  };
}

function parseGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object' || !('goal_weight_value' in raw) || !('goal_weight_unit' in raw)) {
    return null;
  }
  if (raw.goal_weight_value === null && raw.goal_weight_unit === null) {
    return {goal_weight_value: null, goal_weight_unit: null};
  }
  if (
    typeof raw.goal_weight_value !== 'number' ||
    !Number.isFinite(raw.goal_weight_value) ||
    raw.goal_weight_value <= 0 ||
    raw.goal_weight_value >= 1000 ||
    (raw.goal_weight_unit !== 'kg' && raw.goal_weight_unit !== 'lbs')
  ) {
    return null;
  }
  return {goal_weight_value: raw.goal_weight_value, goal_weight_unit: raw.goal_weight_unit};
}

export function parseGoalDraft(raw: unknown): GoalDraft | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('value' in raw) ||
    typeof raw.value !== 'string' ||
    raw.value.length > 30 ||
    !('unit' in raw) ||
    (raw.unit !== 'kg' && raw.unit !== 'lbs') ||
    !('expected' in raw) ||
    !('attempt' in raw)
  ) {
    return null;
  }
  const expected = parseGoal(raw.expected);
  if (!expected) {
    return null;
  }
  if (raw.attempt === null) {
    return {value: raw.value, unit: raw.unit, expected, attempt: null};
  }
  if (!raw.attempt || typeof raw.attempt !== 'object' || !('goal' in raw.attempt) || !('expected' in raw.attempt)) {
    return null;
  }
  const goal = parseGoal(raw.attempt.goal);
  const observed = parseGoal(raw.attempt.expected);
  return goal && observed ? {value: raw.value, unit: raw.unit, expected, attempt: {goal, expected: observed}} : null;
}

export function goalInput(value: string, unit: GoalDraft['unit']): Goal {
  const decimal = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(decimal) || Number(decimal) <= 0 || Number(decimal) >= 1000) {
    throw new Error('Enter a goal greater than 0 and less than 1,000, with up to two decimal places.');
  }
  return {goal_weight_value: Number(decimal), goal_weight_unit: unit};
}
