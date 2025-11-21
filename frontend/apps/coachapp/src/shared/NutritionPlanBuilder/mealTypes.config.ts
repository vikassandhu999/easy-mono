import {MealDaytime} from '@/services/meals';

export const MEAL_TYPES: {label: string; value: MealDaytime}[] = [
    {label: 'Early Morning', value: 'early_morning'},
    {label: 'Breakfast', value: 'breakfast'},
    {label: 'Pre Workout', value: 'pre_workout'},
    {label: 'Lunch', value: 'lunch'},
    {label: 'Post Workout', value: 'post_workout'},
    {label: 'Snack', value: 'snack'},
    {label: 'Dinner', value: 'dinner'},
];
