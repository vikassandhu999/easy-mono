import {PlanDiscipline} from '@/services/plans';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const DISCIPLINE_ADD_LABEL: Record<PlanDiscipline, string> = {
    nutrition: 'Add Meal',
    workout: 'Add Workout',
};

export const DEFAULT_ADD_LABEL = 'Add Session';
