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
import {useCoachTrainingPlansInfiniteQuery} from '@/api/training-plans-list';

import TrainingPlanListItem from './training-plan-list-item';

export default function ListTrainingPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingPlansInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  return (
    <Page>
      <Page.Header size="list">
        <Page.TitleGroup className="flex items-center">
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
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
      <Page.Toolbar
        className={'sticky top-0 z-10 flex flex-col gap-3 border-b bg-surface pt-2 pb-3'}
        size="list"
      >
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
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          <BrowseListBox
            ariaLabel="Training plans"
            className="flex-1 gap-0"
            emptyState={
              <ListEmptyState
                createLabel="Create Training Plan"
                createRoute={ROUTES.CREATE_TRAINING_PLAN}
                emptyDescription="Create your first training plan to get started."
                hasFilter={!!deferredSearch}
                nounPlural="training plans"
              />
            }
            fetchNextPage={fetchNextPage}
            isError={isError}
            isLoading={isLoading}
            onRetry={refetch}
            items={items}
            onAction={(key) => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', String(key)))}
            renderItem={(plan) => <TrainingPlanListItem plan={plan} />}
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
