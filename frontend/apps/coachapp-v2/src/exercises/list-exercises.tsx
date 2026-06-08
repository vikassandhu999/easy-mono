import {Button, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useGoBack} from '@/@hooks/use-go-back';
import MusclePicker from '@/exercises/components/muscle-picker';

import {ExercisesBrowseList} from './exercises-list';

export default function ListExercises() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(search);

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
        <ExercisesBrowseList
          hasFilter={!!debouncedSearch || selectedMuscleIds.length > 0}
          muscleIds={selectedMuscleIds}
          search={debouncedSearch}
        />
      </Page.Content>
    </Page>
  );
}
