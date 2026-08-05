import {Button} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
import MultiSelectAutocomplete from '@/@components/multi-select-autocomplete';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachTrainingExercisesInfiniteQuery, useListMusclesQuery} from '@/api/training-exercises';

import ExerciseListItem from './exercise-list-item';

export default function ListExercises() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingExercisesInfiniteQuery({muscleIds: selectedMuscleIds, search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  const musclesQuery = useListMusclesQuery({});
  const muscles = musclesQuery.data?.data ?? [];

  return (
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create exercise', to: ROUTES.CREATE_EXERCISE}}
      backTo={ROUTES.LIBRARY}
      description="Your movement library for building training plans"
      empty={
        <ListEmptyState
          createLabel="Create exercise"
          createRoute={ROUTES.CREATE_EXERCISE}
          emptyDescription="Create your first exercise to get started."
          hasFilter={!!deferredSearch || selectedMuscleIds.length > 0}
          nounPlural="exercises"
        />
      }
      onOpen={(key) => navigate(ROUTES.EXERCISE_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items, refetch}}
      row={(exercise) => <ExerciseListItem exercise={exercise} />}
      search={{onChange: setSearch, placeholder: 'Search exercises\u2026', value: search}}
      title="Exercises"
      total={total ?? undefined}
      toolbarExtra={
        musclesQuery.isError ? (
          <Button
            onPress={() => musclesQuery.refetch()}
            size="sm"
            variant="secondary"
          >
            Retry muscle groups
          </Button>
        ) : muscles.length > 0 ? (
          <MultiSelectAutocomplete
            collapseToCount
            emptyMessage="No muscles found"
            items={muscles}
            name="muscle_ids"
            onChange={setSelectedMuscleIds}
            placeholder="Muscle groups"
            searchPlaceholder="Search muscles"
            value={selectedMuscleIds}
          />
        ) : null
      }
    />
  );
}
