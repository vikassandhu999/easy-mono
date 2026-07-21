import {Button, SearchField} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import BrowseListBox, {
  BROWSE_LIST_FRAME_CLASS,
  BROWSE_LIST_SURFACE_CLASS,
  BROWSE_SEARCH_GROUP_CLASS,
} from '@/@components/browse-list-box';
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
      <Page.Header
        className="bg-surface pb-1 sm:bg-transparent sm:pb-2"
        size="content"
      >
        <Page.TitleGroup className="flex min-w-0 items-center gap-1">
          {/* Below lg there's no sidebar and (by design) no bottom nav on the
              library lists — this is the way back to the Builder hub. */}
          <BackButton
            className="lg:hidden"
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
            className="min-h-11 min-w-11 rounded-control"
            onPress={() => navigate(ROUTES.CREATE_EXERCISE)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create exercise</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className="sticky top-0 z-10 mb-0 flex items-center gap-3 border-b border-border bg-surface pt-2 pb-3 sm:mb-6 sm:border-0 sm:bg-background"
        size="content"
      >
        <SearchField
          aria-label="Search exercises"
          className="min-w-0 flex-1 sm:max-w-72"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className={BROWSE_SEARCH_GROUP_CLASS}>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11"
              placeholder="Search exercises…"
            />
            <SearchField.ClearButton className="min-h-11 min-w-11" />
          </SearchField.Group>
        </SearchField>
        {muscles.length > 0 && (
          <div className="w-40 shrink-0">
            <MultiSelectAutocomplete
              collapseToCount
              emptyMessage="No muscles found"
              items={muscles}
              name="muscle_ids"
              onChange={setSelectedMuscleIds}
              placeholder="Muscles"
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
          className={BROWSE_LIST_FRAME_CLASS}
          size="content"
        >
          <div className={BROWSE_LIST_SURFACE_CLASS}>
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
