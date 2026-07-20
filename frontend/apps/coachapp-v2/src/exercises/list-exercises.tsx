import {Button, SearchField} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useListMusclesQuery} from '@/api/generated';
import {useCoachTrainingExercisesInfiniteQuery} from '@/api/training-exercises';
import MultiSelectAutocomplete from '@/exercises/components/multi-select-autocomplete';

import ExerciseListItem from './exercise-list-item';

export default function ListExercises() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingExercisesInfiniteQuery({muscleIds: selectedMuscleIds, search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);
  const total = list.data?.pages[0]?.count;

  const {data: musclesData} = useListMusclesQuery({});
  const muscles = musclesData?.data ?? [];

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
          <div className="min-w-0">
            <Page.Title>Exercises</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Your movement library for building training plans
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create exercise"
            onPress={() => navigate(ROUTES.CREATE_EXERCISE)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create exercise</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={'sticky top-0 z-10 flex items-center gap-3 bg-background pt-2 pb-3'}
        size="content"
      >
        <SearchField
          aria-label="Search exercises"
          className="min-w-0 flex-1 sm:max-w-72"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search exercises…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {muscles.length > 0 && (
          <div className="shrink-0">
            <MultiSelectAutocomplete
              emptyMessage="No muscles found"
              items={muscles}
              name="muscle_ids"
              onChange={setSelectedMuscleIds}
              placeholder="Muscle groups"
              searchPlaceholder="Search muscles…"
              value={selectedMuscleIds}
            />
          </div>
        )}
        {total != null && (
          <span className="ms-auto hidden shrink-0 text-sm text-muted sm:block">{total} exercises</span>
        )}
      </Page.Toolbar>
      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="content"
        >
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <BrowseListBox
              ariaLabel="Exercises"
              className="flex-1 p-0"
              emptyState={
                <ListEmptyState
                  createLabel="Create exercise"
                  createRoute={ROUTES.CREATE_EXERCISE}
                  emptyDescription="Create your first exercise to get started."
                  hasFilter={!!deferredSearch || selectedMuscleIds.length > 0}
                  nounPlural="exercises"
                />
              }
              fetchNextPage={fetchNextPage}
              isError={isError}
              isLoading={isLoading}
              onRetry={refetch}
              items={items}
              onAction={(key) => navigate(ROUTES.EXERCISE_DETAIL.replace(':id', String(key)))}
              renderItem={(exercise) => <ExerciseListItem exercise={exercise} />}
            />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
