import {CreateTrainingPlan, TrainingPlan} from '@/services/training_plans';

export const getDefaultValues: CreateTrainingPlan = {
    name: '',
    description: '',
    is_template: true,
    duration_weeks: 4,
    workouts: [],
};

export const populateTrainingPlan = (plan: TrainingPlan): CreateTrainingPlan => {
    return {
        name: plan.name,
        description: plan.description || '',
        is_template: plan.is_template,
        duration_weeks: plan.duration_weeks,
        workouts: plan.workouts,
    };
};
