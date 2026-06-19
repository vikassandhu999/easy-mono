import {Button, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useExercisesInfiniteQuery} from '@/api/exercises';
import MusclePicker from '@/exercises/components/muscle-picker';

import ExerciseListItem from './exercise-list-item';

export default function ListExercises() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);

  const deferredSearch = useDeferredValue(search);
  const list = useExercisesInfiniteQuery({muscle_ids: selectedMuscleIds, search: deferredSearch});
  const {fetchNextPage, isLoading, items, isFetchingNextPage} = useInfiniteItems(list);

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className={'flex items-center'}>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
            isIconOnly
            className={'lg:hidden'}
          >
            <ArrowLeft size={18} />
          </Button>
          <Page.Title>Exercises</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_EXERCISE)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col lg:flex-row gap-3 pt-2 pb-3 bg-surface border-b'}>
        <SearchField
          aria-label="Search exercises"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
          variant={'secondary'}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search exercises..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <div className="lg:min-w-40 space-y-4 rounded-3xl">
          <MusclePicker
            onChange={setSelectedMuscleIds}
            value={selectedMuscleIds}
          />
        </div>
      </Page.Toolbar>
      <Page.Content>
        <BrowseListBox
          ariaLabel="Exercises"
          emptyState={
            <ListEmptyState
              createLabel="Create Exercise"
              createRoute={ROUTES.CREATE_EXERCISE}
              emptyDescription="Create your first exercise to get started."
              filterDescription="Try adjusting your search or filters to find what you're looking for."
              hasFilter={!!deferredSearch || selectedMuscleIds.length > 0}
              nounPlural="exercises"
            />
          }
          fetchNextPage={fetchNextPage}
          isLoading={isLoading || isFetchingNextPage}
          items={items}
          onAction={(key) => navigate(ROUTES.EXERCISE_DETAIL.replace(':id', String(key)))}
          renderItem={(exercise) => <ExerciseListItem exercise={exercise} />}
        />
      </Page.Content>
    </Page>
  );
}
