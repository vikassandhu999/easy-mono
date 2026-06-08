import type {TrainingPlan} from '@/api/trainingPlans';

export type TrainingPlansListFilters = {
  search: string;
};

export type TrainingPlansListQueryResult = {
  fetchNextPage: () => void;
  isLoading: boolean;
  plans: TrainingPlan[];
};
