import {Button, SearchField, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import BrowseListBox, {FILTER_PILL_CLASS} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useCoachTrainingPlansInfiniteQuery, useListTrainingPlansQuery} from '@/api/training-plans-list';

import TrainingPlanListItem from './training-plan-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

export default function ListTrainingPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachTrainingPlansInfiniteQuery({
    search: deferredSearch,
    status: status === 'all' ? undefined : status,
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Lightweight counts for the status tabs — `count` on the list endpoint is
  // the total matching the filter regardless of `limit`, so `limit: 1` is
  // enough to read it back.
  const {data: allData} = useListTrainingPlansQuery({limit: 1});
  const {data: activeData} = useListTrainingPlansQuery({limit: 1, status: 'active'});
  const {data: archivedData} = useListTrainingPlansQuery({limit: 1, status: 'archived'});

  return (
    <Page>
      <Page.Header size="list">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
          <div className="min-w-0">
            <Page.Title>Training plans</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Reusable workout splits and progressions for your clients
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create plan"
            onPress={() => navigate(ROUTES.CREATE_TRAINING_PLAN)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create plan</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={'sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-background pt-2 pb-3'}
        size="list"
      >
        <SearchField
          aria-label="Search training plans"
          className="w-full min-w-0 sm:max-w-72 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search training plans…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Separator
          className="hidden h-6 sm:block"
          orientation="vertical"
        />
        <div className="shrink-0">
          <ToggleButtonGroup
            aria-label="Filter plans by status"
            className="flex flex-nowrap gap-2"
            isDetached
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next) {
                setStatus(next as StatusFilter);
              }
            }}
            selectedKeys={[status]}
            selectionMode="single"
          >
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="all"
            >
              All <span className="text-chip opacity-70">{allData?.count ?? 0}</span>
            </ToggleButton>
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="active"
            >
              Active <span className="text-chip opacity-70">{activeData?.count ?? 0}</span>
            </ToggleButton>
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="archived"
            >
              Archived <span className="text-chip opacity-70">{archivedData?.count ?? 0}</span>
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </Page.Toolbar>
      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <BrowseListBox
              ariaLabel="Training plans"
              className="flex-1 p-0"
              emptyState={
                <ListEmptyState
                  createLabel="Create Training Plan"
                  createRoute={ROUTES.CREATE_TRAINING_PLAN}
                  emptyDescription="Create your first training plan to get started."
                  hasFilter={!!deferredSearch || status !== 'all'}
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
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
