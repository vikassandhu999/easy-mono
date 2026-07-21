import {Button, SearchField, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {
  BROWSE_LIST_FRAME_CLASS,
  BROWSE_LIST_SURFACE_CLASS,
  BROWSE_SEARCH_GROUP_CLASS,
  FILTER_PILL_CLASS,
  FilterCount,
} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useIsSm} from '@/@hooks/use-is-sm';
import {useListNutritionPlansQuery} from '@/api/generated';
import {useCoachNutritionPlansInfiniteQuery} from '@/api/nutrition-plans-list';

import NutritionPlanListItem from './nutrition-plan-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const isSm = useIsSm();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachNutritionPlansInfiniteQuery({
    search: deferredSearch,
    status: status === 'all' ? undefined : status,
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Per-status counts for the tabs. `count` is the total matching the filter
  // regardless of `limit`, so `limit: 1` reads it back cheaply. `All` is derived
  // rather than fetched — status is a closed active|archived enum.
  const {data: activeData} = useListNutritionPlansQuery({limit: 1, status: 'active'});
  const {data: archivedData} = useListNutritionPlansQuery({limit: 1, status: 'archived'});
  const activeCount = activeData?.count ?? 0;
  const archivedCount = archivedData?.count ?? 0;

  return (
    <Page>
      <Page.Header
        className="bg-surface pb-1 sm:bg-transparent sm:pb-2"
        size="content"
      >
        <Page.TitleGroup>
          <div className="min-w-0">
            <Page.Title>
              <span className="sm:hidden">Nutrition</span>
              <span className="hidden sm:inline">Nutrition plans</span>
            </Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Reusable daily macro targets and meal structures for your clients
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create plan"
            className="min-h-11 min-w-11 rounded-control"
            onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create plan</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className="sticky top-0 z-10 mb-0 flex flex-wrap items-center gap-x-3 gap-y-0 border-b border-border bg-surface pt-2 pb-0 sm:mb-6 sm:gap-3 sm:border-0 sm:bg-background sm:pb-3"
        size="content"
      >
        <SearchField
          aria-label="Search nutrition plans"
          className="w-full min-w-0 sm:max-w-72 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className={BROWSE_SEARCH_GROUP_CLASS}>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11"
              placeholder={isSm ? 'Search nutrition plans…' : 'Search plans…'}
            />
            <SearchField.ClearButton className="min-h-11 min-w-11" />
          </SearchField.Group>
        </SearchField>
        <Separator
          className="hidden h-6 sm:block"
          orientation="vertical"
        />
        <div className="-mx-4 min-w-0 max-w-full shrink-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
              All{' '}
              <FilterCount
                count={activeCount + archivedCount}
                isSelected={status === 'all'}
              />
            </ToggleButton>
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="active"
            >
              Active{' '}
              <FilterCount
                count={activeCount}
                isSelected={status === 'active'}
              />
            </ToggleButton>
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="archived"
            >
              Archived{' '}
              <FilterCount
                count={archivedCount}
                isSelected={status === 'archived'}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </Page.Toolbar>
      <Page.Content bare>
        <Page.Frame
          className={BROWSE_LIST_FRAME_CLASS}
          size="content"
        >
          <div className={BROWSE_LIST_SURFACE_CLASS}>
            <BrowseListBox
              ariaLabel="Nutrition plans"
              className="flex-1 p-0"
              emptyState={
                <ListEmptyState
                  createLabel="Create Nutrition Plan"
                  createRoute={ROUTES.CREATE_NUTRITION_PLAN}
                  emptyDescription="Create your first nutrition plan to get started."
                  hasFilter={!!deferredSearch || status !== 'all'}
                  nounPlural="nutrition plans"
                />
              }
              fetchNextPage={fetchNextPage}
              isError={isError}
              isLoading={isLoading}
              onRetry={refetch}
              items={items}
              onAction={(key) => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', String(key)))}
              renderItem={(plan) => <NutritionPlanListItem plan={plan} />}
            />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
