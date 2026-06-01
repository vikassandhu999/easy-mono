import {Button, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useGoBack} from '@/@hooks/use-go-back';

import {TrainingPlansBrowseList} from './training-plans-list';

export default function ListTrainingPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className="flex items-center">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
            isIconOnly
            className={'lg:hidden'}
          >
            <ArrowLeft size={18} />
          </Button>
          <Page.Title>Training Plans</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_TRAINING_PLAN)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 border-b'}>
        <SearchField
          aria-label="Search training plans"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
          variant={'secondary'}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search training plans..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Page.Toolbar>
      <Page.Content>
        <TrainingPlansBrowseList
          hasFilter={!!debouncedSearch}
          search={debouncedSearch}
        />
      </Page.Content>
    </Page>
  );
}
