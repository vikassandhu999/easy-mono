import {Button} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useCoachTrainingExercisesInfiniteQuery, useExerciseOptionsQueries} from '@/api/training-exercises';
import {ROUTES} from '@/routes';
import BrowseScreen from '@/ui/browse-screen';
import ListEmptyState from '@/ui/list-empty-state';
import MultiSelectAutocomplete from '@/ui/multi-select-autocomplete';
import {useInfiniteItems} from '@/ui/use-infinite-items';

import ExerciseListItem from './exercise-list-item';

export default function ListExercises() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [muscleIds, setMuscleIds] = useState<string[]>([]);
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingExercisesInfiniteQuery({equipmentIds, muscleIds, search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  // Both filters come from one hook: an exercise is described by muscle AND
  // equipment everywhere else in the app (form, picker), and the backend has
  // taken `equipment_ids` on this endpoint all along — only the control was
  // missing. One load/error/retry for the pair, which the hook already owns.
  const options = useExerciseOptionsQueries();

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
          hasFilter={!!deferredSearch || muscleIds.length > 0 || equipmentIds.length > 0}
          nounPlural="exercises"
        />
      }
      onOpen={(key) => navigate(ROUTES.EXERCISE_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items, refetch}}
      row={(exercise) => <ExerciseListItem exercise={exercise} />}
      search={{onChange: setSearch, placeholder: 'Search exercises\u2026', value: search}}
      title="Exercises"
      {...(total !== undefined ? {total} : {})}
      toolbarExtra={
        options.isError ? (
          <Button
            onPress={options.retry}
            size="sm"
            variant="secondary"
          >
            Retry filters
          </Button>
        ) : (
          <>
            {options.muscles.length > 0 ? (
              <MultiSelectAutocomplete
                collapseToCount
                emptyMessage="No muscles found"
                items={options.muscles}
                name="muscle_ids"
                onChange={setMuscleIds}
                placeholder="Muscles"
                searchPlaceholder="Search muscles"
                value={muscleIds}
              />
            ) : null}
            {options.equipment.length > 0 ? (
              <MultiSelectAutocomplete
                collapseToCount
                emptyMessage="No equipment found"
                items={options.equipment}
                name="equipment_ids"
                onChange={setEquipmentIds}
                placeholder="Equipment"
                searchPlaceholder="Search equipment"
                value={equipmentIds}
              />
            ) : null}
          </>
        )
      }
    />
  );
}
