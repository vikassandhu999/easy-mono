import type {Exercise} from '@/api/exercises';

export type ExercisesListFilters = {
  muscleIds: string[];
  search: string;
};

export type ExercisesListQueryResult = {
  exercises: Exercise[];
  fetchNextPage: () => void;
  isLoading: boolean;
};
